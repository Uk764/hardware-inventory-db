// productController.js
// Handles all product operations
// Add, Edit, Delete, Search, Bulk Import, Low Stock Alerts

const pool = require('../config/db');

// ================================================
// HELPER FUNCTION: Generate SKU automatically
// Example output: HW-ELE-00123
// ================================================
const generateSKU = async (categoryId) => {
  try {
    let prefix = 'HW';

    if (categoryId) {
      const cat = await pool.query(
        'SELECT name FROM categories WHERE id = $1',
        [categoryId]
      );
      if (cat.rows.length > 0) {
        // Take first 3 letters of category name
        prefix = cat.rows[0].name.substring(0, 3).toUpperCase();
      }
    }

    // Get count of products to generate unique number
    const count = await pool.query('SELECT COUNT(*) FROM products');
    const number = String(parseInt(count.rows[0].count) + 1).padStart(5, '0');

    return `${prefix}-${number}`;
  } catch (error) {
    // Fallback SKU using timestamp
    return `HW-${Date.now()}`;
  }
};

// ================================================
// FUNCTION 1: GET ALL PRODUCTS (with pagination,
// search, and filtering)
// Route: GET /api/products
// ================================================
const getProducts = async (req, res) => {
  try {
    // Extract query parameters
    // Example: /api/products?page=1&limit=20&search=hammer&category=1
    const {
      page = 1,
      limit = 20,
      search,
      category_id,
      supplier_id,
      low_stock,
      is_active = true
    } = req.query;

    // Calculate offset for pagination
    // Page 1 = offset 0, Page 2 = offset 20, etc.
    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Build the WHERE conditions dynamically
    const conditions = ['p.is_active = $1'];
    const params = [is_active === 'false' ? false : true];
    let paramCount = 1;

    // Search filter — searches name, SKU, and barcode
    if (search) {
      paramCount++;
      conditions.push(
        `(p.name ILIKE $${paramCount} OR 
          p.sku ILIKE $${paramCount} OR 
          p.barcode ILIKE $${paramCount})`
      );
      params.push(`%${search}%`);
    }

    // Category filter
    if (category_id) {
      paramCount++;
      conditions.push(`p.category_id = $${paramCount}`);
      params.push(parseInt(category_id));
    }

    // Supplier filter
    if (supplier_id) {
      paramCount++;
      conditions.push(`p.supplier_id = $${paramCount}`);
      params.push(parseInt(supplier_id));
    }

    // Low stock filter
    if (low_stock === 'true') {
      conditions.push(`p.current_stock <= p.minimum_stock`);
    }

    const whereClause = conditions.join(' AND ');

    // Main query to get products
    const productsQuery = await pool.query(
      `SELECT 
        p.id,
        p.sku,
        p.barcode,
        p.name,
        p.description,
        p.category_id,
        c.name AS category_name,
        p.supplier_id,
        s.name AS supplier_name,
        p.cost_price,
        p.selling_price,
        p.mrp,
        p.gst_rate,
        p.hsn_code,
        p.current_stock,
        p.minimum_stock,
        p.unit,
        p.is_active,
        p.created_at,
        CASE 
          WHEN p.current_stock <= 0 THEN 'out_of_stock'
          WHEN p.current_stock <= p.minimum_stock THEN 'low_stock'
          ELSE 'in_stock'
        END AS stock_status
       FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
       LEFT JOIN suppliers s ON s.id = p.supplier_id
       WHERE ${whereClause}
       ORDER BY p.created_at DESC
       LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`,
      [...params, parseInt(limit), offset]
    );

    // Count total products for pagination
    const countQuery = await pool.query(
      `SELECT COUNT(*) FROM products p WHERE ${whereClause}`,
      params
    );

    const totalProducts = parseInt(countQuery.rows[0].count);
    const totalPages = Math.ceil(totalProducts / parseInt(limit));

    res.status(200).json({
      success: true,
      data: productsQuery.rows,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalProducts,
        limit: parseInt(limit),
        hasNextPage: parseInt(page) < totalPages,
        hasPrevPage: parseInt(page) > 1
      }
    });

  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching products'
    });
  }
};

// ================================================
// FUNCTION 2: GET SINGLE PRODUCT
// Route: GET /api/products/:id
// ================================================
const getProduct = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT 
        p.*,
        c.name AS category_name,
        s.name AS supplier_name,
        s.phone AS supplier_phone
       FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
       LEFT JOIN suppliers s ON s.id = p.supplier_id
       WHERE p.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    res.status(200).json({
      success: true,
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// ================================================
// FUNCTION 3: GET PRODUCT BY BARCODE
// Route: GET /api/products/barcode/:barcode
// Used by the POS billing system scanner
// ================================================
const getProductByBarcode = async (req, res) => {
  try {
    const { barcode } = req.params;

    const result = await pool.query(
      `SELECT 
        p.*,
        c.name AS category_name
       FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
       WHERE p.barcode = $1 AND p.is_active = true`,
      [barcode]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Product not found with this barcode'
      });
    }

    res.status(200).json({
      success: true,
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Get by barcode error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// ================================================
// FUNCTION 4: CREATE PRODUCT
// Route: POST /api/products
// ================================================
const createProduct = async (req, res) => {
  try {
    const {
      name,
      description,
      category_id,
      supplier_id,
      cost_price,
      selling_price,
      mrp,
      gst_rate,
      hsn_code,
      current_stock,
      minimum_stock,
      unit,
      barcode
    } = req.body;

    // Validate required fields
    if (!name || name.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Product name is required'
      });
    }

    if (!selling_price || selling_price <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Selling price is required and must be greater than 0'
      });
    }

    // Check for duplicate barcode
    if (barcode) {
      const barcodeExists = await pool.query(
        'SELECT id FROM products WHERE barcode = $1',
        [barcode]
      );
      if (barcodeExists.rows.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'A product with this barcode already exists'
        });
      }
    }

    // Auto-generate SKU
    const sku = await generateSKU(category_id);

    // Insert product into database
    const result = await pool.query(
      `INSERT INTO products (
        sku, barcode, name, description,
        category_id, supplier_id,
        cost_price, selling_price, mrp,
        gst_rate, hsn_code,
        current_stock, minimum_stock, unit
      ) VALUES (
        $1, $2, $3, $4, $5, $6,
        $7, $8, $9, $10, $11,
        $12, $13, $14
      ) RETURNING *`,
      [
        sku,
        barcode || null,
        name.trim(),
        description || null,
        category_id || null,
        supplier_id || null,
        cost_price || 0,
        selling_price,
        mrp || selling_price,
        gst_rate || 18.00,
        hsn_code || null,
        current_stock || 0,
        minimum_stock || 10,
        unit || 'piece'
      ]
    );

    const newProduct = result.rows[0];

    // Record initial stock movement if stock > 0
    if (current_stock && current_stock > 0) {
      await pool.query(
        `INSERT INTO stock_movements 
          (product_id, movement_type, quantity, notes, created_by)
         VALUES ($1, 'purchase', $2, 'Initial stock entry', $3)`,
        [newProduct.id, current_stock, req.user.id]
      );
    }

    res.status(201).json({
      success: true,
      message: 'Product created successfully!',
      data: newProduct
    });

  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating product'
    });
  }
};

// ================================================
// FUNCTION 5: UPDATE PRODUCT (FIXED)
// Route: PUT /api/products/:id
// ================================================
const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name, description, category_id, supplier_id,
      cost_price, selling_price, mrp,
      gst_rate, hsn_code,
      minimum_stock, unit, barcode, is_active
    } = req.body;

    // Check product exists
    const existing = await pool.query(
      'SELECT * FROM products WHERE id = $1', [id]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    const current = existing.rows[0];

    // Check barcode conflict
    if (barcode && barcode !== current.barcode) {
      const conflict = await pool.query(
        'SELECT id FROM products WHERE barcode = $1 AND id != $2',
        [barcode, id]
      );
      if (conflict.rows.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Another product with this barcode already exists'
        });
      }
    }

    // Use existing values as fallback if new value not provided
    const result = await pool.query(
      `UPDATE products SET
        name          = $1,
        description   = $2,
        category_id   = $3,
        supplier_id   = $4,
        cost_price    = $5,
        selling_price = $6,
        mrp           = $7,
        gst_rate      = $8,
        hsn_code      = $9,
        minimum_stock = $10,
        unit          = $11,
        barcode       = $12,
        is_active     = $13,
        updated_at    = NOW()
       WHERE id = $14
       RETURNING *`,
      [
        name                || current.name,
        description         !== undefined ? description       : current.description,
        category_id !== undefined && category_id !== '' ? parseInt(category_id) : current.category_id,
        supplier_id !== undefined && supplier_id !== '' ? parseInt(supplier_id) : current.supplier_id,
        cost_price  !== undefined && cost_price  !== '' ? parseFloat(cost_price)  : current.cost_price,
        selling_price !== undefined && selling_price !== '' ? parseFloat(selling_price) : current.selling_price,
        mrp         !== undefined && mrp         !== '' ? parseFloat(mrp)         : current.mrp,
        gst_rate    !== undefined && gst_rate    !== '' ? parseFloat(gst_rate)    : current.gst_rate,
        hsn_code    !== undefined && hsn_code    !== '' ? hsn_code                : current.hsn_code,
        minimum_stock !== undefined && minimum_stock !== '' ? parseInt(minimum_stock) : current.minimum_stock,
        unit                || current.unit,
        barcode     !== undefined && barcode     !== '' ? barcode                 : current.barcode,
        is_active   !== undefined                       ? is_active               : current.is_active,
        id
      ]
    );

    res.status(200).json({
      success: true,
      message: 'Product updated successfully!',
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Update product error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Server error while updating product: ' + error.message
    });
  }
};

// ================================================
// FUNCTION 6: DELETE PRODUCT (soft delete)
// Route: DELETE /api/products/:id
// We don't actually delete — just mark as inactive
// This protects historical invoice data
// ================================================
const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await pool.query(
      'SELECT * FROM products WHERE id = $1',
      [id]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Soft delete — just mark as inactive
    await pool.query(
      'UPDATE products SET is_active = false, updated_at = NOW() WHERE id = $1',
      [id]
    );

    res.status(200).json({
      success: true,
      message: 'Product deleted successfully!'
    });

  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting product'
    });
  }
};

// ================================================
// FUNCTION 7: UPDATE STOCK
// Route: PUT /api/products/:id/stock
// Used when receiving new stock from supplier
// ================================================
const updateStock = async (req, res) => {
  try {
    const { id } = req.params;
    const { quantity, movement_type, notes } = req.body;

    if (!quantity || quantity === 0) {
      return res.status(400).json({
        success: false,
        message: 'Quantity is required and cannot be zero'
      });
    }

    // Check product exists
    const product = await pool.query(
      'SELECT * FROM products WHERE id = $1 AND is_active = true',
      [id]
    );

    if (product.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    const currentStock = product.rows[0].current_stock;
    const newStock = currentStock + parseInt(quantity);

    if (newStock < 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot reduce stock below 0. Current stock: ${currentStock}`
      });
    }

    // Update stock in products table
    await pool.query(
      'UPDATE products SET current_stock = $1, updated_at = NOW() WHERE id = $2',
      [newStock, id]
    );

    // Record the movement
    await pool.query(
      `INSERT INTO stock_movements 
        (product_id, movement_type, quantity, notes, created_by)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        id,
        movement_type || 'purchase',
        parseInt(quantity),
        notes || null,
        req.user.id
      ]
    );

    res.status(200).json({
      success: true,
      message: 'Stock updated successfully!',
      data: {
        product_id: id,
        previous_stock: currentStock,
        quantity_added: parseInt(quantity),
        new_stock: newStock
      }
    });

  } catch (error) {
    console.error('Update stock error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating stock'
    });
  }
};

// ================================================
// FUNCTION 8: GET LOW STOCK PRODUCTS
// Route: GET /api/products/alerts/low-stock
// ================================================
const getLowStockProducts = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT 
        p.id, p.sku, p.name,
        p.current_stock, p.minimum_stock,
        p.unit,
        c.name AS category_name,
        s.name AS supplier_name,
        s.phone AS supplier_phone,
        CASE 
          WHEN p.current_stock <= 0 THEN 'out_of_stock'
          ELSE 'low_stock'
        END AS alert_type
       FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
       LEFT JOIN suppliers s ON s.id = p.supplier_id
       WHERE p.is_active = true 
         AND p.current_stock <= p.minimum_stock
       ORDER BY p.current_stock ASC`
    );

    res.status(200).json({
      success: true,
      count: result.rows.length,
      data: result.rows
    });

  } catch (error) {
    console.error('Low stock error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// ================================================
// FUNCTION 9: BULK IMPORT FROM EXCEL
// Route: POST /api/products/bulk-import
// ================================================
const bulkImport = async (req, res) => {
  try {
    const xlsx = require('xlsx');

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please upload an Excel file'
      });
    }

    // Read the uploaded Excel file
    const workbook = xlsx.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const rows = xlsx.utils.sheet_to_json(worksheet);

    if (rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Excel file is empty'
      });
    }

    const results = {
      success: 0,
      failed: 0,
      errors: []
    };

    // Process each row
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNumber = i + 2; // +2 because row 1 is header

      try {
        // Validate required fields
        if (!row.name || !row.selling_price) {
          results.failed++;
          results.errors.push(
            `Row ${rowNumber}: name and selling_price are required`
          );
          continue;
        }

        // Find category by name if provided
        let categoryId = null;
        if (row.category) {
          const cat = await pool.query(
            'SELECT id FROM categories WHERE LOWER(name) = LOWER($1)',
            [row.category]
          );
          if (cat.rows.length > 0) categoryId = cat.rows[0].id;
        }

        // Generate SKU
        const sku = await generateSKU(categoryId);

        // Insert the product
        await pool.query(
          `INSERT INTO products (
            sku, name, description, category_id,
            cost_price, selling_price, mrp,
            gst_rate, hsn_code,
            current_stock, minimum_stock, unit, barcode
          ) VALUES (
            $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13
          ) ON CONFLICT (sku) DO NOTHING`,
          [
            sku,
            row.name,
            row.description || null,
            categoryId,
            row.cost_price || 0,
            row.selling_price,
            row.mrp || row.selling_price,
            row.gst_rate || 18,
            row.hsn_code || null,
            row.current_stock || 0,
            row.minimum_stock || 10,
            row.unit || 'piece',
            row.barcode || null
          ]
        );

        results.success++;

      } catch (rowError) {
        results.failed++;
        results.errors.push(`Row ${rowNumber}: ${rowError.message}`);
      }
    }

    // Clean up uploaded file
    const fs = require('fs');
    fs.unlinkSync(req.file.path);

    res.status(200).json({
      success: true,
      message: `Import complete! ${results.success} products imported, ${results.failed} failed.`,
      results
    });

  } catch (error) {
    console.error('Bulk import error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during bulk import'
    });
  }
};

module.exports = {
  getProducts,
  getProduct,
  getProductByBarcode,
  createProduct,
  updateProduct,
  deleteProduct,
  updateStock,
  getLowStockProducts,
  bulkImport
};