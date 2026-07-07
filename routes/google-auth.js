const express = require('express');
const router = express.Router();
const passport = require('passport');

const isGoogleConfigured = !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

// Initiate Google OAuth login
router.get('/auth/google', (req, res) => {
  if (!isGoogleConfigured) {
    req.flash('error', 'Google sign-in is not configured yet. Please use email login.');
    return res.redirect('/login');
  }
  passport.authenticate('google', { scope: ['profile', 'email'] })(req, res);
});

// Google OAuth callback
router.get('/auth/google/callback', (req, res, next) => {
  if (!isGoogleConfigured) {
    req.flash('error', 'Google sign-in is not configured yet.');
    return res.redirect('/login');
  }
  passport.authenticate('google', { failureRedirect: '/login', failureFlash: true })(req, res, next);
}, (req, res) => {
  req.session.user = {
    id: req.user.id,
    username: req.user.username,
    email: req.user.email,
    full_name: req.user.full_name,
    role: req.user.role,
    avatar: req.user.avatar
  };

  req.flash('success', `Welcome, ${req.user.full_name || req.user.username}!`);
  if (req.user.role === 'admin') {
    return res.redirect('/admin');
  }
  res.redirect('/');
});

module.exports = router;
