const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { isAuthenticated } = require('../middleware/auth');

// ==================== CART API ====================

// Get cart count
router.get('/cart/count', async (req, res) => {
  if (!req.session.user) return res.json({ success: true, count: 0 });
  try {
    const result = await pool.query('SELECT COALESCE(SUM(quantity), 0) as count FROM cart WHERE user_id = $1', [req.session.user.id]);
    res.json({ success: true, count: parseInt(result.rows[0].count) });
  } catch (err) {
    res.json({ success: true, count: 0 });
  }
});

// Add to cart
router.post('/cart/add', isAuthenticated, async (req, res) => {
  try {
    const { product_id, quantity } = req.body;
    const qty = parseInt(quantity) || 1;

    const product = await pool.query('SELECT * FROM products WHERE id = $1 AND is_active = true', [product_id]);
    if (product.rows.length === 0) {
      return res.json({ success: false, message: 'Product not found' });
    }

    if (product.rows[0].stock < qty) {
      return res.json({ success: false, message: 'Not enough stock' });
    }

    const existing = await pool.query('SELECT * FROM cart WHERE user_id = $1 AND product_id = $2', [req.session.user.id, product_id]);

    if (existing.rows.length > 0) {
      const newQty = existing.rows[0].quantity + qty;
      await pool.query('UPDATE cart SET quantity = $1 WHERE id = $2', [newQty, existing.rows[0].id]);
    } else {
      await pool.query('INSERT INTO cart (user_id, product_id, quantity) VALUES ($1, $2, $3)', [req.session.user.id, product_id, qty]);
    }

    const countResult = await pool.query('SELECT COALESCE(SUM(quantity), 0) as count FROM cart WHERE user_id = $1', [req.session.user.id]);

    res.json({
      success: true,
      message: `${product.rows[0].name} added to cart!`,
      cartCount: parseInt(countResult.rows[0].count)
    });
  } catch (err) {
    console.error(err);
    res.json({ success: false, message: 'Failed to add to cart' });
  }
});

// Update cart quantity
router.post('/cart/update', isAuthenticated, async (req, res) => {
  try {
    const { cart_id, quantity } = req.body;
    const qty = parseInt(quantity);

    if (qty <= 0) {
      await pool.query('DELETE FROM cart WHERE id = $1 AND user_id = $2', [cart_id, req.session.user.id]);
    } else {
      await pool.query('UPDATE cart SET quantity = $1 WHERE id = $2 AND user_id = $3', [qty, cart_id, req.session.user.id]);
    }

    const cartItems = await pool.query(
      `SELECT c.*, p.price FROM cart c LEFT JOIN products p ON c.product_id = p.id WHERE c.user_id = $1`,
      [req.session.user.id]
    );

    const total = cartItems.rows.reduce((sum, item) => sum + parseFloat(item.price) * item.quantity, 0);
    const count = cartItems.rows.reduce((sum, item) => sum + item.quantity, 0);

    const updatedItem = cartItems.rows.find(item => item.id == cart_id);
    const itemTotal = updatedItem ? (parseFloat(updatedItem.price) * updatedItem.quantity).toFixed(2) : '0.00';

    res.json({
      success: true,
      cartCount: count,
      total: total.toFixed(2),
      itemTotal,
      message: qty <= 0 ? 'Item removed' : 'Cart updated'
    });
  } catch (err) {
    console.error(err);
    res.json({ success: false, message: 'Failed to update cart' });
  }
});

// Remove from cart
router.post('/cart/remove', isAuthenticated, async (req, res) => {
  try {
    const { cart_id } = req.body;
    await pool.query('DELETE FROM cart WHERE id = $1 AND user_id = $2', [cart_id, req.session.user.id]);

    const countResult = await pool.query('SELECT COALESCE(SUM(quantity), 0) as count FROM cart WHERE user_id = $1', [req.session.user.id]);

    res.json({
      success: true,
      cartCount: parseInt(countResult.rows[0].count),
      message: 'Item removed from cart'
    });
  } catch (err) {
    console.error(err);
    res.json({ success: false, message: 'Failed to remove item' });
  }
});

// ==================== SEARCH API ====================

router.get('/search', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.trim().length < 2) return res.json({ success: true, results: [] });

    const products = await pool.query(
      `SELECT id, name, slug, price, original_price, image, rating
       FROM products
       WHERE is_active = true AND (name ILIKE $1 OR description ILIKE $1)
       ORDER BY sold DESC LIMIT 8`,
      [`%${q}%`]
    );

    res.json({ success: true, results: products.rows });
  } catch (err) {
    console.error(err);
    res.json({ success: true, results: [] });
  }
});

// ==================== WISHLIST API ====================

router.post('/wishlist/toggle', isAuthenticated, async (req, res) => {
  try {
    const { product_id } = req.body;

    const existing = await pool.query('SELECT id FROM wishlist WHERE user_id = $1 AND product_id = $2', [req.session.user.id, product_id]);

    if (existing.rows.length > 0) {
      await pool.query('DELETE FROM wishlist WHERE user_id = $1 AND product_id = $2', [req.session.user.id, product_id]);
      const countResult = await pool.query('SELECT COUNT(*) as count FROM wishlist WHERE user_id = $1', [req.session.user.id]);
      res.json({ success: true, inWishlist: false, count: parseInt(countResult.rows[0].count), message: 'Removed from wishlist' });
    } else {
      await pool.query('INSERT INTO wishlist (user_id, product_id) VALUES ($1, $2)', [req.session.user.id, product_id]);
      const countResult = await pool.query('SELECT COUNT(*) as count FROM wishlist WHERE user_id = $1', [req.session.user.id]);
      res.json({ success: true, inWishlist: true, count: parseInt(countResult.rows[0].count), message: 'Added to wishlist' });
    }
  } catch (err) {
    console.error(err);
    res.json({ success: false, message: 'Failed to update wishlist' });
  }
});

router.get('/wishlist/count', async (req, res) => {
  if (!req.session.user) return res.json({ success: true, count: 0 });
  try {
    const result = await pool.query('SELECT COUNT(*) as count FROM wishlist WHERE user_id = $1', [req.session.user.id]);
    res.json({ success: true, count: parseInt(result.rows[0].count) });
  } catch (err) {
    res.json({ success: true, count: 0 });
  }
});

module.exports = router;
