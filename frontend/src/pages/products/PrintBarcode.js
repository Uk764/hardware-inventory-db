// PrintBarcode.js
// Page to print barcode labels for products
// Supports printing single or multiple labels

import React, { useState, useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';
import api from '../../services/api';
import toast from 'react-hot-toast';
import SearchBar from '../../components/ui/SearchBar';
import {
  FiPrinter, FiPlus, FiMinus,
  FiTrash2, FiSearch, FiPackage
} from 'react-icons/fi';

// ================================================
// SINGLE BARCODE DISPLAY
// ================================================
const BarcodeDisplay = ({ product, copies, onChangeCopies, onRemove }) => {
  const svgRef = useRef(null);

  useEffect(() => {
    if (svgRef.current && product.product_code) {
      try {
        JsBarcode(svgRef.current, product.product_code, {
          format:       'CODE128',
          width:        2,
          height:       55,
          displayValue: true,
          fontSize:     11,
          margin:       6,
          background:   '#ffffff',
          lineColor:    '#000000',
          textMargin:   3,
        });
      } catch (err) {
        console.error('Barcode error:', err);
      }
    }
  }, [product.product_code]);

  return (
    <div className="card flex items-center gap-4">

      {/* Barcode Preview */}
      <div className="border border-gray-200 rounded-lg p-3 
                      bg-white text-center flex-shrink-0">
        <p className="text-xs font-bold text-gray-800 mb-1 truncate"
           style={{ maxWidth: '150px' }}>
          {product.name}
        </p>
        <svg ref={svgRef} />
        <p className="text-xs font-semibold text-blue-600 mt-1">
          Rs. {parseFloat(product.selling_price).toFixed(2)}
        </p>
      </div>

      {/* Product Info */}
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-gray-900 truncate">
          {product.name}
        </p>
        <p className="text-sm text-gray-500">
          Code: <span className="font-mono font-bold text-blue-600">
            {product.product_code}
          </span>
        </p>
        <p className="text-sm text-gray-500">SKU: {product.sku}</p>
        <p className="text-sm text-gray-500">
          Stock: {product.current_stock} {product.unit}
        </p>
      </div>

      {/* Copies Control */}
 <div className="flex items-center gap-2">
          <button
            onClick={() => onChangeCopies(Math.max(1, copies - 1))}
            className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200
                       flex items-center justify-center transition-colors"
          >
            <FiMinus className="text-sm" />
          </button>
          <input
            type="number"
            min="1"
            className="w-14 text-center font-bold text-lg border 
                       border-gray-300 rounded-lg py-1"
            value={copies}
            onChange={(e) => {
              const val = parseInt(e.target.value);
              onChangeCopies(val > 0 ? val : 1);
            }}
          />
          <button
            onClick={() => onChangeCopies(copies + 1)}
            className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200
                       flex items-center justify-center transition-colors"
          >
            <FiPlus className="text-sm" />
          </button>
        </div>

      {/* Remove */}
      <button
        onClick={onRemove}
        className="p-2 text-red-500 hover:bg-red-50 
                   rounded-lg transition-colors"
      >
        <FiTrash2 />
      </button>

    </div>
  );
};

// ================================================
// PRINT PREVIEW COMPONENT
// Uses CSS Grid so the browser automatically flows
// labels across as many printed pages as needed
// ================================================
const PrintPreview = ({ items }) => {
  // Flatten items with copies into one long list
  const labels = [];
  items.forEach(item => {
    for (let i = 0; i < item.copies; i++) {
      labels.push(item.product);
    }
  });

  return (
    <div id="print-area" className="hidden">
      <style>{`
        @media print {
          @page {
            size: A4;
            margin: 10mm;
          }
          body * {
            visibility: hidden;
          }
          #print-area, #print-area * {
            visibility: visible;
          }
          #print-area {
            display: block !important;
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
          }
          .print-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 6mm;
          }
          .print-label {
            border: 1px solid #999;
            border-radius: 4px;
            padding: 6px;
            text-align: center;
            break-inside: avoid;
            page-break-inside: avoid;
          }
        }
      `}</style>

      <div className="print-grid">
        {labels.map((product, i) => (
          <PrintLabel key={i} product={product} />
        ))}
      </div>
    </div>
  );
};

// ── Individual print label with its own barcode ──
const PrintLabel = ({ product }) => {
  const svgRef = useRef(null);

  useEffect(() => {
    if (svgRef.current && product.product_code) {
      JsBarcode(svgRef.current, product.product_code, {
        format:       'CODE128',
        width:        1.6,
        height:       40,
        displayValue: true,
        fontSize:     9,
        margin:       3,
        background:   '#ffffff',
        lineColor:    '#000000',
      });
    }
  }, [product.product_code]);

  return (
    <div className="print-label">
      <p style={{
        fontSize: '9px', fontWeight: 'bold',
        marginBottom: '2px',
        overflow: 'hidden', whiteSpace: 'nowrap',
        textOverflow: 'ellipsis'
      }}>
        {product.name}
      </p>
      <svg ref={svgRef} />
      <p style={{
        fontSize: '10px', fontWeight: 'bold', color: '#1a56db',
        marginTop: '2px'
      }}>
        Rs. {parseFloat(product.selling_price).toFixed(2)}
      </p>
    </div>
  );
};

// ================================================
// MAIN PRINT BARCODE PAGE
// ================================================
const PrintBarcode = () => {
  const [search, setSearch]         = useState('');
  const [results, setResults]       = useState([]);
  const [searching, setSearching]   = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [printItems, setPrintItems] = useState([]);
  const searchTimeout               = useRef(null);

  // Search products
  const searchProducts = async (query) => {
    if (!query.trim()) {
      setResults([]);
      setShowResults(false);
      return;
    }
    setSearching(true);
    try {
      const res = await api.get(
        `/products?search=${encodeURIComponent(query)}&limit=8`
      );
      setResults(res.data.data || []);
      setShowResults(true);
    } catch {
      toast.error('Search failed');
    } finally {
      setSearching(false);
    }
  };

  const handleSearchChange = (val) => {
    setSearch(val);
    clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => searchProducts(val), 400);
  };

  // Add product to print list
  const addProduct = (product) => {
    if (!product.product_code) {
      toast.error('This product has no barcode code. Please edit and save it first.');
      return;
    }

    const exists = printItems.find(
      item => item.product.id === product.id
    );

    if (exists) {
      toast('Product already in list. Increase copies instead.');
      return;
    }

    setPrintItems(prev => [...prev, { product, copies: 1 }]);
    setSearch('');
    setShowResults(false);
    toast.success(`${product.name} added!`);
  };

  // Update copies
  const updateCopies = (productId, copies) => {
    setPrintItems(prev =>
      prev.map(item =>
        item.product.id === productId
          ? { ...item, copies }
          : item
      )
    );
  };

  // Remove from list
  const removeProduct = (productId) => {
    setPrintItems(prev =>
      prev.filter(item => item.product.id !== productId)
    );
  };

  // Print
  const handlePrint = () => {
    if (printItems.length === 0) {
      toast.error('Add at least one product to print');
      return;
    }

    const totalLabels = printItems.reduce(
      (sum, item) => sum + item.copies, 0
    );

    toast.success(`Printing ${totalLabels} labels...`);
    setTimeout(() => window.print(), 500);
  };

  const totalLabels = printItems.reduce(
    (sum, item) => sum + item.copies, 0
  );

  return (
    <div>

      {/* Print Preview (hidden, shown on print) */}
      <PrintPreview items={printItems} />

      {/* Page Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Print Barcodes
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Search products and print barcode labels
          </p>
        </div>
        {printItems.length > 0 && (
          <button
            onClick={handlePrint}
            className="btn-primary"
          >
            <FiPrinter />
            Print {totalLabels} Label{totalLabels !== 1 ? 's' : ''}
          </button>
        )}
      </div>

      {/* Search Box */}
      <div className="card mb-6">
        <label className="input-label text-base font-semibold mb-3 block">
          Search Product to Add
        </label>
        <div className="relative">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2
                                text-gray-400 text-lg" />
          <input
            type="text"
            className="input-field pl-10"
            placeholder="Type product name or SKU..."
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
          />
        </div>

        {/* Search Results */}
        {showResults && (
          <div className="mt-2 border border-gray-200 rounded-xl
                          overflow-hidden shadow-lg">
            {searching ? (
              <div className="p-4 text-center">
                <div className="animate-spin rounded-full h-6 w-6
                                border-b-2 border-blue-600 mx-auto" />
              </div>
            ) : results.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                No products found
              </div>
            ) : (
              results.map(product => (
                <button
                  key={product.id}
                  onClick={() => addProduct(product)}
                  className="w-full flex items-center justify-between
                             p-3 hover:bg-blue-50 transition-colors
                             border-b border-gray-100 last:border-0
                             text-left"
                >
                  <div>
                    <p className="font-medium text-gray-900 text-sm">
                      {product.name}
                    </p>
                    <p className="text-xs text-gray-400">
                      {product.sku}
                      {product.product_code && (
                        <span className="ml-2 font-mono text-blue-500">
                          {product.product_code}
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-blue-600">
                      Rs. {parseFloat(product.selling_price).toFixed(2)}
                    </p>
                    {!product.product_code && (
                      <span className="text-xs text-red-400">
                        No code
                      </span>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {/* Print List */}
      {printItems.length === 0 ? (
        <div className="card text-center py-16">
          <FiPackage className="text-5xl text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 font-medium">
            No products added yet
          </p>
          <p className="text-gray-400 text-sm mt-1">
            Search and add products above to print their barcodes
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-gray-600 text-sm">
              {printItems.length} product{printItems.length !== 1 ? 's' : ''},
              {' '}{totalLabels} label{totalLabels !== 1 ? 's' : ''} total
            </p>
            <button
              onClick={() => setPrintItems([])}
              className="text-sm text-red-500 hover:text-red-700"
            >
              Clear All
            </button>
          </div>

          {printItems.map(item => (
            <BarcodeDisplay
              key={item.product.id}
              product={item.product}
              copies={item.copies}
              onChangeCopies={(c) => updateCopies(item.product.id, c)}
              onRemove={() => removeProduct(item.product.id)}
            />
          ))}
        </div>
      )}

    </div>
  );
};

export default PrintBarcode;