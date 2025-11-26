#!/usr/bin/env node

/**
 * Backup Script - Veritabanı ve yapılandırma yedekler
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const RESET = '\x1b[0m';

console.log('\n========================================');
console.log('Yedekleme Başlıyor...');
console.log('========================================\n');

async function backup() {
  try {
    // Backup dizini oluştur
    const backupDir = path.join(__dirname, '..', 'backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir);
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
    const backupPath = path.join(backupDir, `backup-${timestamp}`);

    if (!fs.existsSync(backupPath)) {
      fs.mkdirSync(backupPath);
    }

    // 1. .env dosyalarını yedekle
    console.log('[1/3] Yapılandırma dosyaları yedekleniyor...');

    if (fs.existsSync('.env')) {
      fs.copyFileSync('.env', path.join(backupPath, '.env'));
    }
    if (fs.existsSync('backend/.env')) {
      fs.copyFileSync('backend/.env', path.join(backupPath, 'backend.env'));
    }
    if (fs.existsSync('frontend/.env')) {
      fs.copyFileSync('frontend/.env', path.join(backupPath, 'frontend.env'));
    }

    console.log(`${GREEN}✓${RESET} Yapılandırma dosyaları yedeklendi`);

    // 2. Database'i yedekle
    console.log('[2/3] Veritabanı yedekleniyor...');

    const dbBackupFile = path.join(backupPath, 'database.sql');
    execSync(`docker exec postgres_db pg_dump -U campaign_user whatsapp_campaign > ${dbBackupFile}`, {
      stdio: 'ignore'
    });

    console.log(`${GREEN}✓${RESET} Veritabanı yedeklendi`);

    // 3. Metadata dosyası oluştur
    console.log('[3/3] Metadata oluşturuluyor...');

    const metadata = {
      backup_date: new Date().toISOString(),
      files: fs.readdirSync(backupPath),
      system_info: {
        node_version: process.version,
        platform: process.platform
      }
    };

    fs.writeFileSync(
      path.join(backupPath, 'metadata.json'),
      JSON.stringify(metadata, null, 2)
    );

    console.log(`${GREEN}✓${RESET} Metadata oluşturuldu`);

    console.log('\n========================================');
    console.log(`${GREEN}Yedekleme tamamlandı!${RESET}`);
    console.log('========================================');
    console.log(`\nYedek konumu: ${backupPath}`);
    console.log('\nYedek dosyaları:');
    console.log('  - .env');
    console.log('  - backend.env');
    console.log('  - database.sql');
    console.log('  - metadata.json');
    console.log('\nGeri yüklemek için:');
    console.log('  → npm run restore');
    console.log('========================================\n');

    process.exit(0);
  } catch (error) {
    console.error(`\n${RED}HATA:${RESET} Yedekleme başarısız!`);
    console.error(error.message);
    process.exit(1);
  }
}

backup();
