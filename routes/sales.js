var express = require('express');
var router = express.Router();

const isLoggedIn = function (req, res, next) {
    if (req.session.user) {
        next();
    } else {
        res.redirect('/');
    }
};

module.exports = function (pool) {
    router.get('/', isLoggedIn, (req, res) => {
        const { name } = req.session.user;
        res.render("sales/index", { name, current: 'sales' });
    });

    router.get('/datatable', isLoggedIn, async (req, res, next) => {
        let params = [];

        if (req.query.search.value) {
            params.push(`invoice ilike '%${req.query.search.value}%'`);
            params.push(`customer ilike '%${req.query.search.value}%'`);
        }

        const limit = req.query.length;
        const offset = req.query.start;
        const sortBy = req.query.columns[req.query.order[0].column].data;
        const sortMode = req.query.order[0].dir;
        const sqlData = `SELECT sales.*, customers.* FROM sales LEFT JOIN customers ON sales.customer = customers.customerid${params.length > 0 ?` WHERE ${params.join(' OR ')}` : ''} ORDER BY ${sortBy} ${sortMode} LIMIT ${limit} OFFSET ${offset}`
        const sqlTotal = `SELECT COUNT(*) as total FROM sales${params.length > 0 ? ` WHERE ${params.join(' OR ')}` : ''}`;
        const total = await pool.query(sqlTotal);
        const data = await pool.query(sqlData);

        const response = {
            "draw": Number(req.query.draw),
            "recordsTotal": total.rows[0].total,
            "recordsFiltered": total.rows[0].total,
            "data": data.rows
        };

        res.json(response);
    });

    router.get('/add', async (req, res, next) => {
        try {
            const { name, userid } = req.session.user;
            const sql = `INSERT INTO sales(invoice, totalsum, operator) VALUES(sales(), 0, $1) RETURNING *`;
            const data = await pool.query(sql, [userid]);
            res.redirect(`/sales/show/${data.rows[0].invoice}`);
        } catch (error) {
            console.log(error);
            res.status(500).json({ error: 'Error Creating Data sales' });
        }
    });

    router.get('/edit', async (req, res, next) => {
        try {
            const { name, userid } = req.session.user;
            const sql = `INSERT INTO sales(invoice, totalsum, operator) VALUES(sales(), 0, $1) RETURNING *`;
            const data = await pool.query(sql, [userid]);
            res.redirect(`/sales/edit/${data.rows[0].invoice}`);
        } catch (error) {
            console.log(error);
            res.status(500).json({ error: 'Error Creating Data sales' });
        }
    });

    router.get('/show/:invoice', async (req, res, next) => {
        try {
            const { name } = req.session.user;
            const { invoice } = req.params;
            const invoicesql = `SELECT * FROM sales WHERE invoice = $1`
            const goodsSql = 'SELECT * FROM goods'
            const custSql = 'SELECT * FROM customers'
            const getInvoice = await pool.query(invoicesql, [invoice])
            const getBarcode = await pool.query(goodsSql)
            const getCustomer = await pool.query(custSql)
            res.render('sales/add', {
                name,
                user: req.session.user,
                data: getInvoice.rows[0],
                barcode: getBarcode.rows,
                customer: getCustomer.rows,
            });
        } catch (error) {
            console.log(error);
            res.status(500).json({ error: 'Error Showing Data sales' });
        }
    });

    router.post('/show/:invoice', async (req, res, next) => {
        try {
            const { invoice } = req.params;
            const { totalsum, pay, change, customername } = req.body;
            const { userid } = req.session.user;

            const customerQuery = 'SELECT customerid FROM customers WHERE name = $1';
            const customerResult = await pool.query(customerQuery, [customername]);
            const customerid = customerResult.rows[0].customerid;

            const sql = `UPDATE sales SET totalsum = $1, pay = $2, change = $3, customer = $4 , operator = $5 WHERE invoice = $6`
            await pool.query(sql, [totalsum, pay, change, customerid, userid, invoice])
            res.redirect('/sales');
        } catch (error) {
            console.log(error);
            res.status(500).json({ error: 'Error Updating Data sales' });
        }
    });


    router.get('/edit/:invoice', async (req, res, next) => {
        try {
            const { name } = req.session.user;
            const { invoice } = req.params;
            const invoicesql = `SELECT * FROM sales WHERE invoice = $1`
            const goodsSql = 'SELECT * FROM goods'
            const custSql = 'SELECT * FROM customers'
            const getInvoice = await pool.query(invoicesql, [invoice])
            const getBarcode = await pool.query(goodsSql)
            const getCustomer = await pool.query(custSql)
            res.render('sales/edit', {
                name,
                user: req.session.user,
                data: getInvoice.rows[0],
                barcode: getBarcode.rows,
                customer: getCustomer.rows,
            });
        } catch (error) {
            console.log(error);
            res.status(500).json({ error: 'Error Showing Data sales' });
        }
    });

    router.post('/edit/:invoice', async (req, res, next) => {
        try {
            const { invoice } = req.params;
            const { totalsum, pay, change, customername } = req.body;
            const { userid } = req.session.user;


            const customerQuery = 'SELECT customerid FROM customers WHERE name = $1';
            const customerResult = await pool.query(customerQuery, [customername]);
            const customerid = customerResult.rows[0].customerid;

            const sql = `UPDATE sales SET totalsum = $1, pay = $2, change = $3, customer = $4 , operator = $5 WHERE invoice = $6`
            await pool.query(sql, [totalsum, pay, change, customerid, userid, invoice])
            res.redirect('/sales');
        } catch (error) {
            console.log(error);
            res.status(500).json({ error: 'Error Updating Data sales' });
        }
    });

    router.get('/tables/:invoice', async (req, res, next) => {
        try {
            const { invoice } = req.params;
            const sql = `SELECT saleitems.*, goods.name FROM saleitems LEFT JOIN goods ON saleitems.itemcode = goods.barcode WHERE saleitems.invoice = $1 ORDER BY saleitems.id`;
            const data = await pool.query(sql, [invoice]);
            res.json(data.rows);
        } catch (error) {
            console.log(error);
            res.status(500).json({ error: 'Error Showing Table Sales Items' });
        }
    });

    router.get('/goods/:barcode', async (req, res, next) => {
        try {
            const { barcode } = req.params;
            const sql = `SELECT * FROM goods WHERE barcode = $1`;
            const data = await pool.query(sql, [barcode]);
            console.log('Showing Data Barcode Success');
            res.json(data.rows[0]);
        } catch (error) {
            console.log(error);
            res.status(500).json({ error: 'Error Showing Data Barcode' });
        }
    });

    router.post('/additems', async (req, res, next) => {
        try {
            const { invoice, itemcode, quantity } = req.body
            const sqlSaleItem = `INSERT INTO saleitems(invoice, itemcode, quantity) VALUES($1,$2,$3)`
            const sqlSale = `SELECT * FROM sales WHERE invoice = $1`
            await pool.query(sqlSaleItem, [invoice, itemcode, quantity])
            const data = await pool.query(sqlSale, [invoice])
            res.json(data.rows[0])
        } catch (error) {
            console.log(error);
            res.status(500).json({ error: 'Error Adding Data Sales Items' });
        }
    });

    router.get('/deleteitems/:id', async (req, res, next) => {
        try {
            const { id } = req.params;
            const sql = `DELETE FROM saleitems WHERE id = $1 RETURNING *`;
            const data = await pool.query(sql, [id]);
            res.redirect(`/sales/show/${data.rows[0].invoice}`);
        } catch (error) {
            console.log(error);
        }
    });

    router.get('/delete/:invoice', async (req, res, next) => {
        try {
            const { invoice } = req.params;
            const sql = `DELETE FROM sales WHERE invoice = $1`;
            await pool.query(sql, [invoice]);
            res.redirect('/sales');
        } catch (error) {
            console.log(error);
            res.status(500).json({ error: 'Error Deleting Data sales' });
        }
    });

    return router;
};
