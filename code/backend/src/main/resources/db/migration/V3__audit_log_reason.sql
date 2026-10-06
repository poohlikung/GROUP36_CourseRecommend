ALTER TABLE audit_logs ADD COLUMN reason VARCHAR(1000);
ALTER TABLE courses ADD COLUMN moderation_reason VARCHAR(1000);
