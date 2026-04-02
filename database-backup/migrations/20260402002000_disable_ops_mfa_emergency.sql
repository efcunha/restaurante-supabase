-- Emergency migration: Disable MFA in ops panel
-- Context: MFA was enabled but TOTP setup was not showing, blocking login
-- Solution: Disable requireMfa in companies.settings for ops company

UPDATE companies 
SET settings = jsonb_set(
  COALESCE(settings, '{}'::jsonb), 
  '{opsSecurity,requireMfa}', 
  'false'::jsonb
),
updated_at = NOW()
WHERE id = 'f85bfdc2-982a-4cf7-b176-bce68426f861';
