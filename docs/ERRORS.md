# Hata Logları

Bu dosya, proje geliştirme sürecinde karşılaşılan tüm hataları ve çözümlerini içerir.

**Format:**
```markdown
## [Tarih Saat] Hata Başlığı

**Hata:** Detaylı hata açıklaması
**Sebep:** Hatanın kök nedeni
**Çözüm:** Uygulanan çözüm
**Status:** ✅ Çözüldü / ⏳ Devam Ediyor / ❌ Çözülemedi
```

---

## [2025-01-13 20:20] Docker Desktop Daemon Çalışmıyor

**Hata:**
```
error during connect: Get "http://%2F%2F.%2Fpipe%2FdockerDesktopLinuxEngine/v1.51/containers/json":
open //./pipe/dockerDesktopLinuxEngine: Sistem belirtilen dosyayı bulamıyor.
```

**Sebep:**
Docker Desktop uygulaması başlatılmamış. Docker CLI kurulu ancak Docker daemon çalışmıyor.

**Çözüm:**
Docker Desktop uygulaması başlatıldı.

**Test Sonuçları:**
- `docker --version`: ✅ Docker version 28.5.1
- `docker-compose --version`: ✅ Docker Compose version v2.40.0
- `docker ps`: ✅ Başarılı (daemon çalışıyor)
- `docker info`: ✅ Server Version 28.5.1

**Status:** ✅ Çözüldü - Docker Desktop başlatıldı, daemon çalışıyor

---

## [2025-01-13 20:37] Evolution API Database Connection Hatası

**Hata:**
```
Error: Database provider  invalid.
Error: P1013: The provided database string is invalid. empty host in database URL.
Error: P1000: Authentication failed against database server at `postgres`,
the provided database credentials for `campaign_user` are not valid.
```

**Sebep:**
1. İlk denemede DATABASE_ENABLED=false ancak DATABASE_PROVIDER boş bırakıldı
2. İkinci denemede .env dosyasındaki şifrede özel karakterler (!, @, #) PostgreSQL connection string'de URL encode edilmesi gerekiyordu
3. Üçüncü denemede PostgreSQL volume'unda eski şifre saklanıyordu (volume temizlenmemişti)

**Çözümler:**
1. DATABASE_ENABLED=true yapıldı ve DATABASE_PROVIDER=postgresql eklendi
2. .env dosyasındaki DB_PASSWORD basitleştirildi (özel karakterler kaldırıldı): `CampaignDBPass2025`
3. Docker volume'ları temizlendi: `docker-compose down -v`
4. Container'lar yeniden başlatıldı: `docker-compose up -d`

**Test Sonuçları:**
- Evolution API erişilebilir: ✅ http://localhost:8080
- API Response: ✅ {"status":200,"message":"Welcome to the Evolution API, it is working!","version":"2.2.3"}
- PostgreSQL bağlantısı: ✅ Başarılı
- Redis bağlantısı: ✅ Başarılı

**Öğrenilen Dersler:**
- Docker Compose environment variable'larında özel karakterler sorun yaratabilir
- PostgreSQL şifreleri URL'de kullanılıyorsa basit karakterler tercih edilmeli veya URL encode edilmeli
- Volume'lar eskidatabase verilerini saklıyor, temiz başlangıç için `-v` flag kullanılmalı

**Status:** ✅ Çözüldü - Tüm container'lar çalışıyor
