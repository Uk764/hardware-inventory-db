// categoryRoutes.js
// All routes are protected — user must be logged in

const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  getCategories,
  getCategory,
  createCategory,
  updateCategory,
  deleteCategory
} = require('../controllers/categoryController');

// All routes below require a valid JWT token
router.use(protect);

router.get('/',     getCategories);
router.get('/:id',  getCategory);
router.post('/',    createCategory);
router.put('/:id',  updateCategory);
router.delete('/:id', deleteCategory);

module.exports = router;