-- DONT FORGET TO CASCADE THE TABLE IF HAVE ANY RELATION

CREATE TABLE users(
    userid SERIAL PRIMARY KEY,
    email VARCHAR(100) NOT NULL,
    name VARCHAR(100) NOT NULL,
    password VARCHAR(100) NOT NULL,
    role VARCHAR (20) NOT NULL
);


CREATE TABLE goods(
    barcode VARCHAR(20) PRIMARY KEY NOT NULL,
    name VARCHAR(150) NOT NULL,
    stock INTEGER NOT NULL,
    purchaseprice NUMERIC(19,2) NOT NULL,
    sellingprice NUMERIC(19,2) NOT NULL, 
    unit VARCHAR(10) NOT NULL,
    picture TEXT NOT NULL,
    FOREIGN KEY(unit) REFERENCES units(unit)
);

CREATE TABLE suppliers(
    supplierid SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    address TEXT NOT NULL,
    phone VARCHAR(20) NOT NULL
);

CREATE TABLE purchases(
    invoice VARCHAR(20) PRIMARY KEY,
    time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    totalsum NUMERIC(19,2) NOT NULL DEFAULT 0,
    supplier INTEGER,
    operator INTEGER,
    FOREIGN KEY(supplier) REFERENCES suppliers(supplierid),
    FOREIGN KEY(operator) REFERENCES users(userid)
);

CREATE TABLE customers(
    customerid SERIAL PRIMARY KEY,
    name VARCHAR(100),
    address TEXT,
    phone VARCHAR(20)
);

CREATE TABLE purchaseitems(
    id SERIAL PRIMARY KEY,
    invoice VARCHAR(20) NOT NULL,
    itemcode VARCHAR(20) NOT NULL,
    quantity INTEGER NOT NULL,
    purchaseprice NUMERIC(19,2) NOT NULL DEFAULT 0,
    totalprice NUMERIC(19,2) NOT NULL DEFAULT 0,
    FOREIGN KEY(invoice) REFERENCES purchases(invoice),
    FOREIGN KEY(itemcode) REFERENCES goods(barcode)
);

CREATE TABLE sales (
    invoice VARCHAR(20) PRIMARY KEY NOT NULL,
    time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    totalsum NUMERIC(19,2),
    pay NUMERIC(19,2),
    change NUMERIC(19,2),
    customer INTEGER,
    operator INTEGER,
    FOREIGN KEY(customer) REFERENCES customers(customerid),
    FOREIGN KEY(operator) REFERENCES users(userid)
);

CREATE TABLE saleitems(
    id SERIAL PRIMARY KEY,
    invoice VARCHAR(20) NOT NULL,
    itemcode VARCHAR(20) NOT NULL,
    quantity INTEGER NOT NULL,
    sellingprice NUMERIC(19,2) NOT NULL DEFAULT 0,
    totalprice NUMERIC(19,2) NOT NULL DEFAULT 0,
    FOREIGN KEY(invoice) REFERENCES sales(invoice) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE CASCADE
        NOT VALID,
    FOREIGN KEY(itemcode) REFERENCES goods(barcode)
)

-- Trigger function for purchases
CREATE OR REPLACE FUNCTION updatepurchase() RETURNS TRIGGER AS $setpurchase$
    DECLARE
    oldstock INTEGER;
    summary NUMERIC;
    currentinvoice TEXT;
    BEGIN
        SELECT stock INTO oldstock FROM goods WHERE barcode = NEW.itemcode OR barcode = OLD.itemcode;
        IF (TG_OP = 'INSERT') THEN
            UPDATE goods SET stock = oldstock + NEW.quantity WHERE barcode = NEW.itemcode;
        currentinvoice := NEW.invoice;
        ELSIF (TG_OP = 'UPDATE') THEN
            UPDATE goods SET stock = oldstock - OLD.quantity + NEW.quantity WHERE barcode = NEW.itemcode;
            currentinvoice := OLD.invoice;
        ELSIF (TG_OP = 'DELETE') THEN
            UPDATE goods SET stock = oldstock - OLD.quantity WHERE barcode = OLD.itemcode;
            currentinvoice := OLD.invoice;
        END IF;
        -- Update purchase
        SELECT sum(totalprice) INTO summary FROM purchaseitems WHERE invoice = currentinvoice;
        UPDATE purchases SET totalsum = COALESCE(summary,0) WHERE invoice = currentinvoice;

        RETURN NULL;
    END;
$setpurchase$ LANGUAGE plpgsql;
CREATE TRIGGER setpurchase
AFTER INSERT OR UPDATE OR DELETE ON purchaseitems
    FOR EACH ROW EXECUTE FUNCTION updatepurchase();

-- Update total price purchase
CREATE OR REPLACE FUNCTION updatepricepurchase() RETURNS TRIGGER AS $set_totalpricepurchase$
    DECLARE 
        price NUMERIC;
    BEGIN
        SELECT purchaseprice INTO price FROM goods WHERE barcode = NEW.itemcode;
        NEW.purchaseprice := price;
        NEW.totalprice := NEW.quantity * price;
        RETURN NEW;
    END;
$set_totalpricepurchase$ LANGUAGE plpgsql;

CREATE TRIGGER set_totalpricepurchase
BEFORE INSERT OR UPDATE ON purchaseitems
    FOR EACH ROW EXECUTE FUNCTION updatepricepurchase();


-- Generate Invoice Purchases
CREATE OR REPLACE FUNCTION purchaseinvoice() RETURNS text AS $$
    BEGIN 
        IF EXISTS (SELECT FROM purchases WHERE invoice = 'INV-' || to_char(current_date, 'YYYYMMDD') || '-1') THEN
        return 'INV-' || to_char(current_date, 'YYYYMMDD') || '-' || nextval('purchases_invoice_seq');
        ELSE
            ALTER SEQUENCE purchases_invoice_seq RESTART WITH 1;
            return 'INV-' || to_char(current_date, 'YYYYMMDD') || '-' || nextval('purchases_invoice_seq');
        END IF;
    END;
$$ LANGUAGE plpgsql;

-- Generate Invoice Sales
CREATE OR REPLACE FUNCTION sales() RETURNS text AS $$
    BEGIN
        IF EXISTS (SELECT FROM sales WHERE invoice = 'INV-PENJ' || to_char(current_date, 'YYYYMMDD') || '-1') THEN
            return 'INV-PENJ' || to_char(current_date, 'YYYYMMDD') || '-' || nextval('sales_invoice_seq');
        ELSE
            ALTER SEQUENCE sales_invoice_seq RESTART WITH 1;
            return 'INV-PENJ' || to_char(current_date, 'YYYYMMDD') || '-' || nextval('sales_invoice_seq');
        END IF;
    END;
$$ LANGUAGE plpgsql;

-- Trigger Function For Sales
CREATE OR REPLACE FUNCTION updatesale() RETURNS TRIGGER AS $setsale$
    DECLARE
    oldstock INTEGER;
    summary NUMERIC;
    currentinvoice TEXT;
    BEGIN 
        SELECT stock INTO oldstock FROM goods WHERE barcode = NEW.itemcode OR barcode = OLD.itemcode;
        IF(TG_OP = 'INSERT') THEN
            UPDATE goods SET stock = oldstock - NEW.quantity WHERE barcode = NEW.itemcode;
            currentinvoice := NEW.invoice;
        ELSIF (TG_OP = 'UPDATE') THEN
            UPDATE goods SET stock = oldstock + OLD.quantity - NEW.quantity WHERE barcode = NEW.itemcode;
            currentinvoice := OLD.invoice;
        ELSIF (TG_OP = 'DELETE') THEN
            UPDATE goods SET stock = oldstock + OLD.quantity WHERE barcode = OLD.itemcode;
            currentinvoice := OLD.invoice;
        END IF;
        -- update sales
        SELECT sum(totalprice) INTO summary FROM saleitems WHERE invoice = currentinvoice;
        UPDATE sales SET totalsum = COALESCE(summary, 0) WHERE invoice = currentinvoice;

        RETURN NULL;
    END;
$setsale$ LANGUAGE plpgsql;

CREATE TRIGGER setsale
AFTER INSERT OR UPDATE OR DELETE ON saleitems
    FOR EACH ROW EXECUTE FUNCTION updatesale();

-- update totalprice sale
CREATE OR REPLACE FUNCTION updatepricesale() RETURNS TRIGGER AS $set_totalpricesale$
    DECLARE
        sellprice NUMERIC;
    BEGIN
        SELECT sellingprice INTO sellprice FROM goods WHERE barcode = NEW.itemcode;
        NEW.sellingprice := sellprice;
        NEW.totalprice := NEW.quantity * sellprice;
        RETURN NEW;
    END;
$set_totalpricesale$ LANGUAGE plpgsql;

CREATE TRIGGER set_totalpricesale
BEFORE INSERT OR UPDATE ON saleitems
    FOR EACH ROW EXECUTE FUNCTION updatepricesale();