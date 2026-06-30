// Products.js
// Complete product management page
// Features: List, Search, Filter, Add, Edit, Delete, Stock Update

import React, { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import Pagination from '../../components/ui/Pagination';
import SearchBar from '../../components/ui/SearchBar';
import {
  FiPlus, FiEdit2, FiTrash2, FiPackage,
  FiFilter, FiRefreshCw, FiAlertTriangle
} from 'react-icons/fi';

// ================================================
// STOCK STATUS BADGE
// ================================================
const StockBadge = ({ status }) => {
  if (status === 'out_of_stock') {
    return <span className="badge-red">Out of Stock</span>;
  }
  if (status === 'low_stock') {
    return <span className="badge-yellow">Low Stock</span>;
  }
  return <span className="badge-green">In Stock</span>;
};

// ================================================
// PRODUCT FORM (used for both Add and Edit)
// ================================================
const ProductForm = ({ product, categories, suppliers, onSubmit, onClose }) => {
  const [formData, setFormData] = useState({
    name:          product?.name          || '',
    description:   product?.description   || '',
    category_id:   product?.category_id   || '',
    supplier_id:   product?.supplier_id   || '',
    cost_price:    product?.cost_price     || '',
    selling_price: product?.selling_price  || '',
    mrp:           product?.mrp            || '',
    gst_rate:      product?.gst_rate       || 18,
    hsn_code:      product?.hsn_code       || '',
    current_stock: product?.current_stock  || 0,
    minimum_stock: product?.minimum_stock  || 10,
    unit:          product?.unit           || 'piece',
    barcode:       product?.barcode        || '',
  });

  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('Product name is required');
      return;
    }
    if (!formData.selling_price || formData.selling_price <= 0) {
      toast.error('Selling price is required');
      return;
    }
    setLoading(true);
    try {
      await onSubmit(formData);
    } finally {
      setLoading(false);
    }
  };

  const units = ['piece', 'kg', 'gram', 'meter', 'feet', 'liter', 'box', 'pack', 'roll', 'set'];
  const gstRates = [0, 5, 12, 18, 28];

  return (
    <form onSubmit={handleSubmit} className="space-y-4">

      {/* Product Name */}
      <div>
        <label className="input-label">Product Name *</label>
        <input
          type="text"
          name="name"
          className="input-field"
          placeholder="e.g. Havells 6A Switch"
          value={formData.name}
          onChange={handleChange}
          required
        />
      </div>

      {/* Description */}
      <div>
        <label className="input-label">Description</label>
        <textarea
          name="description"
          className="input-field resize-none"
          rows={2}
          placeholder="Optional product description"
          value={formData.description}
          onChange={handleChange}
        />
      </div>

      {/* Category and Supplier */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="input-label">Category</label>
          <select
            name="category_id"
            className="input-field"
            value={formData.category_id}
            onChange={handleChange}
          >
            <option value="">Select Category</option>
            {categories.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="input-label">Supplier</label>
          <select
            name="supplier_id"
            className="input-field"
            value={formData.supplier_id}
            onChange={handleChange}
          >
            <option value="">Select Supplier</option>
            {suppliers.map(sup => (
              <option key={sup.id} value={sup.id}>{sup.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Prices */}
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="input-label">Cost Price (₹)</label>
          <input
            type="number"
            name="cost_price"
            className="input-field"
            placeholder="0.00"
            min="0"
            step="0.01"
            value={formData.cost_price}
            onChange={handleChange}
          />
        </div>
        <div>
          <label className="input-label">Selling Price (₹) *</label>
          <input
            type="number"
            name="selling_price"
            className="input-field"
            placeholder="0.00"
            min="0"
            step="0.01"
            value={formData.selling_price}
            onChange={handleChange}
            required
          />
        </div>
        <div>
          <label className="input-label">MRP (₹)</label>
          <input
            type="number"
            name="mrp"
            className="input-field"
            placeholder="0.00"
            min="0"
            step="0.01"
            value={formData.mrp}
            onChange={handleChange}
          />
        </div>
      </div>

      {/* GST and HSN */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="input-label">GST Rate (%)</label>
          <select
            name="gst_rate"
            className="input-field"
            value={formData.gst_rate}
            onChange={handleChange}
          >
            {gstRates.map(rate => (
              <option key={rate} value={rate}>{rate}%</option>
            ))}
          </select>
        </div>
        <div>
          <label className="input-label">HSN Code</label>
          <input
            type="text"
            name="hsn_code"
            className="input-field"
            placeholder="e.g. 8536"
            value={formData.hsn_code}
            onChange={handleChange}
          />
        </div>
      </div>

      {/* Stock */}
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="input-label">
            {product ? 'Min Stock' : 'Opening Stock'}
          </label>
          <input
            type="number"
            name="current_stock"
            className="input-field"
            placeholder="0"
            min="0"
            value={formData.current_stock}
            onChange={handleChange}
            disabled={!!product}
          />
          {product && (
            <p className="text-xs text-gray-400 mt-1">
              Use Stock Update to change stock
            </p>
          )}
        </div>
        <div>
          <label className="input-label">Min Stock Alert</label>
          <input
            type="number"
            name="minimum_stock"
            className="input-field"
            placeholder="10"
            min="0"
            value={formData.minimum_stock}
            onChange={handleChange}
          />
        </div>
        <div>
          <label className="input-label">Unit</label>
          <select
            name="unit"
            className="input-field"
            value={formData.unit}
            onChange={handleChange}
          >
            {units.map(u => (
              <option key={u} value={u}>{u}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Barcode */}
      <div>
        <label className="input-label">Barcode</label>
        <input
          type="text"
          name="barcode"
          className="input-field"
          placeholder="e.g. 8901234567890"
          value={formData.barcode}
          onChange={handleChange}
        />
      </div>

      {/* Buttons */}
      <div className="flex gap-3 justify-end pt-4 border-t border-gray-200">
        <button
          type="button"
          onClick={onClose}
          className="btn-secondary"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="btn-primary"
        >
          {loading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 
                              border-b-2 border-white" />
              Saving...
            </>
          ) : (
            product ? 'Update Product' : 'Add Product'
          )}
        </button>
      </div>

    </form>
  );
};

// ================================================
// STOCK UPDATE FORM
// ================================================
const StockUpdateForm = ({ product, onSubmit, onClose }) => {
  const [quantity, setQuantity]   = useState('');
  const [notes, setNotes]         = useState('');
  const [type, setType]           = useState('purchase');
  const [loading, setLoading]     = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!quantity || quantity === 0) {
      toast.error('Please enter quantity');
      return;
    }
    setLoading(true);
    try {
      await onSubmit({
        quantity: type === 'adjustment_remove'
          ? -Math.abs(parseInt(quantity))
          : Math.abs(parseInt(quantity)),
        movement_type: type,
        notes
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">

      <div className="bg-blue-50 p-4 rounded-lg">
        <p className="text-sm text-blue-700">
          <strong>Current Stock:</strong> {product?.current_stock} {product?.unit}
        </p>
      </div>

      <div>
        <label className="input-label">Movement Type</label>
        <select
          className="input-field"
          value={type}
          onChange={(e) => setType(e.target.value)}
        >
          <option value="purchase">Stock In (Purchase)</option>
          <option value="adjustment_remove">Stock Out (Adjustment)</option>
          <option value="return">Return to Supplier</option>
        </select>
      </div>

      <div>
        <label className="input-label">Quantity</label>
        <input
          type="number"
          className="input-field"
          placeholder="Enter quantity"
          min="1"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          required
        />
      </div>

      <div>
        <label className="input-label">Notes (Optional)</label>
        <input
          type="text"
          className="input-field"
          placeholder="e.g. Received from supplier"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>

      <div className="flex gap-3 justify-end pt-4 border-t border-gray-200">
        <button type="button" onClick={onClose} className="btn-secondary">
          Cancel
        </button>
        <button type="submit" disabled={loading} className="btn-primary">
          {loading ? 'Updating...' : 'Update Stock'}
        </button>
      </div>

    </form>
  );
};

// ================================================
// MAIN PRODUCTS PAGE
// ================================================
const Products = () => {
  const [products, setProducts]       = useState([]);
  const [categories, setCategories]   = useState([]);
  const [suppliers, setSuppliers]     = useState([]);
  const [loading, setLoading]         = useState(true);
  const [search, setSearch]           = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages]   = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);

  // Modal states
  const [showAddModal, setShowAddModal]       = useState(false);
  const [showEditModal, setShowEditModal]     = useState(false);
  const [showStockModal, setShowStockModal]   = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);

  // ── Fetch products ──────────────────────────
  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page:  currentPage,
        limit: 15,
        ...(search       && { search }),
        ...(categoryFilter && { category_id: categoryFilter }),
      });

      const res = await api.get(`/products?${params}`);
      setProducts(res.data.data);
      setTotalPages(res.data.pagination.totalPages);
      setTotalProducts(res.data.pagination.totalProducts);
    } catch (error) {
      toast.error('Failed to fetch products');
    } finally {
      setLoading(false);
    }
  }, [currentPage, search, categoryFilter]);

  // ── Fetch categories and suppliers ──────────
  const fetchFilters = async () => {
    try {
      const [catRes, supRes] = await Promise.all([
        api.get('/categories'),
        api.get('/suppliers'),
      ]);
      setCategories(catRes.data.data);
      setSuppliers(supRes.data.data);
    } catch (error) {
      console.error('Failed to fetch filters');
    }
  };

  useEffect(() => {
    fetchFilters();
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Reset to page 1 when search/filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [search, categoryFilter]);

  // ── Add Product ─────────────────────────────
 const handleAdd = async (formData) => {
    try {
      await api.post('/products', formData);
      toast.success('Product added successfully!');
      setShowAddModal(false);
      fetchProducts();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to add product');
    }
  };

  // ── Edit Product ────────────────────────────
  const handleEdit = async (formData) => {
    try {
      await api.put(`/products/${selectedProduct.id}`, formData);
      toast.success('Product updated successfully!');
      setShowEditModal(false);
      fetchProducts();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update product');
    }
  };

  // ── Delete Product ──────────────────────────
  const handleDelete = async () => {
    try {
      await api.delete(`/products/${selectedProduct.id}`);
      toast.success('Product deleted successfully!');
      fetchProducts();
    } catch (error) {
      toast.error('Failed to delete product');
    }
  };

  // ── Update Stock ────────────────────────────
  const handleStockUpdate = async (data) => {
    try {
      await api.put(`/products/${selectedProduct.id}/stock`, data);
      toast.success('Stock updated successfully!');
      setShowStockModal(false);
      fetchProducts();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update stock');
    }
  };

  // ================================================
  // RENDER
  // ================================================
  return (
    <div>

      {/* Page Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Products</h1>
          <p className="text-gray-500 text-sm mt-1">
            {totalProducts} products total
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="btn-primary"
        >
          <FiPlus className="text-lg" />
          Add Product
        </button>
      </div>

      {/* Search and Filters */}
      <div className="card mb-6">
        <div className="flex flex-wrap items-center gap-4">
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder="Search by name, SKU, barcode..."
          />

          <div className="flex items-center gap-2">
            <FiFilter className="text-gray-400" />
            <select
              className="input-field w-48"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value="">All Categories</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>

          <button
            onClick={() => {
              setSearch('');
              setCategoryFilter('');
              setCurrentPage(1);
            }}
            className="btn-secondary"
          >
            <FiRefreshCw />
            Reset
          </button>
        </div>
      </div>

      {/* Products Table */}
      <div className="card p-0 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 
                            border-b-2 border-blue-600" />
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-20">
            <FiPackage className="text-5xl text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 font-medium">No products found</p>
            <p className="text-gray-400 text-sm mt-1">
              Try adjusting your search or add a new product
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="table-header">Product</th>
                  <th className="table-header">SKU</th>
                  <th className="table-header">Category</th>
                  <th className="table-header">Price</th>
                  <th className="table-header">Stock</th>
                  <th className="table-header">Status</th>
                  <th className="table-header">Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <tr key={product.id}
                      className="hover:bg-gray-50 transition-colors">

                    {/* Product Name */}
                    <td className="table-cell">
                      <div>
                        <p className="font-medium text-gray-900">
                          {product.name}
                        </p>
                        {product.barcode && (
                          <p className="text-xs text-gray-400">
                            {product.barcode}
                          </p>
                        )}
                      </div>
                    </td>

                    {/* SKU */}
                    <td className="table-cell">
                      <span className="badge-blue">{product.sku}</span>
                    </td>

                    {/* Category */}
                    <td className="table-cell text-gray-500">
                      {product.category_name || '—'}
                    </td>

                    {/* Price */}
                    <td className="table-cell">
                      <p className="font-medium">
                        ₹{parseFloat(product.selling_price).toFixed(2)}
                      </p>
                      <p className="text-xs text-gray-400">
                        Cost: ₹{parseFloat(product.cost_price).toFixed(2)}
                      </p>
                    </td>

                    {/* Stock */}
                    <td className="table-cell">
                      <button
                        onClick={() => {
                          setSelectedProduct(product);
                          setShowStockModal(true);
                        }}
                        className="text-left hover:text-blue-600 
                                   transition-colors group"
                      >
                        <p className="font-medium group-hover:text-blue-600">
                          {product.current_stock} {product.unit}
                        </p>
                        <p className="text-xs text-gray-400">
                          Min: {product.minimum_stock}
                        </p>
                      </button>
                    </td>

                    {/* Status */}
                    <td className="table-cell">
                      <StockBadge status={product.stock_status} />
                    </td>

                    {/* Actions */}
                    <td className="table-cell">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setSelectedProduct(product);
                            setShowEditModal(true);
                          }}
                          className="p-2 text-blue-600 hover:bg-blue-50 
                                     rounded-lg transition-colors"
                          title="Edit Product"
                        >
                          <FiEdit2 />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedProduct(product);
                            setShowDeleteDialog(true);
                          }}
                          className="p-2 text-red-600 hover:bg-red-50 
                                     rounded-lg transition-colors"
                          title="Delete Product"
                        >
                          <FiTrash2 />
                        </button>
                      </div>
                    </td>

                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {!loading && products.length > 0 && (
          <div className="p-4 border-t border-gray-100">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          </div>
        )}
      </div>

      {/* ADD PRODUCT MODAL */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add New Product"
        size="lg"
      >
        <ProductForm
          categories={categories}
          suppliers={suppliers}
          onSubmit={handleAdd}
          onClose={() => setShowAddModal(false)}
        />
      </Modal>

      {/* EDIT PRODUCT MODAL */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Edit Product"
        size="lg"
      >
        <ProductForm
          product={selectedProduct}
          categories={categories}
          suppliers={suppliers}
          onSubmit={handleEdit}
          onClose={() => setShowEditModal(false)}
        />
      </Modal>

      {/* STOCK UPDATE MODAL */}
      <Modal
        isOpen={showStockModal}
        onClose={() => setShowStockModal(false)}
        title={`Update Stock — ${selectedProduct?.name}`}
        size="sm"
      >
        <StockUpdateForm
          product={selectedProduct}
          onSubmit={handleStockUpdate}
          onClose={() => setShowStockModal(false)}
        />
      </Modal>

      {/* DELETE CONFIRMATION */}
      <ConfirmDialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={handleDelete}
        title="Delete Product"
        message={`Are you sure you want to delete "${selectedProduct?.name}"?`}
      />

    </div>
  );
};

export default Products;