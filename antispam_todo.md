# 🛡️ ANTI-SPAM SİSTEMİ - YAPILACAKLAR LİSTESİ

**Proje:** WhatsApp Campaign System
**Amaç:** WhatsApp ban riskini minimize etmek
**Tarih:** 2025-11-17

---

## 🎯 ALINMIŞ KARARLAR (2025-11-17)

### ✅ Kullanıcı Kararları:

1. **Task Seçimi:** Claude'un kararına bırakıldı (en kritik task'tan başlanacak)
2. **Redis Kullanımı:** ✅ EVET - Rate limiting için Redis kullanılacak
3. **Cron Job:**
   - **Açıklama:** Cron job = Zamanlı görev. Örnek: Her gece saat 00:00'da otomatik çalışan kod
   - **Kullanım:** Spam skorlarını azaltmak için her gece otomatik çalışacak
   - **Teknoloji:** `node-cron` package kullanılacak
4. **OpenAI API:** ✅ EVET - Kullanıcı API key ekleyecek (AI message variation için)
5. **Admin Alert:** 🔔 Panel Notification - Email/SMS yerine dashboard'da bildirim sistemi

### 📋 Uygulama Stratejisi:

**PHASE 1: Kritik Task'lar (Hemen)**
- ✅ TASK 2: Aynı Mesaj Spam Kontrolü (en kolay, hemen uygulanabilir)
- ✅ TASK 3: Mesaj İçerik Analizi (bağımlılık yok, pure JS)
- ✅ TASK 1: Spam Skor Azaltma (cron job ile)
- ✅ TASK 4: Engagement Score Tracking
- ✅ TASK 5: Bloke Edilme Tespiti

**PHASE 2: Yüksek Öncelik (Bu Hafta)**
- ⏳ TASK 8: Redis Rate Limiting (Redis onaylandı)
- ⏳ TASK 6-10: Diğer yüksek öncelik task'lar

**PHASE 3: Orta/Düşük Öncelik (Sonrası)**
- ⏳ Admin Alert → Panel notification olarak implement edilecek
- ⏳ AI features → OpenAI API key eklendikten sonra

### 🔧 Teknik Kararlar:

- **Database Migration:** Her task için migration dosyası oluşturulacak
- **Redis Container:** docker-compose.yml'e eklenecek
- **Cron Service:** Backend server başlangıcında başlatılacak
- **Notification System:** Frontend'e real-time notification component eklenecek
- **API Key Management:** .env dosyasına OPENAI_API_KEY eklenecek

---

## 📊 ÖNCELİK TABLOSU

| Öncelik | Task Sayısı | Tahmini Süre | Risk Azaltma |
|---------|-------------|--------------|--------------|
| 🔴 Kritik | 5 | 2-3 gün | %80 |
| 🟠 Yüksek | 5 | 3-4 gün | %15 |
| 🟡 Orta | 5 | 5-7 gün | %4 |
| 🟢 Düşük | 5 | 2-3 hafta | %1 |

---

## 🔴 KRİTİK ÖNCELİK (Hemen Yapılmalı)

### ✅ TASK 1: Spam Skor Azaltma Sistemi
**Öncelik:** 🔴 Kritik
**Süre:** 4-6 saat
**Etki:** ⭐⭐⭐⭐⭐

**Problem:**
- Spam skoru sadece artıyor, hiç azalmıyor
- Bir kez 70'e ulaşan hesap sonsuza kadar bloke kalıyor

**Çözüm:**
- Günlük otomatik skor azaltma (-2 puan/gün)
- 7 gün temiz kayıt bonusu (-10 puan)
- Engagement bonusu (-5 puan)

**Değişecek Dosyalar:**
- [ ] `backend/package.json` - node-cron ekleme
- [ ] `backend/src/services/spamScoreManager.js` - YENİ dosya
- [ ] `backend/server.js` - Cron job başlatma
- [ ] `backend/src/controllers/messages.js` - Engagement bonus entegrasyonu

**Teknik Detaylar:**
```javascript
// Cron: Her gece 00:00'da çalışır
cron.schedule('0 0 * * *', async () => {
  await decreaseSpamScores(); // Herkese -2 puan
  await applyCleanRecordBonus(); // 7 gün temiz = -10 puan
  await applyEngagementBonus(); // %50+ cevap = -5 puan
});
```

**Bağımlılıklar:**
- `node-cron` package
- PostgreSQL CRON veya Node.js cron

**Testler:**
- Manuel spam skoru artırma ve azalma testi
- 7 gün temiz kayıt simülasyonu
- Engagement bonus hesaplama testi

---

### ✅ TASK 2: Aynı Mesaj Spam Kontrolü (MD5 Hash)
**Öncelik:** 🔴 Kritik
**Süre:** 3-4 saat
**Etki:** ⭐⭐⭐⭐⭐

**Problem:**
- Aynı mesajı 100 kişiye gönderme = WhatsApp'ın #1 ban sebebi
- Copy-paste detection yok

**Çözüm:**
- MD5 hash ile aynı mesaj tespiti
- 24 saat içinde aynı mesaj max 5 kişiye
- AI-powered message variation (farklı selamlamalar)

**Değişecek Dosyalar:**
- [ ] `backend/database/migrations/add_message_hash.sql` - YENİ migration
- [ ] `backend/src/controllers/messages.js` - Hash kontrolü ekleme
- [ ] `backend/src/services/messageVariation.js` - YENİ dosya

**Teknik Detaylar:**
```sql
-- Migration
ALTER TABLE messages ADD COLUMN message_hash VARCHAR(32);
CREATE INDEX idx_messages_hash ON messages(message_hash, created_at);
```

```javascript
// Hash hesaplama
const crypto = require('crypto');
const messageHash = crypto.createHash('md5').update(messageText).digest('hex');

// Kontrol
const sameMessages = await db.query(`
  SELECT COUNT(*) FROM messages
  WHERE message_hash = $1
  AND created_at > NOW() - INTERVAL '24 hours'
`, [messageHash]);

if (sameMessages.rows[0].count >= 5) {
  throw new Error('Bu mesaj 24 saat içinde 5 kişiye gönderildi. Lütfen mesajı değiştirin.');
}
```

**Message Variation Stratejisi:**
```javascript
function generateVariation(baseMessage, contactName) {
  const greetings = ['Merhaba', 'Selam', 'İyi günler', 'Hoşgeldiniz'];
  const endings = ['İyi günler.', 'Teşekkürler.', 'Sevgiler.', 'Saygılarımla.'];

  const greeting = greetings[Math.floor(Math.random() * greetings.length)];
  const ending = endings[Math.floor(Math.random() * endings.length)];

  return `${greeting} ${contactName},\n\n${baseMessage}\n\n${ending}`;
}
```

**Bağımlılıklar:**
- Node.js crypto (built-in)

**Testler:**
- Aynı mesajı 6 kişiye gönderme denemesi (5. kişi geçmeli, 6. bloke olmalı)
- Hash collision testi
- Variation fonksiyonu testi

---

### ✅ TASK 3: Mesaj İçerik Analizi
**Öncelik:** 🔴 Kritik
**Süre:** 4-5 saat
**Etki:** ⭐⭐⭐⭐⭐

**Problem:**
- Mesaj uzunluğu kontrolü yok (>1000 karakter spam)
- Link sayısı kontrolü yok (2+ link = spam)
- Telefon numarası, büyük harf, emoji spam kontrolü yok

**Çözüm:**
- Content analysis fonksiyonu
- Risk skoru hesaplama (0-100)
- 20+ risk skoru = mesaj reddedilir

**Değişecek Dosyalar:**
- [ ] `backend/src/services/contentAnalyzer.js` - YENİ dosya
- [ ] `backend/src/controllers/messages.js` - Content analysis entegrasyonu
- [ ] `backend/src/validators/schemas.js` - Validation rules güncelleme

**Teknik Detaylar:**
```javascript
function analyzeMessageContent(messageText) {
  const risks = [];
  let riskScore = 0;

  // 1. Uzunluk kontrolü (>1000 karakter)
  if (messageText.length > 1000) {
    riskScore += 10;
    risks.push('Mesaj çok uzun');
  }

  // 2. Link kontrolü (max 2 link)
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const links = messageText.match(urlRegex) || [];
  if (links.length > 2) {
    riskScore += 20;
    risks.push('Çok fazla link');
  }

  // 3. Telefon numarası (1+ telefon)
  const phoneRegex = /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g;
  const phones = messageText.match(phoneRegex) || [];
  if (phones.length > 1) {
    riskScore += 10;
    risks.push('Birden fazla telefon');
  }

  // 4. Büyük harf oranı (>%50 = spam)
  const uppercaseRatio = (messageText.match(/[A-Z]/g) || []).length / messageText.length;
  if (uppercaseRatio > 0.5) {
    riskScore += 10;
    risks.push('Çok fazla büyük harf');
  }

  // 5. Tekrarlanan karakterler (!!!!, ????)
  if (/(.)\1{4,}/.test(messageText)) {
    riskScore += 5;
    risks.push('Tekrarlanan karakterler');
  }

  // 6. Emoji sayısı (>10 emoji)
  const emojiRegex = /[\u{1F600}-\u{1F64F}]/gu;
  const emojis = messageText.match(emojiRegex) || [];
  if (emojis.length > 10) {
    riskScore += 5;
    risks.push('Çok fazla emoji');
  }

  return { riskScore, risks, safe: riskScore < 20 };
}
```

**Bağımlılıklar:**
- Yok (pure JavaScript)

**Testler:**
- Uzun mesaj testi (>1000 karakter)
- 3 link'li mesaj testi
- Büyük harfli mesaj testi (SPAM MESAJ)
- Emoji spam testi (🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉)

---

### ✅ TASK 4: Engagement Score Tracking
**Öncelik:** 🔴 Kritik
**Süre:** 5-6 saat
**Etki:** ⭐⭐⭐⭐⭐

**Problem:**
- Cevap alıp almadığımızı takip etmiyoruz
- WhatsApp düşük engagement'ı spam olarak algılar
- 100 mesaj, 0 cevap = BAN

**Çözüm:**
- Consultant bazında engagement_score kolonu
- Contact bazında received_reply flag'i
- Webhook'ta cevap geldiğinde otomatik güncelleme
- Düşük engagement uyarısı (<%10)

**Değişecek Dosyalar:**
- [ ] `backend/database/migrations/add_engagement_tracking.sql` - YENİ migration
- [ ] `backend/src/controllers/webhooks.js` - Reply tracking ekleme
- [ ] `backend/src/services/engagementManager.js` - YENİ dosya
- [ ] `backend/src/controllers/messages.js` - Engagement kontrolü ekleme

**Teknik Detaylar:**
```sql
-- Migration
ALTER TABLE consultants ADD COLUMN engagement_score FLOAT DEFAULT 0.0;
ALTER TABLE contacts ADD COLUMN received_reply BOOLEAN DEFAULT FALSE;
CREATE INDEX idx_contacts_engagement ON contacts(consultant_id, received_reply);
```

```javascript
// Webhook: Cevap geldiğinde
async function handleIncomingMessage(message) {
  if (!message.fromMe) {
    // Karşı taraf cevap verdi
    await db.query(`
      UPDATE contacts
      SET received_reply = TRUE
      WHERE number = $1
    `, [message.from]);

    // Engagement skorunu güncelle
    await updateEngagementScore(consultantId);
  }
}

// Engagement hesaplama
async function updateEngagementScore(consultantId) {
  const result = await db.query(`
    SELECT
      COUNT(*) FILTER (WHERE received_reply = TRUE) as replied,
      COUNT(*) as total
    FROM contacts
    WHERE consultant_id = $1
    AND last_message_from_us IS NOT NULL
  `, [consultantId]);

  const { replied, total } = result.rows[0];
  const engagementScore = total > 0 ? (replied / total) * 100 : 0;

  await db.query(`
    UPDATE consultants
    SET engagement_score = $1
    WHERE id = $2
  `, [engagementScore, consultantId]);
}

// Anti-Spam Check
if (engagementScore < 10 && totalMessagesSent > 50) {
  throw new Error(`Engagement oranı çok düşük (%${engagementScore}). Mesaj gönderimi durduruldu.`);
}
```

**Bağımlılıklar:**
- Yok

**Testler:**
- Cevap geldiğinde received_reply = TRUE testi
- Engagement skoru hesaplama testi
- Düşük engagement uyarı testi

---

### ✅ TASK 5: Bloke Edilme Tespiti
**Öncelik:** 🔴 Kritik
**Süre:** 3-4 saat
**Etki:** ⭐⭐⭐⭐

**Problem:**
- Bizi bloke eden kişilere mesaj göndermeye devam ediyoruz
- Bloke edilmiş numaraya mesaj = spam score artışı

**Çözüm:**
- Evolution API hata kodlarını yakala (403, blocked)
- Contact'ı is_blocked = TRUE olarak işaretle
- Bloke edilmiş kişilere mesaj gönderme engelle

**Değişecek Dosyalar:**
- [ ] `backend/database/migrations/add_blocked_tracking.sql` - YENİ migration
- [ ] `backend/src/services/evolution/client.js` - Error handling iyileştirme
- [ ] `backend/src/controllers/messages.js` - Bloke kontrolü ekleme

**Teknik Detaylar:**
```sql
-- Migration
ALTER TABLE contacts ADD COLUMN is_blocked BOOLEAN DEFAULT FALSE;
ALTER TABLE contacts ADD COLUMN blocked_at TIMESTAMP;
CREATE INDEX idx_contacts_blocked ON contacts(is_blocked);
```

```javascript
// Evolution client: Error handling
async sendTextMessage(instanceName, number, text) {
  try {
    const response = await this.client.post(`/message/sendText/${instanceName}`, {
      number: number,
      text: text
    });
    return response.data;
  } catch (error) {
    // Bloke tespiti
    if (error.response?.status === 403 ||
        error.message.includes('blocked') ||
        error.message.includes('not authorized')) {

      // Contact'ı bloke olarak işaretle
      await db.query(`
        UPDATE contacts
        SET is_blocked = TRUE, blocked_at = CURRENT_TIMESTAMP
        WHERE number = $1
      `, [number]);

      logger.warn(`[Evolution] Contact ${number} BLOCKED us. Marked as blocked.`);
    }

    throw error;
  }
}

// Anti-Spam Check
const blockCheck = await db.query(`
  SELECT is_blocked FROM contacts WHERE id = $1
`, [contactId]);

if (blockCheck.rows[0]?.is_blocked) {
  throw new Error('Bu kişi sizi bloke etmiş. Mesaj gönderilemez.');
}
```

**Bağımlılıklar:**
- Yok

**Testler:**
- 403 error simülasyonu
- Bloke flag'i set edilme testi
- Bloke edilmiş kişiye mesaj gönderme engelleme testi

---

## 🟠 YÜKSEK ÖNCELİK (Bu Hafta)

### ✅ TASK 6: İnsan Davranış Pattern (Gelişmiş Random Delay)
**Öncelik:** 🟠 Yüksek
**Süre:** 3-4 saat
**Etki:** ⭐⭐⭐⭐

**Problem:**
- 20-40 saniye sabit pattern
- WhatsApp bot tespiti için pattern analizi yapıyor

**Çözüm:**
- Weighted random delay (5s - 30dk arası)
- Günün saatine göre davranış değişimi
- %10: 5-15s (hızlı)
- %40: 20-40s (normal)
- %30: 45-90s (yavaş)
- %15: 2-5dk (molada)
- %5: 10-30dk (toplantıda)

**Değişecek Dosyalar:**
- [ ] `backend/src/services/humanBehavior.js` - YENİ dosya
- [ ] `backend/src/controllers/messages.js` - Delay fonksiyonu değiştirme
- [ ] `backend/src/services/campaignExecutor.js` - Executor'da delay güncelleme

**Teknik Detaylar:**
```javascript
function getHumanLikeDelay() {
  const patterns = [
    { weight: 0.1, min: 5, max: 15 },    // %10: Hızlı
    { weight: 0.4, min: 20, max: 40 },   // %40: Normal
    { weight: 0.3, min: 45, max: 90 },   // %30: Yavaş
    { weight: 0.15, min: 120, max: 300 }, // %15: Mola
    { weight: 0.05, min: 600, max: 1800 } // %5: Toplantı
  ];

  const rand = Math.random();
  let cumulative = 0;

  for (const pattern of patterns) {
    cumulative += pattern.weight;
    if (rand <= cumulative) {
      return Math.floor(Math.random() * (pattern.max - pattern.min)) + pattern.min;
    }
  }

  return 30; // fallback
}

// Saate göre davranış
function getContextualDelay() {
  const hour = new Date().getHours();

  if (hour >= 12 && hour < 14) {
    return Math.random() * (180 - 60) + 60; // Öğle: 1-3dk
  }

  if (hour >= 18 && hour < 20) {
    return Math.random() * (20 - 10) + 10; // Akşam: 10-20s
  }

  return getHumanLikeDelay();
}
```

**Testler:**
- 100 mesaj gönderimi ve delay dağılımı analizi
- Saate göre davranış testi

---

### ✅ TASK 7: Profile Health Check
**Öncelik:** 🟠 Yüksek
**Süre:** 3-4 saat
**Etki:** ⭐⭐⭐⭐

**Problem:**
- Profil fotoğrafı olmayan hesaplar spam olarak algılanır
- Boş profil = bot

**Çözüm:**
- Profil sağlığı skoru (0-100)
- Profil fotoğrafı: +25 puan
- İsim: +25 puan
- About: +25 puan
- Business hesap: +25 puan
- %50'nin altındaysa limit azalt

**Değişecek Dosyalar:**
- [ ] `backend/database/migrations/add_profile_health.sql` - YENİ migration
- [ ] `backend/src/services/profileHealthChecker.js` - YENİ dosya
- [ ] `backend/src/controllers/whatsapp.js` - QR scan sonrası health check

**Teknik Detaylar:**
```sql
ALTER TABLE consultants ADD COLUMN profile_health_score INTEGER DEFAULT 0;
```

```javascript
async function checkProfileHealth(instanceName) {
  const profileInfo = await evolutionClient.getProfileInfo(instanceName);

  const health = {
    hasProfilePicture: profileInfo.profilePicture ? 25 : 0,
    hasName: profileInfo.name ? 25 : 0,
    hasAbout: profileInfo.about ? 25 : 0,
    isBusiness: profileInfo.isBusiness ? 25 : 0
  };

  const totalHealth = Object.values(health).reduce((a, b) => a + b, 0);

  if (totalHealth < 50) {
    // Günlük limiti %50 azalt
    effectiveDailyLimit = Math.floor(effectiveDailyLimit * 0.5);
  }

  return totalHealth;
}
```

**Testler:**
- Boş profil testi (0 puan)
- Tam profil testi (100 puan)
- Limit azaltma testi

---

### ✅ TASK 8: Rate Limiting (Redis)
**Öncelik:** 🟠 Yüksek
**Süre:** 4-5 saat
**Etki:** ⭐⭐⭐⭐

**Problem:**
- Saniyede kaç mesaj gönderildiği kontrol edilmiyor
- Burst gönderim = bot tespiti

**Çözüm:**
- Redis ile rate limiting
- Dakikada max 3 mesaj
- Instance bazlı kontrol

**Değişecek Dosyalar:**
- [ ] `backend/package.json` - ioredis ekleme
- [ ] `backend/docker-compose.yml` - Redis container ekleme
- [ ] `backend/src/config/redis.js` - YENİ dosya
- [ ] `backend/src/middleware/rateLimit.js` - YENİ dosya
- [ ] `backend/src/controllers/messages.js` - Rate limit kontrolü

**Teknik Detaylar:**
```yaml
# docker-compose.yml
redis:
  image: redis:7-alpine
  ports:
    - "6379:6379"
  volumes:
    - redis_data:/data
```

```javascript
const Redis = require('ioredis');
const redis = new Redis({
  host: process.env.REDIS_HOST || 'redis',
  port: process.env.REDIS_PORT || 6379
});

async function checkRateLimit(instanceName) {
  const key = `rate_limit:${instanceName}`;

  const count = await redis.incr(key);
  await redis.expire(key, 60); // 60 saniye TTL

  if (count > 3) {
    throw new Error('Rate limit exceeded. Max 3 messages per minute.');
  }

  return count;
}
```

**Bağımlılıklar:**
- Redis server
- ioredis package

**Testler:**
- 4 mesaj/dakika testi (4. mesaj bloke olmalı)
- TTL testi (60 saniye sonra reset)

---

### ✅ TASK 9: Spam Report Detection (Dolaylı)
**Öncelik:** 🟠 Yüksek
**Süre:** 4-5 saat
**Etki:** ⭐⭐⭐⭐

**Problem:**
- Spam raporu aldığımızı bilemiyoruz
- 10+ spam raporu = ban

**Çözüm:**
- Fail rate artışı analizi
- Son 7 gün vs önceki 7 gün karşılaştırması
- %50+ artış = potansiyel spam report
- Otomatik spam skoru artırma (+20)

**Değişecek Dosyalar:**
- [ ] `backend/src/services/spamReportDetector.js` - YENİ dosya
- [ ] `backend/server.js` - Cron job ekleme (günlük)
- [ ] `backend/src/services/alertManager.js` - YENİ dosya (admin alert)

**Teknik Detaylar:**
```javascript
async function detectPotentialSpamReports(consultantId) {
  // Son 7 gün
  const last7Days = await db.query(`
    SELECT
      COUNT(*) FILTER (WHERE status = 'sent') as sent,
      COUNT(*) FILTER (WHERE status = 'failed') as failed
    FROM messages
    WHERE consultant_id = $1
    AND created_at > NOW() - INTERVAL '7 days'
  `, [consultantId]);

  // Önceki 7 gün
  const previous7Days = await db.query(`
    SELECT
      COUNT(*) FILTER (WHERE status = 'sent') as sent,
      COUNT(*) FILTER (WHERE status = 'failed') as failed
    FROM messages
    WHERE consultant_id = $1
    AND created_at BETWEEN NOW() - INTERVAL '14 days' AND NOW() - INTERVAL '7 days'
  `, [consultantId]);

  const currentFailRate = last7Days.rows[0].failed / last7Days.rows[0].sent;
  const previousFailRate = previous7Days.rows[0].failed / previous7Days.rows[0].sent;

  // Fail rate %50+ arttıysa
  if (currentFailRate > previousFailRate * 1.5) {
    logger.error(`⚠️ POTENTIAL SPAM REPORTS! Fail rate increased ${((currentFailRate/previousFailRate - 1) * 100).toFixed(0)}%`);

    // Spam skorunu artır
    await db.query(`
      UPDATE consultants
      SET spam_risk_score = spam_risk_score + 20
      WHERE id = $1
    `, [consultantId]);

    // Admin alert
    await sendAdminAlert(consultantId, 'POTENTIAL_SPAM_REPORTS', {
      currentFailRate: (currentFailRate * 100).toFixed(2) + '%',
      previousFailRate: (previousFailRate * 100).toFixed(2) + '%'
    });
  }
}
```

**Testler:**
- Fail rate artışı simülasyonu
- Admin alert testi

---

### ✅ TASK 10: Contact Warm-up (İlk Mesaj Stratejisi)
**Öncelik:** 🟠 Yüksek
**Süre:** 3-4 saat
**Etki:** ⭐⭐⭐

**Problem:**
- İlk defa mesaj göndereceğimiz kişilere direkt kampanya mesajı
- WhatsApp bunu spam olarak algılar

**Çözüm:**
- İlk mesaj kısa ve samimi
- 24 saat sonra asıl kampanya mesajı
- first_message_sent flag'i

**Değişecek Dosyalar:**
- [ ] `backend/database/migrations/add_contact_warmup.sql` - YENİ migration
- [ ] `backend/src/services/contactWarmup.js` - YENİ dosya
- [ ] `backend/src/controllers/messages.js` - İlk mesaj kontrolü

**Teknik Detaylar:**
```sql
ALTER TABLE contacts ADD COLUMN first_message_sent BOOLEAN DEFAULT FALSE;
ALTER TABLE contacts ADD COLUMN first_message_sent_at TIMESTAMP;
```

```javascript
async function sendWarmupMessage(contact) {
  const warmupMessages = [
    'Merhaba! Nasılsınız?',
    'Selam, iyi günler!',
    'Merhabalar, bugün nasılsınız?'
  ];

  const randomMessage = warmupMessages[Math.floor(Math.random() * warmupMessages.length)];

  await sendTextMessage(instanceName, contact.number, randomMessage);

  await db.query(`
    UPDATE contacts
    SET first_message_sent = TRUE, first_message_sent_at = CURRENT_TIMESTAMP
    WHERE id = $1
  `, [contact.id]);
}

// Kontrol
if (!contact.first_message_sent) {
  await sendWarmupMessage(contact);
  throw new Error('İlk mesaj gönderildi. 24 saat sonra kampanya mesajı gönderilebilir.');
}
```

**Testler:**
- İlk mesaj gönderimi
- 24 saat beklemeden kampanya mesajı testi

---

## 🟡 ORTA ÖNCELİK (Bu Ay)

### ✅ TASK 11: Mesaj Kalite Skoru
**Öncelik:** 🟡 Orta
**Süre:** 4-5 saat
**Etki:** ⭐⭐⭐

**Açıklama:**
- Her mesaja 0-100 arası kalite puanı
- Uzunluk, link, emoji, büyük harf, kişiselleştirme analizi
- Düşük kalite (<50) mesaj gönderilmez

**Değişecek Dosyalar:**
- [ ] `backend/src/services/messageQualityScorer.js` - YENİ

---

### ✅ TASK 12: Auto-Pause Sistemi
**Öncelik:** 🟡 Orta
**Süre:** 3-4 saat
**Etki:** ⭐⭐⭐

**Açıklama:**
- Spam skoru 60'a ulaşınca kampanyaları otomatik durdur
- Admin'e bildirim gönder
- Manuel onay ile devam et

**Değişecek Dosyalar:**
- [ ] `backend/src/services/autoPauseManager.js` - YENİ
- [ ] `backend/src/controllers/campaigns.js` - Auto-pause entegrasyonu

---

### ✅ TASK 13: Admin Alert Sistemi
**Öncelik:** 🟡 Orta
**Süre:** 5-6 saat
**Etki:** ⭐⭐⭐

**Açıklama:**
- Kritik spam olaylarında email/SMS alert
- Spam skoru 60+ → Email
- Potential spam report → SMS
- Daily digest (günlük özet)

**Değişecek Dosyalar:**
- [ ] `backend/src/services/alertManager.js` - YENİ
- [ ] `backend/package.json` - nodemailer, twilio ekleme

**Bağımlılıklar:**
- nodemailer (email)
- twilio (SMS)

---

### ✅ TASK 14: A/B Testing Sistemi
**Öncelik:** 🟡 Orta
**Süre:** 6-8 saat
**Etki:** ⭐⭐⭐

**Açıklama:**
- Farklı mesaj varyasyonlarını test et
- %50 A versiyonu, %50 B versiyonu
- Hangi mesaj daha iyi engagement aldı?
- Otomatik en iyi mesajı seç

**Değişecek Dosyalar:**
- [ ] `backend/database/migrations/add_ab_testing.sql` - YENİ
- [ ] `backend/src/services/abTestingManager.js` - YENİ
- [ ] `frontend/src/pages/ABTesting.jsx` - YENİ sayfa

---

### ✅ TASK 15: Hesap Sağlık Raporu (PDF)
**Öncelik:** 🟡 Orta
**Süre:** 6-8 saat
**Etki:** ⭐⭐

**Açıklama:**
- Haftalık PDF raporu
- Spam skoru, engagement, mesaj başarı oranı
- Grafik ve öneriler
- Email ile gönderme

**Değişecek Dosyalar:**
- [ ] `backend/src/services/reportGenerator.js` - YENİ
- [ ] `backend/package.json` - puppeteer veya pdfkit

**Bağımlılıklar:**
- puppeteer veya pdfkit

---

## 🟢 DÜŞÜK ÖNCELİK (İlerisi İçin)

### ✅ TASK 16: AI Content Moderator
**Öncelik:** 🟢 Düşük
**Süre:** 8-10 saat
**Etki:** ⭐⭐

**Açıklama:**
- OpenAI ile mesaj içeriği analizi
- Spam tespit, toxic content detection
- Otomatik mesaj düzeltme önerileri

**Bağımlılıklar:**
- OpenAI API key
- openai package

---

### ✅ TASK 17: Competitor Analysis
**Öncelik:** 🟢 Düşük
**Süre:** 10-12 saat
**Etki:** ⭐⭐

**Açıklama:**
- Rakiplerin mesaj stratejilerini analiz et
- Hangi saatlerde gönderiyorlar?
- Ne kadar sıklıkla?
- Mesaj uzunlukları?

---

### ✅ TASK 18: Sentiment Analysis
**Öncelik:** 🟢 Düşük
**Süre:** 8-10 saat
**Etki:** ⭐⭐

**Açıklama:**
- Gelen cevapların duygu analizi
- Pozitif/negatif/nötr
- Engagement skoru hesaplamasında kullan

**Bağımlılıklar:**
- sentiment package veya OpenAI

---

### ✅ TASK 19: Auto-Reply Detector
**Öncelik:** 🟢 Düşük
**Süre:** 4-5 saat
**Etki:** ⭐

**Açıklama:**
- Otomatik cevapları tespit et
- "I'm currently away" gibi mesajlar
- Engagement hesaplamasından çıkar

---

### ✅ TASK 20: WhatsApp Business API Geçişi
**Öncelik:** 🟢 Düşük (ama stratejik)
**Süre:** 3-4 hafta
**Etki:** ⭐⭐⭐⭐

**Açıklama:**
- Evolution API yerine Official WhatsApp Business API
- Daha güvenilir, daha az ban riski
- Ancak ücretli ve daha karmaşık

**Bağımlılıklar:**
- WhatsApp Business API key (Meta)
- Ücretli hesap

---

## 📊 UYGULAMA PLANI

### Hafta 1: Kritik Öncelik (5 Task)
- [x] **Gün 1-2:** TASK 1 (Spam Skor Azaltma)
- [x] **Gün 2-3:** TASK 2 (Aynı Mesaj Spam Kontrolü)
- [x] **Gün 3-4:** TASK 3 (Mesaj İçerik Analizi)
- [x] **Gün 4-5:** TASK 4 (Engagement Score)
- [x] **Gün 5-6:** TASK 5 (Bloke Tespiti)
- [x] **Gün 7:** Test ve bug fix

### Hafta 2: Yüksek Öncelik (5 Task)
- [ ] **Gün 8-9:** TASK 6 (İnsan Davranış Pattern)
- [ ] **Gün 9-10:** TASK 7 (Profile Health Check)
- [ ] **Gün 10-12:** TASK 8 (Rate Limiting - Redis)
- [ ] **Gün 12-13:** TASK 9 (Spam Report Detection)
- [ ] **Gün 13-14:** TASK 10 (Contact Warm-up)

### Hafta 3-4: Orta Öncelik (5 Task)
- [ ] TASK 11-15

### Hafta 5-8: Düşük Öncelik (5 Task)
- [ ] TASK 16-20

---

## 🔧 GEREKLİ BAĞIMLILIKLAR

### NPM Packages
```bash
npm install node-cron      # Cron jobs için
npm install ioredis        # Redis için
npm install nodemailer     # Email için
npm install twilio         # SMS için (opsiyonel)
npm install openai         # AI features için (opsiyonel)
```

### Docker Services
```yaml
# Redis container ekle
redis:
  image: redis:7-alpine
  ports:
    - "6379:6379"
```

---

## 📝 NOTLAR

1. **Database Migrations:** Her task için migration dosyası oluşturulmalı
2. **Testing:** Her task için unit test yazılmalı
3. **Documentation:** Her yeni servis için JSDoc eklenmeli
4. **Logging:** Tüm anti-spam olayları loglanmalı
5. **Monitoring:** Prometheus/Grafana ile metrikler toplanmalı

---

## ⚠️ RİSK ANALİZİ

| Risk | Olasılık | Etki | Çözüm |
|------|----------|------|-------|
| Redis bağlantı hatası | Orta | Yüksek | Fallback mekanizması ekle |
| Cron job çalışmama | Düşük | Orta | Health check endpoint |
| Yanlış spam tespiti | Orta | Yüksek | Manuel override özelliği |
| Performans düşüşü | Orta | Orta | Database indexing |

---

## 📈 BAŞARI METRİKLERİ

**Hedefler:**
- [ ] WhatsApp ban oranı: 0% (şu anda bilinmiyor)
- [ ] Spam skoru: Ortalama <30 (şu anda 0)
- [ ] Engagement rate: >%20 (şu anda takip edilmiyor)
- [ ] Mesaj başarı oranı: >%95 (şu anda bilinmiyor)
- [ ] Profile health: Ortalama >70 (şu anda takip edilmiyor)

---

**Son Güncelleme:** 2025-11-17
**Tahmini Tamamlanma:** 6-8 hafta
**Toplam Task Sayısı:** 20
**Kritik Task:** 5
**Yüksek Öncelik:** 5
**Orta Öncelik:** 5
**Düşük Öncelik:** 5
