#!/usr/bin/env node

/**
 * Health Check - Sistem sağlık kontrolü
 */

const http = require('http');

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const RESET = '\x1b[0m';

console.log('\n========================================');
console.log('Sistem Sağlık Kontrolü');
console.log('========================================\n');

const checks = [
  { name: 'Backend API', url: 'http://localhost:3000/health' },
  { name: 'Frontend', url: 'http://localhost:5173' },
  { name: 'Evolution API', url: 'http://localhost:8080' },
  { name: 'Swagger Docs', url: 'http://localhost:3000/api-docs' }
];

let failedChecks = 0;

async function checkUrl(name, url) {
  return new Promise((resolve) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname,
      method: 'GET',
      timeout: 5000
    };

    const req = http.request(options, (res) => {
      if (res.statusCode >= 200 && res.statusCode < 400) {
        console.log(`${GREEN}✓${RESET} ${name}: ${url}`);
        resolve(true);
      } else {
        console.log(`${YELLOW}⚠${RESET} ${name}: HTTP ${res.statusCode}`);
        failedChecks++;
        resolve(false);
      }
    });

    req.on('error', () => {
      console.log(`${RED}✗${RESET} ${name}: Erişilemiyor`);
      failedChecks++;
      resolve(false);
    });

    req.on('timeout', () => {
      req.destroy();
      console.log(`${RED}✗${RESET} ${name}: Zaman aşımı`);
      failedChecks++;
      resolve(false);
    });

    req.end();
  });
}

async function runChecks() {
  for (const check of checks) {
    await checkUrl(check.name, check.url);
  }

  console.log('\n========================================');

  if (failedChecks === 0) {
    console.log(`${GREEN}Tüm servisler çalışıyor!${RESET}`);
    console.log('\nSisteme erişmek için:');
    console.log('  → Frontend: http://localhost:5173');
    console.log('  → API Docs: http://localhost:3000/api-docs');
  } else {
    console.log(`${YELLOW}${failedChecks} servis çalışmıyor!${RESET}`);
    console.log('\nSorun giderme:');
    console.log('  1. Docker Desktop açık mı kontrol edin');
    console.log('  2. docker-compose up -d çalıştırın');
    console.log('  3. docker-compose logs kontrol edin');
    console.log('  4. Portlar kullanımda mı kontrol edin (3000, 5173, 8080)');
  }

  console.log('========================================\n');

  process.exit(failedChecks > 0 ? 1 : 0);
}

runChecks();
