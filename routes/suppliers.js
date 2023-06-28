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
    res.render("suppliers/index", { name });
  });

  router.get('/datatable', isLoggedIn, async (req, res, next) => {
    let params = []

    if (req.query.search.value) {
      params.push(`supplierid::text ilike '%${req.query.search.value}%'`)
      params.push(`name ilike '%${req.query.search.value}%'`)
      params.push(`address ilike '%${req.query.search.value}%'`)
      params.push(`phone ilike '%${req.query.search.value}%'`)
    }

    const limit = req.query.length
    const offset = req.query.start
    const sortBy = req.query.columns[req.query.order[0].column].data
    const sortMode = req.query.order[0].dir
    const sqlData = `SELECT * FROM suppliers${params.length > 0 ? ` WHERE ${params.join(' OR ')}` : ''} ORDER BY ${sortBy} ${sortMode} limit ${limit} offset ${offset} `
    const sqlTotal = `SELECT COUNT(*) as total FROM suppliers${params.length > 0 ? ` WHERE ${params.join(' OR ')}` : ''}`
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

  router.get('/delete/:supplierid', isLoggedIn, async (req, res, next) => {
    try {
      const { supplierid } = req.params;
      let sql = `DELETE FROM suppliers WHERE supplierid = $1`
      await pool.query(sql, [supplierid]);
      res.redirect('/suppliers');
    } catch (error) {
      console.log(error)
      res.status(500).json({ error: "Error Deleting Data User" })
    }
  })

  router.get('/add', isLoggedIn, (req, res) => {
    const { name } = req.session.user;
    res.render("suppliers/add", { name });
  });

  router.post('/add', isLoggedIn, async (req, res) => {
    try {
      const { name, address, phone} = req.body;
      let sql = `INSERT INTO suppliers(name, address, phone) VALUES ($1, $2, $3)`;
      await pool.query(sql, [name, address, phone]);
      res.redirect('/suppliers');
    } catch (error) {
      console.log(error);
      res.status(500).json({ error: "Error creating user data" });
    }
  });

  router.get('/edit/:supplierid', isLoggedIn, async (req, res, next) => {
    try {
      const { name } = req.session.user;
      const { supplierid } = req.params
      const sql = 'SELECT * FROM suppliers WHERE supplierid = $1';
      const data = await pool.query(sql, [supplierid])
      // console.log(data)
      res.render('suppliers/edit', { data: data.rows[0], name })
    } catch (error) {
      console.log(error)
      res.status(500).json({ error: "Error Getting Data User" })
    }
  })

  router.post('/edit/:supplierid', isLoggedIn, async (req, res, next) => {
    try {
      const { supplierid } = req.params;
      const { name, address, phone } = req.body;
      let sql = `UPDATE suppliers SET name = $1, address = $2, phone = $3 WHERE supplierid = $4`
      await pool.query(sql, [name, address, phone, supplierid]);
      res.redirect('/suppliers');
    } catch (error) {
      console.log(error)
      res.status(500).json({ error: "Error Updating Data User" })
    }
  })

  return router;
};
