// billingRoutes.js
const express = require('express');
const router  = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  createInvoice,
  getInvoices,
  getInvoice,
  getTodaySummary
} = require('../controllers/billingController');

// All routes protected
router.use(protect);

router.post('/invoice',        createInvoice);
router.get('/invoices',        getInvoices);
router.get('/invoice/:id',     getInvoice);
router.get('/today',           getTodaySummary);

module.exports = router;