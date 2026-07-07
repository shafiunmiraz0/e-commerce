const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { isAuthenticated } = require('../middleware/auth');

// View cart
router.get('/', isAuthenticated, async (req, res) => {
  try {
    const cartItems = await pool.query(
      `SELECT c.*, p.name, p.price, p.image, p.stock, p.slug FROM cart c LEFT JOIN products p ON c.product_id = p.id WHERE c.user_id = $1 ORDER BY c.created_at DESC`,
      [req.session.user.id]
    );

    const total = cartItems.rows.reduce((sum, item) => sum + parseFloat(item.price) * item.quantity, 0);

    res.render('cart', { title: 'Shopping Cart', cartItems: cartItems.rows, total });
  } catch (err) {
    console.error(err);
    res.redirect('/');
  }
});

// Add to cart
router.post('/add', isAuthenticated, async (req, res) => {
  try {
    const { product_id, quantity } = req.body;
    const qty = parseInt(quantity) || 1;

    const product = await pool.query('SELECT * FROM products WHERE id = $1', [product_id]);
    if (product.rows.length === 0) {
      req.flash('error', 'Product not found');
      return res.redirect('back');
    }

    if (product.rows[0].stock < qty) {
      req.flash('error', 'Not enough stock');
      return res.redirect('back');
    }

    const existing = await pool.query('SELECT * FROM cart WHERE user_id = $1 AND product_id = $2', [req.session.user.id, product_id]);

    if (existing.rows.length > 0) {
      const newQty = existing.rows[0].quantity + qty;
      await pool.query('UPDATE cart SET quantity = $1 WHERE id = $2', [newQty, existing.rows[0].id]);
    } else {
      await pool.query('INSERT INTO cart (user_id, product_id, quantity) VALUES ($1, $2, $3)', [req.session.user.id, product_id, qty]);
    }

    req.flash('success', 'Added to cart!');
    res.redirect(req.get('Referrer') || '/cart');
  } catch (err) {
    console.error(err);
    req.flash('error', 'Failed to add to cart');
    res.redirect('back');
  }
});

// Buy Now - add to cart and go to checkout (or redirect to login)
router.post('/buy-now', async (req, res) => {
  try {
    const { product_id, quantity } = req.body;
    const qty = parseInt(quantity) || 1;

    // If not logged in, store intent and redirect to login
    if (!req.session.user) {
      req.session.buyNow = { product_id: parseInt(product_id), quantity: qty };
      req.flash('info', 'Please sign in or create an account to complete your order');
      return res.redirect('/login?returnTo=/checkout');
    }

    const product = await pool.query('SELECT * FROM products WHERE id = $1', [product_id]);
    if (product.rows.length === 0) {
      req.flash('error', 'Product not found');
      return res.redirect('back');
    }

    if (product.rows[0].stock < qty) {
      req.flash('error', 'Not enough stock');
      return res.redirect('back');
    }

    // Clear existing cart and add just this item
    await pool.query('DELETE FROM cart WHERE user_id = $1', [req.session.user.id]);
    await pool.query('INSERT INTO cart (user_id, product_id, quantity) VALUES ($1, $2, $3)', [req.session.user.id, product_id, qty]);

    res.redirect('/cart/checkout');
  } catch (err) {
    console.error(err);
    req.flash('error', 'Failed to process order');
    res.redirect('back');
  }
});

// Update cart quantity
router.post('/update', isAuthenticated, async (req, res) => {
  try {
    const { cart_id, quantity } = req.body;
    const qty = parseInt(quantity);

    if (qty <= 0) {
      await pool.query('DELETE FROM cart WHERE id = $1 AND user_id = $2', [cart_id, req.session.user.id]);
    } else {
      await pool.query('UPDATE cart SET quantity = $1 WHERE id = $2 AND user_id = $3', [qty, cart_id, req.session.user.id]);
    }

    res.redirect('/cart');
  } catch (err) {
    console.error(err);
    res.redirect('/cart');
  }
});

// Remove from cart
router.post('/remove', isAuthenticated, async (req, res) => {
  try {
    const { cart_id } = req.body;
    await pool.query('DELETE FROM cart WHERE id = $1 AND user_id = $2', [cart_id, req.session.user.id]);
    req.flash('success', 'Item removed from cart');
    res.redirect('/cart');
  } catch (err) {
    console.error(err);
    res.redirect('/cart');
  }
});

// Checkout page
router.get('/checkout', isAuthenticated, async (req, res) => {
  try {
    // Process any pending buy-now item
    if (req.session.buyNow) {
      const { product_id, quantity } = req.session.buyNow;
      const product = await pool.query('SELECT * FROM products WHERE id = $1', [product_id]);
      if (product.rows.length > 0 && product.rows[0].stock >= quantity) {
        await pool.query('DELETE FROM cart WHERE user_id = $1', [req.session.user.id]);
        await pool.query('INSERT INTO cart (user_id, product_id, quantity) VALUES ($1, $2, $3)', [req.session.user.id, product_id, quantity]);
      }
      delete req.session.buyNow;
    }

    const cartItems = await pool.query(
      `SELECT c.*, p.name, p.price, p.image, p.stock FROM cart c LEFT JOIN products p ON c.product_id = p.id WHERE c.user_id = $1`,
      [req.session.user.id]
    );

    if (cartItems.rows.length === 0) {
      req.flash('error', 'Your cart is empty');
      return res.redirect('/cart');
    }

    const total = cartItems.rows.reduce((sum, item) => sum + parseFloat(item.price) * item.quantity, 0);
    const profile = await pool.query('SELECT * FROM users WHERE id = $1', [req.session.user.id]);

    res.render('checkout', { title: 'Checkout', cartItems: cartItems.rows, total, profile: profile.rows[0] });
  } catch (err) {
    console.error(err);
    res.redirect('/cart');
  }
});

// Place order
router.post('/place-order', isAuthenticated, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { shipping_name, shipping_address, shipping_city, shipping_country, shipping_phone, payment_method, notes } = req.body;

    const cartItems = await client.query(
      `SELECT c.*, p.name, p.price, p.image, p.stock FROM cart c LEFT JOIN products p ON c.product_id = p.id WHERE c.user_id = $1`,
      [req.session.user.id]
    );

    if (cartItems.rows.length === 0) {
      req.flash('error', 'Your cart is empty');
      return res.redirect('/cart');
    }

    const total = cartItems.rows.reduce((sum, item) => sum + parseFloat(item.price) * item.quantity, 0);

    const orderResult = await client.query(
      `INSERT INTO orders (user_id, total_amount, shipping_name, shipping_address, shipping_city, shipping_country, shipping_phone, payment_method, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [req.session.user.id, total, shipping_name, shipping_address, shipping_city, shipping_country, shipping_phone, payment_method || 'cod', notes]
    );

    const order = orderResult.rows[0];

    for (const item of cartItems.rows) {
      await client.query(
        'INSERT INTO order_items (order_id, product_id, product_name, product_image, price, quantity) VALUES ($1, $2, $3, $4, $5, $6)',
        [order.id, item.product_id, item.name, item.image, item.price, item.quantity]
      );

      await client.query('UPDATE products SET stock = stock - $1, sold = sold + $1 WHERE id = $2', [item.quantity, item.product_id]);
    }

    await client.query('DELETE FROM cart WHERE user_id = $1', [req.session.user.id]);

    await client.query('COMMIT');

    req.flash('success', `Order #${order.id} placed successfully!`);
    res.redirect('/account/orders');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    req.flash('error', 'Failed to place order');
    res.redirect('/checkout');
  } finally {
    client.release();
  }
});

// My orders (redirect to account panel)
router.get('/my-orders', isAuthenticated, (req, res) => {
  res.redirect('/account/orders');
});

// Cancel order
router.post('/cancel-order/:id', isAuthenticated, async (req, res) => {
  try {
    const order = await pool.query('SELECT * FROM orders WHERE id = $1 AND user_id = $2', [req.params.id, req.session.user.id]);
    if (order.rows.length === 0 || order.rows[0].status !== 'pending') {
      req.flash('error', 'Cannot cancel this order');
      return res.redirect('/account/orders');
    }

    await pool.query('UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2', ['cancelled', req.params.id]);

    const items = await pool.query('SELECT * FROM order_items WHERE order_id = $1', [req.params.id]);
    for (const item of items.rows) {
      await pool.query('UPDATE products SET stock = stock + $1, sold = sold - $1 WHERE id = $2', [item.quantity, item.product_id]);
    }

    req.flash('success', 'Order cancelled');
    res.redirect('/account/orders');
  } catch (err) {
    console.error(err);
    res.redirect('/account/orders');
  }
});

module.exports = router;
