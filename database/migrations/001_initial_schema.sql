-- ============================================
-- WhatsApp Campaign System - Initial Schema
-- Version: 1.0.0
-- Date: 2025-01-13
-- ============================================

-- ============================================
-- DANIŞMANLAR TABLOSU
-- ============================================
CREATE TABLE consultants (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    phone VARCHAR(20),
    instance_name VARCHAR(100) UNIQUE NOT NULL,
    whatsapp_number VARCHAR(20),
    status VARCHAR(20) DEFAULT 'pending', -- pending, active, offline, banned
    daily_limit INTEGER DEFAULT 200,
    spam_risk_score INTEGER DEFAULT 0, -- 0-100
    connected_at TIMESTAMP,
    last_active_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index'ler
CREATE INDEX idx_consultants_status ON consultants(status);
CREATE INDEX idx_consultants_instance ON consultants(instance_name);

-- ============================================
-- KİŞİLER TABLOSU
-- ============================================
CREATE TABLE contacts (
    id SERIAL PRIMARY KEY,
    consultant_id INTEGER REFERENCES consultants(id) ON DELETE CASCADE,
    name VARCHAR(100),
    number VARCHAR(20) NOT NULL,
    segment VARCHAR(1) DEFAULT 'B', -- A (sıcak), B (ılık), C (soğuk)
    is_my_contact BOOLEAN DEFAULT true,
    profile_pic_url TEXT,
    last_message_time TIMESTAMP,
    last_message_from_us TIMESTAMP,
    message_count INTEGER DEFAULT 0,
    complaint_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(consultant_id, number)
);

-- Index'ler
CREATE INDEX idx_contacts_consultant ON contacts(consultant_id);
CREATE INDEX idx_contacts_number ON contacts(number);
CREATE INDEX idx_contacts_segment ON contacts(segment);
CREATE INDEX idx_contacts_last_message ON contacts(last_message_from_us);

-- ============================================
-- KAMPANYALAR TABLOSU
-- ============================================
CREATE TABLE campaigns (
    id SERIAL PRIMARY KEY,
    consultant_id INTEGER REFERENCES consultants(id) ON DELETE CASCADE,
    name VARCHAR(200),
    message_template TEXT NOT NULL,
    total_recipients INTEGER DEFAULT 0,
    sent_count INTEGER DEFAULT 0,
    delivered_count INTEGER DEFAULT 0,
    read_count INTEGER DEFAULT 0,
    reply_count INTEGER DEFAULT 0,
    failed_count INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'draft', -- draft, running, paused, completed, failed
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index'ler
CREATE INDEX idx_campaigns_consultant ON campaigns(consultant_id);
CREATE INDEX idx_campaigns_status ON campaigns(status);

-- ============================================
-- MESAJLAR TABLOSU
-- ============================================
CREATE TABLE messages (
    id SERIAL PRIMARY KEY,
    campaign_id INTEGER REFERENCES campaigns(id) ON DELETE CASCADE,
    consultant_id INTEGER REFERENCES consultants(id) ON DELETE CASCADE,
    contact_id INTEGER REFERENCES contacts(id) ON DELETE CASCADE,
    message_text TEXT NOT NULL,
    message_variation_index INTEGER, -- Hangi varyasyon kullanıldı
    status VARCHAR(20) DEFAULT 'pending', -- pending, sent, delivered, read, failed
    sent_at TIMESTAMP,
    delivered_at TIMESTAMP,
    read_at TIMESTAMP,
    replied BOOLEAN DEFAULT false,
    reply_text TEXT,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index'ler
CREATE INDEX idx_messages_campaign ON messages(campaign_id);
CREATE INDEX idx_messages_contact ON messages(contact_id);
CREATE INDEX idx_messages_status ON messages(status);
CREATE INDEX idx_messages_sent_at ON messages(sent_at);

-- ============================================
-- SPAM LOGLARI TABLOSU
-- ============================================
CREATE TABLE spam_logs (
    id SERIAL PRIMARY KEY,
    consultant_id INTEGER REFERENCES consultants(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL, -- rate_limit, complaint, ban, warning
    severity VARCHAR(20) DEFAULT 'low', -- low, medium, high, critical
    details TEXT,
    metadata JSONB, -- Ek bilgiler (JSON formatında)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index'ler
CREATE INDEX idx_spam_logs_consultant ON spam_logs(consultant_id);
CREATE INDEX idx_spam_logs_event_type ON spam_logs(event_type);
CREATE INDEX idx_spam_logs_created_at ON spam_logs(created_at);

-- ============================================
-- SİSTEM İSTATİSTİKLERİ TABLOSU (Günlük)
-- ============================================
CREATE TABLE daily_stats (
    id SERIAL PRIMARY KEY,
    consultant_id INTEGER REFERENCES consultants(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    messages_sent INTEGER DEFAULT 0,
    messages_delivered INTEGER DEFAULT 0,
    messages_read INTEGER DEFAULT 0,
    messages_replied INTEGER DEFAULT 0,
    messages_failed INTEGER DEFAULT 0,
    spam_risk_score INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(consultant_id, date)
);

-- Index'ler
CREATE INDEX idx_daily_stats_consultant_date ON daily_stats(consultant_id, date);

-- ============================================
-- TRİGGERS (Otomatik güncellemeler)
-- ============================================

-- Updated_at otomatik güncelleme fonksiyonu
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Consultants tablosu için trigger
CREATE TRIGGER update_consultants_updated_at
    BEFORE UPDATE ON consultants
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Contacts tablosu için trigger
CREATE TRIGGER update_contacts_updated_at
    BEFORE UPDATE ON contacts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Campaigns tablosu için trigger
CREATE TRIGGER update_campaigns_updated_at
    BEFORE UPDATE ON campaigns
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- TEST DATA (İlk test için)
-- ============================================

-- Test danışmanı
INSERT INTO consultants (name, email, instance_name, status, daily_limit)
VALUES ('Test Danışman', 'test@example.com', 'test_instance_1', 'pending', 50);

-- Test kampanyası (id=1 olan danışman için)
INSERT INTO campaigns (consultant_id, name, message_template, status)
VALUES (
    1,
    'Test Kampanya',
    'Merhaba {isim}, size özel bir teklifimiz var!',
    'draft'
);

-- ============================================
-- VIEWS (Hızlı sorgular için)
-- ============================================

-- Aktif danışmanlar view'ı
CREATE VIEW active_consultants AS
SELECT
    id,
    name,
    email,
    instance_name,
    whatsapp_number,
    daily_limit,
    spam_risk_score,
    connected_at,
    last_active_at
FROM consultants
WHERE status = 'active';

-- Bugünün istatistikleri view'ı
CREATE VIEW today_stats AS
SELECT
    c.id,
    c.name,
    c.email,
    COALESCE(ds.messages_sent, 0) as messages_sent_today,
    COALESCE(ds.messages_delivered, 0) as messages_delivered_today,
    COALESCE(ds.messages_read, 0) as messages_read_today,
    COALESCE(ds.spam_risk_score, 0) as spam_risk_score,
    c.daily_limit
FROM consultants c
LEFT JOIN daily_stats ds ON c.id = ds.consultant_id AND ds.date = CURRENT_DATE
WHERE c.status = 'active';

-- ============================================
-- COMMENTS (Dokümantasyon)
-- ============================================

COMMENT ON TABLE consultants IS 'Finansal danışmanlar ve WhatsApp hesap bilgileri';
COMMENT ON TABLE contacts IS 'Danışmanların kişi listeleri';
COMMENT ON TABLE campaigns IS 'WhatsApp kampanyaları';
COMMENT ON TABLE messages IS 'Gönderilen tüm mesajlar';
COMMENT ON TABLE spam_logs IS 'Spam risk ve uyarı logları';
COMMENT ON TABLE daily_stats IS 'Günlük istatistikler';

COMMENT ON COLUMN consultants.spam_risk_score IS 'Spam riski (0-100): 0=güvenli, 100=yüksek risk';
COMMENT ON COLUMN contacts.segment IS 'Kişi segmenti: A=sıcak, B=ılık, C=soğuk';
COMMENT ON COLUMN messages.message_variation_index IS 'OpenAI ile oluşturulan varyasyon numarası';

-- ============================================
-- SCHEMA VERSION
-- ============================================

CREATE TABLE schema_version (
    version VARCHAR(20) PRIMARY KEY,
    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    description TEXT
);

INSERT INTO schema_version (version, description)
VALUES ('1.0.0', 'Initial schema: consultants, contacts, campaigns, messages, spam_logs, daily_stats');
