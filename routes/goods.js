var express = require('express');
var router = express.Router();
var path = require('path');

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
        res.render("goods/index", { name });
    });

    router.get('/datatable', isLoggedIn, async (req, res, next) => {
        let params = []

        if (req.query.search.value) {
            params.push(`barcode ilike '%${req.query.search.value}%'`)
            params.push(`name ilike '%${req.query.search.value}%'`)
            params.push(`unit ilike '%${req.query.search.value}%'`)
            params.push(`stock::text ilike '%${req.query.search.value}%'`)
        }

        const limit = req.query.length
        const offset = req.query.start
        const sortBy = req.query.columns[req.query.order[0].column].data
        const sortMode = req.query.order[0].dir
        const sqlData = `SELECT * FROM goods${params.length > 0 ? ` WHERE ${params.join(' OR ')}` : ''} ORDER BY ${sortBy} ${sortMode} limit ${limit} offset ${offset} `
        const sqlTotal = `SELECT COUNT(*) as total FROM goods${params.length > 0 ? ` WHERE ${params.join(' OR ')}` : ''}`
        const total = await pool.query(sqlTotal)
        const data = await pool.query(sqlData)

        const response = {
            "draw": Number(req.query.draw),
            "recordsTotal": total.rows[0].total,
            "recordsFiltered": total.rows[0].total,
            "data": data.rows
        }

        res.json(response)
    })

    router.get('/delete/:barcode', isLoggedIn, async (req, res, next) => {
        try {
            const { barcode } = req.params;
            let sql = `DELETE FROM goods WHERE barcode = $1`
            await pool.query(sql, [barcode]);
            res.redirect('/goods');
        } catch (error) {
            console.log(error)
            res.status(500).json({ error: "Error Deleting Data User" })
        }
    })

    router.get('/add', isLoggedIn, async (req, res) => {
        const { name } = req.session.user;
        const sql = `SELECT * FROM units`
        const data = await pool.query(sql)
        res.render("goods/add", { isiUnit: data.rows, data: {}, name });
    });

    router.post('/add', isLoggedIn, async (req, res) => {
        try {
            const { barcode, name, stock, purchaseprice, sellingprice, unit } = req.body
            let sql = `INSERT INTO goods(barcode,name,stock,purchaseprice,sellingprice,unit,picture) VALUES ($1,$2,$3,$4,$5,$6,$7)`
            if (!req.files || Object.keys(req.files).length === 0) {
                return res.status(400).send('No files were uploaded.');
            }
            const picture = req.files.picture;
            const pictureName = `${Date.now()}-${picture.name}`;
            const uploadPath = path.join(__dirname, '..', 'public', 'images', 'picture', pictureName);

            picture.mv(uploadPath, async function (err) {
                if (err) {
                    return res.status(500).send(err);
                }
                await pool.query(sql, [barcode, name, stock, purchaseprice, sellingprice, unit, pictureName]);
                console.log('Data Goods Added');
                res.redirect('/goods');
            });
        } catch (error) {
            console.log(error)
            res.status(500).json({ error: "Error Creating Data Goods" })
        }
    })

    router.get('/edit/:barcode', isLoggedIn, async (req, res, next) => {
        try {
            const { name } = req.session.user;
            const { barcode } = req.params
            const sql = 'SELECT * FROM goods WHERE barcode = $1';
            const sql2 = 'SELECT * FROM units';
            const data = await pool.query(sql, [barcode])
            const unit = await pool.query(sql2)
            res.render('goods/edit', { data: data.rows[0], isiUnit: unit.rows, name })
        } catch (error) {
            console.log(error)
            res.status(500).json({ error: "Error Getting Data User" })
        }
    })

    router.post('/edit/:barcode', isLoggedIn, async (req, res, next) => {
        try {
            const { barcode } = req.params;
            const { name, stock, purchaseprice, sellingprice, unit } = req.body;
            let sql = `UPDATE goods SET name = $1, stock = $2, purchaseprice = $3, sellingprice = $4, unit = $5 WHERE barcode = $6`;

            if (!req.files || !req.files.picture) {
                // No file was uploaded, proceed with updating other fields
                await pool.query(sql, [name, stock, purchaseprice, sellingprice, unit, barcode]);
                console.log('Data Goods Updated');
                return res.redirect('/goods');
            }

            const picture = req.files.picture;
            const pictureName = `${Date.now()}-${picture.name}`;
            const uploadPath = path.join(__dirname, '..', 'public', 'images', 'picture', pictureName);

            picture.mv(uploadPath, async function (err) {
                if (err) {
                    console.log(err);
                    return res.status(500).send(err);
                }

                // File uploaded successfully, update all fields including the picture
                sql = `UPDATE goods SET name = $1, stock = $2, purchaseprice = $3, sellingprice = $4, unit = $5, picture = $6 WHERE barcode = $7`;
                await pool.query(sql, [name, stock, purchaseprice, sellingprice, unit, pictureName, barcode]);
                console.log('Data Goods Updated');
                res.redirect('/goods');
            });
        } catch (error) {
            console.log(error);
            res.status(500).json({ error: "Error Updating Data Goods" });
        }
    })

    return router;
};
