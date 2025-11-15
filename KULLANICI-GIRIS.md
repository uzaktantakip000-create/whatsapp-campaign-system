# Kullanıcı Giriş Bilgileri

## 🎯 Hızlı Başlangıç

### Hazır Test Kullanıcıları Oluşturma

Aşağıdaki SQL komutunu çalıştırarak hazır kullanıcılar oluşturabilirsiniz:

```bash
psql -U campaign_user -d whatsapp_campaign -f database/seeds/create-admin.sql
```

Bu komut şu kullanıcıları oluşturur:

#### 1️⃣ ADMIN KULLANICI
```
Email: admin@whatsapp-campaign.com
Şifre: Admin123!
Rol: admin
```

**Admin Yetkiler:**
- ✅ Tüm danışman özellikler
- ✅ Admin Paneli erişimi
- ✅ Tüm danışmanları görme
- ✅ Danışmanları aktif/pasif yapma
- ✅ Sistem geneli istatistikler
- ✅ Aktivite logları

#### 2️⃣ DANIŞMAN KULLANICI
```
Email: consultant@whatsapp-campaign.com
Şifre: Admin123!
Rol: consultant
```

**Danışman Yetkiler:**
- ✅ Dashboard erişimi
- ✅ WhatsApp bağlantısı
- ✅ Kişi yönetimi (kendi kişileri)
- ✅ Kampanya oluşturma ve yönetme
- ✅ Mesaj şablonları
- ✅ Profil yönetimi
- ❌ Admin Paneli yok
- ❌ Diğer danışmanları göremez

---

## 📝 Manuel Kullanıcı Oluşturma

### Yöntem 1: Web Arayüzünden Kayıt

1. Tarayıcıda http://localhost:5173 adresine gidin
2. **"Kayıt Ol"** butonuna tıklayın
3. Formu doldurun:
   - **İsim:** Ahmet Yılmaz
   - **Email:** ahmet@example.com
   - **Şifre:** Ahmet123!
   - **Telefon:** +905551234567
4. **"Kayıt Ol"** butonuna tıklayın
5. Otomatik olarak giriş yapılacak

**Not:** İlk kayıt olan kullanıcı **danışman (consultant)** rolü alır.

### Yöntem 2: Admin Yapmak (Veritabanı)

Kayıt olan bir kullanıcıyı admin yapmak için:

```sql
-- Email ile admin yapma
UPDATE consultants
SET role = 'admin'
WHERE email = 'ahmet@example.com';

-- ID ile admin yapma
UPDATE consultants
SET role = 'admin'
WHERE id = 1;

-- Kontrol
SELECT id, name, email, role FROM consultants;
```

---

## 🔐 Şifre Gereksinimleri

Güvenli şifre oluşturmak için:

✅ **Gerekli:**
- En az 8 karakter
- En az 1 büyük harf (A-Z)
- En az 1 küçük harf (a-z)
- En az 1 rakam (0-9)

✅ **Önerilen:**
- Özel karakter (!@#$%^&*)
- En az 12 karakter
- Tahmin edilmesi zor

❌ **Kabul Edilmeyen:**
- "password123"
- "12345678"
- Aynı karakter tekrarı (aaaaaaaa)

**Örnek Güçlü Şifreler:**
- `MyPass123!`
- `SecureKey2024#`
- `Admin@2024!`

---

## 👥 Rol Farkları

### ADMIN vs DANIŞMAN

| Özellik | Admin | Danışman |
|---------|-------|----------|
| Dashboard | ✅ | ✅ |
| WhatsApp Bağlantısı | ✅ | ✅ |
| Kişi Yönetimi | ✅ | ✅ |
| Kampanya Yönetimi | ✅ | ✅ |
| Mesaj Şablonları | ✅ | ✅ |
| Mesaj Gönderimi | ✅ | ✅ |
| **Admin Paneli** | ✅ | ❌ |
| **Tüm Danışmanları Görme** | ✅ | ❌ |
| **Sistem İstatistikleri** | ✅ | ❌ |
| **Kullanıcı Yönetimi** | ✅ | ❌ |

### Admin Paneli Özellikleri

Admin hesabı ile giriş yaptığınızda:

1. **Sol menüde "Admin Paneli" sekmesi görünür**
2. Admin Panelinde:
   - 📊 Sistem geneli istatistikler
     - Toplam danışman sayısı
     - Toplam kampanya sayısı
     - Toplam mesaj sayısı
     - Aktif WhatsApp bağlantıları
   - 👥 Tüm danışmanların listesi
   - 🔍 Danışman detayları
   - ✅ Danışman aktif/pasif yapma
   - 📈 Danışman istatistikleri

---

## 🔄 Giriş/Çıkış İşlemleri

### Giriş Yapma

1. http://localhost:5173 adresine gidin
2. Email ve şifrenizi girin
3. **"Giriş Yap"** butonuna tıklayın
4. Dashboard'a yönlendirileceksiniz

### Çıkış Yapma

1. Sağ üstteki profil simgesine tıklayın
2. **"Çıkış Yap"** seçeneğine tıklayın
3. Login sayfasına yönlendirileceksiniz

### Unutulan Şifre

**Şu anda şifre sıfırlama özelliği yok.** Şifrenizi unutursanız:

1. Veritabanından şifreyi değiştirin:

```sql
-- Yeni şifre: NewPass123!
UPDATE consultants
SET password = '$2a$10$vI8aWBnW3fID.ZQ4/zo1G.q1lRps.9cGLcZEiGDMVr5yUP1KUOYTa'
WHERE email = 'ahmet@example.com';
```

2. Veya yeni hesap oluşturun

---

## 🧪 Test Senaryoları

### Senaryo 1: Admin Girişi

```
1. http://localhost:5173 aç
2. Email: admin@whatsapp-campaign.com
3. Şifre: Admin123!
4. Giriş Yap
5. Sol menüde "Admin Paneli" görünecek ✅
```

### Senaryo 2: Danışman Girişi

```
1. http://localhost:5173 aç
2. Email: consultant@whatsapp-campaign.com
3. Şifre: Admin123!
4. Giriş Yap
5. Sol menüde "Admin Paneli" GÖRÜNMEZ ❌
```

### Senaryo 3: Yeni Kayıt

```
1. http://localhost:5173/register aç
2. İsim: Test User
3. Email: test@example.com
4. Şifre: Test123!
5. Telefon: +905559999999
6. Kayıt Ol
7. Otomatik giriş yapılacak ✅
8. Rol: consultant (danışman)
```

---

## 🔒 Güvenlik Notları

### JWT Token

- Token süresi: **7 gün** (.env'de `JWT_EXPIRES_IN`)
- Token localStorage'da saklanır
- Çıkış yapınca token silinir
- Token süresi dolunca otomatik çıkış

### Şifre Güvenliği

- Şifreler **bcrypt** ile hash'lenir
- Salt rounds: **10**
- Veritabanında düz metin şifre yok
- Her kullanıcı için farklı salt

### API Güvenliği

- Rate limiting: Dakikada **100 istek**
- Helmet.js ile güvenlik başlıkları
- CORS koruması
- SQL injection koruması (parametreli sorgular)

---

## 📊 Örnek Kullanım

### 1. Admin ile Sistem Kurulumu

```
1. Admin hesabı ile giriş yap
2. Admin Paneli'ne git
3. Tüm danışmanları gör
4. Sistem istatistiklerini kontrol et
5. Gerekirse danışmanları pasif yap
```

### 2. Danışman ile Kampanya

```
1. Danışman hesabı ile giriş yap
2. WhatsApp'ı bağla (QR kod tarat)
3. Kişileri ekle (CSV import veya manuel)
4. Mesaj şablonu oluştur
5. Kampanya başlat
6. İlerlemeyi takip et
```

---

## 🆘 Sorun Giderme

### "Email zaten kayıtlı" hatası

- Bu email ile daha önce kayıt olunmuş
- Farklı bir email kullanın veya giriş yapın

### "Geçersiz şifre" hatası

- Şifre kurallarını kontrol edin
- En az 8 karakter olmalı
- Büyük harf, küçük harf ve rakam içermeli

### Admin Paneli görünmüyor

- Rolünüzü kontrol edin:
  ```sql
  SELECT id, name, email, role FROM consultants WHERE email = 'sizin@email.com';
  ```
- Role'ün 'admin' olması lazım
- Çıkış yapıp tekrar giriş yapın

### Token süresi doldu

- Otomatik çıkış yapılır
- Tekrar giriş yapın
- 7 gün boyunca aktif kalır

---

## 📞 Destek

Sorun yaşarsanız:

1. Backend loglarını kontrol edin
2. Frontend console'u kontrol edin (F12)
3. Veritabanı bağlantısını kontrol edin
4. .env dosyasını kontrol edin

---

**Son Güncelleme:** 2025-11-14
**Version:** 1.0.0
