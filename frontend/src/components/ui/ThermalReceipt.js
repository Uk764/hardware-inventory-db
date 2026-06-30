// ThermalReceipt.js
// Renders a thermal-printer-friendly receipt using a React Portal
// so it's completely isolated from the rest of the page during print

import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';

const formatCurrency = (amount) =>
  parseFloat(amount || 0).toFixed(2);

const ThermalReceipt = ({ invoice, width = '80mm' }) => {

  // ── All hooks must run unconditionally, every render ──
  useEffect(() => {
    if (!invoice) return; // safe to bail inside the effect itself

    const styleId = 'thermal-receipt-page-size';
    let styleTag = document.getElementById(styleId);

    if (!styleTag) {
      styleTag = document.createElement('style');
      styleTag.id = styleId;
      document.head.appendChild(styleTag);
    }

    styleTag.textContent = `
      @media print {
        @page {
          size: ${width} auto;
          margin: 0;
        }
      }
    `;

    return () => {
      const tag = document.getElementById(styleId);
      if (tag) tag.remove();
    };
  }, [width, invoice]);

  // ── Early return AFTER all hooks ──
  if (!invoice) return null;

  const items = invoice.items || [];

  const invoiceDate = new Date(invoice.created_at).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric'
  });
  const invoiceTime = new Date(invoice.created_at).toLocaleTimeString('en-IN', {
    hour: '2-digit', minute: '2-digit'
  });

  const content = (
    <div
      id="thermal-receipt"
      style={{
        width:      width,
        fontFamily: "'Courier New', monospace",
        fontSize:   width === '58mm' ? '10px' : '11px',
        color:      '#000',
        padding:    '4mm',
        background: '#fff',
      }}
    >
      {/* Store Header */}
      <div style={{ textAlign: 'center', marginBottom: '6px' }}>
        <p style={{ fontWeight: 'bold', fontSize: width === '58mm' ? '13px' : '15px' }}>
          HARDWARE STORE
        </p>
        <p style={{ fontSize: '9px', margin: '2px 0' }}>
          123 Main Road, Your City - 400001
        </p>
        <p style={{ fontSize: '9px', margin: '2px 0' }}>
          Ph: +91 98765 43210
        </p>
        <p style={{ fontSize: '9px', margin: '2px 0' }}>
          GSTIN: 27AAPFU0939F1ZV
        </p>
      </div>

      <div style={{ borderTop: '1px dashed #000', margin: '4px 0' }} />

      {/* Invoice Meta */}
      <div style={{ fontSize: '9px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>Invoice:</span>
          <span style={{ fontWeight: 'bold' }}>{invoice.invoice_number}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>Date:</span>
          <span>{invoiceDate} {invoiceTime}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>Customer:</span>
          <span>{invoice.customer_name || 'Walk-in'}</span>
        </div>
        {invoice.customer_phone && (
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Phone:</span>
            <span>{invoice.customer_phone}</span>
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>Payment:</span>
          <span>{(invoice.payment_method || 'cash').toUpperCase()}</span>
        </div>
      </div>

      <div style={{ borderTop: '1px dashed #000', margin: '4px 0' }} />

      {/* Items Header */}
      <div style={{
        display: 'flex', justifyContent: 'space-between',
        fontWeight: 'bold', fontSize: '9px', marginBottom: '2px'
      }}>
        <span style={{ flex: 2 }}>Item</span>
        <span style={{ flex: 1, textAlign: 'center' }}>Qty</span>
        <span style={{ flex: 1, textAlign: 'right' }}>Amt</span>
      </div>

      <div style={{ borderTop: '1px dashed #000', margin: '2px 0' }} />

      {/* Items */}
      {items.map((item, i) => (
        <div key={i} style={{ marginBottom: '4px' }}>
          <p style={{ fontSize: '9px', fontWeight: 'bold' }}>
            {item.product_name}
          </p>
          <div style={{
            display: 'flex', justifyContent: 'space-between', fontSize: '9px'
          }}>
            <span>
              {formatCurrency(item.unit_price)} x {item.quantity}
              {' '}(GST {item.gst_rate}%)
            </span>
            <span style={{ fontWeight: 'bold' }}>
              {formatCurrency(item.total_price)}
            </span>
          </div>
        </div>
      ))}

      <div style={{ borderTop: '1px dashed #000', margin: '4px 0' }} />

      {/* Totals */}
      <div style={{ fontSize: '10px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>Subtotal:</span>
          <span>Rs. {formatCurrency(invoice.subtotal)}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>GST:</span>
          <span>Rs. {formatCurrency(invoice.total_gst)}</span>
        </div>
        {parseFloat(invoice.discount) > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Discount:</span>
            <span>- Rs. {formatCurrency(invoice.discount)}</span>
          </div>
        )}
      </div>

      <div style={{ borderTop: '1px dashed #000', margin: '4px 0' }} />

      <div style={{
        display: 'flex', justifyContent: 'space-between',
        fontWeight: 'bold', fontSize: width === '58mm' ? '12px' : '14px'
      }}>
        <span>TOTAL:</span>
        <span>Rs. {formatCurrency(invoice.total_amount)}</span>
      </div>

      <div style={{ borderTop: '1px dashed #000', margin: '6px 0' }} />

      {/* Footer */}
      <div style={{ textAlign: 'center', fontSize: '9px', marginTop: '6px' }}>
        <p>Thank you for shopping with us!</p>
        <p style={{ marginTop: '4px' }}>** This is a computer generated receipt **</p>
      </div>

    </div>
  );

  return createPortal(content, document.body);
};

export default ThermalReceipt;