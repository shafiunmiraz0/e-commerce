const pool = require('../config/database');

function isAuthenticated(req, res, next) {
  if (req.session && req.session.user) {
    return next();
  }
  req.flash('error', 'Please log in to continue');
  res.redirect('/login');
}

function isAdmin(req, res, next) {
  if (req.session && req.session.user && req.session.user.role === 'admin') {
    return next();
  }
  req.flash('error', 'Access denied. Admin only.');
  res.redirect('/');
}

function setLocals(req, res, next) {
  res.locals.user = req.session.user || null;
  res.locals.success = req.flash('success');
  res.locals.error = req.flash('error');
  res.locals.cartCount = 0;
  res.locals.wishlistCount = 0;

  if (req.session.user) {
    pool.query('SELECT COALESCE(SUM(quantity), 0) as count FROM cart WHERE user_id = $1', [req.session.user.id])
      .then(r => { res.locals.cartCount = parseInt(r.rows[0].count); })
      .catch(() => {});
    pool.query('SELECT COUNT(*) as count FROM wishlist WHERE user_id = $1', [req.session.user.id])
      .then(r => { res.locals.wishlistCount = parseInt(r.rows[0].count); })
      .catch(() => {});
  } else {
    const guest = req.session.guestCart || [];
    res.locals.cartCount = guest.reduce((s, i) => s + i.quantity, 0);
  }

  next();
}

module.exports = { isAuthenticated, isAdmin, setLocals };
