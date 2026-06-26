// pdfController.js
// Generates professional PDF invoices — FIXED VERSION

const PDFDocument = require('pdfkit');
const pool        = require('../config/db');

const generateInvoicePDF = async (req, res) => {
  try {
    const { id } = req.params;

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

    // ── Create PDF ───────────────────────────────
    const doc = new PDFDocument({
      size:    'A4',
      margins: { top: 50, bottom: 50, left: 50, right: 50 }
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `inline; filename="Invoice-${invoice.invoice_number}.pdf"`
    );
    doc.pipe(res);

    // ── COLORS ───────────────────────────────────
    const PRIMARY   = '#2563eb';
    const DARK      = '#1f2937';
    const GRAY      = '#6b7280';
    const LIGHTGRAY = '#f3f4f6';
    const GREEN     = '#16a34a';
    const WHITE     = '#ffffff';

    const pageW = doc.page.width;
    const pageH = doc.page.height;

    // ── HEADER BACKGROUND ────────────────────────
    doc.rect(0, 0, pageW, 130).fill(PRIMARY);

    // Store Name — NO emoji, clean text
    doc.fontSize(22)
       .font('Helvetica-Bold')
       .fillColor(WHITE)
       .text('HARDWARE STORE', 50, 28);

    // Store tagline
    doc.fontSize(9)
       .font('Helvetica')
       .fillColor(WHITE)
       .text('Complete Hardware & Electrical Solutions', 50, 56)
       .text('123 Main Road, Your City - 400001', 50, 70)
       .text('Phone: +91 98765 43219  |  Email: infy@hardwarestore.com', 50, 84)
       .text('GSTIN: 37AAPFU0939F1ZV', 50, 98);

    // INVOICE label — right side
    doc.fontSize(30)
       .font('Helvetica-Bold')
       .fillColor(WHITE)
       .text('INVOICE', 350, 28, { width: 195, align: 'right' });

    doc.fontSize(10)
       .font('Helvetica')
       .fillColor(WHITE)
       .text(invoice.invoice_number, 350, 68, { width: 195, align: 'right' });

    // ── BILL TO + INVOICE INFO BOX ───────────────
    doc.rect(50, 145, pageW - 100, 90).fill(LIGHTGRAY);

    // Left — Customer
    doc.fontSize(8)
       .font('Helvetica-Bold')
       .fillColor(GRAY)
       .text('BILL TO:', 65, 158);

    doc.fontSize(12)
       .font('Helvetica-Bold')
       .fillColor(DARK)
       .text(invoice.customer_name || 'Walk-in Customer', 65, 173);

    if (invoice.customer_phone) {
      doc.fontSize(9)
         .font('Helvetica')
         .fillColor(GRAY)
         .text('Phone: ' + invoice.customer_phone, 65, 191);
    }

    if (invoice.customer_gstin) {
      doc.fontSize(9)
         .font('Helvetica')
         .fillColor(GRAY)
         .text('GSTIN: ' + invoice.customer_gstin, 65,
           invoice.customer_phone ? 205 : 191);
    }

    // Right — Invoice Details
    const rx = 360;

    doc.fontSize(9)
       .font('Helvetica-Bold')
       .fillColor(GRAY)
       .text('INVOICE DATE:',    rx, 158)
       .text('PAYMENT METHOD:',  rx, 175)
       .text('STATUS:',          rx, 192);

    const invoiceDate = new Date(invoice.created_at)
      .toLocaleDateString('en-IN', {
        day: '2-digit', month: 'long', year: 'numeric'
      });

    doc.fontSize(9)
       .font('Helvetica')
       .fillColor(DARK)
       .text(invoiceDate,
             rx + 110, 158, { width: 80 })
       .text((invoice.payment_method || 'CASH').toUpperCase(),
             rx + 110, 175, { width: 80 });

    doc.fontSize(9)
       .font('Helvetica-Bold')
       .fillColor(GREEN)
       .text('PAID', rx + 110, 192, { width: 80 });

    // ── ITEMS TABLE HEADER ───────────────────────
    const tableTop = 252;

    doc.rect(50, tableTop, pageW - 100, 24).fill(PRIMARY);

    // Column positions
    const cols = {
      no:    { x: 55,  w: 28  },
      name:  { x: 83,  w: 185 },
      sku:   { x: 268, w: 75  },
      qty:   { x: 343, w: 38  },
      price: { x: 381, w: 65  },
      gst:   { x: 446, w: 75  },
      total: { x: 521, w: 74  },
    };

    doc.fontSize(8)
       .font('Helvetica-Bold')
       .fillColor(WHITE);

    doc.text('#',       cols.no.x,    tableTop + 8, { width: cols.no.w    });
    doc.text('PRODUCT', cols.name.x,  tableTop + 8, { width: cols.name.w  });
    doc.text('SKU',     cols.sku.x,   tableTop + 8, { width: cols.sku.w   });
    doc.text('QTY',     cols.qty.x,   tableTop + 8, { width: cols.qty.w   });
    doc.text('PRICE',   cols.price.x, tableTop + 8, { width: cols.price.w });
    doc.text('GST',     cols.gst.x,   tableTop + 8, { width: cols.gst.w   });
    doc.text('TOTAL',   cols.total.x, tableTop + 8, {
      width: cols.total.w, align: 'right'
    });

    // ── TABLE ROWS ───────────────────────────────
    let y = tableTop + 24;

    items.forEach((item, i) => {
      const rowH = 24;

      // Alternating background
      if (i % 2 === 0) {
        doc.rect(50, y, pageW - 100, rowH).fill('#f9fafb');
      }

      doc.fontSize(8)
         .font('Helvetica')
         .fillColor(DARK);

      // Row number
      doc.text(String(i + 1), cols.no.x, y + 7, { width: cols.no.w });

      // Product name — truncate if too long
      const pName = item.product_name.length > 26
        ? item.product_name.substring(0, 26) + '..'
        : item.product_name;
      doc.text(pName, cols.name.x, y + 7, { width: cols.name.w });

      // SKU
      doc.text(item.sku || '-', cols.sku.x, y + 7, { width: cols.sku.w });

      // Quantity
      doc.text(String(item.quantity), cols.qty.x, y + 7, {
        width: cols.qty.w
      });

      // Unit price — use Rs. instead of rupee symbol
      doc.text(
        'Rs.' + parseFloat(item.unit_price).toFixed(2),
        cols.price.x, y + 7,
        { width: cols.price.w }
      );

      // GST
      doc.text(
        item.gst_rate + '% (Rs.' + parseFloat(item.gst_amount).toFixed(2) + ')',
        cols.gst.x, y + 7,
        { width: cols.gst.w }
      );

      // Total — bold
      doc.font('Helvetica-Bold')
         .text(
           'Rs.' + parseFloat(item.total_price).toFixed(2),
           cols.total.x, y + 7,
           { width: cols.total.w, align: 'right' }
         );

      // Row bottom border
      doc.moveTo(50, y + rowH)
         .lineTo(pageW - 50, y + rowH)
         .strokeColor('#e5e7eb')
         .lineWidth(0.5)
         .stroke();

      y += rowH;
    });

    // ── TOTALS ───────────────────────────────────
    y += 12;

    const tX = 380;
    const tW = pageW - 50 - tX;
    const lW = 90;
    const vW = tW - lW;

    // Helper to draw a total row
    const drawTotalRow = (label, value, bold = false, color = DARK) => {
      doc.fontSize(9)
         .font(bold ? 'Helvetica-Bold' : 'Helvetica')
         .fillColor(GRAY)
         .text(label, tX, y, { width: lW });

      doc.font(bold ? 'Helvetica-Bold' : 'Helvetica')
         .fillColor(color)
         .text(value, tX + lW, y, { width: vW, align: 'right' });

      y += 18;
    };

    drawTotalRow(
      'Subtotal:',
      'Rs.' + parseFloat(invoice.subtotal).toFixed(2)
    );

    drawTotalRow(
      'Total GST:',
      'Rs.' + parseFloat(invoice.total_gst).toFixed(2)
    );

    if (parseFloat(invoice.discount) > 0) {
      drawTotalRow(
        'Discount:',
        '- Rs.' + parseFloat(invoice.discount).toFixed(2),
        false, GREEN
      );
    }

    // Divider
    doc.moveTo(tX, y)
       .lineTo(pageW - 50, y)
       .strokeColor(PRIMARY)
       .lineWidth(1)
       .stroke();
    y += 6;

    // Grand total box
    doc.rect(tX, y, tW, 30).fill(PRIMARY);

    doc.fontSize(13)
       .font('Helvetica-Bold')
       .fillColor(WHITE)
       .text('TOTAL:', tX + 6, y + 9, { width: lW });

    doc.fontSize(13)
       .font('Helvetica-Bold')
       .fillColor(WHITE)
       .text(
         'Rs.' + parseFloat(invoice.total_amount).toFixed(2),
         tX + lW, y + 9,
         { width: vW - 6, align: 'right' }
       );

    y += 50;

    // ── FOOTER ───────────────────────────────────
    doc.fontSize(12)
       .font('Helvetica-Bold')
       .fillColor(PRIMARY)
       .text('Thank you for your business!', 50, y, {
         align: 'center',
         width: pageW - 100
       });

    y += 20;

    doc.fontSize(8)
       .font('Helvetica')
       .fillColor(GRAY)
       .text(
         'This is a computer generated invoice and does not require a signature.',
         50, y,
         { align: 'center', width: pageW - 100 }
       );

    y += 25;

    // Terms box
    doc.rect(50, y, pageW - 100, 50).fill(LIGHTGRAY);

    doc.fontSize(8.5)
       .font('Helvetica-Bold')
       .fillColor(DARK)
       .text('Terms & Conditions:', 62, y + 8);

    doc.fontSize(8)
       .font('Helvetica')
       .fillColor(GRAY)
       .text(
         '1. Goods once sold will not be taken back.\n' +
         '2. All disputes subject to local jurisdiction only.\n' +
         '3. E. & O.E.',
         62, y + 22
       );

    doc.end();

  } catch (error) {
    console.error('PDF generation error:', error);
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: 'Failed to generate PDF: ' + error.message
      });
    }
  }
};

module.exports = { generateInvoicePDF };