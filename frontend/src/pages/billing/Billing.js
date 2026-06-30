// Billing.js — Complete POS with Barcode Scanner Support

import React, { useState, useRef, useCallback, useEffect } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import {
  FiSearch, FiTrash2, FiPlus, FiMinus,
  FiShoppingCart, FiUser, FiCreditCard,
  FiPrinter, FiX, FiCheck, FiZap
} from 'react-icons/fi';
import ThermalReceipt from '../../components/ui/ThermalReceipt';

// ── Format currency ──────────────────────────────
const formatCurrency = (amount) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency', currency: 'INR',
    minimumFractionDigits: 2,
  }).format(amount || 0);

// ================================================
// CART ITEM
// ================================================
const CartItem = ({ item, onUpdateQuantity, onRemove }) => {
  const itemTotal = item.selling_price * item.quantity;
  const gstAmount = (itemTotal * item.gst_rate) / 100;

  return (
    <div className="flex items-start gap-3 py-3 border-b border-gray-100">
      <div className="flex-1 min-w-0">
        <p className="font-medium text-gray-900 text-sm truncate">
          {item.name}
        </p>
        <p className="text-xs text-gray-400 font-mono">
          {item.product_code || item.sku}
        </p>
        <p className="text-xs text-gray-500 mt-0.5">
          {formatCurrency(item.selling_price)} x {item.quantity}
          <span className="text-blue-500 ml-2">
            GST: {formatCurrency(gstAmount)}
          </span>
        </p>
      </div>

      <div className="flex items-center gap-1">
        <button
          onClick={() => onUpdateQuantity(item.product_id, item.quantity - 1)}
          className="w-7 h-7 rounded-lg bg-gray-100 hover:bg-gray-200
                     flex items-center justify-center transition-colors"
        >
          <FiMinus className="text-xs" />
        </button>
        <span className="w-8 text-center text-sm font-medium">
          {item.quantity}
        </span>
        <button
          onClick={() => onUpdateQuantity(item.product_id, item.quantity + 1)}
          disabled={item.quantity >= item.current_stock}
          className="w-7 h-7 rounded-lg bg-gray-100 hover:bg-gray-200
                     flex items-center justify-center transition-colors
                     disabled:opacity-40"
        >
          <FiPlus className="text-xs" />
        </button>
      </div>

      <div className="text-right min-w-[70px]">
        <p className="font-semibold text-gray-900 text-sm">
          {formatCurrency(itemTotal + gstAmount)}
        </p>
        <button
          onClick={() => onRemove(item.product_id)}
          className="text-red-400 hover:text-red-600 transition-colors mt-1"
        >
          <FiTrash2 className="text-xs" />
        </button>
      </div>
    </div>
  );
};

// ================================================
// INVOICE SUCCESS MODAL
// ================================================
const InvoiceSuccess = ({ invoice, onNewBill, onPrintReceipt }) => (
  <div className="fixed inset-0 z-50 flex items-center
                  justify-center p-4 bg-black bg-opacity-60">
    <div className="bg-white rounded-2xl shadow-2xl w-full
                    max-w-md p-8 text-center">

      <div className="bg-green-100 w-20 h-20 rounded-full
                      flex items-center justify-center mx-auto mb-4">
        <FiCheck className="text-green-600 text-4xl" />
      </div>

      <h2 className="text-2xl font-bold text-gray-900 mb-2">
        Payment Successful!
      </h2>
      <p className="text-gray-500 mb-6">
        Invoice {invoice?.invoice_number} created
      </p>

      <div className="bg-gray-50 rounded-xl p-4 mb-6 text-left space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Customer</span>
          <span className="font-medium">
            {invoice?.customer_name || 'Walk-in Customer'}
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Subtotal</span>
          <span>{formatCurrency(invoice?.subtotal)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">GST</span>
          <span>{formatCurrency(invoice?.total_gst)}</span>
        </div>
        {parseFloat(invoice?.discount) > 0 && (
          <div className="flex justify-between text-sm text-green-600">
            <span>Discount</span>
            <span>- {formatCurrency(invoice?.discount)}</span>
          </div>
        )}
        <div className="flex justify-between font-bold text-lg
                        border-t border-gray-200 pt-2 mt-2">
          <span>Total Paid</span>
          <span className="text-green-600">
            {formatCurrency(invoice?.total_amount)}
          </span>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex gap-2">
          <button
            onClick={() => onPrintReceipt('58mm')}
            className="btn-secondary flex-1 justify-center text-sm"
          >
            <FiPrinter /> Receipt (58mm)
          </button>
          <button
            onClick={() => onPrintReceipt('80mm')}
            className="btn-secondary flex-1 justify-center text-sm"
          >
            <FiPrinter /> Receipt (80mm)
          </button>
        </div>
        <div className="flex gap-2">
          <button
            onClick={async () => {
              try {
                const token = localStorage.getItem('token');
                const url   = `http://localhost:5000/api/billing/invoice/${invoice?.id}/pdf`;
                const res   = await fetch(url, {
                  headers: { Authorization: `Bearer ${token}` }
                });
                const blob    = await res.blob();
                const blobUrl = URL.createObjectURL(blob);
                window.open(blobUrl, '_blank');
              } catch {
                toast.error('Failed to open PDF');
              }
            }}
            className="btn-secondary flex-1 justify-center text-sm"
          >
            <FiPrinter /> A4 Invoice
          </button>
          <button
            onClick={onNewBill}
            className="btn-primary flex-1 justify-center text-sm"
          >
            New Bill
          </button>
        </div>
      </div>

    </div>
  </div>
);

// ================================================
// MAIN BILLING PAGE
// ================================================
const Billing = () => {
  // Cart
  const [cart, setCart]                 = useState([]);
  const [discount, setDiscount]         = useState('');
  const [discountType, setDiscountType] = useState('flat'); // 'flat' or 'percent'
  const [paymentMethod, setPaymentMethod] = useState('cash');

  // Customer
  const [customerName, setCustomerName]   = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerGstin, setCustomerGstin] = useState('');

  // Product search
  const [searchQuery, setSearchQuery]     = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching]         = useState(false);
  const [showResults, setShowResults]     = useState(false);

  // Barcode scanner
  const [barcodeInput, setBarcodeInput]   = useState('');
  const [scannerActive, setScannerActive] = useState(true);
  const allowRefocus = useRef(true);
  const [lastScanned, setLastScanned]     = useState('');
  const [scanError, setScanError]         = useState('');

  // Invoice
  const [processing, setProcessing]         = useState(false);
  const [successInvoice, setSuccessInvoice] = useState(null);
  const [receiptWidth, setReceiptWidth]     = useState('80mm');
  const [fullInvoiceForReceipt, setFullInvoiceForReceipt] = useState(null);

  const searchRef  = useRef(null);
  const barcodeRef = useRef(null);
  const searchTimeout = useRef(null);

  // ── Auto focus barcode input ─────────────────
  useEffect(() => {
    if (scannerActive && barcodeRef.current) {
      barcodeRef.current.focus();
    }
  }, [scannerActive, cart]);

  // ── Prevent scanner from stealing focus from
  //    other inputs like discount, customer fields ─
  useEffect(() => {
    const handleFocusIn = (e) => {
      const tag = e.target.tagName;
      const isBarcodeInput = e.target === barcodeRef.current;

      if (
        (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') &&
        !isBarcodeInput
      ) {
        allowRefocus.current = false;
      } else if (isBarcodeInput) {
        allowRefocus.current = true;
      }
    };

    const handleFocusOut = () => {
      setTimeout(() => {
        const active = document.activeElement;
        const isOtherInput =
          active &&
          active !== barcodeRef.current &&
          ['INPUT', 'TEXTAREA', 'SELECT'].includes(active.tagName);

        if (!isOtherInput) {
          allowRefocus.current = true;
        }
      }, 50);
    };

    document.addEventListener('focusin', handleFocusIn);
    document.addEventListener('focusout', handleFocusOut);

    return () => {
      document.removeEventListener('focusin', handleFocusIn);
      document.removeEventListener('focusout', handleFocusOut);
    };
  }, []);

  // ── Add product to cart ──────────────────────
  const addToCart = useCallback((product) => {
    if (product.current_stock <= 0) {
      toast.error(`OUT OF STOCK: ${product.name}`);
      setScanError(`Out of Stock: ${product.name}`);
      setTimeout(() => setScanError(''), 3000);
      return false;
    }

    setCart(prev => {
      const existing = prev.find(i => i.product_id === product.id);

      if (existing) {
        if (existing.quantity >= product.current_stock) {
          toast.error(
            `Max stock reached! Only ${product.current_stock} available.`
          );
          return prev;
        }
        return prev.map(i =>
          i.product_id === product.id
            ? { ...i, quantity: i.quantity + 1 }
            : i
        );
      }

      return [...prev, {
        product_id:    product.id,
        name:          product.name,
        sku:           product.sku,
        product_code:  product.product_code,
        selling_price: parseFloat(product.selling_price),
        gst_rate:      parseFloat(product.gst_rate),
        current_stock: product.current_stock,
        unit:          product.unit,
        quantity:      1,
      }];
    });

    return true;
  }, []);

  // ── Barcode Scanner Handler ──────────────────
  const handleBarcodeKeyDown = async (e) => {
    if (e.key === 'Enter') {
      const code = barcodeInput.trim();
      if (!code) return;

      setScanError('');
      setLastScanned(code);

      try {
        const res = await api.get(`/products/barcode/${code}`);
        const product = res.data.data;

        const added = addToCart(product);
        if (added) {
          toast.success(
            `Scanned: ${product.name}`,
            { icon: '📷', duration: 1500 }
          );
        }
      } catch (error) {
        const msg = error.response?.status === 404
          ? `Product not found: "${code}"`
          : 'Scanner error — try again';

        toast.error(msg);
        setScanError(msg);
        setTimeout(() => setScanError(''), 3000);
      }

      setBarcodeInput('');
      setTimeout(() => {
        if (barcodeRef.current) barcodeRef.current.focus();
      }, 100);
    }
  };

  // ── Product Search ───────────────────────────
  const searchProducts = useCallback(async (query) => {
    if (!query.trim()) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }
    setSearching(true);
    try {
      const res = await api.get(
        `/products?search=${encodeURIComponent(query)}&limit=8`
      );
      setSearchResults(res.data.data || []);
      setShowResults(true);
    } catch {
      toast.error('Search failed');
    } finally {
      setSearching(false);
    }
  }, []);

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchQuery(value);
    clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => searchProducts(value), 400);
  };

  // ── Cart Operations ──────────────────────────
  const updateQuantity = (productId, newQty) => {
    if (newQty <= 0) {
      removeFromCart(productId);
      return;
    }
    setCart(prev => prev.map(item =>
      item.product_id === productId
        ? { ...item, quantity: newQty }
        : item
    ));
  };

  const removeFromCart = (productId) => {
    setCart(prev => prev.filter(i => i.product_id !== productId));
  };

  // ── Totals ───────────────────────────────────
  const subtotal = cart.reduce(
    (sum, item) => sum + item.selling_price * item.quantity, 0
  );

  const totalGst = cart.reduce((sum, item) => {
    const itemTotal = item.selling_price * item.quantity;
    return sum + (itemTotal * item.gst_rate / 100);
  }, 0);

  const rawDiscount = parseFloat(discount) || 0;
  const discountAmount = discountType === 'percent'
    ? (subtotal + totalGst) * (rawDiscount / 100)
    : rawDiscount;

  const grandTotal = subtotal + totalGst - discountAmount;

  // ── Create Invoice ───────────────────────────
  const handleCreateInvoice = async () => {
    if (cart.length === 0) {
      toast.error('Cart is empty!');
      return;
    }

    setProcessing(true);
    try {
      const res = await api.post('/billing/invoice', {
        customer_name:  customerName  || 'Walk-in Customer',
        customer_phone: customerPhone || null,
        customer_gstin: customerGstin || null,
        items: cart.map(item => ({
          product_id: item.product_id,
          quantity:   item.quantity,
        })),
        payment_method: paymentMethod,
        discount:       discountAmount,
      });

      setSuccessInvoice(res.data.data);
      toast.success('Invoice created!');
    } catch (error) {
      toast.error(
        error.response?.data?.message || 'Failed to create invoice'
      );
    } finally {
      setProcessing(false);
    }
  };
// ── Print Thermal Receipt ────────────────────
  const handlePrintReceipt = async (width) => {
    try {
      // Fetch full invoice with items (success response from
      // createInvoice already includes items, but ensure freshness)
      const res = await api.get(`/billing/invoice/${successInvoice.id}`);
      setFullInvoiceForReceipt(res.data.data);
      setReceiptWidth(width);

      // Wait for DOM to update with receipt content, then print
      setTimeout(() => {
        document.body.classList.add('printing-receipt');
        window.print();
        setTimeout(() => {
          document.body.classList.remove('printing-receipt');
        }, 500);
      }, 200);

    } catch (error) {
      toast.error('Failed to load receipt data');
    }
  };
  // ── New Bill ─────────────────────────────────
  const handleNewBill = () => {
    setCart([]);
    setDiscount('');
    setDiscountType('flat');
    setPaymentMethod('cash');
    setCustomerName('');
    setCustomerPhone('');
    setCustomerGstin('');
    setBarcodeInput('');
    setLastScanned('');
    setScanError('');
    setSuccessInvoice(null);
    setTimeout(() => {
      if (barcodeRef.current) barcodeRef.current.focus();
    }, 200);
  };

  // ================================================
  // RENDER
  // ================================================
  return (
    <div>
      {successInvoice && (
        <>
          <InvoiceSuccess
            invoice={successInvoice}
            onNewBill={handleNewBill}
            onPrintReceipt={handlePrintReceipt}
          />
          <ThermalReceipt
            invoice={fullInvoiceForReceipt || successInvoice}
            width={receiptWidth}
          />
        </>
      )}

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">POS Billing</h1>
        <p className="text-gray-500 text-sm mt-1">
          Scan barcode or search to add products
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── LEFT PANEL ──────────────────────── */}
        <div className="lg:col-span-2 space-y-4">

          {/* BARCODE SCANNER INPUT */}
          <div className={`card border-2 transition-colors ${
            scanError
              ? 'border-red-400 bg-red-50'
              : 'border-blue-300 bg-blue-50'
          }`}>
            <div className="flex items-center gap-2 mb-3">
              <FiZap className={`text-lg ${
                scanError ? 'text-red-500' : 'text-blue-600'
              }`} />
              <h3 className="font-semibold text-gray-900">
                Barcode Scanner
              </h3>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                scanError
                  ? 'bg-red-100 text-red-600'
                  : 'bg-green-100 text-green-700'
              }`}>
                {scanError ? 'Error' : 'Ready'}
              </span>
            </div>

            <input
              ref={barcodeRef}
              type="text"
              className={`input-field text-base py-3 font-mono ${
                scanError ? 'border-red-400' : 'border-blue-400'
              }`}
              placeholder="Scan barcode here or type product code + Enter..."
              value={barcodeInput}
              onChange={(e) => setBarcodeInput(e.target.value)}
              onKeyDown={handleBarcodeKeyDown}
              onBlur={() => {
                setTimeout(() => {
                  if (
                    barcodeRef.current &&
                    allowRefocus.current
                  ) {
                    barcodeRef.current.focus();
                  }
                }, 300);
              }}
            />

            {scanError && (
              <p className="text-red-600 text-sm mt-2 font-medium">
                {scanError}
              </p>
            )}
            {lastScanned && !scanError && (
              <p className="text-blue-600 text-xs mt-2">
                Last scanned:{' '}
                <span className="font-mono font-bold">
                  {lastScanned}
                </span>
              </p>
            )}
            <p className="text-gray-400 text-xs mt-2">
              Connect USB barcode scanner and scan any product. Press Enter after typing manually.
            </p>
          </div>

          {/* MANUAL PRODUCT SEARCH */}
          <div className="card">
            <label className="input-label text-base font-semibold mb-3 block">
              Manual Product Search
            </label>
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2
                                    text-gray-400 text-lg" />
              <input
                ref={searchRef}
                type="text"
                className="input-field pl-10 text-base py-3"
                placeholder="Type product name or SKU to search..."
                value={searchQuery}
                onChange={handleSearchChange}
                onFocus={() => searchQuery && setShowResults(true)}
              />
              {searchQuery && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setShowResults(false);
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2
                             text-gray-400 hover:text-gray-600"
                >
                  <FiX />
                </button>
              )}
            </div>

            {showResults && (
              <div className="mt-2 border border-gray-200 rounded-xl
                              overflow-hidden shadow-lg">
                {searching ? (
                  <div className="p-4 text-center">
                    <div className="animate-spin rounded-full h-6 w-6
                                    border-b-2 border-blue-600 mx-auto" />
                  </div>
                ) : searchResults.length === 0 ? (
                  <div className="p-4 text-center text-gray-500">
                    No products found
                  </div>
                ) : (
                  searchResults.map(product => (
                    <button
                      key={product.id}
                      onClick={() => {
                        const added = addToCart(product);
                        if (added) {
                          toast.success(`${product.name} added!`);
                          setSearchQuery('');
                          setShowResults(false);
                        }
                      }}
                      disabled={product.current_stock <= 0}
                      className="w-full flex items-center justify-between
                                 p-3 hover:bg-blue-50 transition-colors
                                 border-b border-gray-100 last:border-0
                                 disabled:opacity-50 disabled:cursor-not-allowed
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
                          {' · '}
                          Stock: {product.current_stock}
                          {product.current_stock <= 0 && (
                            <span className="ml-1 text-red-500 font-medium">
                              OUT OF STOCK
                            </span>
                          )}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-blue-600">
                          {formatCurrency(product.selling_price)}
                        </p>
                        <p className="text-xs text-gray-400">
                          GST: {product.gst_rate}%
                        </p>
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {/* CUSTOMER DETAILS */}
          <div className="card">
            <h3 className="font-semibold text-gray-900 mb-4
                           flex items-center gap-2">
              <FiUser className="text-blue-600" />
              Customer Details
              <span className="text-gray-400 text-sm font-normal">
                (Optional)
              </span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="input-label">Name</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="Walk-in Customer"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                />
              </div>
              <div>
                <label className="input-label">Phone</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="9876543210"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                />
              </div>
              <div>
                <label className="input-label">GSTIN</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="GST Number"
                  value={customerGstin}
                  onChange={(e) => setCustomerGstin(e.target.value)}
                />
              </div>
            </div>
          </div>

        </div>

        {/* ── RIGHT PANEL: CART ────────────────── */}
        <div className="space-y-4">

          <div className="card">
            <h3 className="font-semibold text-gray-900 mb-4
                           flex items-center gap-2">
              <FiShoppingCart className="text-blue-600" />
              Cart
              {cart.length > 0 && (
                <span className="bg-blue-600 text-white text-xs
                                 rounded-full w-5 h-5 flex items-center
                                 justify-center ml-auto">
                  {cart.length}
                </span>
              )}
            </h3>

            {cart.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <FiShoppingCart className="text-4xl mx-auto mb-2 opacity-30" />
                <p className="text-sm">Cart is empty</p>
                <p className="text-xs mt-1">
                  Scan a barcode or search products
                </p>
              </div>
            ) : (
              <div className="max-h-72 overflow-y-auto">
                {cart.map(item => (
                  <CartItem
                    key={item.product_id}
                    item={item}
                    onUpdateQuantity={updateQuantity}
                    onRemove={removeFromCart}
                  />
                ))}
              </div>
            )}
          </div>

          {/* BILL SUMMARY */}
          {cart.length > 0 && (
            <div className="card">
              <h3 className="font-semibold text-gray-900 mb-4">
                Bill Summary
              </h3>

              <div className="space-y-3 text-sm">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal ({cart.length} items)</span>
                  <span>{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>GST</span>
                  <span>{formatCurrency(totalGst)}</span>
                </div>

                {/* Discount Section */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Discount (Optional)</span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setDiscountType('flat')}
                        className={`px-2 py-1 rounded-md text-xs font-medium transition-colors
                          ${discountType === 'flat'
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-500'
                          }`}
                      >
                        Rs.
                      </button>
                      <button
                        type="button"
                        onClick={() => setDiscountType('percent')}
                        className={`px-2 py-1 rounded-md text-xs font-medium transition-colors
                          ${discountType === 'percent'
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-500'
                          }`}
                      >
                        %
                      </button>
                    </div>
                  </div>
                  <input
                    type="number"
                    className="input-field text-right py-1.5 text-sm"
                    placeholder={
                      discountType === 'percent'
                        ? 'e.g. 10 (for 10% off)'
                        : 'e.g. 50 (Rs. off)'
                    }
                    min="0"
                    max={discountType === 'percent' ? 100 : undefined}
                    value={discount}
                    onChange={(e) => setDiscount(e.target.value)}
                  />
                  {discountAmount > 0 && (
                    <div className="flex justify-between text-sm text-green-600 font-medium">
                      <span>
                        Discount Applied
                        {discountType === 'percent' && ` (${discount}%)`}
                      </span>
                      <span>- {formatCurrency(discountAmount)}</span>
                    </div>
                  )}
                </div>

                <div className="flex justify-between font-bold text-lg
                                border-t border-gray-200 pt-3 mt-3">
                  <span>Total</span>
                  <span className="text-green-600">
                    {formatCurrency(grandTotal)}
                  </span>
                </div>
              </div>

              {/* Payment Method */}
              <div className="mt-4">
                <label className="input-label">Payment Method</label>
                <div className="grid grid-cols-3 gap-2 mt-1">
                  {['cash', 'card', 'upi'].map(method => (
                    <button
                      key={method}
                      onClick={() => setPaymentMethod(method)}
                      className={`py-2 rounded-lg text-sm font-medium
                                  capitalize border transition-colors
                        ${paymentMethod === method
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                        }`}
                    >
                      {method.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={handleCreateInvoice}
                disabled={processing || cart.length === 0}
                className="btn-success w-full justify-center mt-4 py-3 text-base"
              >
                {processing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4
                                    border-b-2 border-white" />
                    Processing...
                  </>
                ) : (
                  <>
                    <FiCreditCard className="text-lg" />
                    Create Invoice — {formatCurrency(grandTotal)}
                  </>
                )}
              </button>

              <button
                onClick={() => setCart([])}
                className="btn-secondary w-full justify-center mt-2"
              >
                <FiX /> Clear Cart
              </button>

            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default Billing;