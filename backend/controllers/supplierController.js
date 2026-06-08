// supplierController.js
// Handles all supplier operations
// Suppliers = companies you buy products from

const pool = require('../config/db');

// ================================================
// FUNCTION 1: GET ALL SUPPLIERS
// Route: GET /api/suppliers
// ================================================
const getSuppliers = async (req, res) => {
  try {
    // Support search by name
    const { search } = req.query;

    let query = `
      SELECT 
        s.id, s.name, s.contact_person,
        s.phone, s.email, s.address,
        s.gstin, s.is_active, s.created_at,
        COUNT(p.id) AS product_count
      FROM suppliers s
      LEFT JOIN products p ON p.supplier_id = s.id AND p.is_active = true
    `;

    const params = [];

    if (search) {
      query += ` WHERE s.name ILIKE $1 OR s.contact_person ILIKE $1`;
      params.push(`%${search}%`);
    }

    query += ` GROUP BY s.id ORDER BY s.name ASC`;

    const result = await pool.query(query, params);

    res.status(200).json({
      success: true,
      count: result.rows.length,
      data: result.rows
    });

  } catch (error) {
    console.error('Get suppliers error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching suppliers'
    });
  }
};

// ================================================
// FUNCTION 2: GET SINGLE SUPPLIER
// Route: GET /api/suppliers/:id
// ================================================
const getSupplier = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'SELECT * FROM suppliers WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Supplier not found'
      });
    }

    res.status(200).json({
      success: true,
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Get supplier error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// ================================================
// FUNCTION 3: CREATE SUPPLIER
// Route: POST /api/suppliers
// ================================================
const createSupplier = async (req, res) => {
  try {
    const {
      name, contact_person, phone,
      email, address, gstin
    } = req.body;

    // Validate required field
    if (!name || name.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Supplier name is required'
      });
    }

    // Check for duplicate name
    const existing = await pool.query(
      'SELECT id FROM suppliers WHERE LOWER(name) = LOWER($1)',
      [name.trim()]
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Supplier with this name already exists'
      });
    }

    const result = await pool.query(
      `INSERT INTO suppliers 
        (name, contact_person, phone, email, address, gstin)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        name.trim(),
        contact_person || null,
        phone || null,
        email || null,
        address || null,
        gstin || null
      ]
    );

    res.status(201).json({
      success: true,
      message: 'Supplier created successfully!',
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Create supplier error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating supplier'
    });
  }
};

// ================================================
// FUNCTION 4: UPDATE SUPPLIER
// Route: PUT /api/suppliers/:id
// ================================================
const updateSupplier = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name, contact_person, phone,
      email, address, gstin, is_active
    } = req.body;

    // Check if supplier exists
    const existing = await pool.query(
      'SELECT * FROM suppliers WHERE id = $1',
      [id]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Supplier not found'
      });
    }

    const result = await pool.query(
      `UPDATE suppliers SET
        name           = COALESCE($1, name),
        contact_person = COALESCE($2, contact_person),
        phone          = COALESCE($3, phone),
        email          = COALESCE($4, email),
        address        = COALESCE($5, address),
        gstin          = COALESCE($6, gstin),
        is_active      = COALESCE($7, is_active),
        updated_at     = NOW()
       WHERE id = $8
       RETURNING *`,
      [
        name ? name.trim() : null,
        contact_person,
        phone,
        email,
        address,
        gstin,
        is_active,
        id
      ]
    );

    res.status(200).json({
      success: true,
      message: 'Supplier updated successfully!',
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Update supplier error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating supplier'
    });
  }
};

// ================================================
// FUNCTION 5: DELETE SUPPLIER
// Route: DELETE /api/suppliers/:id
// ================================================
const deleteSupplier = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if supplier exists
    const existing = await pool.query(
      'SELECT * FROM suppliers WHERE id = $1',
      [id]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Supplier not found'
      });
    }

    // Check if products are linked to this supplier
    const productsUsing = await pool.query(
      'SELECT COUNT(*) FROM products WHERE supplier_id = $1 AND is_active = true',
      [id]
    );

    if (parseInt(productsUsing.rows[0].count) > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete. ${productsUsing.rows[0].count} products are linked to this supplier.`
      });
    }

    await pool.query('DELETE FROM suppliers WHERE id = $1', [id]);

    res.status(200).json({
      success: true,
      message: 'Supplier deleted successfully!'
    });

  } catch (error) {
    console.error('Delete supplier error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting supplier'
    });
  }
};

module.exports = {
  getSuppliers,
  getSupplier,
  createSupplier,
  updateSupplier,
  deleteSupplier
};