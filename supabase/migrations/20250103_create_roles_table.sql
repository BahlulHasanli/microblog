-- Create roles table
CREATE TABLE roles (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  name VARCHAR(50) NOT NULL UNIQUE,
  description TEXT,
  is_admin BOOLEAN NOT NULL DEFAULT FALSE,
  is_moderator BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default roles
INSERT INTO roles (name, description, is_admin, is_moderator) VALUES
  ('Admin', 'Tam hüquqlu administrator', TRUE, TRUE),
  ('Moderator', 'Məzmun moderatoru', FALSE, TRUE),
  ('Redator', 'Məzmun redaktoru', FALSE, FALSE),
  ('Sadə istifadəçi', 'Adi istifadəçi', FALSE, FALSE);

-- Add role_id to users table
ALTER TABLE users ADD COLUMN role_id BIGINT REFERENCES roles(id) DEFAULT 4;

-- Create index for faster lookups
CREATE INDEX idx_users_role_id ON users(role_id);
CREATE INDEX idx_roles_is_admin ON roles(is_admin);
CREATE INDEX idx_roles_is_moderator ON roles(is_moderator);
