#!/usr/bin/env node

/**
 * Create Demo Consultant - Quick demo account creation
 */

require('dotenv').config();
const db = require('./src/config/database');
const bcrypt = require('bcryptjs');

async function createDemo() {
  try {
    console.log('\n=== Creating Demo Consultant ===\n');

    // Hash password
    const passwordHash = await bcrypt.hash('demo123', 10);
    console.log('Password hashed successfully');

    // Delete existing demo@example.com if exists
    await db.query('DELETE FROM consultants WHERE email = $1', ['demo@example.com']);
    console.log('Deleted any existing demo@example.com');

    // Insert new demo consultant
    const result = await db.query(`
      INSERT INTO consultants
      (name, email, password_hash, role, instance_name, daily_limit, status, is_active)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id, name, email, role
    `, [
      'Demo Consultant',
      'demo@example.com',
      passwordHash,
      'consultant',
      'demo_instance_' + Date.now(),
      200,
      'active',
      true
    ]);

    console.log('\n✓ Demo consultant created successfully!\n');
    console.log('Login credentials:');
    console.log('  Email: demo@example.com');
    console.log('  Password: demo123');
    console.log('\nUser details:', result.rows[0]);
    console.log('\n');

    process.exit(0);
  } catch (error) {
    console.error('\n✗ Error creating demo consultant:');
    console.error(error.message);
    process.exit(1);
  }
}

createDemo();
