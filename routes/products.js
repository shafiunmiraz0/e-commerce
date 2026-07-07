const express = require('express');
const router = express.Router();
const pool = require('../config/database');

// Home page - featured products + categories
router.get('/', async (req, res) => {
  try {
    const categories = await pool.query('SELECT * FROM categories ORDER BY id');
    const featured = await pool.query(
      'SELECT p.*, c.name as category_name FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE p.is_featured = true AND p.is_active = true ORDER BY p.sold DESC LIMIT 8'
    );
    const popular = await pool.query(
      'SELECT p.*, c.name as category_name FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE p.is_active = true ORDER BY p.sold DESC LIMIT 12'
    );
    const latest = await pool.query(
      'SELECT p.*, c.name as category_name FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE p.is_active = true ORDER BY p.created_at DESC LIMIT 8'
    );

    res.render('index', {
      title: 'ShopVue - Best Deals Online',
      categories: categories.rows,
      featured: featured.rows,
      popular: popular.rows,
      latest: latest.rows
    });
  } catch (err) {
    console.error(err);
    res.render('index', { title: 'ShopVue', categories: [], featured: [], popular: [], latest: [] });
  }
});

// Product listing page
router.get('/products', async (req, res) => {
  try {
    const { category, search, sort, page, min_price, max_price } = req.query;
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

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM products p LEFT JOIN categories c ON p.category_id = c.id ${whereClause}`,
      params
    );

    const products = await pool.query(
      `SELECT p.*, c.name as category_name, c.slug as category_slug FROM products p LEFT JOIN categories c ON p.category_id = c.id ${whereClause} ${orderClause} LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
      [...params, limit, offset]
    );

    const categories = await pool.query('SELECT * FROM categories ORDER BY id');
    const totalPages = Math.ceil(parseInt(countResult.rows[0].count) / limit);

    res.render('products', {
      title: search ? `Search: ${search}` : 'All Products',
      products: products.rows,
      categories: categories.rows,
      currentCategory: category || '',
      currentSearch: search || '',
      currentSort: sort || '',
      currentMinPrice: min_price || '',
      currentMaxPrice: max_price || '',
      currentPage: parseInt(page) || 1,
      totalPages,
      totalProducts: parseInt(countResult.rows[0].count)
    });
  } catch (err) {
    console.error(err);
    res.render('products', { title: 'Products', products: [], categories: [], currentCategory: '', currentSearch: '', currentSort: '', currentMinPrice: '', currentMaxPrice: '', currentPage: 1, totalPages: 0, totalProducts: 0 });
  }
});

// Single product page
router.get('/product/:slug', async (req, res) => {
  try {
    const product = await pool.query(
      `SELECT p.*, c.name as category_name, c.slug as category_slug FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE p.slug = $1`,
      [req.params.slug]
    );

    if (product.rows.length === 0) {
      req.flash('error', 'Product not found');
      return res.redirect('/');
    }

    const related = await pool.query(
      `SELECT p.*, c.name as category_name FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE p.category_id = $1 AND p.id != $2 AND p.is_active = true ORDER BY RANDOM() LIMIT 4`,
      [product.rows[0].category_id, product.rows[0].id]
    );

    const crossSell = await pool.query(
      `SELECT p.*, c.name as category_name FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE p.category_id = $1 AND p.id != $2 AND p.is_active = true ORDER BY p.rating DESC LIMIT 3`,
      [product.rows[0].category_id, product.rows[0].id]
    );

    const reviews = await pool.query(
      `SELECT r.*, u.username, u.avatar FROM reviews r LEFT JOIN users u ON r.user_id = u.id WHERE r.product_id = $1 ORDER BY r.created_at DESC LIMIT 10`,
      [product.rows[0].id]
    );

    const reviewStats = await pool.query(
      `SELECT COUNT(*) as total, COALESCE(AVG(rating), 0) as avg_rating,
       COUNT(*) FILTER (WHERE rating = 5) as stars5,
       COUNT(*) FILTER (WHERE rating = 4) as stars4,
       COUNT(*) FILTER (WHERE rating = 3) as stars3,
       COUNT(*) FILTER (WHERE rating = 2) as stars2,
       COUNT(*) FILTER (WHERE rating = 1) as stars1
       FROM reviews WHERE product_id = $1`,
      [product.rows[0].id]
    );

    let inWishlist = false;
    if (req.session.user) {
      const wl = await pool.query('SELECT id FROM wishlist WHERE user_id = $1 AND product_id = $2', [req.session.user.id, product.rows[0].id]);
      inWishlist = wl.rows.length > 0;
    }

    const viewers = Math.floor(Math.random() * 20) + 5;

    res.render('product', {
      title: product.rows[0].name,
      product: product.rows[0],
      related: related.rows,
      crossSell: crossSell.rows,
      reviews: reviews.rows,
      reviewStats: reviewStats.rows[0],
      inWishlist,
      viewers
    });
  } catch (err) {
    console.error(err);
    res.redirect('/');
  }
});

module.exports = router;
