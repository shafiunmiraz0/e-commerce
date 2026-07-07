require('dotenv').config();
const express = require('express');
const session = require('express-session');
const PgSession = require('connect-pg-simple')(session);
const flash = require('express-flash');
const methodOverride = require('method-override');
const path = require('path');
const pool = require('./config/database');
const { setLocals } = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 3000;

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Body parser
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// Method override
app.use(methodOverride('_method'));

// Session
app.use(session({
  store: new PgSession({ pool, tableName: 'user_sessions', createTableIfMissing: true }),
  secret: process.env.SESSION_SECRET || 'fallback-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 7 * 24 * 60 * 60 * 1000, httpOnly: true }
}));

// Passport (Google OAuth)
const passport = require('./config/google-auth');
app.use(passport.initialize());
app.use(passport.session());

// Flash messages
app.use(flash());

// Locals
app.use(setLocals);

// Routes
const authRoutes = require('./routes/auth');
const googleAuthRoutes = require('./routes/google-auth');
const productRoutes = require('./routes/products');
const cartRoutes = require('./routes/cart');
const adminRoutes = require('./routes/admin');
const apiRoutes = require('./routes/api');

app.use('/', productRoutes);
app.use('/', authRoutes);
app.use('/', googleAuthRoutes);
app.use('/cart', cartRoutes);
app.use('/admin', adminRoutes);
app.use('/api', apiRoutes);

// 404
app.use((req, res) => {
  res.status(404).render('404', { title: 'Page Not Found', user: req.session.user || null, cartCount: 0, wishlistCount: 0 });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).render('error', { title: 'Server Error', error: err.message, user: req.session.user || null, cartCount: 0, wishlistCount: 0 });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🚀 Server running on http://localhost:${PORT}`);
  console.log(`📦 Admin panel: http://localhost:${PORT}/admin`);
  console.log(`👤 Default admin: admin@store.com / admin123\n`);
  if (process.env.GOOGLE_CLIENT_ID) {
    console.log(`🔐 Google OAuth: enabled`);
  } else {
    console.log(`⚠ Google OAuth: not configured (set GOOGLE_CLIENT_ID in .env)`);
  }
});
