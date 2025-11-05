-- Migration: Add avatar_url field to profiles table
-- Date: 2025-01-04
-- Description: Adds avatar_url field to store user profile pictures

-- Add avatar_url column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS avatar_url text;

-- Add comment to document the field
COMMENT ON COLUMN public.profiles.avatar_url IS 'URL to user profile picture/avatar image';

-- Create index for faster lookups (optional, but recommended if we query by avatar_url)
CREATE INDEX IF NOT EXISTS idx_profiles_avatar_url 
ON public.profiles(avatar_url) 
WHERE avatar_url IS NOT NULL;

-- Update existing records that have drive_photo_url in auth.users metadata
-- This is a one-time migration to copy existing photo URLs
DO $$
DECLARE
  user_record RECORD;
BEGIN
  FOR user_record IN 
    SELECT 
      au.id,
      au.raw_user_meta_data->>'drive_photo_url' as drive_photo_url
    FROM auth.users au
    WHERE au.raw_user_meta_data->>'drive_photo_url' IS NOT NULL
  LOOP
    UPDATE public.profiles
    SET avatar_url = user_record.drive_photo_url
    WHERE user_id = user_record.id
      AND (avatar_url IS NULL OR avatar_url = '');
  END LOOP;
END $$;

-- Verify the migration
SELECT 
  COUNT(*) as total_profiles,
  COUNT(avatar_url) as profiles_with_avatar
FROM public.profiles;

