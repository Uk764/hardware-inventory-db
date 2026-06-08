// productRoutes.js
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const upload = require('../config/multer');
const {
  getProducts,
  getProduct,
  getProductByBarcode,
  createProduct,
  updateProduct,
  deleteProduct,
  updateStock,
  getLowStockProducts,
  bulkImport
} = require('../controllers/productController');

// All routes are protected
router.use(protect);

// Special routes FIRST (before /:id to avoid conflicts)
router.get('/alerts/low-stock',       getLowStockProducts);
router.get('/barcode/:barcode',       getProductByBarcode);
router.post('/bulk-import', upload.single('file'), bulkImport);

// Standard CRUD routes
router.get('/',       getProducts);
router.get('/:id',    getProduct);
router.post('/',      createProduct);
router.put('/:id',    updateProduct);
router.delete('/:id', deleteProduct);

// Stock management
router.put('/:id/stock', updateStock);

module.exports = router;