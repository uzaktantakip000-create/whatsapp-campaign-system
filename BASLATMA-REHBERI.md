# 🚀 WhatsApp Campaign System - Basit Başlatma Rehberi

## ⚡ Hızlı Başlangıç (Tek Tıklama)

### 1. Ön Hazırlık (Sadece İlk Kez)

**Docker Desktop'ı Başlatın:**
- Windows'ta "Docker Desktop" yazıp uygulamayı açın
- Docker'ın başlamasını bekleyin (sistem tepsisinde whale simgesi sabit olmalı)
- Bu adım her bilgisayar açılışında yapılmalı

### 2. Sistemi Başlatma (Tek Tıklama)

**Windows Explorer'da:**
```
C:\Users\USER\Downloads\files\whatsapp-campaign-system\start.bat
```
dosyasına çift tıklayın!

Script şunları otomatik yapar:
- ✅ Docker'ı kontrol eder
- ✅ PostgreSQL ve Redis'i başlatır
- ✅ Backend'i başlatır (http://localhost:3000)
- ✅ Frontend'i başlatır (http://localhost:5173)
- ✅ Giriş bilgilerini gösterir

### 3. Giriş Yapma

Tarayıcınızda: **http://localhost:5173**

**ADMIN Hesabı:**
```
Email: admin@whatsapp-campaign.com
Şifre: Admin123!
```

**DANIŞMAN Hesabı:**
```
Email: consultant@whatsapp-campaign.com
Şifre: Admin123!
```

### 4. Sistemi Durdurma

**Windows Explorer'da:**
```
C:\Users\USER\Downloads\files\whatsapp-campaign-system\stop.bat
```
dosyasına çift tıklayın!

---

## 🔧 Manuel Başlatma (Eğer Script Çalışmazsa)

### Adım 1: Docker Desktop'ı Başlat
- Windows'ta "Docker Desktop" uygulamasını aç
- Tamamen başlamasını bekle

### Adım 2: Docker Konteynerlerini Başlat
PowerShell veya CMD'de:
```bash
cd C:\Users\USER\Downloads\files\whatsapp-campaign-system
docker-compose up -d postgres redis
```

### Adım 3: Backend'i Başlat
Yeni bir terminal penceresi aç:
```bash
cd C:\Users\USER\Downloads\files\whatsapp-campaign-system\backend
npm start
```

### Adım 4: Frontend'i Başlat
Yeni bir terminal penceresi aç:
```bash
cd C:\Users\USER\Downloads\files\whatsapp-campaign-system\frontend
npm run dev
```

### Adım 5: Tarayıcıda Aç
```
http://localhost:5173
```

---

## ❓ Sorun Giderme

### "Docker çalışmıyor" Hatası
**Çözüm:**
1. Docker Desktop uygulamasını aç
2. Whale simgesinin sistem tepsisinde sabit olmasını bekle
3. `start.bat` dosyasını tekrar çalıştır

### "Network Error" Hatası
**Çözüm:**
1. Backend'in çalışıp çalışmadığını kontrol et
2. http://localhost:3000/health adresini ziyaret et
3. Çalışmıyorsa `start.bat` dosyasını tekrar çalıştır

### "Port already in use" Hatası
**Çözüm:**
1. Eski processleri kapat
2. `stop.bat` dosyasını çalıştır
3. 5 saniye bekle
4. `start.bat` dosyasını tekrar çalıştır

### Frontend açılıyor ama login çalışmıyor
**Çözüm:**
1. Docker Desktop'ın çalıştığından emin ol
2. Backend'in çalıştığını kontrol et: http://localhost:3000/health
3. Her ikisi de çalışıyorsa, tarayıcı cache'ini temizle (Ctrl+Shift+Delete)

---

## 📋 Sistem Gereksinimleri

- ✅ Windows 10/11
- ✅ Docker Desktop yüklü ve çalışıyor
- ✅ Node.js 18+ yüklü
- ✅ En az 4GB RAM
- ✅ 2GB boş disk alanı

---

## 🎯 Hızlı Test

Sistemi başlattıktan sonra şunları deneyin:

1. **Admin Panel Testi:**
   - Admin ile giriş yap
   - Sol menüde "Admin Paneli" sekmesine tıkla
   - Tüm danışmanları gör

2. **Dashboard Testi:**
   - Dashboard'da istatistikleri gör
   - WhatsApp bağlantı durumunu kontrol et

3. **Logout Testi:**
   - Sağ üstteki profil simgesine tıkla
   - "Çıkış Yap" seçeneğine tıkla
   - Login sayfasına yönlendirildiğini doğrula

---

## 📞 Yardım

Sorun yaşarsanız:

1. **Backend Loglarını Kontrol Edin:**
   - Backend terminal penceresinde hata mesajlarına bakın

2. **Frontend Console'u Kontrol Edin:**
   - Tarayıcıda F12'ye basın
   - Console sekmesinde hata mesajlarına bakın

3. **Docker Durumunu Kontrol Edin:**
   ```bash
   docker ps
   ```
   - PostgreSQL ve Redis konteynerlerinin çalıştığını doğrulayın

---

**Son Güncelleme:** 2025-11-14
**Version:** 1.0.0
