const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const pool = require('../config/database');
const { isAuthenticated } = require('../middleware/auth');

// Login page
router.get('/login', (req, res) => {
  if (req.session.user) return res.redirect('/');
  res.render('login', { title: 'Login', returnTo: req.query.returnTo || '' });
});

// Register page
router.get('/register', (req, res) => {
  if (req.session.user) return res.redirect('/');
  res.render('register', { title: 'Register', returnTo: req.query.returnTo || '' });
});

// Register POST
router.post('/register', async (req, res) => {
  try {
    const { username, email, password, password_confirm, full_name, returnTo } = req.body;

    if (!username || !email || !password) {
      req.flash('error', 'All fields are required');
      return res.redirect('/register');
    }

    if (password !== password_confirm) {
      req.flash('error', 'Passwords do not match');
      return res.redirect('/register');
    }

    if (password.length < 6) {
      req.flash('error', 'Password must be at least 6 characters');
      return res.redirect('/register');
    }

    const existing = await pool.query('SELECT id FROM users WHERE email = $1 OR username = $2', [email, username]);
    if (existing.rows.length > 0) {
      req.flash('error', 'Username or email already exists');
      return res.redirect('/register');
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const result = await pool.query(
      'INSERT INTO users (username, email, password, full_name) VALUES ($1, $2, $3, $4) RETURNING *',
      [username, email, hashedPassword, full_name || '']
    );

    req.session.user = {
      id: result.rows[0].id,
      username: result.rows[0].username,
      email: result.rows[0].email,
      full_name: result.rows[0].full_name,
      role: result.rows[0].role
    };

    req.flash('success', 'Account created successfully!');

    // Process pending buy-now item
    if (req.session.buyNow) {
      return res.redirect('/checkout');
    }

    if (returnTo) return res.redirect(returnTo);
    res.redirect('/');
  } catch (err) {
    console.error(err);
    req.flash('error', 'Registration failed. Try again.');
    res.redirect('/register');
  }
});

// Login POST
router.post('/login', async (req, res) => {
  try {
    const { email, password, returnTo } = req.body;

    if (!email || !password) {
      req.flash('error', 'All fields are required');
      return res.redirect('/login');
    }

    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) {
      req.flash('error', 'Invalid email or password');
      return res.redirect('/login');
    }

    const user = result.rows[0];
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      req.flash('error', 'Invalid email or password');
      return res.redirect('/login');
    }

    req.session.user = {
      id: user.id,
      username: user.username,
      email: user.email,
      full_name: user.full_name,
      role: user.role,
      avatar: user.avatar
    };

    req.flash('success', `Welcome back, ${user.full_name || user.username}!`);

    // Process pending buy-now item
    if (req.session.buyNow) {
      return res.redirect('/checkout');
    }

    if (returnTo) return res.redirect(returnTo);
    if (user.role === 'admin') return res.redirect('/admin');
    res.redirect('/');
  } catch (err) {
    console.error(err);
    req.flash('error', 'Login failed. Try again.');
    res.redirect('/login');
  }
});

// Logout
router.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/');
  });
});

// Forgot password page (placeholder)
router.get('/forgot-password', (req, res) => {
  res.render('forgot-password', { title: 'Forgot Password' });
});

// Account dashboard
router.get('/account', isAuthenticated, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM users WHERE id = $1', [req.session.user.id]);
    const orders = await pool.query(
      'SELECT * FROM orders WHERE user_id = $1 ORDER BY created_at DESC',
      [req.session.user.id]
    );

    for (let order of orders.rows) {
      const items = await pool.query('SELECT * FROM order_items WHERE order_id = $1', [order.id]);
      order.items = items.rows;
    }

    const orderStats = {
      total: orders.rows.length,
      pending: orders.rows.filter(o => o.status === 'pending').length,
      confirmed: orders.rows.filter(o => o.status === 'confirmed').length,
      shipped: orders.rows.filter(o => o.status === 'shipped').length,
      delivered: orders.rows.filter(o => o.status === 'delivered').length,
      cancelled: orders.rows.filter(o => o.status === 'cancelled').length,
    };

    res.render('account/dashboard', { title: 'My Account', profile: result.rows[0], orders: orders.rows, orderStats, activeTab: 'overview' });
  } catch (err) {
    console.error(err);
    res.redirect('/');
  }
});

// Account orders
router.get('/account/orders', isAuthenticated, async (req, res) => {
  try {
    const { status } = req.query;
    const result = await pool.query('SELECT * FROM users WHERE id = $1', [req.session.user.id]);

    let ordersQuery = 'SELECT * FROM orders WHERE user_id = $1';
    const params = [req.session.user.id];

    if (status) {
      ordersQuery += ' AND status = $2';
      params.push(status);
    }

    ordersQuery += ' ORDER BY created_at DESC';
    const orders = await pool.query(ordersQuery, params);

    for (let order of orders.rows) {
      const items = await pool.query('SELECT * FROM order_items WHERE order_id = $1', [order.id]);
      order.items = items.rows;
    }

    const allOrders = await pool.query('SELECT * FROM orders WHERE user_id = $1', [req.session.user.id]);
    const orderStats = {
      total: allOrders.rows.length,
      pending: allOrders.rows.filter(o => o.status === 'pending').length,
      confirmed: allOrders.rows.filter(o => o.status === 'confirmed').length,
      shipped: allOrders.rows.filter(o => o.status === 'shipped').length,
      delivered: allOrders.rows.filter(o => o.status === 'delivered').length,
      cancelled: allOrders.rows.filter(o => o.status === 'cancelled').length,
    };

    res.render('account/orders', { title: 'My Orders', profile: result.rows[0], orders: orders.rows, orderStats, activeTab: 'orders', currentStatus: status || '' });
  } catch (err) {
    console.error(err);
    res.redirect('/');
  }
});

// Account profile
router.get('/account/profile', isAuthenticated, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM users WHERE id = $1', [req.session.user.id]);
    res.render('account/profile', { title: 'My Profile', profile: result.rows[0], activeTab: 'profile' });
  } catch (err) {
    console.error(err);
    res.redirect('/');
  }
});

// Update profile
router.post('/account/profile', isAuthenticated, async (req, res) => {
  try {
    const { full_name, phone, address, city, country } = req.body;
    await pool.query(
      'UPDATE users SET full_name = $1, phone = $2, address = $3, city = $4, country = $5, updated_at = NOW() WHERE id = $6',
      [full_name, phone, address, city, country, req.session.user.id]
    );
    req.session.user.full_name = full_name;
    req.flash('success', 'Profile updated!');
    res.redirect('/account/profile');
  } catch (err) {
    console.error(err);
    req.flash('error', 'Update failed');
    res.redirect('/account/profile');
  }
});

module.exports = router;
