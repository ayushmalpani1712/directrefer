-- Verification Requests table for admin approvals
-- Run this in Supabase SQL Editor

-- 1. Create the table
CREATE TABLE IF NOT EXISTS public.verification_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  request_type text NOT NULL CHECK (request_type IN ('email_otp', 'id_card')),
  work_email text,
  id_card_url text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz
);

-- 2. Enable RLS
ALTER TABLE public.verification_requests ENABLE ROW LEVEL SECURITY;

-- 3. RLS policies
-- Users can see their own requests
CREATE POLICY "Users can view own verification requests"
  ON public.verification_requests FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own requests
CREATE POLICY "Users can insert own verification requests"
  ON public.verification_requests FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Admins can see all requests
CREATE POLICY "Admins can view all verification requests"
  ON public.verification_requests FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

-- Admins can update all requests (approve/reject)
CREATE POLICY "Admins can update verification requests"
  ON public.verification_requests FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

-- 4. RPC function for reviewing requests
CREATE OR REPLACE FUNCTION review_verification_request(
  p_request_id uuid,
  p_approve boolean
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
  v_request_type text;
BEGIN
  -- Only admins can review
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin') THEN
    RAISE EXCEPTION 'Only admins can review verification requests';
  END IF;

  -- Get the request
  SELECT user_id, request_type INTO v_user_id, v_request_type
  FROM public.verification_requests
  WHERE id = p_request_id;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Verification request not found';
  END IF;

  -- Update the request status
  UPDATE public.verification_requests
  SET status = CASE WHEN p_approve THEN 'approved' ELSE 'rejected' END,
      reviewed_at = now()
  WHERE id = p_request_id;

  -- If approved, mark the user as verified
  IF p_approve AND v_request_type = 'email_otp' THEN
    UPDATE public.users
    SET verified = true
    WHERE id = v_user_id;
  END IF;
END;
$$;

-- 5. Create index
CREATE INDEX IF NOT EXISTS idx_verification_requests_status
  ON public.verification_requests (status);
CREATE INDEX IF NOT EXISTS idx_verification_requests_user_id
  ON public.verification_requests (user_id);
