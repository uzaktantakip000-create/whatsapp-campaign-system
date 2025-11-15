/**
 * Create Test Users Script
 * Creates admin and consultant test users in the database
 */

const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const colors = require('colors');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'whatsapp_campaign',
  user: process.env.DB_USER || 'campaign_user',
  password: process.env.DB_PASSWORD,
});

async function createTestUsers() {
  console.log(colors.cyan('\n=== Creating Test Users ===\n'));

  try {
    // Hash password (Admin123!)
    const password = 'Admin123!';
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create Admin User
    console.log(colors.yellow('Creating Admin User...'));
    try {
      const adminResult = await pool.query(
        `INSERT INTO consultants (name, email, password_hash, phone, role, instance_name, is_active, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
         ON CONFLICT (email) DO UPDATE SET
           password_hash = EXCLUDED.password_hash,
           role = EXCLUDED.role,
           updated_at = NOW()
         RETURNING id, name, email, role`,
        [
          'Admin User',
          'admin@whatsapp-campaign.com',
          hashedPassword,
          '+905550000000',
          'admin',
          'admin_instance',
          true
        ]
      );
      console.log(colors.green('✓ Admin User Created:'));
      console.log(colors.white(`  Email: ${colors.bold('admin@whatsapp-campaign.com')}`));
      console.log(colors.white(`  Password: ${colors.bold('Admin123!')}`));
      console.log(colors.white(`  Role: ${colors.bold('admin')}`));
      console.log(colors.white(`  ID: ${adminResult.rows[0].id}\n`));
    } catch (error) {
      console.log(colors.red('✗ Failed to create admin:'), error.message);
    }

    // Create Consultant User
    console.log(colors.yellow('Creating Consultant User...'));
    try {
      const consultantResult = await pool.query(
        `INSERT INTO consultants (name, email, password_hash, phone, role, instance_name, is_active, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
         ON CONFLICT (email) DO UPDATE SET
           password_hash = EXCLUDED.password_hash,
           updated_at = NOW()
         RETURNING id, name, email, role`,
        [
          'Test Consultant',
          'consultant@whatsapp-campaign.com',
          hashedPassword,
          '+905551234567',
          'consultant',
          'test_consultant',
          true
        ]
      );
      console.log(colors.green('✓ Consultant User Created:'));
      console.log(colors.white(`  Email: ${colors.bold('consultant@whatsapp-campaign.com')}`));
      console.log(colors.white(`  Password: ${colors.bold('Admin123!')}`));
      console.log(colors.white(`  Role: ${colors.bold('consultant')}`));
      console.log(colors.white(`  ID: ${consultantResult.rows[0].id}\n`));
    } catch (error) {
      console.log(colors.red('✗ Failed to create consultant:'), error.message);
    }

    // List all users
    console.log(colors.cyan('\n=== All Users in Database ===\n'));
    const allUsers = await pool.query(
      'SELECT id, name, email, role, is_active, created_at FROM consultants ORDER BY id'
    );

    if (allUsers.rows.length === 0) {
      console.log(colors.yellow('No users found in database.'));
    } else {
      console.table(allUsers.rows.map(user => ({
        ID: user.id,
        Name: user.name,
        Email: user.email,
        Role: user.role,
        Active: user.is_active ? 'Yes' : 'No',
        Created: new Date(user.created_at).toLocaleDateString()
      })));
    }

    console.log(colors.green('\n✅ Test users created successfully!\n'));
    console.log(colors.cyan('You can now login with:'));
    console.log(colors.white('  Admin: admin@whatsapp-campaign.com / Admin123!'));
    console.log(colors.white('  Consultant: consultant@whatsapp-campaign.com / Admin123!'));
    console.log(colors.cyan('\nGo to: http://localhost:5173\n'));

  } catch (error) {
    console.error(colors.red('\n✗ Error:'), error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run
createTestUsers();
