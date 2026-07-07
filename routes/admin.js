const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { isAuthenticated, isAdmin } = require('../middleware/auth');

// Admin dashboard
router.get('/', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const stats = {
      totalOrders: (await pool.query('SELECT COUNT(*) FROM orders')).rows[0].count,
      totalRevenue: (await pool.query('SELECT COALESCE(SUM(total_amount), 0) as total FROM orders WHERE status != $1', ['cancelled'])).rows[0].total,
      totalProducts: (await pool.query('SELECT COUNT(*) FROM products')).rows[0].count,
      totalUsers: (await pool.query('SELECT COUNT(*) FROM users')).rows[0].count,
      pendingOrders: (await pool.query('SELECT COUNT(*) FROM orders WHERE status = $1', ['pending'])).rows[0].count,
    };

    const recentOrders = await pool.query(
      `SELECT o.*, u.username FROM orders o LEFT JOIN users u ON o.user_id = u.id ORDER BY o.created_at DESC LIMIT 10`
    );

    const topProducts = await pool.query(
      'SELECT * FROM products ORDER BY sold DESC LIMIT 5'
    );

    res.render('admin/dashboard', { title: 'Admin Dashboard', stats, recentOrders: recentOrders.rows, topProducts: topProducts.rows });
  } catch (err) {
    console.error(err);
    res.redirect('/');
  }
});

// Admin products
router.get('/products', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const products = await pool.query(
      `SELECT p.*, c.name as category_name FROM products p LEFT JOIN categories c ON p.category_id = c.id ORDER BY p.created_at DESC`
    );
    const categories = await pool.query('SELECT * FROM categories ORDER BY id');
    res.render('admin/products', { title: 'Manage Products', products: products.rows, categories: categories.rows });
  } catch (err) {
    console.error(err);
    res.redirect('/admin');
  }
});

// Add product
router.post('/products/add', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const { name, description, price, original_price, image, category_id, stock, is_featured } = req.body;
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    await pool.query(
      `INSERT INTO products (name, slug, description, price, original_price, image, category_id, stock, is_featured) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [name, slug, description, parseFloat(price), parseFloat(original_price) || null, image, parseInt(category_id) || null, parseInt(stock) || 0, is_featured === 'on']
    );

    req.flash('success', 'Product added!');
    res.redirect('/admin/products');
  } catch (err) {
    console.error(err);
    req.flash('error', 'Failed to add product');
    res.redirect('/admin/products');
  }
});

// Edit product form
router.get('/products/edit/:id', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const product = await pool.query('SELECT * FROM products WHERE id = $1', [req.params.id]);
    const categories = await pool.query('SELECT * FROM categories ORDER BY id');
    if (product.rows.length === 0) {
      req.flash('error', 'Product not found');
      return res.redirect('/admin/products');
    }
    res.render('admin/edit-product', { title: 'Edit Product', product: product.rows[0], categories: categories.rows });
  } catch (err) {
    console.error(err);
    res.redirect('/admin/products');
  }
});

// Update product
router.post('/products/edit/:id', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const { name, description, price, original_price, image, category_id, stock, is_active, is_featured } = req.body;
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    await pool.query(
      `UPDATE products SET name=$1, slug=$2, description=$3, price=$4, original_price=$5, image=$6, category_id=$7, stock=$8, is_active=$9, is_featured=$10, updated_at=NOW() WHERE id=$11`,
      [name, slug, description, parseFloat(price), parseFloat(original_price) || null, image, parseInt(category_id) || null, parseInt(stock) || 0, is_active === 'on', is_featured === 'on', req.params.id]
    );

    req.flash('success', 'Product updated!');
    res.redirect('/admin/products');
  } catch (err) {
    console.error(err);
    req.flash('error', 'Failed to update product');
    res.redirect('/admin/products');
  }
});

// Delete product
router.post('/products/delete/:id', isAuthenticated, isAdmin, async (req, res) => {
  try {
    await pool.query('DELETE FROM products WHERE id = $1', [req.params.id]);
    req.flash('success', 'Product deleted');
    res.redirect('/admin/products');
  } catch (err) {
    console.error(err);
    req.flash('error', 'Failed to delete product');
    res.redirect('/admin/products');
  }
});

// Admin orders
router.get('/orders', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const { status } = req.query;
    let query = `SELECT o.*, u.username, u.email FROM orders o LEFT JOIN users u ON o.user_id = u.id`;
    const params = [];

    if (status) {
      query += ' WHERE o.status = $1';
      params.push(status);
    }

    query += ' ORDER BY o.created_at DESC';

    const orders = await pool.query(query, params);

    for (let order of orders.rows) {
      const items = await pool.query('SELECT * FROM order_items WHERE order_id = $1', [order.id]);
      order.items = items.rows;
    }

    const counts = {
      all: (await pool.query('SELECT COUNT(*) FROM orders')).rows[0].count,
      pending: (await pool.query("SELECT COUNT(*) FROM orders WHERE status = 'pending'")).rows[0].count,
      confirmed: (await pool.query("SELECT COUNT(*) FROM orders WHERE status = 'confirmed'")).rows[0].count,
      shipped: (await pool.query("SELECT COUNT(*) FROM orders WHERE status = 'shipped'")).rows[0].count,
      delivered: (await pool.query("SELECT COUNT(*) FROM orders WHERE status = 'delivered'")).rows[0].count,
      cancelled: (await pool.query("SELECT COUNT(*) FROM orders WHERE status = 'cancelled'")).rows[0].count,
    };

    res.render('admin/orders', { title: 'Manage Orders', orders: orders.rows, currentStatus: status || '', counts });
  } catch (err) {
    console.error(err);
    res.redirect('/admin');
  }
});

// Update order status
router.post('/orders/:id/status', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const { status } = req.body;
    await pool.query('UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2', [status, req.params.id]);
    req.flash('success', 'Order status updated');
    res.redirect('/admin/orders');
  } catch (err) {
    console.error(err);
    req.flash('error', 'Failed to update status');
    res.redirect('/admin/orders');
  }
});

// Admin users
router.get('/users', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const users = await pool.query('SELECT * FROM users ORDER BY created_at DESC');
    res.render('admin/users', { title: 'Manage Users', users: users.rows });
  } catch (err) {
    console.error(err);
    res.redirect('/admin');
  }
});

// Toggle user role
router.post('/users/:id/role', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const { role } = req.body;
    await pool.query('UPDATE users SET role = $1, updated_at = NOW() WHERE id = $2', [role, req.params.id]);
    req.flash('success', 'User role updated');
    res.redirect('/admin/users');
  } catch (err) {
    console.error(err);
    req.flash('error', 'Failed to update user');
    res.redirect('/admin/users');
  }
});

// Delete user
router.post('/users/:id/delete', isAuthenticated, isAdmin, async (req, res) => {
  try {
    if (parseInt(req.params.id) === req.session.user.id) {
      req.flash('error', 'Cannot delete your own account');
      return res.redirect('/admin/users');
    }
    await pool.query('DELETE FROM users WHERE id = $1', [req.params.id]);
    req.flash('success', 'User deleted');
    res.redirect('/admin/users');
  } catch (err) {
    console.error(err);
    req.flash('error', 'Failed to delete user');
    res.redirect('/admin/users');
  }
});

module.exports = router;
