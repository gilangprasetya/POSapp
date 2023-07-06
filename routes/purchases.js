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
        res.render("purchases/index", { name });
    });

    router.get('/datatable', isLoggedIn, async (req, res, next) => {
        let params = [];

        if (req.query.search.value) {
            params.push(`invoice ilike '%${req.query.search.value}%'`);
        }

        const limit = req.query.length;
        const offset = req.query.start;
        const sortBy = req.query.columns[req.query.order[0].column].data;
        const sortMode = req.query.order[0].dir;
        const sqlData = `SELECT purchases.*, suppliers.* FROM purchases LEFT JOIN suppliers ON purchases.supplier = suppliers.supplierid${params.length > 0 ?` WHERE ${params.join(' OR ')}` : ''} ORDER BY ${sortBy} ${sortMode} LIMIT ${limit} OFFSET ${offset}`
        const sqlTotal = `SELECT COUNT(*) as total FROM purchases${params.length > 0 ? ` WHERE ${params.join(' OR ')}` : ''}`;
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
            const sql = `INSERT INTO purchases(invoice, totalsum, operator) VALUES(purchaseinvoice(), 0, $1) RETURNING *`;
            const data = await pool.query(sql, [userid]);
            res.redirect(`/purchases/show/${data.rows[0].invoice}`);
        } catch (error) {
            console.log(error);
            res.status(500).json({ error: 'Error Creating Data Purchases' });
        }
    });

    router.get('/edit', async (req, res, next) => {
        try {
            const { name, userid } = req.session.user;
            const sql = `INSERT INTO purchases(invoice, totalsum, operator) VALUES(purchaseinvoice(), 0, $1) RETURNING *`;
            const data = await pool.query(sql, [userid]);
            res.redirect(`/purchases/edit/${data.rows[0].invoice}`);
        } catch (error) {
            console.log(error);
            res.status(500).json({ error: 'Error Creating Data Purchases' });
        }
    });

    router.get('/show/:invoice', async (req, res, next) => {
        try {
            const { name } = req.session.user;
            const { invoice } = req.params;
            const invoicesql = `SELECT * FROM purchases WHERE invoice = $1`;
            const goodssql = `SELECT * FROM goods ORDER BY barcode`;
            const supsql = `SELECT * FROM suppliers ORDER BY supplierid`;
            const getInvoice = await pool.query(invoicesql, [invoice]);
            const getBarcode = await pool.query(goodssql);
            const getSupplier = await pool.query(supsql);
            res.render('purchases/add', {
                name,
                user: req.session.user,
                data: getInvoice.rows[0],
                barcode: getBarcode.rows,
                supplier: getSupplier.rows,
            });
        } catch (error) {
            console.log(error);
            res.status(500).json({ error: 'Error Showing Data Purchases' });
        }
    });

    router.post('/show/:invoice', async (req, res, next) => {
        try {
            const { invoice } = req.params;
            const { totalsum, suppliername } = req.body;
            const { userid } = req.session.user;

            // Fetch the supplierid based on the suppliername
            const supplierQuery = 'SELECT supplierid FROM suppliers WHERE name = $1';
            const supplierResult = await pool.query(supplierQuery, [suppliername]);
            const supplierid = supplierResult.rows[0].supplierid;

            const sql = `UPDATE purchases SET totalsum = $1, supplier = $2, operator = $3 WHERE invoice = $4`;
            await pool.query(sql, [totalsum, supplierid, userid, invoice]);
            console.log('Success Updating Data Purchases');
            res.redirect('/purchases');
        } catch (error) {
            console.log(error);
            res.status(500).json({ error: 'Error Updating Data Purchases' });
        }
    });


    router.get('/edit/:invoice', async (req, res, next) => {
        try {
            const { name } = req.session.user;
            const { invoice } = req.params;
            const invoicesql = `SELECT * FROM purchases WHERE invoice = $1`;
            const goodssql = `SELECT * FROM goods ORDER BY barcode`;
            const supsql = `SELECT * FROM suppliers ORDER BY supplierid`;
            const getInvoice = await pool.query(invoicesql, [invoice]);
            const getBarcode = await pool.query(goodssql);
            const getSupplier = await pool.query(supsql);
            res.render('purchases/edit', {
                name,
                user: req.session.user,
                data: getInvoice.rows[0],
                barcode: getBarcode.rows,
                supplier: getSupplier.rows,
            });
        } catch (error) {
            console.log(error);
            res.status(500).json({ error: 'Error Showing Data Purchases' });
        }
    });

    router.post('/edit/:invoice', async (req, res, next) => {
        try {
            const { invoice } = req.params;
            const { totalsum, suppliername } = req.body;
            const { userid } = req.session.user;

            // Fetch the supplierid based on the suppliername
            const supplierQuery = 'SELECT supplierid FROM suppliers WHERE name = $1';
            const supplierResult = await pool.query(supplierQuery, [suppliername]);
            const supplierid = supplierResult.rows[0].supplierid;
            
            const sql = `UPDATE purchases SET totalsum = $1, supplier = $2, operator = $3 WHERE invoice = $4`;
            await pool.query(sql, [totalsum, supplierid, userid, invoice]);
            console.log('Success Updating Data Purchases');
            res.redirect('/purchases');
        } catch (error) {
            console.log(error);
            res.status(500).json({ error: 'Error Updating Data Purchases' });
        }
    });

    router.get('/tables/:invoice', async (req, res, next) => {
        try {
            const { invoice } = req.params;
            const sql = `SELECT purchaseitems.*, goods.name FROM purchaseitems LEFT JOIN goods ON purchaseitems.itemcode = goods.barcode WHERE purchaseitems.invoice = $1 ORDER BY purchaseitems.id`;
            const data = await pool.query(sql, [invoice]);
            console.log('Showing Table Purchase Items Success');
            res.json(data.rows);
        } catch (error) {
            console.log(error);
            res.status(500).json({ error: 'Error Showing Table Purchase Items' });
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
            const { invoice, itemcode, quantity } = req.body;
            const sqlPurchaseItem = `INSERT INTO purchaseitems(invoice, itemcode, quantity) VALUES($1, $2, $3)`;
            const sqlPurchase = `SELECT * FROM purchases WHERE invoice = $1`;
            await pool.query(sqlPurchaseItem, [invoice, itemcode, quantity]);
            const data = await pool.query(sqlPurchase, [invoice]);
            console.log('Adding Purchase Items Success');
            res.json(data.rows[0]);
        } catch (error) {
            console.log(error);
            res.status(500).json({ error: 'Error Adding Data Purchase Items' });
        }
    });

    router.get('/deleteitems/:id', async (req, res, next) => {
        try {
            const { id } = req.params;
            const sql = `DELETE FROM purchaseitems WHERE id = $1 RETURNING *`;
            const data = await pool.query(sql, [id]);
            res.redirect(`/purchases/show/${data.rows[0].invoice}`);
        } catch (error) {
            console.log(error);
        }
    });

    router.get('/delete/:invoice', async (req, res, next) => {
        try {
            const { invoice } = req.params;
            const sql = `DELETE FROM purchases WHERE invoice = $1`;
            await pool.query(sql, [invoice]);
            res.redirect('/purchases');
        } catch (error) {
            console.log(error);
            res.status(500).json({ error: 'Error Deleting Data Purchases' });
        }
    });

    return router;
};
