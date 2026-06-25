// pdfController.js
// Generates professional PDF invoices
// Uses PDFKit library

const PDFDocument = require('pdfkit');
const pool        = require('../config/db');

// ================================================
// GENERATE PDF INVOICE
// Route: GET /api/billing/invoice/:id/pdf
// ================================================
const generateInvoicePDF = async (req, res) => {
  try {
    const { id } = req.params;

    // ── Fetch invoice with items ─────────────────
    const invoiceResult = await pool.query(
      `SELECT i.*,
              u.name AS created_by_name,
              json_agg(
                json_build_object(
                  'id',           ii.id,
                  'product_name', ii.product_name,
                  'sku',          ii.sku,
                  'quantity',     ii.quantity,
                  'unit_price',   ii.unit_price,
                  'gst_rate',     ii.gst_rate,
                  'gst_amount',   ii.gst_amount,
                  'total_price',  ii.total_price
                ) ORDER BY ii.id
              ) AS items
       FROM invoices i
       LEFT JOIN invoice_items ii ON ii.invoice_id = i.id
       LEFT JOIN users u ON u.id = i.created_by
       WHERE i.id = $1
       GROUP BY i.id, u.name`,
      [id]
    );

    if (invoiceResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }

    const invoice = invoiceResult.rows[0];
    const items   = invoice.items || [];

    // ── Create PDF Document ──────────────────────
    const doc = new PDFDocument({
      size:    'A4',
      margins: { top: 50, bottom: 50, left: 50, right: 50 }
    });

    // Set response headers so browser downloads/shows PDF
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `inline; filename="Invoice-${invoice.invoice_number}.pdf"`
    );

    // Pipe PDF to response
    doc.pipe(res);

    // ── COLORS ──────────────────────────────────
    const PRIMARY   = '#2563eb'; // Blue
    const DARK      = '#1f2937'; // Dark gray
    const GRAY      = '#6b7280'; // Medium gray
    const LIGHTGRAY = '#f3f4f6'; // Light gray
    const GREEN     = '#16a34a'; // Green

    // ── HEADER SECTION ───────────────────────────
    // Blue header background
    doc.rect(0, 0, doc.page.width, 120)
       .fill(PRIMARY);

    // Store Name
    doc.fontSize(24)
       .font('Helvetica-Bold')
       .fillColor('white')
       .text('🏪 HARDWARE STORE', 50, 30);

    // Store Details
    doc.fontSize(9)
       .font('Helvetica')
       .fillColor('white')
       .text('Complete Hardware & Electrical Solutions', 50, 60)
       .text('📍 123 Main Road, Your City - 400001', 50, 75)
       .text('📞 +91 98765 43210  |  📧 info@hardwarestore.com', 50, 90)
       .text('GSTIN: 27AAPFU0939F1ZV', 50, 105);

    // INVOICE label on right
    doc.fontSize(28)
       .font('Helvetica-Bold')
       .fillColor('white')
       .text('INVOICE', 400, 35, { align: 'right', width: 145 });

    doc.fontSize(10)
       .font('Helvetica')
       .fillColor('white')
       .text(invoice.invoice_number, 400, 70, { align: 'right', width: 145 });

    // ── INVOICE INFO BOX ─────────────────────────
    doc.rect(50, 135, doc.page.width - 100, 80)
       .fill(LIGHTGRAY);

    // Left side - Customer info
    doc.fontSize(9)
       .font('Helvetica-Bold')
       .fillColor(GRAY)
       .text('BILL TO:', 65, 148);

    doc.fontSize(11)
       .font('Helvetica-Bold')
       .fillColor(DARK)
       .text(invoice.customer_name || 'Walk-in Customer', 65, 162);

    if (invoice.customer_phone) {
      doc.fontSize(9)
         .font('Helvetica')
         .fillColor(GRAY)
         .text(`📞 ${invoice.customer_phone}`, 65, 178);
    }

    if (invoice.customer_gstin) {
      doc.fontSize(9)
         .font('Helvetica')
         .fillColor(GRAY)
         .text(`GSTIN: ${invoice.customer_gstin}`, 65, 192);
    }

    // Right side - Invoice details
    const rightCol = 380;

    doc.fontSize(9)
       .font('Helvetica-Bold')
       .fillColor(GRAY)
       .text('INVOICE DATE:', rightCol, 148)
       .text('PAYMENT METHOD:', rightCol, 165)
       .text('STATUS:', rightCol, 182);

    doc.fontSize(9)
       .font('Helvetica')
       .fillColor(DARK)
       .text(
         new Date(invoice.created_at).toLocaleDateString('en-IN', {
           day: '2-digit', month: 'long', year: 'numeric'
         }),
         rightCol + 100, 148
       )
       .text(
         (invoice.payment_method || 'cash').toUpperCase(),
         rightCol + 100, 165
       );

    doc.fontSize(9)
       .font('Helvetica-Bold')
       .fillColor(GREEN)
       .text('PAID ✓', rightCol + 100, 182);

    // ── ITEMS TABLE ───────────────────────────────
    const tableTop  = 235;
    const colWidths = {
      no:    30,
      name:  195,
      sku:   70,
      qty:   40,
      price: 70,
      gst:   55,
      total: 75,
    };

    // Table header background
    doc.rect(50, tableTop, doc.page.width - 100, 22)
       .fill(PRIMARY);

    // Table header text
    doc.fontSize(8)
       .font('Helvetica-Bold')
       .fillColor('white');

    let xPos = 55;
    doc.text('#',           xPos, tableTop + 7, { width: colWidths.no });
    xPos += colWidths.no;
    doc.text('PRODUCT',     xPos, tableTop + 7, { width: colWidths.name });
    xPos += colWidths.name;
    doc.text('SKU',         xPos, tableTop + 7, { width: colWidths.sku });
    xPos += colWidths.sku;
    doc.text('QTY',         xPos, tableTop + 7, { width: colWidths.qty });
    xPos += colWidths.qty;
    doc.text('PRICE',       xPos, tableTop + 7, { width: colWidths.price });
    xPos += colWidths.price;
    doc.text('GST',         xPos, tableTop + 7, { width: colWidths.gst });
    xPos += colWidths.gst;
    doc.text('TOTAL',       xPos, tableTop + 7, { width: colWidths.total, align: 'right' });

    // Table rows
    let yPos = tableTop + 22;

    items.forEach((item, index) => {
      // Alternating row colors
      if (index % 2 === 0) {
        doc.rect(50, yPos, doc.page.width - 100, 22)
           .fill('#f9fafb');
      }

      doc.fontSize(8)
         .font('Helvetica')
         .fillColor(DARK);

      xPos = 55;
      doc.text(String(index + 1), xPos, yPos + 7, { width: colWidths.no });
      xPos += colWidths.no;

      // Product name (truncate if too long)
      const productName = item.product_name.length > 28
        ? item.product_name.substring(0, 28) + '...'
        : item.product_name;
      doc.text(productName, xPos, yPos + 7, { width: colWidths.name });
      xPos += colWidths.name;

      doc.text(item.sku || '—', xPos, yPos + 7, { width: colWidths.sku });
      xPos += colWidths.sku;

      doc.text(String(item.quantity), xPos, yPos + 7, { width: colWidths.qty });
      xPos += colWidths.qty;

      doc.text(
        `₹${parseFloat(item.unit_price).toFixed(2)}`,
        xPos, yPos + 7, { width: colWidths.price }
      );
      xPos += colWidths.price;

      doc.text(
        `${item.gst_rate}% (₹${parseFloat(item.gst_amount).toFixed(2)})`,
        xPos, yPos + 7, { width: colWidths.gst }
      );
      xPos += colWidths.gst;

      doc.font('Helvetica-Bold')
         .text(
           `₹${parseFloat(item.total_price).toFixed(2)}`,
           xPos, yPos + 7, { width: colWidths.total, align: 'right' }
         );

      // Bottom border for each row
      doc.moveTo(50, yPos + 22)
         .lineTo(doc.page.width - 50, yPos + 22)
         .stroke('#e5e7eb');

      yPos += 22;
    });

    // ── TOTALS SECTION ───────────────────────────
    yPos += 10;
    const totalsX = 380;
    const totalsW = doc.page.width - 50 - totalsX;

    // Subtotal
    doc.fontSize(9)
       .font('Helvetica')
       .fillColor(GRAY)
       .text('Subtotal:', totalsX, yPos, { width: 80 })
       .font('Helvetica')
       .fillColor(DARK)
       .text(
         `₹${parseFloat(invoice.subtotal).toFixed(2)}`,
         totalsX + 80, yPos,
         { width: totalsW - 80, align: 'right' }
       );

    yPos += 18;

    // GST
    doc.fontSize(9)
       .font('Helvetica')
       .fillColor(GRAY)
       .text('Total GST:', totalsX, yPos, { width: 80 })
       .fillColor(DARK)
       .text(
         `₹${parseFloat(invoice.total_gst).toFixed(2)}`,
         totalsX + 80, yPos,
         { width: totalsW - 80, align: 'right' }
       );

    yPos += 18;

    // Discount
    if (parseFloat(invoice.discount) > 0) {
      doc.fontSize(9)
         .font('Helvetica')
         .fillColor(GREEN)
         .text('Discount:', totalsX, yPos, { width: 80 })
         .text(
           `- ₹${parseFloat(invoice.discount).toFixed(2)}`,
           totalsX + 80, yPos,
           { width: totalsW - 80, align: 'right' }
         );
      yPos += 18;
    }

    // Divider line
    doc.moveTo(totalsX, yPos)
       .lineTo(doc.page.width - 50, yPos)
       .stroke(PRIMARY);

    yPos += 8;

    // Grand Total
    doc.rect(totalsX, yPos, totalsW, 28)
       .fill(PRIMARY);

    doc.fontSize(12)
       .font('Helvetica-Bold')
       .fillColor('white')
       .text('TOTAL:', totalsX + 5, yPos + 8, { width: 80 })
       .text(
         `₹${parseFloat(invoice.total_amount).toFixed(2)}`,
         totalsX + 80, yPos + 8,
         { width: totalsW - 85, align: 'right' }
       );

    yPos += 48;

    // ── FOOTER ───────────────────────────────────
    // Thank you note
    doc.fontSize(11)
       .font('Helvetica-Bold')
       .fillColor(PRIMARY)
       .text('Thank you for your business!', 50, yPos, {
         align: 'center',
         width: doc.page.width - 100
       });

    yPos += 18;

    doc.fontSize(8)
       .font('Helvetica')
       .fillColor(GRAY)
       .text(
         'This is a computer generated invoice and does not require a signature.',
         50, yPos,
         { align: 'center', width: doc.page.width - 100 }
       );

    yPos += 25;

    // Terms box
    doc.rect(50, yPos, doc.page.width - 100, 45)
       .fill(LIGHTGRAY);

    doc.fontSize(8)
       .font('Helvetica-Bold')
       .fillColor(DARK)
       .text('Terms & Conditions:', 60, yPos + 8);

    doc.fontSize(7.5)
       .font('Helvetica')
       .fillColor(GRAY)
       .text(
         '1. Goods once sold will not be taken back.\n' +
         '2. All disputes subject to local jurisdiction only.\n' +
         '3. E. & O.E.',
         60, yPos + 20
       );

    // Finalize PDF
    doc.end();

  } catch (error) {
    console.error('PDF generation error:', error);
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: 'Failed to generate PDF'
      });
    }
  }
};

module.exports = { generateInvoicePDF };