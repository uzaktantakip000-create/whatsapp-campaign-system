#!/usr/bin/env node

/**
 * Setup Checker - Sistem gereksinimlerini kontrol eder
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const RESET = '\x1b[0m';

console.log('\n========================================');
console.log('WhatsApp Campaign System - Kurulum Kontrolü');
console.log('========================================\n');

let allChecks

Passed = true;

// 1. Node.js kontrolü
try {
  const nodeVersion = execSync('node --version', { encoding: 'utf8' }).trim();
  const majorVersion = parseInt(nodeVersion.split('.')[0].replace('v', ''));

  if (majorVersion >= 18) {
    console.log(`${GREEN}✓${RESET} Node.js: ${nodeVersion}`);
  } else {
    console.log(`${RED}✗${RESET} Node.js çok eski: ${nodeVersion} (Minimum: v18.0.0)`);
    allChecksPassed = false;
  }
} catch (error) {
  console.log(`${RED}✗${RESET} Node.js bulunamadı!`);
  console.log('  → https://nodejs.org adresinden yükleyin');
  allChecksPassed = false;
}

// 2. npm kontrolü
try {
  const npmVersion = execSync('npm --version', { encoding: 'utf8' }).trim();
  console.log(`${GREEN}✓${RESET} npm: v${npmVersion}`);
} catch (error) {
  console.log(`${RED}✗${RESET} npm bulunamadı!`);
  allChecksPassed = false;
}

// 3. Docker kontrolü
try {
  const dockerVersion = execSync('docker --version', { encoding: 'utf8' }).trim();
  console.log(`${GREEN}✓${RESET} Docker: ${dockerVersion}`);
} catch (error) {
  console.log(`${RED}✗${RESET} Docker bulunamadı!`);
  console.log('  → https://www.docker.com/products/docker-desktop adresinden yükleyin');
  allChecksPassed = false;
}

// 4. Docker Compose kontrolü
try {
  const composeVersion = execSync('docker-compose --version', { encoding: 'utf8' }).trim();
  console.log(`${GREEN}✓${RESET} Docker Compose: ${composeVersion}`);
} catch (error) {
  console.log(`${YELLOW}⚠${RESET} Docker Compose bulunamadı (Docker Desktop ile gelir)`);
}

// 5. Docker daemon kontrolü
try {
  execSync('docker ps', { stdio: 'ignore' });
  console.log(`${GREEN}✓${RESET} Docker daemon çalışıyor`);
} catch (error) {
  console.log(`${YELLOW}⚠${RESET} Docker Desktop çalışmıyor!`);
  console.log('  → Docker Desktop uygulamasını açın');
}

// 6. .env dosyası kontrolü
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  console.log(`${GREEN}✓${RESET} .env dosyası mevcut`);
} else {
  console.log(`${YELLOW}⚠${RESET} .env dosyası yok`);
  console.log('  → setup.bat veya setup.sh çalıştırın');
}

// 7. Backend node_modules kontrolü
const backendModules = path.join(__dirname, '..', 'backend', 'node_modules');
if (fs.existsSync(backendModules)) {
  console.log(`${GREEN}✓${RESET} Backend bağımlılıkları yüklü`);
} else {
  console.log(`${YELLOW}⚠${RESET} Backend bağımlılıkları eksik`);
  console.log('  → cd backend && npm install');
}

// 8. Frontend node_modules kontrolü
const frontendModules = path.join(__dirname, '..', 'frontend', 'node_modules');
if (fs.existsSync(frontendModules)) {
  console.log(`${GREEN}✓${RESET} Frontend bağımlılıkları yüklü`);
} else {
  console.log(`${YELLOW}⚠${RESET} Frontend bağımlılıkları eksik`);
  console.log('  → cd frontend && npm install');
}

console.log('\n========================================');

if (allChecksPassed) {
  console.log(`${GREEN}Tüm kontroller başarılı!${RESET}`);
  console.log('\nSistemi başlatmak için:');
  console.log('  → Windows: setup.bat');
  console.log('  → Mac/Linux: bash setup.sh');
  console.log('\nVeya manuel:');
  console.log('  → npm run start');
} else {
  console.log(`${RED}Bazı gereksinimler eksik!${RESET}`);
  console.log('Yukarıdaki hataları düzeltin ve tekrar deneyin.');
  process.exit(1);
}

console.log('========================================\n');
