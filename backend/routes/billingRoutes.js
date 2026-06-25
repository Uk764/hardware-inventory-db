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
const { generateInvoicePDF } = require('../controllers/pdfController');

// All routes protected
router.use(protect);

router.post('/invoice',          createInvoice);
router.get('/invoices',          getInvoices);
router.get('/invoice/:id',       getInvoice);
router.get('/invoice/:id/pdf',   generateInvoicePDF);
router.get('/today',             getTodaySummary);

module.exports = router;