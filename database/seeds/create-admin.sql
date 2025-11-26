-- Create Admin User
-- Password: Admin123! (hashed with bcrypt)

INSERT INTO consultants (
  name,
  email,
  password,
  phone,
  role,
  instance_name,
  is_active,
  created_at,
  updated_at
) VALUES (
  'Admin User',
  'admin@whatsapp-campaign.com',
  '$2a$10$vI8aWBnW3fID.ZQ4/zo1G.q1lRps.9cGLcZEiGDMVr5yUP1KUOYTa', -- Admin123!
  '+905550000000',
  'admin',
  'admin_instance',
  true,
  NOW(),
  NOW()
) ON CONFLICT (email) DO NOTHING;

-- Create Test Consultant
INSERT INTO consultants (
  name,
  email,
  password,
  phone,
  role,
  instance_name,
  is_active,
  created_at,
  updated_at
) VALUES (
  'Test Consultant',
  'consultant@whatsapp-campaign.com',
  '$2a$10$vI8aWBnW3fID.ZQ4/zo1G.q1lRps.9cGLcZEiGDMVr5yUP1KUOYTa', -- Admin123!
  '+905551234567',
  'consultant',
  'test_consultant',
  true,
  NOW(),
  NOW()
) ON CONFLICT (email) DO NOTHING;

-- Display created users
SELECT id, name, email, role, is_active FROM consultants ORDER BY id;
