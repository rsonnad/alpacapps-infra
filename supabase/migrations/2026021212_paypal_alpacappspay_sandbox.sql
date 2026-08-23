-- Do not commit sandbox credentials. Configure them through the approved
-- runtime secret store after migration.
UPDATE paypal_config SET
  sandbox_client_id = NULL,
  sandbox_client_secret = NULL,
  test_mode = true,
  is_active = true,
  updated_at = now()
WHERE id = 1;
