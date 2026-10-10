ALTER TABLE courses ALTER COLUMN url TYPE VARCHAR(2048);
CREATE UNIQUE INDEX uq_platforms_allowed_host ON platforms (allowed_host);
