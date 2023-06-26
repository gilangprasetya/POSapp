var express = require('express');
var router = express.Router();
const bcrypt = require('bcrypt');
const saltRounds = 10;

const isLoggedIn = function (req, res, next) {
  if (req.session.user) {
    next()
  } else {
    res.redirect('/')
  }
}

module.exports = function (db) {
  /* GET home page. */
  router.get('/', (req, res) => {
    res.render('login', { errorMessage: req.flash('errorMessage') });
  });

  router.get('/logout', (req, res) => {
    req.session.destroy(function (err) {
      res.redirect('/');
    })
  });

  router.post('/', (req, res) => {
    db.query("select * from admin where email = $1", [req.body.email], (err, data) => {
      if (data.rows.length == 0) {
        req.flash('errorMessage', "email doesn't exist")
        return res.redirect('/')
      }
      bcrypt.compare(req.body.password, data.rows[0].password, function (err, result) {
        if (!result) {
          req.flash('errorMessage', "wrong password")
          return res.redirect('/')
        }

        req.session.user = data.rows[0]
        res.redirect('/dashboard')
      });
    })
  })

  router.get('/register', (req, res) => {
    res.render('register', { errorMessage: req.flash('errorMessage') });
  });

  router.post('/register', (req, res) => {
    if (req.body.retypepassword != req.body.password) {
      req.flash('errorMessage', "password doesn't match")
      return res.redirect('/register')
    }

    db.query("select * from admin where email = $1", [req.body.email], (err, data) => {
      if (data.rows.length > 0) {
        req.flash('errorMessage', "email exist")
        return res.redirect('/register')
      }
      const password = req.body.password;
      bcrypt.hash(password, saltRounds, function (err, hash) {
        if (err) throw err;
        db.query("insert into admin(name, email, password) values ($1, $2, $3)", [req.body.name, req.body.email, hash], (err, data) => {
          if (err) {
            console.log(err);
          }
          res.redirect("/");
        });
      });
    })
  })

  router.get('/dashboard', isLoggedIn, (req, res) => {
    const { name } = req.session.user;
    res.render('dashboard', { name });
  });

  return router;
}