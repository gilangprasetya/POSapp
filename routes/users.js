var express = require('express');
var router = express.Router();
const bcrypt = require('bcrypt');
const saltRounds = 10;
const { isLoggedIn } = require('../helpers/util')

module.exports = function (pool) {

  router.get('/', isLoggedIn, (req, res) => {
    const { name } = req.session.user;
    res.render("users/index", { name, current: 'users' });
  });

  router.get('/datatable', isLoggedIn, async (req, res, next) => {
    let params = []

    if (req.query.search.value) {
      params.push(`name ilike '%${req.query.search.value}%'`)
      params.push(`email ilike '%${req.query.search.value}%'`)
    }

    const limit = req.query.length
    const offset = req.query.start
    const sortBy = req.query.columns[req.query.order[0].column].data
    const sortMode = req.query.order[0].dir
    const sqlData = `SELECT * FROM users${params.length > 0 ? ` WHERE ${params.join(' OR ')}` : ''} ORDER BY ${sortBy} ${sortMode} limit ${limit} offset ${offset} `
    const sqlTotal = `SELECT COUNT(*) as total FROM users${params.length > 0 ? ` WHERE ${params.join(' OR ')}` : ''}`
    const total = await pool.query(sqlTotal)
    const data = await pool.query(sqlData)
    console.log(total.rows[0].total)

    const response = {
      "draw": Number(req.query.draw),
      "recordsTotal": total.rows[0].total,
      "recordsFiltered": total.rows[0].total,
      "data": data.rows
    }

    res.json(response)
  })

  router.get('/delete/:userid', isLoggedIn, async (req, res, next) => {
    try {
      const { userid } = req.params;
      let sql = `DELETE FROM users WHERE userid = $1`
      await pool.query(sql, [userid]);
      console.log('Delete User Success');
      res.redirect('/users');
    } catch (error) {
      console.log(error)
      res.status(500).json({ error: "Error Deleting Data User" })
    }
  })

  router.get('/add', isLoggedIn, (req, res) => {
    const { name } = req.session.user;
    res.render("users/add", { name, current: 'users', errorMessage: req.flash('errorMessage') });
  });

  router.post('/add', isLoggedIn, async (req, res) => {
    try {
      const { email, name, password, role } = req.body;

      // Check if the email already exists
      const existingUser = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
      if (existingUser.rows.length > 0) {
        req.flash('errorMessage', 'Email already exists and cannot be duplicated.');
        res.redirect('/users/add');
        return; // Stop further execution
      }

      const hash = await bcrypt.hash(password, saltRounds);
      let sql = `INSERT INTO users(email, name, password, role) VALUES ($1, $2, $3, $4)`;
      await pool.query(sql, [email, name, hash, role]);
      console.log('User added successfully');
      res.redirect('/users');
    } catch (error) {
      console.log(error);
      res.status(500).json({ error: "Error creating user data" });
    }
  });

  router.get('/edit/:userid', isLoggedIn, async (req, res, next) => {
    try {
      const { name } = req.session.user;
      const { userid } = req.params;
      const sql = 'SELECT * FROM users WHERE userid = $1';
      const data = await pool.query(sql, [userid]);
      res.render('users/edit', { data: data.rows[0], name, current: 'users', errorMessage: req.flash('errorMessage') });
    } catch (error) {
      console.log(error);
      res.status(500).json({ error: "Error Getting Data User" });
    }
  });

  router.post('/edit/:userid', isLoggedIn, async (req, res, next) => {
    try {
      const { userid } = req.params;
      const { email, name, role } = req.body;

      // Check if the email already exists
      const existingUser = await pool.query('SELECT * FROM users WHERE email = $1 AND userid != $2', [email, userid]);
      if (existingUser.rows.length > 0) {
        req.flash('errorMessage', 'Email already exists and cannot be duplicated.');
        res.redirect(`/users/edit/${userid}`);
        return; // Stop further execution
      }

      let sql = `UPDATE users SET email = $1, name =$2, role = $3 WHERE userid = $4`;
      await pool.query(sql, [email, name, role, userid]);
      console.log('Data User Edited');
      res.redirect('/users');
    } catch (error) {
      console.log(error);
      res.status(500).json({ error: "Error Updating Data User" });
    }
  });

  router.get('/profile', isLoggedIn, async (req, res, next) => {
    try {
      const { name } = req.session.user;
      const { userid } = req.session.user;
      const successMessage = req.flash('successMessage');
      const sql = 'SELECT * FROM users WHERE userid = $1';
      const data = await pool.query(sql, [userid]);
      res.render('users/profile', { data: data.rows[0], name, current: 'users', successMessage: successMessage.length ? successMessage[0] : null, errorMessage: req.flash('errorMessage') });
    } catch (error) {
      console.log(error);
      res.status(500).json({ error: "Error Getting User Profile" });
    }
  });

  router.post('/profile', isLoggedIn, async (req, res, next) => {
    try {
      const { userid } = req.session.user;
      const { email, name } = req.body;

      // Check if the email already exists
      const existingUser = await pool.query('SELECT * FROM users WHERE email = $1 AND userid != $2', [email, userid]);
      if (existingUser.rows.length > 0) {
        req.flash('errorMessage', 'Email already exists and cannot be duplicated.');
        res.redirect('/users/profile');
        return; // Stop further execution
      }

      let sql = `UPDATE users SET email = $1, name = $2 WHERE userid = $3`;
      await pool.query(sql, [email, name, userid]);
      req.flash('successMessage', 'Your profile has been updated.');
      res.redirect('/users/profile');
    } catch (error) {
      console.log(error);
      res.status(500).json({ error: "Error Updating User Profile" });
    }
  });

  router.get('/changepassword', isLoggedIn, (req, res) => {
    const { name } = req.session.user;
    const successMessage = req.flash('successMessage');
    res.render("users/changepassword", { name, current: 'users', successMessage: successMessage.length ? successMessage[0] : null, errorMessage: req.flash('errorMessage') });
  });

  router.post('/changepassword', isLoggedIn, async (req, res) => {
    try {
      const { userid } = req.session.user;
      const { oldPassword, newPassword, confirmPassword } = req.body;

      // Retrieve the user from the database
      const user = await pool.query('SELECT * FROM users WHERE userid = $1', [userid]);
      if (user.rows.length === 0) {
        req.flash('errorMessage', 'User not found.');
        res.redirect('/users/changepassword');
        return; // Stop further execution
      }

      // Compare the old password with the stored hashed password
      const isMatch = await bcrypt.compare(oldPassword, user.rows[0].password);
      if (!isMatch) {
        req.flash('errorMessage', 'Old Password is Wrong.');
        res.redirect('/users/changepassword');
        return; // Stop further execution
      }

      // Check if the new password and confirm password match
      if (newPassword !== confirmPassword) {
        req.flash('errorMessage', `Retype Password doesn't match.`);
        res.redirect('/users/changepassword');
        return; // Stop further execution
      }

      // Hash the new password
      const hash = await bcrypt.hash(newPassword, saltRounds);

      // Update the user's password in the database
      const sql = 'UPDATE users SET password = $1 WHERE userid = $2';
      await pool.query(sql, [hash, userid]);

      req.flash('successMessage', 'Your password has been updated.');
      res.redirect('/users/changepassword');
    } catch (error) {
      console.log(error);
      res.status(500).json({ error: "Error changing password" });
    }
  });


  return router;
};
