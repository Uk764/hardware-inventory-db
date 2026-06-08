// categoryController.js
// Handles all category operations
// Categories = types of products (Electrical, Plumbing, etc.)

const pool = require('../config/db');

// ================================================
// FUNCTION 1: GET ALL CATEGORIES
// Route: GET /api/categories
// ================================================
const getCategories = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT 
        c.id,
        c.name,
        c.description,
        c.is_active,
        c.created_at,
        COUNT(p.id) AS product_count
       FROM categories c
       LEFT JOIN products p ON p.category_id = c.id AND p.is_active = true
       GROUP BY c.id
       ORDER BY c.name ASC`
    );

    res.status(200).json({
      success: true,
      count: result.rows.length,
      data: result.rows
    });

  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching categories'
    });
  }
};

// ================================================
// FUNCTION 2: GET SINGLE CATEGORY
// Route: GET /api/categories/:id
// ================================================
const getCategory = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'SELECT * FROM categories WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    res.status(200).json({
      success: true,
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Get category error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// ================================================
// FUNCTION 3: CREATE CATEGORY
// Route: POST /api/categories
// ================================================
const createCategory = async (req, res) => {
  try {
    const { name, description } = req.body;

    // Validate required fields
    if (!name || name.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Category name is required'
      });
    }

    // Check if category already exists
    const existing = await pool.query(
      'SELECT id FROM categories WHERE LOWER(name) = LOWER($1)',
      [name.trim()]
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Category with this name already exists'
      });
    }

    // Insert into database
    const result = await pool.query(
      `INSERT INTO categories (name, description)
       VALUES ($1, $2)
       RETURNING *`,
      [name.trim(), description || null]
    );

    res.status(201).json({
      success: true,
      message: 'Category created successfully!',
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Create category error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating category'
    });
  }
};

// ================================================
// FUNCTION 4: UPDATE CATEGORY
// Route: PUT /api/categories/:id
// ================================================
const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, is_active } = req.body;

    // Check if category exists
    const existing = await pool.query(
      'SELECT * FROM categories WHERE id = $1',
      [id]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    // Check if new name conflicts with another category
    if (name) {
      const nameConflict = await pool.query(
        'SELECT id FROM categories WHERE LOWER(name) = LOWER($1) AND id != $2',
        [name.trim(), id]
      );

      if (nameConflict.rows.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Another category with this name already exists'
        });
      }
    }

    // Update the category
    const result = await pool.query(
      `UPDATE categories 
       SET 
         name = COALESCE($1, name),
         description = COALESCE($2, description),
         is_active = COALESCE($3, is_active),
         updated_at = NOW()
       WHERE id = $4
       RETURNING *`,
      [
        name ? name.trim() : null,
        description,
        is_active,
        id
      ]
    );

    res.status(200).json({
      success: true,
      message: 'Category updated successfully!',
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Update category error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating category'
    });
  }
};

// ================================================
// FUNCTION 5: DELETE CATEGORY
// Route: DELETE /api/categories/:id
// ================================================
const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if category exists
    const existing = await pool.query(
      'SELECT * FROM categories WHERE id = $1',
      [id]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    // Check if any products use this category
    const productsUsing = await pool.query(
      'SELECT COUNT(*) FROM products WHERE category_id = $1 AND is_active = true',
      [id]
    );

    if (parseInt(productsUsing.rows[0].count) > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete. ${productsUsing.rows[0].count} products are using this category.`
      });
    }

    // Safe to delete
    await pool.query('DELETE FROM categories WHERE id = $1', [id]);

    res.status(200).json({
      success: true,
      message: 'Category deleted successfully!'
    });

  } catch (error) {
    console.error('Delete category error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting category'
    });
  }
};

module.exports = {
  getCategories,
  getCategory,
  createCategory,
  updateCategory,
  deleteCategory
};