const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const pool = require('./database');

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const result = await pool.query('SELECT id, username, email, full_name, role, avatar FROM users WHERE id = $1', [id]);
    if (result.rows.length > 0) {
      done(null, result.rows[0]);
    } else {
      done(null, false);
    }
  } catch (err) {
    done(err, null);
  }
});

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL || '/auth/google/callback',
    scope: ['profile', 'email']
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      const email = profile.emails && profile.emails[0] ? profile.emails[0].value : null;
      const googleId = profile.id;
      const fullName = profile.displayName || '';
      const avatar = profile.photos && profile.photos[0] ? profile.photos[0].value : null;

      // Check if user exists by google_id
      let result = await pool.query('SELECT * FROM users WHERE google_id = $1', [googleId]);

      if (result.rows.length > 0) {
        // User exists, log them in
        return done(null, result.rows[0]);
      }

      // Check if user exists by email
      if (email) {
        result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        if (result.rows.length > 0) {
          // Link Google account to existing user
          await pool.query(
            'UPDATE users SET google_id = $1, auth_provider = $2, avatar = COALESCE(avatar, $3) WHERE id = $4',
            [googleId, 'google', avatar, result.rows[0].id]
          );
          result.rows[0].google_id = googleId;
          result.rows[0].auth_provider = 'google';
          return done(null, result.rows[0]);
        }
      }

      // Create new user
      let username = email ? email.split('@')[0] : 'user_' + googleId.slice(-8);

      // Ensure username is unique
      const existingUsername = await pool.query('SELECT id FROM users WHERE username = $1', [username]);
      if (existingUsername.rows.length > 0) {
        username = username + '_' + Date.now().toString(36);
      }

      const newUser = await pool.query(
        `INSERT INTO users (username, email, password, full_name, avatar, auth_provider, google_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
        [username, email, null, fullName, avatar, 'google', googleId]
      );

      return done(null, newUser.rows[0]);
    } catch (err) {
      console.error('Google OAuth error:', err);
      return done(err, null);
    }
  }));
} else {
  console.log('⚠ Google OAuth not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env');
}

module.exports = passport;
