// Reports.js
// Full reports page with sales data and exports

import React, { useState, useEffect } from 'react';
import {
  BarChart, Bar, LineChart, Line,
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { FiTrendingUp, FiPackage, FiDownload } from 'react-icons/fi';

// Format currency
const formatCurrency = (amount) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency', currency: 'INR',
    minimumFractionDigits: 0,
  }).format(amount || 0);

// Pie chart colors
const COLORS = [
  '#2563eb', '#16a34a', '#d97706', '#dc2626',
  '#7c3aed', '#0891b2', '#be185d', '#065f46'
];

// Custom tooltip
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl
                      shadow-lg p-3">
        <p className="font-semibold text-gray-900 mb-1">{label}</p>
        {payload.map((entry, i) => (
          <p key={i} style={{ color: entry.color }} className="text-sm">
            {entry.name}: {
              entry.name.includes('Revenue') || entry.name === 'value'
                ? formatCurrency(entry.value)
                : entry.value
            }
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const Reports = () => {
  const [salesData, setSalesData]       = useState([]);
  const [monthlyData, setMonthlyData]   = useState([]);
  const [topProducts, setTopProducts]   = useState([]);
  const [categoryData, setCategoryData] = useState([]);
  const [summary, setSummary]           = useState(null);
  const [loading, setLoading]           = useState(true);
  const [exporting, setExporting]       = useState(false);
  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      try {
        const [salesRes, monthRes, topRes, catRes, sumRes] =
          await Promise.all([
            api.get('/reports/sales'),
            api.get('/reports/monthly'),
            api.get('/reports/top-products?limit=10'),
            api.get('/reports/category-sales'),
            api.get('/reports/summary'),
          ]);

        setSalesData(salesRes.data.data);
        setMonthlyData(monthRes.data.data);
        setTopProducts(topRes.data.data);
        setCategoryData(catRes.data.data);
        setSummary(sumRes.data.data);
      } catch {
        toast.error('Failed to load reports');
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);
  const handleExport = async () => {
    setExporting(true);
    try {
      const token = localStorage.getItem('token');
      const url   = 'http://localhost:5000/api/reports/export';

      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!response.ok) throw new Error('Export failed');

      const blob = await response.blob();
      const downloadUrl = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `Hardware-Store-Report-${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(downloadUrl);

      toast.success('Report downloaded successfully!');
    } catch (error) {
      toast.error('Failed to export report');
    } finally {
      setExporting(false);
    }
  };
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12
                        border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Reports & Analytics
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Complete overview of your store performance
          </p>
        </div>
        <button
          onClick={handleExport}
          disabled={exporting}
          className="btn-primary"
        >
          {exporting ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4
                              border-b-2 border-white" />
              Exporting...
            </>
          ) : (
            <>
              <FiDownload />
              Export to Excel
            </>
          )}
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: 'Total Revenue',
            value: formatCurrency(summary?.total_revenue),
            color: 'bg-green-500',
          },
          {
            label: 'Monthly Revenue',
            value: formatCurrency(summary?.monthly_revenue),
            color: 'bg-blue-500',
          },
          {
            label: "Today's Sales",
            value: formatCurrency(summary?.today?.revenue),
            color: 'bg-purple-500',
          },
          {
            label: 'Today GST',
            value: formatCurrency(summary?.today?.gst),
            color: 'bg-orange-500',
          },
        ].map((card, i) => (
          <div key={i} className="card">
            <div className={`${card.color} w-10 h-10 rounded-xl
                             flex items-center justify-center mb-3`}>
              <FiTrendingUp className="text-white text-lg" />
            </div>
            <p className="text-gray-500 text-sm">{card.label}</p>
            <p className="text-xl font-bold text-gray-900 mt-1">
              {card.value}
            </p>
          </div>
        ))}
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* 7 Day Sales Line Chart */}
        <div className="card">
          <h2 className="text-lg font-bold text-gray-900 mb-4">
            📈 Last 7 Days Sales
          </h2>
          {salesData.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              No sales data yet
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={salesData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="day"
                       tick={{ fontSize: 11, fill: '#6b7280' }} />
                <YAxis tick={{ fontSize: 11, fill: '#6b7280' }}
                       tickFormatter={(v) => `₹${v}`} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  name="Revenue"
                  stroke="#2563eb"
                  strokeWidth={2.5}
                  dot={{ fill: '#2563eb', r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="invoices"
                  name="Invoices"
                  stroke="#16a34a"
                  strokeWidth={2}
                  dot={{ fill: '#16a34a', r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Category Pie Chart */}
        <div className="card">
          <h2 className="text-lg font-bold text-gray-900 mb-4">
            🥧 Sales by Category
          </h2>
          {categoryData.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              No category data yet
            </div>
          ) : (
          <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="45%"
                  outerRadius={85}
                  dataKey="value"
                  nameKey="name"
                  label={({ percent }) =>
                    percent > 0.05 ? `${(percent * 100).toFixed(0)}%` : ''
                  }
                  labelLine={false}
                >
                  {categoryData.map((_, index) => (
                    <Cell
                      key={index}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  verticalAlign="bottom"
                  height={60}
                  iconType="circle"
                  wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }}
                  formatter={(value, entry) => {
                    const item = categoryData.find(d => d.name === value);
                    const pct = item
                      ? ((item.value / categoryData.reduce((s, d) => s + d.value, 0)) * 100).toFixed(0)
                      : 0;
                    return `${value} (${pct}%)`;
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

      </div>

      {/* Monthly Bar Chart */}
      <div className="card">
        <h2 className="text-lg font-bold text-gray-900 mb-4">
          📊 Monthly Revenue & GST (Last 6 Months)
        </h2>
        {monthlyData.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            No monthly data yet
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month"
                     tick={{ fontSize: 11, fill: '#6b7280' }} />
              <YAxis tick={{ fontSize: 11, fill: '#6b7280' }}
                     tickFormatter={(v) => `₹${v}`} />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Bar dataKey="revenue" name="Revenue"
                   fill="#2563eb" radius={[4, 4, 0, 0]} />
              <Bar dataKey="gst" name="GST Collected"
                   fill="#60a5fa" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Top Products Table */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900">
            🏆 Top 10 Selling Products
          </h2>
        </div>
        {topProducts.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <FiPackage className="text-4xl mx-auto mb-2 opacity-30" />
            <p>No sales data yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="table-header">Rank</th>
                  <th className="table-header">Product</th>
                  <th className="table-header">SKU</th>
                  <th className="table-header">Category</th>
                  <th className="table-header">Units Sold</th>
                  <th className="table-header">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {topProducts.map((product, index) => (
                  <tr key={product.id}
                      className="hover:bg-gray-50 transition-colors">
                    <td className="table-cell text-center">
                      <span className="font-bold">
                        {index === 0 ? '🥇' :
                         index === 1 ? '🥈' :
                         index === 2 ? '🥉' :
                         `#${index + 1}`}
                      </span>
                    </td>
                    <td className="table-cell">
                      <p className="font-medium text-gray-900">
                        {product.name}
                      </p>
                    </td>
                    <td className="table-cell">
                      <span className="badge-blue">{product.sku}</span>
                    </td>
                    <td className="table-cell text-gray-500">
                      {product.category_name || '—'}
                    </td>
                    <td className="table-cell">
                      <span className="badge-green">
                        {product.total_sold} units
                      </span>
                    </td>
                    <td className="table-cell font-bold text-green-600">
                      {formatCurrency(product.total_revenue)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
};

export default Reports;