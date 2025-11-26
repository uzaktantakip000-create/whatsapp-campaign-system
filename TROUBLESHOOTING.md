# 🔧 Sorun Giderme Rehberi

## 📋 Yaygın Sorunlar ve Çözümleri

### 🐳 Docker Sorunları

#### Docker Desktop çalışmıyor

**Belirtiler:**
- `docker ps` komutu hata veriyor
- "Cannot connect to Docker daemon" hatası

**Çözüm:**
```bash
# 1. Docker Desktop'ı açın (Windows'ta sistem tepsisinde kontrol edin)
# 2. Yeşil ışık yanana kadar bekleyin (1-2 dakika)
# 3. Tekrar deneyin:
docker ps
```

#### Containerlar başlamıyor

**Belirtiler:**
- `docker-compose up -d` hata veriyor
- Containerlar "Exited" durumunda

**Çözüm:**
```bash
# 1. Logları kontrol edin
docker-compose logs

# 2. Tüm container'ları durdurun
docker-compose down

# 3. Volume'ları temizleyin
docker-compose down -v

# 4. Yeniden başlatın
docker-compose up -d
```

#### Port çakışması

**Belirtiler:**
- "Port already in use" hatası
- Backend veya frontend açılmıyor

**Çözüm:**
```bash
# Windows - Hangi process portu kullanıyor?
netstat -ano | findstr :3000
netstat -ano | findstr :5173
netstat -ano | findstr :8080

# Process'i öldürün
taskkill /PID [PID_NUMARASI] /F

# Mac/Linux
lsof -ti:3000 | xargs kill -9
lsof -ti:5173 | xargs kill -9
```

---

### 💾 Database Sorunları

#### PostgreSQL bağlanamıyor

**Belirtiler:**
- "Connection refused" hatası
- Backend başlamıyor

**Çözüm:**
```bash
# 1. PostgreSQL container'ını kontrol edin
docker ps | grep postgres

# 2. Çalışmıyorsa başlatın
docker-compose up -d postgres

# 3. Logları inceleyin
docker-compose logs postgres

# 4. 10 saniye bekleyin ve tekrar deneyin
```

#### Migration çalışmıyor

**Belirtiler:**
- "Table does not exist" hatası
- Veritabanı tabloları eksik

**Çözüm:**
```bash
# 1. Backend container'a girin
docker exec -it backend_api sh

# 2. Migration'ları manuel çalıştırın
cd database/migrations
psql -h postgres_db -U campaign_user -d whatsapp_campaign -f 001_initial_schema.sql
psql -h postgres_db -U campaign_user -d whatsapp_campaign -f 002_add_auth_fields.sql

# 3. Container'dan çıkın
exit
```

---

### 🌐 Backend API Sorunları

#### Backend açılmıyor

**Belirtiler:**
- http://localhost:3000/health çalışmıyor
- "Cannot GET /" hatası

**Çözüm:**
```bash
# 1. Backend container loglarını inceleyin
docker-compose logs backend

# 2. Yeniden başlatın
docker-compose restart backend

# 3. Hala çalışmıyorsa elle başlatın
cd backend
npm start
```

#### .env dosyası eksik

**Belirtiler:**
- "Missing environment variable" hatası
- Config hatası

**Çözüm:**
```bash
# 1. .env dosyasını kontrol edin
cat backend/.env

# 2. Yoksa oluşturun
cd backend
cp .env.example .env

# 3. Gerekli değerleri doldurun (QUICK-START.md'ye bakın)
```

---

### 🎨 Frontend Sorunları

#### Frontend açılmıyor

**Belirtiler:**
- http://localhost:5173 çalışmıyor
- Sayfa yüklenmiyor

**Çözüm:**
```bash
# 1. Frontend'i manuel başlatın
cd frontend
npm run dev

# 2. Hata varsa bağımlılıkları yeniden yükleyin
rm -rf node_modules
npm install
npm run dev
```

#### API çağrıları çalışmıyor

**Belirtiler:**
- "Network Error" hatası
- 404 Not Found

**Çözüm:**
```bash
# 1. Backend çalışıyor mu kontrol edin
curl http://localhost:3000/health

# 2. .env dosyasını kontrol edin
cat frontend/.env

# VITE_API_URL=/api olmalı

# 3. Vite config'i kontrol edin
cat frontend/vite.config.js

# proxy ayarı doğru mu?
```

---

### 📱 WhatsApp Sorunları

#### QR kod çıkmıyor

**Belirtiler:**
- "Connect WhatsApp" butonuna basıldığında QR kod görünmüyor
- Loading sonsuza kadar sürüyor

**Çözüm:**
```bash
# 1. Evolution API çalışıyor mu?
curl http://localhost:8080

# 2. Evolution API loglarını kontrol edin
docker-compose logs evolution_api

# 3. Yeniden başlatın
docker-compose restart evolution_api

# 4. 30 saniye bekleyin ve tekrar deneyin
```

#### QR kod okutuldu ama bağlanmıyor

**Belirtiler:**
- QR kod tarandı
- Ama "Connected" durumuna geçmiyor

**Çözüm:**
```bash
# 1. Webhook çalışıyor mu kontrol edin
curl -X POST http://localhost:3000/api/webhooks/evolution

# 2. Backend loglarını inceleyin
docker-compose logs backend | grep webhook

# 3. WhatsApp durumunu manuel kontrol edin
curl http://localhost:3000/api/whatsapp/status \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### Contact sync çalışmıyor

**Belirtiler:**
- "Sync from WhatsApp" butonuna basılıyor
- Ama contactlar gelmiyor

**Çözüm:**
```bash
# 1. WhatsApp bağlı mı kontrol edin
# Frontend → WhatsApp menüsüne bakın

# 2. Manuel sync deneyin
curl -X POST http://localhost:3000/api/contacts/sync \
  -H "Authorization: Bearer YOUR_TOKEN"

# 3. Backend loglarını inceleyin
docker-compose logs backend | grep sync
```

---

### 🔒 Authentication Sorunları

#### Login çalışmıyor

**Belirtiler:**
- "Invalid credentials" hatası
- Şifreyi hatırlamıyorum

**Çözüm:**
```bash
# 1. Seed data'yı yükleyin (demo kullanıcıları oluşturur)
cd backend
node scripts/seed-data.js

# Demo: demo@example.com / demo123
# Admin: admin@example.com / admin123
```

#### Token expired hatası

**Belirtiler:**
- "Token expired" hatası
- Sürekli login sayfasına yönlendiriliyor

**Çözüm:**
```
# 1. Tarayıcı console'u açın (F12)
# 2. Application → Local Storage
# 3. "token" key'ini silin
# 4. Sayfayı yenileyin (F5)
# 5. Tekrar login yapın
```

---

### 🚀 Performance Sorunları

#### Sistem yavaş çalışıyor

**Belirtiler:**
- Sayfa yüklemesi uzun sürüyor
- API çağrıları yavaş

**Çözüm:**
```bash
# 1. Docker kaynaklarını kontrol edin
docker stats

# 2. Gereksiz container'ları durdurun
docker ps -a
docker stop [CONTAINER_ID]

# 3. Docker Desktop ayarlarını açın
# Resources → Memory: Min 4GB
# Resources → CPU: Min 2 cores
```

---

## 🆘 Tüm Sorunları Çözmek İçin: Temiz Kurulum

Eğer hiçbir şey çalışmıyorsa, sıfırdan başlayın:

```bash
# 1. Tüm container'ları durdurun ve silin
docker-compose down -v

# 2. Node modules'ları temizleyin
rm -rf backend/node_modules frontend/node_modules

# 3. .env dosyalarını yedekleyin
cp .env .env.backup
cp backend/.env backend/.env.backup

# 4. Kurulum scriptini çalıştırın
# Windows:
setup.bat

# Mac/Linux:
bash setup.sh

# 5. Seed data yükleyin
npm run seed

# 6. Health check yapın
npm run health
```

---

## 📞 Hala Sorun mu Var?

### Debug Modunda Çalıştırın

```bash
# Backend debug logs
cd backend
DEBUG=* npm start

# Frontend dev mode
cd frontend
npm run dev
```

### Logları Toplayın

```bash
# Tüm logları dosyaya kaydedin
docker-compose logs > docker-logs.txt

# Backend logları
docker-compose logs backend > backend-logs.txt

# Sorun raporlarken bu dosyaları gönderin
```

---

## ✅ Kontrol Listesi

Sorun yaşadığınızda şunları kontrol edin:

- [ ] Docker Desktop çalışıyor mu?
- [ ] Node.js yüklü mü? (`node --version`)
- [ ] Port'lar boş mu? (3000, 5173, 8080, 5432, 6379)
- [ ] .env dosyaları mevcut mu?
- [ ] Backend container çalışıyor mu? (`docker ps`)
- [ ] Database migration yapıldı mı?
- [ ] Seed data yüklendi mi?
- [ ] İnternet bağlantısı var mı? (Evolution API için)

---

**Mutlu kullanımlar! 🎉**
