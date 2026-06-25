// billingController.js
// Handles all billing and invoice operations

const pool = require('../config/db');

// ================================================
// HELPER: Generate Invoice Number
// Example: INV-2024-00001
// ================================================
const generateInvoiceNumber = async () => {
  const year = new Date().getFullYear();
  const count = await pool.query(
    'SELECT COUNT(*) FROM invoices'
  );
  const number = String(parseInt(count.rows[0].count) + 1).padStart(5, '0');
  return `INV-${year}-${number}`;
};

// ================================================
// FUNCTION 1: CREATE INVOICE
// Route: POST /api/billing/invoice
// This is the main billing function
// It creates the invoice AND reduces stock
// ================================================
const createInvoice = async (req, res) => {
  // Use a database transaction
  // Transaction = all steps must succeed or all are cancelled
  // If stock update fails, invoice is also cancelled
  const client = await pool.connect();

  try {
    await client.query('BEGIN'); // Start transaction

    const {
      customer_name,
      customer_phone,
      customer_gstin,
      items,           // Array of cart items
      payment_method,
      discount = 0
    } = req.body;

    // Validate items
    if (!items || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No items in the invoice'
      });
    }

    // ── Step 1: Calculate totals ─────────────────
    let subtotal  = 0;
    let total_gst = 0;

    // Validate each item and calculate amounts
    const processedItems = [];

    for (const item of items) {
      // Get latest product details from database
      const productResult = await client.query(
        'SELECT * FROM products WHERE id = $1 AND is_active = true',
        [item.product_id]
      );

      if (productResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          success: false,
          message: `Product ID ${item.product_id} not found`
        });
      }

      const product = productResult.rows[0];

      // Check if enough stock available
      if (product.current_stock < item.quantity) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for "${product.name}". Available: ${product.current_stock}`
        });
      }

      // Calculate GST amount for this item
      const unitPrice  = parseFloat(product.selling_price);
      const gstRate    = parseFloat(product.gst_rate);
      const itemTotal  = unitPrice * item.quantity;
      const gstAmount  = (itemTotal * gstRate) / 100;

      subtotal  += itemTotal;
      total_gst += gstAmount;

      processedItems.push({
        product_id:   product.id,
        product_name: product.name,
        sku:          product.sku,
        quantity:     item.quantity,
        unit_price:   unitPrice,
        gst_rate:     gstRate,
        gst_amount:   gstAmount,
        total_price:  itemTotal + gstAmount,
      });
    }

    // Calculate final total
    const discountAmount = parseFloat(discount) || 0;
    const total_amount   = subtotal + total_gst - discountAmount;

    // ── Step 2: Generate Invoice Number ──────────
    const invoice_number = await generateInvoiceNumber();

    // ── Step 3: Insert Invoice ───────────────────
    const invoiceResult = await client.query(
      `INSERT INTO invoices (
        invoice_number, customer_name, customer_phone,
        customer_gstin, subtotal, total_gst,
        discount, total_amount, payment_method,
        payment_status, created_by
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
      RETURNING *`,
      [
        invoice_number,
        customer_name  || 'Walk-in Customer',
        customer_phone || null,
        customer_gstin || null,
        subtotal.toFixed(2),
        total_gst.toFixed(2),
        discountAmount.toFixed(2),
        total_amount.toFixed(2),
        payment_method || 'cash',
        'paid',
        req.user.id
      ]
    );

    const invoice = invoiceResult.rows[0];

    // ── Step 4: Insert Invoice Items ─────────────
    for (const item of processedItems) {
      await client.query(
        `INSERT INTO invoice_items (
          invoice_id, product_id, product_name, sku,
          quantity, unit_price, gst_rate,
          gst_amount, total_price
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [
          invoice.id,
          item.product_id,
          item.product_name,
          item.sku,
          item.quantity,
          item.unit_price,
          item.gst_rate,
          item.gst_amount.toFixed(2),
          item.total_price.toFixed(2),
        ]
      );

      // ── Step 5: Reduce Stock ─────────────────
      await client.query(
        `UPDATE products 
         SET current_stock = current_stock - $1,
             updated_at = NOW()
         WHERE id = $2`,
        [item.quantity, item.product_id]
      );

      // ── Step 6: Record Stock Movement ────────
      await client.query(
        `INSERT INTO stock_movements
          (product_id, movement_type, quantity, reference_id, notes, created_by)
         VALUES ($1, 'sale', $2, $3, 'Sale', $4)`,
        [item.product_id, -item.quantity, invoice.id, req.user.id]
      );
    }

    // All steps succeeded — commit transaction
    await client.query('COMMIT');

    // Return complete invoice with items
    const fullInvoice = await pool.query(
      `SELECT i.*,
              json_agg(ii.*) AS items
       FROM invoices i
       LEFT JOIN invoice_items ii ON ii.invoice_id = i.id
       WHERE i.id = $1
       GROUP BY i.id`,
      [invoice.id]
    );

    res.status(201).json({
      success: true,
      message: 'Invoice created successfully!',
      data: fullInvoice.rows[0]
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Create invoice error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating invoice'
    });
  } finally {
    client.release();
  }
};

// ================================================
// FUNCTION 2: GET ALL INVOICES
// Route: GET /api/billing/invoices
// ================================================
const getInvoices = async (req, res) => {
  try {
    const { page = 1, limit = 20, search } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let whereClause = '';
    const params    = [];

    if (search) {
      whereClause = `WHERE i.invoice_number ILIKE $1 
                     OR i.customer_name ILIKE $1
                     OR i.customer_phone ILIKE $1`;
      params.push(`%${search}%`);
    }

    const result = await pool.query(
      `SELECT i.*,
              u.name AS created_by_name
       FROM invoices i
       LEFT JOIN users u ON u.id = i.created_by
       ${whereClause}
       ORDER BY i.created_at DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, parseInt(limit), offset]
    );

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM invoices i ${whereClause}`,
      params
    );

    res.status(200).json({
      success: true,
      data: result.rows,
      pagination: {
        currentPage:   parseInt(page),
        totalPages:    Math.ceil(parseInt(countResult.rows[0].count) / parseInt(limit)),
        totalInvoices: parseInt(countResult.rows[0].count),
      }
    });

  } catch (error) {
    console.error('Get invoices error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ================================================
// FUNCTION 3: GET SINGLE INVOICE WITH ITEMS
// Route: GET /api/billing/invoice/:id
// ================================================
const getInvoice = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT i.*,
              u.name AS created_by_name,
              json_agg(
                json_build_object(
                  'id',           ii.id,
                  'product_id',   ii.product_id,
                  'product_name', ii.product_name,
                  'sku',          ii.sku,
                  'quantity',     ii.quantity,
                  'unit_price',   ii.unit_price,
                  'gst_rate',     ii.gst_rate,
                  'gst_amount',   ii.gst_amount,
                  'total_price',  ii.total_price
                )
              ) AS items
       FROM invoices i
       LEFT JOIN invoice_items ii ON ii.invoice_id = i.id
       LEFT JOIN users u ON u.id = i.created_by
       WHERE i.id = $1
       GROUP BY i.id, u.name`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }

    res.status(200).json({
      success: true,
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Get invoice error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ================================================
// FUNCTION 4: GET TODAY'S SALES SUMMARY
// Route: GET /api/billing/today
// ================================================
const getTodaySummary = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT 
        COUNT(*)                    AS total_invoices,
        COALESCE(SUM(total_amount), 0) AS total_revenue,
        COALESCE(SUM(total_gst), 0)    AS total_gst,
        COALESCE(SUM(discount), 0)     AS total_discount
       FROM invoices
       WHERE DATE(created_at) = CURRENT_DATE`
    );

    res.status(200).json({
      success: true,
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Today summary error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = {
  createInvoice,
  getInvoices,
  getInvoice,
  getTodaySummary
};