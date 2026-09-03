-- Add api_addendum column to ai_assistant_config for the AI assistant API channel
-- Parallel to chat_addendum and email_addendum
ALTER TABLE ai_assistant_config ADD COLUMN IF NOT EXISTS api_addendum text DEFAULT '';

UPDATE ai_assistant_config SET api_addendum = 'You are responding via the AI assistant HTTP API channel. Keep responses concise and structured. Return factual data when possible. Avoid markdown formatting — use plain text since the consumer may not render markdown.' WHERE id = 1;
