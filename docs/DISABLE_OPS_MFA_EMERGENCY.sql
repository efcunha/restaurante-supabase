-- Disable MFA requirement in ops panel - RUN THIS IMMEDIATELY IN SUPABASE DASHBOARD
-- Go to: https://app.supabase.com/project/ykalocfhnetxenvmtlcn/sql/new
-- Copy and paste this entire query, then click "Run"

UPDATE companies 
SET settings = jsonb_set(
  COALESCE(settings, '{}'::jsonb), 
  '{opsSecurity,requireMfa}', 
  'false'::jsonb
),
updated_at = NOW()
WHERE id = 'f85bfdc2-982a-4cf7-b176-bce68426f861';

-- After running this, you can login to restaurante-ops without MFA
-- The login page will no longer show the MFA code field
-- You can then reconfigure MFA if needed
