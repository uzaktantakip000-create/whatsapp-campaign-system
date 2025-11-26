-- ============================================
-- WhatsApp Campaign System - Message Templates
-- Version: 1.1.0
-- Date: 2025-11-13
-- Description: Add message templates for variation generation
-- ============================================

-- ============================================
-- MESSAGE TEMPLATES TABLE
-- ============================================
CREATE TABLE message_templates (
    id SERIAL PRIMARY KEY,
    consultant_id INTEGER REFERENCES consultants(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    content TEXT NOT NULL,
    category VARCHAR(50), -- 'greeting', 'product', 'reminder', 'followup', etc.
    variables JSONB DEFAULT '[]'::jsonb, -- Array of variable names: ["name", "product", "date"]
    is_active BOOLEAN DEFAULT true,
    usage_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT templates_unique_name UNIQUE(consultant_id, name)
);

-- Comments
COMMENT ON TABLE message_templates IS 'Message templates with placeholders for personalization';
COMMENT ON COLUMN message_templates.content IS 'Message content with placeholders like {name}, {product}, {date}';
COMMENT ON COLUMN message_templates.variables IS 'JSON array of required variable names';
COMMENT ON COLUMN message_templates.usage_count IS 'Number of times this template was used';

-- Indexes
CREATE INDEX idx_templates_consultant ON message_templates(consultant_id);
CREATE INDEX idx_templates_category ON message_templates(category);
CREATE INDEX idx_templates_active ON message_templates(is_active);

-- ============================================
-- UPDATE TRIGGER
-- ============================================
CREATE TRIGGER update_message_templates_updated_at
    BEFORE UPDATE ON message_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- SAMPLE TEMPLATES
-- ============================================
-- Assuming consultant_id 1 exists for testing
INSERT INTO message_templates (consultant_id, name, content, category, variables) VALUES
(
    1,
    'Hoşgeldin Mesajı',
    'Merhaba {name}! 👋 Ben {consultant_name}, finansal danışmanınız. Size özel {product} fırsatları hakkında bilgi vermek istiyorum.',
    'greeting',
    '["name", "consultant_name", "product"]'::jsonb
),
(
    1,
    'Ürün Tanıtımı',
    'Merhaba {name}, {product} ürünümüz hakkında detaylı bilgi almak ister misiniz? {date} tarihine kadar özel indirimlerimiz var!',
    'product',
    '["name", "product", "date"]'::jsonb
),
(
    1,
    'Takip Mesajı',
    'Selam {name}, geçen görüşmemizde konuştuğumuz {product} konusunda düşünceleriniz nasıl? Sorularınız varsa yanıtlamaktan memnuniyet duyarım.',
    'followup',
    '["name", "product"]'::jsonb
),
(
    1,
    'Hatırlatma',
    '{name}, {date} tarihli randevunuzu hatırlatmak istedim. Görüşmemizden önce {product} hakkında bilgi almak isterseniz bana yazabilirsiniz.',
    'reminder',
    '["name", "date", "product"]'::jsonb
);

-- ============================================
-- UPDATE SCHEMA VERSION
-- ============================================
UPDATE schema_version
SET version = '1.1.0',
    description = 'Added message_templates table',
    applied_at = CURRENT_TIMESTAMP
WHERE version = '1.0.0';

-- If schema_version doesn't have the record, insert it
INSERT INTO schema_version (version, description)
SELECT '1.1.0', 'Added message_templates table'
WHERE NOT EXISTS (SELECT 1 FROM schema_version WHERE version = '1.1.0');
