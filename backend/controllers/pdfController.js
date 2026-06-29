// pdfController.js — Professional PDF Invoice Generator

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

    // ── Setup PDF ────────────────────────────────
    const doc = new PDFDocument({
      size:        'A4',
      margin:      0,
      autoFirstPage: true,
      bufferPages: true,
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `inline; filename="Invoice-${invoice.invoice_number}.pdf"`
    );
    doc.pipe(res);

    // ── Constants ────────────────────────────────
    const C = {
      primary:   '#1a56db',
      dark:      '#111827',
      gray:      '#6b7280',
      lightgray: '#f9fafb',
      bordergray:'#e5e7eb',
      green:     '#15803d',
      white:     '#ffffff',
      margin:    40,
      pageW:     595.28,
      pageH:     841.89,
    };

    const contentW = C.pageW - C.margin * 2;

    // ── HELPER FUNCTIONS ─────────────────────────

    // Draw filled rectangle
    const fillRect = (x, y, w, h, color) => {
      doc.rect(x, y, w, h).fill(color);
    };

    // Draw text at exact position
    const drawText = (text, x, y, options = {}) => {
      doc.fontSize(options.size || 9)
         .font(options.bold ? 'Helvetica-Bold' : 'Helvetica')
         .fillColor(options.color || C.dark)
         .text(String(text), x, y, {
           width:     options.width  || undefined,
           align:     options.align  || 'left',
           lineBreak: options.wrap   || false,
         });
    };

    // Draw horizontal line
    const drawLine = (x1, y1, x2, color = C.bordergray, width = 0.5) => {
      doc.moveTo(x1, y1)
         .lineTo(x2, y1)
         .strokeColor(color)
         .lineWidth(width)
         .stroke();
    };

    // Format amount
    const fmt = (n) => 'Rs. ' + parseFloat(n || 0).toFixed(2);

    // ── SECTION 1: HEADER ────────────────────────
    fillRect(0, 0, C.pageW, 115, C.primary);

    // Store name
    drawText('HARDWARE STORE', C.margin, 22, {
      size: 24, bold: true, color: C.white
    });

    // Store details — left column
    const storeLines = [
      'Complete Hardware & Electrical Solutions',
      '123 Main Road, Your City - 400001',
      'Phone: +91 98765 43210',
      'Email: info@hardwarestore.com',
      'GSTIN: 27AAPFU0939F1ZV',
    ];
    storeLines.forEach((line, i) => {
      drawText(line, C.margin, 52 + i * 12, {
        size: 8, color: '#bfdbfe'
      });
    });

    // INVOICE + number — right column
    drawText('INVOICE', C.pageW - C.margin - 160, 25, {
      size: 26, bold: true, color: C.white,
      width: 160, align: 'right'
    });

    drawText(invoice.invoice_number, C.pageW - C.margin - 160, 58, {
      size: 10, color: '#bfdbfe',
      width: 160, align: 'right'
    });

    const invoiceDate = new Date(invoice.created_at)
      .toLocaleDateString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric'
      });

    drawText(invoiceDate, C.pageW - C.margin - 160, 74, {
      size: 9, color: '#bfdbfe',
      width: 160, align: 'right'
    });

    // ── SECTION 2: BILL TO + INVOICE META ────────
    const boxY  = 125;
    const boxH  = 85;
    const halfW = (contentW - 10) / 2;

    // Left box — Bill To
    fillRect(C.margin, boxY, halfW, boxH, C.lightgray);

    drawText('BILL TO', C.margin + 12, boxY + 10, {
      size: 7.5, bold: true, color: C.gray
    });

    drawText(
      invoice.customer_name || 'Walk-in Customer',
      C.margin + 12, boxY + 24,
      { size: 11, bold: true, color: C.dark }
    );

    if (invoice.customer_phone) {
      drawText(
        'Phone: ' + invoice.customer_phone,
        C.margin + 12, boxY + 42,
        { size: 8.5, color: C.gray }
      );
    }

    if (invoice.customer_gstin) {
      drawText(
        'GSTIN: ' + invoice.customer_gstin,
        C.margin + 12, boxY + (invoice.customer_phone ? 56 : 42),
        { size: 8.5, color: C.gray }
      );
    }

    // Right box — Invoice Meta
    const rightBoxX = C.margin + halfW + 10;
    fillRect(rightBoxX, boxY, halfW, boxH, C.lightgray);

    const metaRows = [
      { label: 'Invoice No.',  value: invoice.invoice_number },
      { label: 'Date',         value: invoiceDate },
      { label: 'Payment',      value: (invoice.payment_method || 'CASH').toUpperCase() },
      { label: 'Status',       value: 'PAID', green: true },
    ];

    metaRows.forEach((row, i) => {
      const ry = boxY + 12 + i * 17;
      drawText(row.label + ':', rightBoxX + 12, ry, {
        size: 8.5, bold: true, color: C.gray
      });
      drawText(row.value, rightBoxX + 95, ry, {
        size: 8.5,
        color: row.green ? C.green : C.dark,
        bold:  row.green || false,
      });
    });

    // ── SECTION 3: ITEMS TABLE ───────────────────
    const tY    = boxY + boxH + 18; // Table starts here
    const tHead = 22;               // Header row height
    const tRow  = 22;               // Data row height

    // Define columns: x = start position, w = width
    const COL = {
      no:    { x: C.margin,       w: 25,  label: '#',       align: 'center' },
      name:  { x: C.margin + 25,  w: 170, label: 'PRODUCT', align: 'left'   },
      sku:   { x: C.margin + 195, w: 75,  label: 'SKU',     align: 'left'   },
      qty:   { x: C.margin + 270, w: 35,  label: 'QTY',     align: 'center' },
      price: { x: C.margin + 305, w: 65,  label: 'PRICE',   align: 'right'  },
      gst:   { x: C.margin + 370, w: 60,  label: 'GST',     align: 'center' },
      total: { x: C.margin + 430, w: 75,  label: 'TOTAL',   align: 'right'  },
    };

    // Table header background
    fillRect(C.margin, tY, contentW, tHead, C.primary);

    // Table header labels
    Object.values(COL).forEach(col => {
      drawText(col.label, col.x + 4, tY + 7, {
        size: 7.5, bold: true, color: C.white,
        width: col.w - 8, align: col.align
      });
    });

    // Table rows
    let rowY = tY + tHead;
    let currentPage = 1;

    items.forEach((item, i) => {
      // Auto page break — if near bottom, add new page
      if (rowY > C.pageH - 180) {
        doc.addPage({ size: 'A4', margin: 0 });
        rowY = 40;
        currentPage++;

        // Redraw table header on new page
        fillRect(C.margin, rowY, contentW, tHead, C.primary);
        Object.values(COL).forEach(col => {
          drawText(col.label, col.x + 4, rowY + 7, {
            size: 7.5, bold: true, color: C.white,
            width: col.w - 8, align: col.align
          });
        });
        rowY += tHead;
      }

      // Row background (alternating)
      fillRect(
        C.margin, rowY, contentW, tRow,
        i % 2 === 0 ? C.lightgray : C.white
      );

      // Row data
      const td = (text, col, opts = {}) => {
        drawText(text, col.x + 4, rowY + 7, {
          size:  8,
          width: col.w - 8,
          align: col.align,
          ...opts
        });
      };

      const pName = item.product_name.length > 24
        ? item.product_name.substring(0, 24) + '..'
        : item.product_name;

      td(String(i + 1),                             COL.no);
      td(pName,                                     COL.name);
      td(item.sku || '-',                           COL.sku,   { size: 7.5, color: C.gray });
      td(String(item.quantity),                     COL.qty);
      td('Rs.' + parseFloat(item.unit_price).toFixed(2), COL.price);
      td(item.gst_rate + '%',                       COL.gst);
      td('Rs.' + parseFloat(item.total_price).toFixed(2), COL.total, { bold: true });

      // Bottom border
      drawLine(C.margin, rowY + tRow, C.margin + contentW);

      rowY += tRow;
    });

    // ── SECTION 4: TOTALS ────────────────────────
    rowY += 10;

    // Check page break for totals
    if (rowY > C.pageH - 160) {
      doc.addPage({ size: 'A4', margin: 0 });
      rowY = 40;
    }

    const totalsX = C.margin + contentW - 200; // Right aligned block
    const totalsW = 200;
    const labelW  = 100;
    const valueW  = 95;
    const totalsLineH = 20;

    const drawTotalLine = (label, value, bold = false, color = C.dark, bg = null) => {
      if (bg) fillRect(totalsX, rowY, totalsW, totalsLineH + 4, bg);

      drawText(label, totalsX + 8, rowY + (bg ? 6 : 4), {
        size:  9,
        bold,
        color: C.gray,
        width: labelW
      });

      drawText(value, totalsX + labelW, rowY + (bg ? 6 : 4), {
        size:  9,
        bold,
        color,
        width: valueW,
        align: 'right'
      });

      rowY += bg ? totalsLineH + 8 : totalsLineH;
    };

    // Divider above totals
    drawLine(totalsX, rowY, totalsX + totalsW, C.primary, 1);
    rowY += 8;

    drawTotalLine('Subtotal:', fmt(invoice.subtotal));
    drawTotalLine('Total GST:', fmt(invoice.total_gst));

    if (parseFloat(invoice.discount) > 0) {
      drawTotalLine(
        'Discount:',
        '- ' + fmt(invoice.discount),
        false, C.green
      );
    }

    // Divider before grand total
    drawLine(totalsX, rowY, totalsX + totalsW, C.bordergray, 0.5);
    rowY += 6;

    // Grand total box
    drawTotalLine(
      'GRAND TOTAL:',
      fmt(invoice.total_amount),
      true, C.white, C.primary
    );

    // ── SECTION 5: FOOTER ────────────────────────
    rowY += 20;

    // Check page break for footer
    if (rowY > C.pageH - 100) {
      doc.addPage({ size: 'A4', margin: 0 });
      rowY = 40;
    }

    // Thank you
    drawText('Thank you for your business!', C.margin, rowY, {
      size: 12, bold: true, color: C.primary,
      width: contentW, align: 'center'
    });

    rowY += 18;

    drawText(
      'This is a computer generated invoice and does not require a signature.',
      C.margin, rowY,
      { size: 8, color: C.gray, width: contentW, align: 'center' }
    );

    rowY += 20;

    // Terms box
    fillRect(C.margin, rowY, contentW, 55, C.lightgray);

    drawText('Terms & Conditions:', C.margin + 12, rowY + 10, {
      size: 8.5, bold: true, color: C.dark
    });

    const terms = [
      '1. Goods once sold will not be taken back.',
      '2. All disputes are subject to local jurisdiction only.',
      '3. E. & O.E.',
    ];

    terms.forEach((t, i) => {
      drawText(t, C.margin + 12, rowY + 24 + i * 10, {
        size: 8, color: C.gray
      });
    });

    // ── Page numbers ─────────────────────────────
    const pages = doc.bufferedPageRange();
    for (let p = 0; p < pages.count; p++) {
      doc.switchToPage(p);
      drawText(
        `Page ${p + 1} of ${pages.count}`,
        C.margin, C.pageH - 20,
        { size: 7.5, color: C.gray, width: contentW, align: 'right' }
      );
    }

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