#!/usr/bin/env node

/**
 * Create Admin User - Quick admin account creation
 */

require('dotenv').config();
const db = require('./src/config/database');
const bcrypt = require('bcryptjs');

async function createAdmin() {
  try {
    console.log('\n=== Creating Admin User ===\n');

    // Hash password
    const passwordHash = await bcrypt.hash('admin123', 10);
    console.log('Password hashed successfully');

    // Delete existing admin@example.com if exists
    await db.query('DELETE FROM consultants WHERE email = $1', ['admin@example.com']);
    console.log('Deleted any existing admin@example.com');

    // Insert new admin
    const result = await db.query(`
      INSERT INTO consultants
      (name, email, password_hash, role, instance_name, daily_limit, status, is_active)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id, name, email, role
    `, [
      'Admin User',
      'admin@example.com',
      passwordHash,
      'admin',
      'admin_main_' + Date.now(),
      500,
      'active',
      true
    ]);

    console.log('\n✓ Admin user created successfully!\n');
    console.log('Login credentials:');
    console.log('  Email: admin@example.com');
    console.log('  Password: admin123');
    console.log('\nUser details:', result.rows[0]);
    console.log('\n');

    process.exit(0);
  } catch (error) {
    console.error('\n✗ Error creating admin user:');
    console.error(error.message);
    process.exit(1);
  }
}

createAdmin();
