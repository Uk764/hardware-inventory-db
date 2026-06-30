// reportsController.js
// Generates all reports and dashboard statistics

const pool = require('../config/db');

// ================================================
// FUNCTION 1: DASHBOARD SUMMARY
// Route: GET /api/reports/summary
// Returns: key stats for dashboard cards
// ================================================
const getDashboardSummary = async (req, res) => {
  try {

    // Total products count
    const productsResult = await pool.query(
      `SELECT COUNT(*) AS total_products
       FROM products WHERE is_active = true`
    );

    // Low stock count
    const lowStockResult = await pool.query(
      `SELECT COUNT(*) AS low_stock_count
       FROM products
       WHERE is_active = true
         AND current_stock <= minimum_stock`
    );

    // Today's sales
    const todayResult = await pool.query(
      `SELECT
        COUNT(*)                       AS total_invoices,
        COALESCE(SUM(total_amount), 0) AS total_revenue,
        COALESCE(SUM(total_gst), 0)    AS total_gst
       FROM invoices
       WHERE DATE(created_at) = CURRENT_DATE`
    );

    // This month's revenue
    const monthResult = await pool.query(
      `SELECT COALESCE(SUM(total_amount), 0) AS monthly_revenue
       FROM invoices
       WHERE DATE_TRUNC('month', created_at) = DATE_TRUNC('month', NOW())`
    );

    // Total revenue all time
    const totalRevenueResult = await pool.query(
      `SELECT COALESCE(SUM(total_amount), 0) AS total_revenue
       FROM invoices`
    );

    // Total categories
    const categoriesResult = await pool.query(
      `SELECT COUNT(*) AS total_categories
       FROM categories WHERE is_active = true`
    );

    // Total suppliers
    const suppliersResult = await pool.query(
      `SELECT COUNT(*) AS total_suppliers
       FROM suppliers WHERE is_active = true`
    );

    // Out of stock count
    const outOfStockResult = await pool.query(
      `SELECT COUNT(*) AS out_of_stock
       FROM products
       WHERE is_active = true AND current_stock = 0`
    );

    res.status(200).json({
      success: true,
      data: {
        total_products:   parseInt(productsResult.rows[0].total_products),
        low_stock_count:  parseInt(lowStockResult.rows[0].low_stock_count),
        out_of_stock:     parseInt(outOfStockResult.rows[0].out_of_stock),
        total_categories: parseInt(categoriesResult.rows[0].total_categories),
        total_suppliers:  parseInt(suppliersResult.rows[0].total_suppliers),
        today: {
          invoices: parseInt(todayResult.rows[0].total_invoices),
          revenue:  parseFloat(todayResult.rows[0].total_revenue),
          gst:      parseFloat(todayResult.rows[0].total_gst),
        },
        monthly_revenue: parseFloat(monthResult.rows[0].monthly_revenue),
        total_revenue:   parseFloat(totalRevenueResult.rows[0].total_revenue),
      }
    });

  } catch (error) {
    console.error('Dashboard summary error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ================================================
// FUNCTION 2: LAST 7 DAYS SALES CHART DATA (FIXED)
// Route: GET /api/reports/sales
// ================================================
const getSalesChart = async (req, res) => {
  try {
    // Let PostgreSQL do all date math — avoids timezone mismatch
    const result = await pool.query(
      `SELECT
        TO_CHAR(d::date, 'DD Mon') AS day,
        d::date                    AS date,
        COALESCE(COUNT(i.id), 0)           AS invoices,
        COALESCE(SUM(i.total_amount), 0)   AS revenue,
        COALESCE(SUM(i.total_gst), 0)      AS gst
       FROM generate_series(
              CURRENT_DATE - INTERVAL '6 days',
              CURRENT_DATE,
              INTERVAL '1 day'
            ) AS d
       LEFT JOIN invoices i
              ON DATE(i.created_at) = d::date
       GROUP BY d
       ORDER BY d ASC`
    );

    const data = result.rows.map(r => ({
      day:      r.day,
      revenue:  parseFloat(r.revenue),
      invoices: parseInt(r.invoices),
      gst:      parseFloat(r.gst),
    }));

    res.status(200).json({
      success: true,
      data
    });

  } catch (error) {
    console.error('Sales chart error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
// ================================================
// FUNCTION 3: TOP SELLING PRODUCTS
// Route: GET /api/reports/top-products
// ================================================
const getTopProducts = async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const result = await pool.query(
      `SELECT
        p.id,
        p.name,
        p.sku,
        c.name              AS category_name,
        SUM(ii.quantity)    AS total_sold,
        SUM(ii.total_price) AS total_revenue
       FROM invoice_items ii
       JOIN products p  ON p.id  = ii.product_id
       LEFT JOIN categories c ON c.id = p.category_id
       GROUP BY p.id, p.name, p.sku, c.name
       ORDER BY total_sold DESC
       LIMIT $1`,
      [parseInt(limit)]
    );

    res.status(200).json({
      success: true,
      data: result.rows
    });

  } catch (error) {
    console.error('Top products error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ================================================
// FUNCTION 4: MONTHLY REVENUE (last 6 months)
// Route: GET /api/reports/monthly
// ================================================
const getMonthlyRevenue = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
        TO_CHAR(DATE_TRUNC('month', created_at), 'Mon YYYY') AS month,
        DATE_TRUNC('month', created_at)                       AS month_date,
        COUNT(*)                                              AS invoices,
        COALESCE(SUM(total_amount), 0)                       AS revenue,
        COALESCE(SUM(total_gst), 0)                          AS gst
       FROM invoices
       WHERE created_at >= NOW() - INTERVAL '6 months'
       GROUP BY DATE_TRUNC('month', created_at),
                TO_CHAR(DATE_TRUNC('month', created_at), 'Mon YYYY')
       ORDER BY month_date ASC`
    );

    res.status(200).json({
      success: true,
      data: result.rows.map(r => ({
        month:    r.month,
        revenue:  parseFloat(r.revenue),
        invoices: parseInt(r.invoices),
        gst:      parseFloat(r.gst),
      }))
    });

  } catch (error) {
    console.error('Monthly revenue error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ================================================
// FUNCTION 5: CATEGORY WISE SALES
// Route: GET /api/reports/category-sales
// ================================================
const getCategorySales = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
        COALESCE(c.name, 'Uncategorized') AS name,
        SUM(ii.quantity)                   AS total_sold,
        SUM(ii.total_price)                AS total_revenue
       FROM invoice_items ii
       JOIN products p    ON p.id  = ii.product_id
       LEFT JOIN categories c ON c.id = p.category_id
       GROUP BY c.name
       ORDER BY total_revenue DESC
       LIMIT 8`
    );

    res.status(200).json({
      success: true,
      data: result.rows.map(r => ({
        name:    r.name,
        value:   parseFloat(r.total_revenue),
        sold:    parseInt(r.total_sold),
      }))
    });

  } catch (error) {
    console.error('Category sales error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = {
  getDashboardSummary,
  getSalesChart,
  getTopProducts,
  getMonthlyRevenue,
  getCategorySales,
};