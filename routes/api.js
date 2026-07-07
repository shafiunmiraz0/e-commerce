const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { isAuthenticated } = require('../middleware/auth');

// Helper: get total cart count (DB or session)
async function getCartCount(req) {
  if (req.session.user) {
    const r = await pool.query('SELECT COALESCE(SUM(quantity), 0) as count FROM cart WHERE user_id = $1', [req.session.user.id]);
    return parseInt(r.rows[0].count);
  }
  const guest = req.session.guestCart || [];
  return guest.reduce((s, i) => s + i.quantity, 0);
}

// ==================== CART API ====================

// Get cart count
router.get('/cart/count', async (req, res) => {
  try {
    const count = await getCartCount(req);
    res.json({ success: true, count });
  } catch (err) {
    res.json({ success: true, count: 0 });
  }
});

// Add to cart (works for guests and logged-in users)
router.post('/cart/add', async (req, res) => {
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

    if (req.session.user) {
      // Logged-in: save to DB
      const existing = await pool.query('SELECT * FROM cart WHERE user_id = $1 AND product_id = $2', [req.session.user.id, product_id]);
      if (existing.rows.length > 0) {
        await pool.query('UPDATE cart SET quantity = $1 WHERE id = $2', [existing.rows[0].quantity + qty, existing.rows[0].id]);
      } else {
        await pool.query('INSERT INTO cart (user_id, product_id, quantity) VALUES ($1, $2, $3)', [req.session.user.id, product_id, qty]);
      }
    } else {
      // Guest: save to session
      if (!req.session.guestCart) req.session.guestCart = [];
      const existing = req.session.guestCart.find(i => i.product_id === product_id);
      if (existing) {
        existing.quantity += qty;
      } else {
        req.session.guestCart.push({ product_id, quantity: qty });
      }
    }

    const count = await getCartCount(req);
    res.json({
      success: true,
      message: `${product.rows[0].name} added to cart!`,
      cartCount: count
    });
  } catch (err) {
    console.error(err);
    res.json({ success: false, message: 'Failed to add to cart' });
  }
});

// Update cart quantity
router.post('/cart/update', async (req, res) => {
  try {
    const { cart_id, quantity } = req.body;
    const qty = parseInt(quantity);

    if (req.session.user) {
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
      res.json({ success: true, cartCount: count, total: total.toFixed(2), itemTotal, message: qty <= 0 ? 'Item removed' : 'Cart updated' });
    } else {
      // Guest session cart
      if (!req.session.guestCart) req.session.guestCart = [];
      if (qty <= 0) {
        req.session.guestCart = req.session.guestCart.filter(i => i.product_id != cart_id);
      } else {
        const item = req.session.guestCart.find(i => i.product_id == cart_id);
        if (item) item.quantity = qty;
      }
      const count = req.session.guestCart.reduce((s, i) => s + i.quantity, 0);
      res.json({ success: true, cartCount: count, message: qty <= 0 ? 'Item removed' : 'Cart updated' });
    }
  } catch (err) {
    console.error(err);
    res.json({ success: false, message: 'Failed to update cart' });
  }
});

// Remove from cart
router.post('/cart/remove', async (req, res) => {
  try {
    const { cart_id } = req.body;

    if (req.session.user) {
      await pool.query('DELETE FROM cart WHERE id = $1 AND user_id = $2', [cart_id, req.session.user.id]);
    } else {
      if (!req.session.guestCart) req.session.guestCart = [];
      req.session.guestCart = req.session.guestCart.filter(i => i.product_id != cart_id);
    }

    const count = await getCartCount(req);
    res.json({ success: true, cartCount: count, message: 'Item removed from cart' });
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

// ==================== PRODUCTS API (Load More) ====================

router.get('/products', async (req, res) => {
  try {
    const { page, category, search, sort, min_price, max_price } = req.query;
    const limit = 12;
    const offset = ((parseInt(page) || 1) - 1) * limit;

    let whereClause = 'WHERE p.is_active = true';
    const params = [];
    let paramIndex = 1;

    if (category) {
      whereClause += ` AND c.slug = $${paramIndex++}`;
      params.push(category);
    }
    if (search) {
      whereClause += ` AND (p.name ILIKE $${paramIndex} OR p.description ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }
    if (min_price) {
      whereClause += ` AND p.price >= $${paramIndex++}`;
      params.push(parseFloat(min_price));
    }
    if (max_price) {
      whereClause += ` AND p.price <= $${paramIndex++}`;
      params.push(parseFloat(max_price));
    }

    let orderClause = 'ORDER BY p.created_at DESC';
    if (sort === 'price_asc') orderClause = 'ORDER BY p.price ASC';
    else if (sort === 'price_desc') orderClause = 'ORDER BY p.price DESC';
    else if (sort === 'popular') orderClause = 'ORDER BY p.sold DESC';
    else if (sort === 'rating') orderClause = 'ORDER BY p.rating DESC';

    const products = await pool.query(
      `SELECT p.*, c.name as category_name, c.slug as category_slug FROM products p LEFT JOIN categories c ON p.category_id = c.id ${whereClause} ${orderClause} LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
      [...params, limit, offset]
    );

    res.json({ success: true, products: products.rows });
  } catch (err) {
    console.error(err);
    res.json({ success: false, products: [] });
  }
});

// ==================== REVIEWS API ====================

router.post('/reviews', isAuthenticated, async (req, res) => {
  try {
    const { product_id, rating, title, comment } = req.body;
    const r = parseInt(rating);
    if (!product_id || !r || r < 1 || r > 5) {
      return res.json({ success: false, message: 'Invalid rating' });
    }

    await pool.query(
      'INSERT INTO reviews (product_id, user_id, rating, title, comment) VALUES ($1, $2, $3, $4, $5)',
      [product_id, req.session.user.id, r, title || null, comment || null]
    );

    const stats = await pool.query(
      'SELECT COUNT(*) as count, COALESCE(AVG(rating), 0) as avg FROM reviews WHERE product_id = $1',
      [product_id]
    );
    await pool.query(
      'UPDATE products SET reviews_count = $1, rating = $2 WHERE id = $3',
      [parseInt(stats.rows[0].count), parseFloat(stats.rows[0].avg).toFixed(1), product_id]
    );

    const review = await pool.query(
      `SELECT r.*, u.username, u.avatar FROM reviews r LEFT JOIN users u ON r.user_id = u.id WHERE r.product_id = $1 AND r.user_id = $2 ORDER BY r.created_at DESC LIMIT 1`,
      [product_id, req.session.user.id]
    );

    res.json({
      success: true,
      message: 'Review submitted!',
      review: review.rows[0],
      stats: { count: parseInt(stats.rows[0].count), avg: parseFloat(stats.rows[0].avg).toFixed(1) }
    });
  } catch (err) {
    console.error(err);
    res.json({ success: false, message: 'Failed to submit review' });
  }
});

// ==================== SAVE FOR LATER ====================

router.post('/cart/save-for-later', isAuthenticated, async (req, res) => {
  try {
    const { cart_id } = req.body;
    const item = await pool.query('SELECT * FROM cart WHERE id = $1 AND user_id = $2', [cart_id, req.session.user.id]);
    if (item.rows.length === 0) return res.json({ success: false, message: 'Item not found' });

    const product_id = item.rows[0].product_id;
    const existing = await pool.query('SELECT id FROM wishlist WHERE user_id = $1 AND product_id = $2', [req.session.user.id, product_id]);
    if (existing.rows.length === 0) {
      await pool.query('INSERT INTO wishlist (user_id, product_id) VALUES ($1, $2)', [req.session.user.id, product_id]);
    }
    await pool.query('DELETE FROM cart WHERE id = $1 AND user_id = $2', [cart_id, req.session.user.id]);

    const countResult = await pool.query('SELECT COALESCE(SUM(quantity), 0) as count FROM cart WHERE user_id = $1', [req.session.user.id]);
    res.json({ success: true, cartCount: parseInt(countResult.rows[0].count), message: 'Moved to wishlist' });
  } catch (err) {
    console.error(err);
    res.json({ success: false, message: 'Failed to save item' });
  }
});

module.exports = router;
