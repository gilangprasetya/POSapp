const express = require('express');
const router = express.Router();
const { isLoggedIn } = require('../helpers/util');

module.exports = function (db) {
  router.get('/', isLoggedIn, (req, res) => {
    const { name } = req.session.user;

    // Perform the PostgreSQL queries
    const purchaseQuery = 'SELECT SUM(totalsum) AS total_purchase FROM purchases;';
    const salesQuery = 'SELECT SUM(totalsum) AS total_sales FROM sales;';

    db.query(purchaseQuery, (purchaseErr, purchaseResult) => {
      if (purchaseErr) {
        console.log('Error executing purchase query:', purchaseErr);
        res.sendStatus(500);
        return;
      }

      const totalPurchase = purchaseResult.rows[0].total_purchase;

      db.query(salesQuery, (salesErr, salesResult) => {
        if (salesErr) {
          console.log('Error executing sales query:', salesErr);
          res.sendStatus(500);
          return;
        }

        const totalSales = salesResult.rows[0].total_sales;

        res.render('dashboard', { name, totalPurchase, totalSales, current: 'dashboard' });
      });
    });
  });

  router.get('/totalPurchases', isLoggedIn, (req, res) => {
    const purchaseQuery = 'SELECT SUM(totalsum) AS total_purchase FROM purchases;';
    db.query(purchaseQuery, (purchaseErr, purchaseResult) => {
      if (purchaseErr) {
        console.log('Error executing purchase query:', purchaseErr);
        res.sendStatus(500);
        return;
      }

      const totalPurchase = purchaseResult.rows[0].total_purchase;
      res.json({ totalPurchase });
    });
  });

  router.get('/totalSales', isLoggedIn, (req, res) => {
    const salesQuery = 'SELECT SUM(totalsum) AS total_sales FROM sales;';
    db.query(salesQuery, (salesErr, salesResult) => {
      if (salesErr) {
        console.log('Error executing sales query:', salesErr);
        res.sendStatus(500);
        return;
      }

      const totalSales = salesResult.rows[0].total_sales;
      res.json({ totalSales });
    });
  });

  return router;
};
