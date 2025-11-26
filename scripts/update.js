#!/usr/bin/env node

/**
 * Safe Update Script - Bozulmadan güncelleme yapar
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const RESET = '\x1b[0m';

console.log('\n========================================');
console.log('Güvenli Güncelleme Başlıyor...');
console.log('========================================\n');

async function safeUpdate() {
  try {
    // 1. Yedek al
    console.log('[1/7] Mevcut yapılandırma yedekleniyor...');
    const backupDir = path.join(__dirname, '..', 'backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir);
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = path.join(backupDir, `backup-${timestamp}.tar.gz`);

    // .env dosyalarını yedekle
    if (fs.existsSync('.env')) {
      fs.copyFileSync('.env', `.env.backup-${timestamp}`);
    }
    if (fs.existsSync('backend/.env')) {
      fs.copyFileSync('backend/.env', `backend/.env.backup-${timestamp}`);
    }

    console.log(`${GREEN}✓${RESET} Yedek oluşturuldu`);

    // 2. Git güncellemelerini kontrol et (eğer git repo ise)
    console.log('[2/7] Güncellemeler kontrol ediliyor...');
    try {
      execSync('git fetch', { stdio: 'ignore' });
      const status = execSync('git status -uno', { encoding: 'utf8' });

      if (status.includes('Your branch is behind')) {
        console.log(`${YELLOW}⚠${RESET} Yeni güncellemeler mevcut`);
      } else {
        console.log(`${GREEN}✓${RESET} Sistem güncel`);
      }
    } catch (error) {
      console.log(`${YELLOW}⚠${RESET} Git bulunamadı, manuel güncelleme`);
    }

    // 3. Docker container'ları durdur
    console.log('[3/7] Container'lar durduruluyor...');
    execSync('docker-compose down', { stdio: 'inherit' });
    console.log(`${GREEN}✓${RESET} Container'lar durduruldu`);

    // 4. Dependencies güncelle
    console.log('[4/7] Backend bağımlılıkları güncelleniyor...');
    process.chdir('backend');
    execSync('npm install', { stdio: 'inherit' });
    process.chdir('..');
    console.log(`${GREEN}✓${RESET} Backend güncellendi`);

    console.log('[5/7] Frontend bağımlılıkları güncelleniyor...');
    process.chdir('frontend');
    execSync('npm install', { stdio: 'inherit' });
    process.chdir('..');
    console.log(`${GREEN}✓${RESET} Frontend güncellendi`);

    // 5. Docker image'ları yeniden build et
    console.log('[6/7] Docker image'lar yeniden oluşturuluyor...');
    execSync('docker-compose build --no-cache backend', { stdio: 'inherit' });
    console.log(`${GREEN}✓${RESET} Docker image'lar güncellendi`);

    // 6. Container'ları başlat
    console.log('[7/7] Container'lar başlatılıyor...');
    execSync('docker-compose up -d', { stdio: 'inherit' });
    console.log(`${GREEN}✓${RESET} Container'lar başlatıldı`);

    console.log('\n========================================');
    console.log(`${GREEN}Güncelleme tamamlandı!${RESET}`);
    console.log('========================================');
    console.log('\nSistemi kontrol etmek için:');
    console.log('  → npm run health');
    console.log('\nYedek dosyalar:');
    console.log(`  → .env.backup-${timestamp}`);
    console.log(`  → backend/.env.backup-${timestamp}`);
    console.log('========================================\n');

    process.exit(0);
  } catch (error) {
    console.error(`\n${RED}HATA:${RESET} Güncelleme başarısız!`);
    console.error(error.message);
    console.log('\nYedek dosyalardan geri yükleyebilirsiniz:');
    console.log('  → npm run restore');
    process.exit(1);
  }
}

safeUpdate();
