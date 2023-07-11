var express = require('express');
var router = express.Router();
const { isLoggedIn, isAdmin } = require('../helpers/util')

module.exports = function (pool) {

  router.get('/', isLoggedIn, isAdmin, (req, res) => {
    const { name } = req.session.user;
    res.render("units/index", { name, current: 'goodutils', user: req.session.user });
  });

  router.get('/datatable', isLoggedIn, async (req, res, next) => {
    let params = []

    if (req.query.search.value) {
      params.push(`unit ilike '%${req.query.search.value}%'`)
      params.push(`name ilike '%${req.query.search.value}%'`)
      params.push(`note ilike '%${req.query.search.value}%'`)
    }

    const limit = req.query.length
    const offset = req.query.start
    const sortBy = req.query.columns[req.query.order[0].column].data
    const sortMode = req.query.order[0].dir
    const sqlData = `SELECT * FROM units${params.length > 0 ? ` WHERE ${params.join(' OR ')}` : ''} ORDER BY ${sortBy} ${sortMode} limit ${limit} offset ${offset} `
    const sqlTotal = `SELECT COUNT(*) as total FROM units${params.length > 0 ? ` WHERE ${params.join(' OR ')}` : ''}`
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

  router.get('/delete/:unit', isLoggedIn, async (req, res, next) => {
    try {
      const { unit } = req.params;
      let sql = `DELETE FROM units WHERE unit = $1`
      await pool.query(sql, [unit]);
      res.redirect('/units');
    } catch (error) {
      console.log(error)
      res.status(500).json({ error: "Error Deleting Data User" })
    }
  })

  router.get('/add', isLoggedIn, (req, res) => {
    const { name } = req.session.user;
    res.render("units/add", { name, current: 'goodutils', errorMessage: req.flash('errorMessage'), user: req.session.user });
  });

  router.post('/add', isLoggedIn, async (req, res) => {
    try {
      const { unit, name, note } = req.body;

      // Check if the unit already exists
      const existingUnit = await pool.query('SELECT * FROM units WHERE unit = $1', [unit]);
      if (existingUnit.rows.length > 0) {
        req.flash('errorMessage', 'Unit already exists / Duplicate Unit');
        res.redirect('/units/add');
        return; // Stop further execution
      }

      let sql = `INSERT INTO units(unit, name, note) VALUES ($1, $2, $3)`;
      await pool.query(sql, [unit, name, note]);
      res.redirect('/units');
    } catch (error) {
      console.log(error);
      res.status(500).json({ error: "Error creating user data" });
    }
  });

  router.get('/edit/:unit', isLoggedIn, async (req, res, next) => {
    try {
      const { name } = req.session.user;
      const { unit } = req.params;
      const sql = 'SELECT * FROM units WHERE unit = $1';
      const data = await pool.query(sql, [unit]);
      res.render('units/edit', { data: data.rows[0], name, current: 'goodutils', errorMessage: req.flash('errorMessage'), user: req.session.user });
    } catch (error) {
      console.log(error);
      res.status(500).json({ error: "Error Getting Data User" });
    }
  });

  router.post('/edit/:unit', isLoggedIn, async (req, res, next) => {
    try {
      const { unit } = req.params;
      const { newUnit, name, note } = req.body;

      // Check if the new unit already exists
      const existingUnit = await pool.query('SELECT * FROM units WHERE unit = $1', [newUnit]);
      if (existingUnit.rows.length > 0 && existingUnit.rows[0].unit !== unit) {
        req.flash('errorMessage', 'Unit already exists / Duplicate Unit');
        res.redirect(`/units/edit/${unit}`);
        return; // Stop further execution
      }

      let sql = `UPDATE units SET unit = $1, name = $2, note = $3 WHERE unit = $4`;
      await pool.query(sql, [newUnit, name, note, unit]);
      res.redirect('/units');
    } catch (error) {
      console.log(error);
      res.status(500).json({ error: "Error Updating Data User" });
    }
  });


  return router;
};
