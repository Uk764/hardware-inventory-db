// reportsRoutes.js
const express = require('express');
const router  = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  getDashboardSummary,
  getSalesChart,
  getTopProducts,
  getMonthlyRevenue,
  getCategorySales,
  exportReportsExcel,
} = require('../controllers/reportsController');

router.use(protect);

router.get('/summary',        getDashboardSummary);
router.get('/sales',          getSalesChart);
router.get('/top-products',   getTopProducts);
router.get('/monthly',        getMonthlyRevenue);
router.get('/category-sales', getCategorySales);
router.get('/export',         exportReportsExcel);

module.exports = router;