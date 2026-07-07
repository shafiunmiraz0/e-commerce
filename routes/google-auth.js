const express = require('express');
const router = express.Router();
const passport = require('passport');

// Initiate Google OAuth login
router.get('/auth/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

// Google OAuth callback
router.get('/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/login', failureFlash: true }),
  (req, res) => {
    // Bridge Passport user to existing session system
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
  }
);

module.exports = router;
