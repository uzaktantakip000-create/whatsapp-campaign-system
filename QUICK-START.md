# 🚀 WhatsApp Campaign System - Hızlı Başlangıç

## 📌 Gereksinimler (Bir kere yükleyin)

### Windows:
1. **Docker Desktop** → https://www.docker.com/products/docker-desktop
2. **Node.js (v18+)** → https://nodejs.org

### Mac/Linux:
1. **Docker** → https://www.docker.com/get-started
2. **Node.js (v18+)** → https://nodejs.org

---

## ⚡ Kurulum (3 Adımda)

### Windows Kullanıcıları:

```cmd
# 1. Klasöre girin
cd whatsapp-campaign-system

# 2. Kurulum scriptini çalıştırın
setup.bat

# 3. Bittiğinde tarayıcıda açın:
http://localhost:5173
```

### Mac/Linux Kullanıcıları:

```bash
# 1. Klasöre girin
cd whatsapp-campaign-system

# 2. Kurulum scriptini çalıştırın
bash setup.sh

# 3. Bittiğinde tarayıcıda açın:
http://localhost:5173
```

---

## 🎯 İlk Kullanım

### 1. Giriş Yapın

**Demo Kullanıcı:**
- Email: `demo@example.com`
- Şifre: `demo123`

**Admin Kullanıcı:**
- Email: `admin@example.com`
- Şifre: `admin123`

### 2. WhatsApp Bağlayın

1. Sol menüden **WhatsApp** tıklayın
2. **Connect WhatsApp** butonuna tıklayın
3. Telefonunuzda WhatsApp açın
4. **Linked Devices** → **Link a Device**
5. QR kodu tarayın

### 3. Kontakları Senkronize Edin

1. Sol menüden **Contacts** tıklayın
2. **Sync from WhatsApp** butonuna tıklayın
3. Tüm kontaklarınız gelecek

### 4. İlk Kampanyanızı Oluşturun

1. Sol menüden **Campaigns** tıklayın
2. **Create Campaign** butonuna tıklayın
3. İsim verin, mesaj yazın
4. Kontakları seçin
5. **Create** tıklayın
6. **Start Campaign** ile başlatın

---

## 🛠️ Kolay Komutlar

| Komut | Açıklama |
|-------|----------|
| `npm run start` | Sistemi başlat |
| `npm run stop` | Sistemi durdur |
| `npm run restart` | Sistemi yeniden başlat |
| `npm run health` | Sistem kontrolü |
| `npm run logs` | Logları göster |
| `npm run seed` | Örnek verileri yükle |

---

## ❓ Sorun mu Yaşıyorsunuz?

### Backend çalışmıyor

```bash
# Docker container'ları kontrol edin
docker ps

# Logları inceleyin
docker-compose logs backend

# Yeniden başlatın
docker-compose restart backend
```

### Frontend açılmıyor

```bash
# Frontend'i manuel başlatın
cd frontend
npm run dev
```

### Database bağlantı hatası

```bash
# PostgreSQL container'ını yeniden başlatın
docker-compose restart postgres

# 10 saniye bekleyin ve tekrar deneyin
```

### Portlar kullanımda

```bash
# Port 3000 meşgul
netstat -ano | findstr :3000

# Process'i öldürün
taskkill /PID [PID_NUMARASI] /F
```

---

## 📞 Yardım

- 📖 Detaylı Dokümantasyon: `README.md`
- 🔧 Sorun Giderme: `TROUBLESHOOTING.md`
- 🚀 Deployment: `DEPLOYMENT.md`
- 📚 API Docs: http://localhost:3000/api-docs

---

## ⏱️ Kurulum Süresi

- **İlk Kurulum:** ~15 dakika
- **Sonraki Başlatmalar:** ~30 saniye

---

## ✨ Özellikler

✅ Otomatik kurulum
✅ Örnek verilerle gelir
✅ WhatsApp QR code ile bağlanma
✅ Otomatik contact senkronizasyonu
✅ Kampanya yönetimi
✅ Admin paneli
✅ Real-time updates
✅ Responsive tasarım

---

**Hemen başlayın! 🚀**

```bash
# Windows
setup.bat

# Mac/Linux
bash setup.sh
```
