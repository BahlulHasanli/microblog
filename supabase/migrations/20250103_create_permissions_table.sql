-- Create permissions table
CREATE TABLE IF NOT EXISTS permissions (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  category VARCHAR(50) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create role_permissions junction table
CREATE TABLE IF NOT EXISTS role_permissions (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  role_id BIGINT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id BIGINT NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(role_id, permission_id)
);

-- Insert default permissions
INSERT INTO permissions (name, description, category) VALUES
  -- Users permissions
  ('users.view', 'İstifadəçiləri görə bilmək', 'users'),
  ('users.edit', 'İstifadəçiləri redaktə edə bilmək', 'users'),
  ('users.delete', 'İstifadəçiləri silə bilmək', 'users'),
  
  -- Posts permissions
  ('posts.view', 'Postları görə bilmək', 'posts'),
  ('posts.create', 'Post yarada bilmək', 'posts'),
  ('posts.edit', 'Postları redaktə edə bilmək', 'posts'),
  ('posts.delete', 'Postları silə bilmək', 'posts'),
  ('posts.publish', 'Postları dərc edə bilmək', 'posts'),
  
  -- Comments permissions
  ('comments.view', 'Şərhləri görə bilmək', 'comments'),
  ('comments.create', 'Şərh yaza bilmək', 'comments'),
  ('comments.edit', 'Şərhləri redaktə edə bilmək', 'comments'),
  ('comments.delete', 'Şərhləri silə bilmək', 'comments'),
  
  -- Roles permissions
  ('roles.view', 'Rolları görə bilmək', 'roles'),
  ('roles.edit', 'Rolları redaktə edə bilmək', 'roles'),
  ('roles.delete', 'Rolları silə bilmək', 'roles'),
  
  -- Settings permissions
  ('settings.view', 'Nizamlamaları görə bilmək', 'settings'),
  ('settings.edit', 'Nizamlamaları redaktə edə bilmək', 'settings');

-- Assign permissions to Admin role (role_id = 1) - all permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT 1, id FROM permissions;

-- Assign permissions to Moderator role (role_id = 2)
INSERT INTO role_permissions (role_id, permission_id)
SELECT 2, id FROM permissions WHERE name IN (
  'users.view',
  'posts.view', 'posts.edit', 'posts.delete', 'posts.publish',
  'comments.view', 'comments.delete'
);

-- Assign permissions to Editor role (role_id = 3)
INSERT INTO role_permissions (role_id, permission_id)
SELECT 3, id FROM permissions WHERE name IN (
  'posts.view', 'posts.create', 'posts.edit',
  'comments.view', 'comments.create'
);

-- Assign permissions to User role (role_id = 4)
INSERT INTO role_permissions (role_id, permission_id)
SELECT 4, id FROM permissions WHERE name IN (
  'posts.view',
  'comments.view', 'comments.create'
);

-- Create indexes for faster lookups
CREATE INDEX idx_role_permissions_role_id ON role_permissions(role_id);
CREATE INDEX idx_role_permissions_permission_id ON role_permissions(permission_id);
CREATE INDEX idx_permissions_category ON permissions(category);
CREATE INDEX idx_permissions_name ON permissions(name);
