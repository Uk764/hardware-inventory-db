const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  getSuppliers,
  getSupplier,
  createSupplier,
  updateSupplier,
  deleteSupplier
} = require('../controllers/supplierController');

router.use(protect);

router.get('/',       getSuppliers);
router.get('/:id',    getSupplier);
router.post('/',      createSupplier);
router.put('/:id',    updateSupplier);
router.delete('/:id', deleteSupplier);

module.exports = router;