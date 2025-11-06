-- Create the app_config table to store global application settings
CREATE TABLE app_config (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add a trigger to automatically update the updated_at timestamp on any change
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER app_config_updated_at
BEFORE UPDATE ON app_config
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

-- Insert the initial base URL value
INSERT INTO app_config (key, value) VALUES ('BASE_URL', 'http://localhost:3000');