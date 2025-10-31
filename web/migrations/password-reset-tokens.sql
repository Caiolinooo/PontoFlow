-- Password Reset Tokens Table
-- This table stores temporary tokens for password reset functionality

CREATE TABLE IF NOT EXISTS public.password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users_unified(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token ON public.password_reset_tokens(token);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id ON public.password_reset_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_expires_at ON public.password_reset_tokens(expires_at);

-- Enable RLS
ALTER TABLE public.password_reset_tokens ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own tokens (for security auditing)
CREATE POLICY "Users can view their own reset tokens"
  ON public.password_reset_tokens
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Service role can manage all tokens
CREATE POLICY "Service role can manage all reset tokens"
  ON public.password_reset_tokens
  FOR ALL
  USING (true);

-- Function to clean up expired tokens (run periodically)
CREATE OR REPLACE FUNCTION public.cleanup_expired_reset_tokens()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM public.password_reset_tokens
  WHERE expires_at < NOW() OR used_at IS NOT NULL;
END;
$$;

-- Comment on table
COMMENT ON TABLE public.password_reset_tokens IS 'Stores temporary tokens for password reset functionality. Tokens expire after 1 hour.';

