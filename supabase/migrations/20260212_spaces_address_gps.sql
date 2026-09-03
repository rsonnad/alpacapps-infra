-- Add optional address and GPS fields to spaces.
-- Only the top-level "property" space needs them now, but all spaces can use them.

ALTER TABLE spaces ADD COLUMN IF NOT EXISTS address text;
ALTER TABLE spaces ADD COLUMN IF NOT EXISTS gps jsonb;

COMMENT ON COLUMN spaces.address IS 'Physical street address (optional)';
COMMENT ON COLUMN spaces.gps     IS 'GPS coordinates as {"lat": number, "lng": number} (optional)';

-- Set the property (top-level parent) address and GPS
UPDATE spaces
SET address = 'YOUR_PROPERTY_ADDRESS',
    gps     = '{"lat": 0.0, "lng": 0.0}'::jsonb
WHERE parent_id IS NULL
  AND name ILIKE '%property%';

-- If no row matched by name, fall back to the first top-level space
UPDATE spaces
SET address = 'YOUR_PROPERTY_ADDRESS',
    gps     = '{"lat": 0.0, "lng": 0.0}'::jsonb
WHERE parent_id IS NULL
  AND address IS NULL
  AND id = (SELECT id FROM spaces WHERE parent_id IS NULL ORDER BY name LIMIT 1);
