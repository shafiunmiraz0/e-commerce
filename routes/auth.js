const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const pool = require('../config/database');
const { isAuthenticated } = require('../middleware/auth');

// Login page
router.get('/login', (req, res) => {
  if (req.session.user) return res.redirect('/');
  res.render('login', { title: 'Login' });
});

// Register page
router.get('/register', (req, res) => {
  if (req.session.user) return res.redirect('/');
  res.render('register', { title: 'Register' });
});

// Register POST
router.post('/register', async (req, res) => {
  try {
    const { username, email, password, password_confirm, full_name } = req.body;

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
    const { email, password } = req.body;

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

    if (user.role === 'admin') {
      return res.redirect('/admin');
    }
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

// Profile page
router.get('/profile', isAuthenticated, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM users WHERE id = $1', [req.session.user.id]);
    const orders = await pool.query(
      'SELECT * FROM orders WHERE user_id = $1 ORDER BY created_at DESC LIMIT 10',
      [req.session.user.id]
    );
    res.render('profile', { title: 'My Profile', profile: result.rows[0], orders: orders.rows });
  } catch (err) {
    console.error(err);
    res.redirect('/');
  }
});

// Update profile
router.post('/profile', isAuthenticated, async (req, res) => {
  try {
    const { full_name, phone, address, city, country } = req.body;
    await pool.query(
      'UPDATE users SET full_name = $1, phone = $2, address = $3, city = $4, country = $5, updated_at = NOW() WHERE id = $6',
      [full_name, phone, address, city, country, req.session.user.id]
    );
    req.session.user.full_name = full_name;
    req.flash('success', 'Profile updated!');
    res.redirect('/profile');
  } catch (err) {
    console.error(err);
    req.flash('error', 'Update failed');
    res.redirect('/profile');
  }
});

module.exports = router;
