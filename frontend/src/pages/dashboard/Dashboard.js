// Dashboard.js
// Real dashboard with live data and charts

import React, { useState, useEffect } from 'react';
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import api from '../../services/api';
import {
  FiPackage, FiAlertTriangle, FiShoppingCart,
  FiTrendingUp, FiTag, FiTruck, FiFileText,
  FiDollarSign
} from 'react-icons/fi';

// ── Format currency ──────────────────────────────
const formatCurrency = (amount) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency', currency: 'INR',
    minimumFractionDigits: 0,
  }).format(amount || 0);

// ── Stat Card Component ──────────────────────────
const StatCard = ({ title, value, icon: Icon, color, subtitle }) => (
  <div className="card flex items-center gap-4 hover:shadow-md
                  transition-shadow">
    <div className={`${color} p-4 rounded-xl flex-shrink-0`}>
      <Icon className="text-2xl text-white" />
    </div>
    <div className="min-w-0">
      <p className="text-gray-500 text-sm truncate">{title}</p>
      <p className="text-2xl font-bold text-gray-900 truncate">{value}</p>
      {subtitle && (
        <p className="text-xs text-gray-400 mt-0.5 truncate">{subtitle}</p>
      )}
    </div>
  </div>
);

// ── Custom Tooltip for Charts ────────────────────
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl
                      shadow-lg p-3">
        <p className="font-semibold text-gray-900 mb-1">{label}</p>
        {payload.map((entry, i) => (
          <p key={i} style={{ color: entry.color }}
             className="text-sm">
            {entry.name}: {
              entry.name === 'Revenue'
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

// ================================================
// MAIN DASHBOARD
// ================================================
const Dashboard = () => {
  const [summary, setSummary]     = useState(null);
  const [salesData, setSalesData] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [monthlyData, setMonthlyData] = useState([]);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      try {
        const [sumRes, salesRes, topRes, monthRes] = await Promise.all([
          api.get('/reports/summary'),
          api.get('/reports/sales'),
          api.get('/reports/top-products?limit=5'),
          api.get('/reports/monthly'),
        ]);

        setSummary(sumRes.data.data);
        setSalesData(salesRes.data.data);
        setTopProducts(topRes.data.data);
        setMonthlyData(monthRes.data.data);
      } catch (error) {
        console.error('Dashboard fetch error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, []);

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

      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">
          Welcome back! Here's your store overview.
        </p>
      </div>

      {/* ── TOP STATS ROW 1 ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Today's Revenue"
          value={formatCurrency(summary?.today?.revenue)}
          icon={FiDollarSign}
          color="bg-green-500"
          subtitle={`${summary?.today?.invoices || 0} invoices today`}
        />
        <StatCard
          title="Monthly Revenue"
          value={formatCurrency(summary?.monthly_revenue)}
          icon={FiTrendingUp}
          color="bg-blue-500"
          subtitle="This month"
        />
        <StatCard
          title="Total Products"
          value={summary?.total_products || 0}
          icon={FiPackage}
          color="bg-purple-500"
          subtitle={`${summary?.total_categories || 0} categories`}
        />
        <StatCard
          title="Low Stock Alert"
          value={summary?.low_stock_count || 0}
          icon={FiAlertTriangle}
          color="bg-yellow-500"
          subtitle={`${summary?.out_of_stock || 0} out of stock`}
        />
      </div>

      {/* ── TOP STATS ROW 2 ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Today's GST"
          value={formatCurrency(summary?.today?.gst)}
          icon={FiFileText}
          color="bg-indigo-500"
          subtitle="GST collected today"
        />
        <StatCard
          title="Total Revenue"
          value={formatCurrency(summary?.total_revenue)}
          icon={FiShoppingCart}
          color="bg-pink-500"
          subtitle="All time"
        />
        <StatCard
          title="Suppliers"
          value={summary?.total_suppliers || 0}
          icon={FiTruck}
          color="bg-orange-500"
          subtitle="Active suppliers"
        />
        <StatCard
          title="Categories"
          value={summary?.total_categories || 0}
          icon={FiTag}
          color="bg-teal-500"
          subtitle="Product categories"
        />
      </div>

      {/* ── CHARTS ROW ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Last 7 Days Sales Chart */}
        <div className="card">
          <h2 className="text-lg font-bold text-gray-900 mb-4">
            📈 Last 7 Days Revenue
          </h2>
          {salesData.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <p>No sales data yet</p>
              <p className="text-sm mt-1">
                Start billing to see your chart
              </p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={salesData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="day"
                  tick={{ fontSize: 11, fill: '#6b7280' }}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#6b7280' }}
                  tickFormatter={(v) => `₹${v}`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  name="Revenue"
                  stroke="#2563eb"
                  strokeWidth={2.5}
                  dot={{ fill: '#2563eb', r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Monthly Revenue Bar Chart */}
        <div className="card">
          <h2 className="text-lg font-bold text-gray-900 mb-4">
            📊 Monthly Revenue (6 Months)
          </h2>
          {monthlyData.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <p>No monthly data yet</p>
              <p className="text-sm mt-1">
                Data will appear after first sales
              </p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 11, fill: '#6b7280' }}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#6b7280' }}
                  tickFormatter={(v) => `₹${v}`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Bar
                  dataKey="revenue"
                  name="Revenue"
                  fill="#2563eb"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="gst"
                  name="GST"
                  fill="#60a5fa"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

      </div>

      {/* ── TOP PRODUCTS TABLE ── */}
      <div className="card">
        <h2 className="text-lg font-bold text-gray-900 mb-4">
          🏆 Top Selling Products
        </h2>
        {topProducts.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <p>No sales data yet</p>
            <p className="text-sm mt-1">
              Top products will appear after first sales
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="table-header">#</th>
                  <th className="table-header">Product</th>
                  <th className="table-header">Category</th>
                  <th className="table-header">Units Sold</th>
                  <th className="table-header">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {topProducts.map((product, index) => (
                  <tr key={product.id}
                      className="hover:bg-gray-50 transition-colors">
                    <td className="table-cell">
                      <span className={`font-bold text-lg ${
                        index === 0 ? 'text-yellow-500' :
                        index === 1 ? 'text-gray-400'  :
                        index === 2 ? 'text-orange-500': 'text-gray-400'
                      }`}>
                        {index === 0 ? '🥇' :
                         index === 1 ? '🥈' :
                         index === 2 ? '🥉' : `#${index + 1}`}
                      </span>
                    </td>
                    <td className="table-cell">
                      <p className="font-medium text-gray-900">
                        {product.name}
                      </p>
                      <p className="text-xs text-gray-400">{product.sku}</p>
                    </td>
                    <td className="table-cell text-gray-500">
                      {product.category_name || '—'}
                    </td>
                    <td className="table-cell">
                      <span className="badge-blue">
                        {product.total_sold} units
                      </span>
                    </td>
                    <td className="table-cell font-semibold text-green-600">
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

export default Dashboard;