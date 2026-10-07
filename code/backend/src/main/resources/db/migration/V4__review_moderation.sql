ALTER TABLE reviews ADD COLUMN version INTEGER NOT NULL DEFAULT 0;
ALTER TABLE reviews ADD COLUMN moderation_reason VARCHAR(1000);

CREATE INDEX idx_reviews_status_created ON reviews(status, created_at DESC, id DESC);
