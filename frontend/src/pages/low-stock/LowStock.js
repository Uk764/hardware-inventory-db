// LowStock.js
// Shows all products with stock at or below minimum level

import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { FiAlertTriangle, FiPackage, FiPhone } from 'react-icons/fi';

const LowStock = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading]   = useState(true);

  const fetchLowStock = async () => {
    setLoading(true);
    try {
      const res = await api.get('/products/alerts/low-stock');
      setProducts(res.data.data);
    } catch {
      toast.error('Failed to fetch low stock data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchLowStock(); }, []);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Low Stock Alerts
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            {products.length} products need attention
          </p>
        </div>
        <button onClick={fetchLowStock} className="btn-secondary">
          Refresh
        </button>
      </div>

      {/* Alert Summary */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="card bg-red-50 border-red-200">
          <div className="flex items-center gap-3">
            <div className="bg-red-100 p-3 rounded-xl">
              <FiPackage className="text-red-600 text-xl" />
            </div>
            <div>
              <p className="text-red-600 font-bold text-2xl">
                {products.filter(p => p.alert_type === 'out_of_stock').length}
              </p>
              <p className="text-red-500 text-sm">Out of Stock</p>
            </div>
          </div>
        </div>
        <div className="card bg-yellow-50 border-yellow-200">
          <div className="flex items-center gap-3">
            <div className="bg-yellow-100 p-3 rounded-xl">
              <FiAlertTriangle className="text-yellow-600 text-xl" />
            </div>
            <div>
              <p className="text-yellow-600 font-bold text-2xl">
                {products.filter(p => p.alert_type === 'low_stock').length}
              </p>
              <p className="text-yellow-500 text-sm">Low Stock</p>
            </div>
          </div>
        </div>
      </div>

      {/* Products Table */}
      <div className="card p-0 overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 
                            border-b-2 border-blue-600" />
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-4xl mb-4">✅</p>
            <p className="text-gray-500 font-medium">
              All products are well stocked!
            </p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr>
                <th className="table-header">Product</th>
                <th className="table-header">Category</th>
                <th className="table-header">Current Stock</th>
                <th className="table-header">Min Required</th>
                <th className="table-header">Supplier</th>
                <th className="table-header">Status</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id}
                    className="hover:bg-gray-50 transition-colors">
                  <td className="table-cell">
                    <p className="font-medium text-gray-900">{p.name}</p>
                    <p className="text-xs text-gray-400">{p.sku}</p>
                  </td>
                  <td className="table-cell text-gray-500">
                    {p.category_name || '—'}
                  </td>
                  <td className="table-cell">
                    <span className={`font-bold text-lg ${
                      p.current_stock === 0
                        ? 'text-red-600'
                        : 'text-yellow-600'
                    }`}>
                      {p.current_stock}
                    </span>
                    <span className="text-gray-400 text-xs ml-1">
                      {p.unit}
                    </span>
                  </td>
                  <td className="table-cell text-gray-500">
                    {p.minimum_stock} {p.unit}
                  </td>
                  <td className="table-cell">
                    {p.supplier_name ? (
                      <div>
                        <p className="text-sm text-gray-700">
                          {p.supplier_name}
                        </p>
                        {p.supplier_phone && (
                          <p className="text-xs text-gray-400 
                                        flex items-center gap-1">
                            <FiPhone className="text-xs" />
                            {p.supplier_phone}
                          </p>
                        )}
                      </div>
                    ) : '—'}
                  </td>
                  <td className="table-cell">
                    {p.alert_type === 'out_of_stock' ? (
                      <span className="badge-red">Out of Stock</span>
                    ) : (
                      <span className="badge-yellow">Low Stock</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default LowStock;