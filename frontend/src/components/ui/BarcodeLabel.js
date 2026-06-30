// BarcodeLabel.js
// Generates and displays barcode labels using JsBarcode
// Can be used inline or printed

import React, { useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';

// ================================================
// SINGLE BARCODE LABEL
// ================================================
const BarcodeLabel = ({
  productCode,
  productName,
  price,
  showPrice = true,
  width     = 2,
  height    = 60,
}) => {
  const svgRef = useRef(null);

  useEffect(() => {
    if (svgRef.current && productCode) {
      try {
        JsBarcode(svgRef.current, productCode, {
          format:      'CODE128',
          width:       width,
          height:      height,
          displayValue: true,
          fontSize:    12,
          margin:      8,
          background:  '#ffffff',
          lineColor:   '#000000',
          textMargin:  4,
        });
      } catch (error) {
        console.error('Barcode generation error:', error);
      }
    }
  }, [productCode, width, height]);

  if (!productCode) return null;

  return (
    <div className="barcode-label border border-gray-300 rounded-lg 
                    p-3 inline-block bg-white text-center"
         style={{ minWidth: '180px' }}>

      {/* Product Name */}
      <p className="text-xs font-bold text-gray-900 mb-1 truncate"
         style={{ maxWidth: '160px' }}>
        {productName}
      </p>

      {/* Barcode SVG */}
      <svg ref={svgRef} />

      {/* Price */}
      {showPrice && price && (
        <p className="text-sm font-bold text-blue-600 mt-1">
          Rs. {parseFloat(price).toFixed(2)}
        </p>
      )}

    </div>
  );
};

export default BarcodeLabel;