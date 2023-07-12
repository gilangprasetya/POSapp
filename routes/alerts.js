var express = require('express');
var router = express.Router();
const { isLoggedIn, isAdmin } = require('../helpers/util')

module.exports = function (pool) {

    router.get('/', isLoggedIn, isAdmin, async (req, res, next) => {
        try {
            const data = await pool.query('SELECT * FROM goods WHERE stock <= 5');
            res.json({ datas: data.rows });
        } catch (error) {
            next(error);
        }
    });

    router.get('/count', isLoggedIn, isAdmin, async (req, res, next) => {
        try {
            const { rows: total } = await pool.query('SELECT COUNT(barcode) as total FROM goods WHERE stock <= 5');
            res.json(total);
          } catch (error) {
            next(error);
          }
        });

    return router;
};
