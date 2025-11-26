#!/usr/bin/env node

/**
 * Seed Data - Örnek veriler yükler
 * Test için hazır verilerle sistemi başlatır
 */

const db = require('../src/config/database');
const bcrypt = require('bcryptjs');

const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RESET = '\x1b[0m';

console.log('\n========================================');
console.log('Örnek Verileri Yükleniyor...');
console.log('========================================\n');

async function seedData() {
  try {
    // 1. Admin kullanıcı oluştur
    console.log('[1/3] Admin kullanıcı oluşturuluyor...');

    const adminPassword = await bcrypt.hash('admin123', 10);
    const adminCheck = await db.query('SELECT id FROM consultants WHERE email = $1', ['admin@example.com']);

    if (adminCheck.rows.length === 0) {
      await db.query(`
        INSERT INTO consultants (name, email, password_hash, role, instance_name, daily_limit, status, is_active)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, ['Admin User', 'admin@example.com', adminPassword, 'admin', 'admin_instance', 500, 'active', true]);
      console.log(`${GREEN}✓${RESET} Admin oluşturuldu (email: admin@example.com, şifre: admin123)`);
    } else {
      console.log(`${YELLOW}⚠${RESET} Admin zaten mevcut`);
    }

    // 2. Demo consultant oluştur
    console.log('[2/3] Demo consultant oluşturuluyor...');

    const demoPassword = await bcrypt.hash('demo123', 10);
    const demoCheck = await db.query('SELECT id FROM consultants WHERE email = $1', ['demo@example.com']);

    if (demoCheck.rows.length === 0) {
      await db.query(`
        INSERT INTO consultants (name, email, password_hash, role, instance_name, daily_limit, status, is_active)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, ['Demo Consultant', 'demo@example.com', demoPassword, 'consultant', 'demo_instance', 200, 'active', true]);
      console.log(`${GREEN}✓${RESET} Demo consultant oluşturuldu (email: demo@example.com, şifre: demo123)`);
    } else {
      console.log(`${YELLOW}⚠${RESET} Demo consultant zaten mevcut`);
    }

    // 3. Örnek template oluştur
    console.log('[3/3] Örnek template oluşturuluyor...');

    const consultantResult = await db.query('SELECT id FROM consultants LIMIT 1');
    if (consultantResult.rows.length > 0) {
      const consultantId = consultantResult.rows[0].id;

      const templateCheck = await db.query('SELECT id FROM message_templates WHERE name = $1', ['Hoş Geldin Mesajı']);

      if (templateCheck.rows.length === 0) {
        await db.query(`
          INSERT INTO message_templates (consultant_id, name, content, category, is_active)
          VALUES ($1, $2, $3, $4, $5)
        `, [
          consultantId,
          'Hoş Geldin Mesajı',
          'Merhaba {name}! 👋\n\nSisteye hoş geldiniz. Size nasıl yardımcı olabilirim?',
          'onboarding',
          true
        ]);
        console.log(`${GREEN}✓${RESET} Örnek template oluşturuldu`);
      } else {
        console.log(`${YELLOW}⚠${RESET} Template zaten mevcut`);
      }
    }

    console.log('\n========================================');
    console.log(`${GREEN}Örnek veriler yüklendi!${RESET}`);
    console.log('========================================');
    console.log('\nGiriş bilgileri:');
    console.log('  Admin:');
    console.log('    Email: admin@example.com');
    console.log('    Şifre: admin123');
    console.log('  ');
    console.log('  Demo Consultant:');
    console.log('    Email: demo@example.com');
    console.log('    Şifre: demo123');
    console.log('========================================\n');

    process.exit(0);
  } catch (error) {
    console.error(`\n${RED}HATA:${RESET} Seed data yüklenemedi!`);
    console.error(error.message);
    process.exit(1);
  }
}

seedData();
