# Tasarım Kararları

Bu dosya, proje süresince alınan önemli teknik ve mimari kararları içerir.

**Format:**
```markdown
## [Tarih] Karar Başlığı

**Karar:** Alınan karar
**Sebepler:** Kararın nedenleri
**Alternatifler:** Değerlendirilen diğer seçenekler
**Status:** ✅ Onaylandı / ⏳ Değerlendiriliyor / ❌ Reddedildi
```

---

## [2025-01-13] Teknoloji Stack Seçimi

**Karar:**
- WhatsApp API: Evolution API
- Backend: Node.js + Express
- Database: PostgreSQL
- Cache/Queue: Redis
- Container: Docker
- AI: OpenAI API
- Frontend: React (Faz 4)

**Sebepler:**
- Evolution API: Ücretsiz, açık kaynak, güçlü WhatsApp entegrasyonu
- PostgreSQL: İlişkisel veri yapısı, ACID garantisi, complex sorgular
- Redis: Hızlı cache ve queue işlemleri
- Docker: Kolay deployment, izolasyon, ölçeklenebilirlik
- Node.js: JavaScript ecosystem, async operations, geniş kütüphane desteği

**Alternatifler:**
- Ultramsg: Ücretli ($39/hesap), yüksek maliyet
- MongoDB: NoSQL, ilişkisel yapıya uygun değil
- RabbitMQ: Faz 1-3 için fazla kompleks (Faz 5'te düşünülebilir)

**Status:** ✅ Onaylandı

---

## [2025-01-13] Proje Yapısı

**Karar:** Monorepo yapısı kullanılacak (backend + frontend aynı repository)

**Sebepler:**
- Tek yerden versiyon kontrolü
- Kolay koordinasyon
- Basit deployment

**Status:** ✅ Onaylandı

---

## [2025-01-13] Belgelendirme Sistemi

**Karar:** 4 ayrı belge dosyası kullanılacak
- PROGRESS.md: Günlük ilerleme
- ERRORS.md: Hata logları
- DECISIONS.md: Teknik kararlar
- TESTING.md: Test sonuçları

**Sebepler:**
- Organize yapı
- Kolay takip
- Hata payı sıfır prensibi
- Gelecekte referans

**Status:** ✅ Onaylandı
