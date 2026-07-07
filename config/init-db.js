const pool = require('./database');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function initDB() {
  try {
    const sql = fs.readFileSync(path.join(__dirname, '..', 'init.sql'), 'utf8');
    
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('\\'));

    for (const stmt of statements) {
      try {
        await pool.query(stmt);
        console.log('✓ Executed:', stmt.substring(0, 60) + '...');
      } catch (err) {
        if (err.code === '23505') {
          console.log('⏭ Skipped (already exists):', stmt.substring(0, 60) + '...');
        } else {
          console.error('✗ Error:', err.message);
        }
      }
    }

    // Create admin user with proper bcrypt hash
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('admin123', salt);
    try {
      await pool.query(
        `INSERT INTO users (username, email, password, full_name, role) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (username) DO UPDATE SET password = $2`,
        ['admin', 'admin@store.com', hashedPassword, 'Admin User', 'admin']
      );
      console.log('✓ Admin user created (admin@store.com / admin123)');
    } catch (err) {
      console.log('⏭ Admin user:', err.message);
    }

    console.log('\n✅ Database initialized successfully!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Database initialization failed:', err.message);
    process.exit(1);
  }
}

initDB();
