-- Qaralama postlar (ictimai siyahılarda gizlidir)
ALTER TABLE posts ADD COLUMN IF NOT EXISTS is_draft BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_posts_is_draft ON posts(is_draft) WHERE is_draft = true;

COMMENT ON COLUMN posts.is_draft IS 'true: yalnız müəllif/staff görür; təsdiq gözləmir';
