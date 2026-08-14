-- Phase 3 — Referrer Experience: fix verification data flow.
-- Previously, approving an id_card request never flipped users.verified, so the
-- "Verified Referrer" badge never appeared for ID-card-verified professionals.
-- This re-creates review_verification_request so ANY approval also sets
-- professional_verified + verified (id_card sets work_verification_method).
-- Run this in the Supabase SQL Editor.

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
  v_work_email text;
  v_id_card_url text;
BEGIN
  -- Only admins can review
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin') THEN
    RAISE EXCEPTION 'Only admins can review verification requests';
  END IF;

  -- Get the request
  SELECT user_id, request_type, work_email, id_card_url
  INTO v_user_id, v_request_type, v_work_email, v_id_card_url
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

  -- On approval: mark the user verified for BOTH verification methods.
  -- email_otp = work-email verified; id_card = founder-reviewed employment verification.
  IF p_approve THEN
    IF v_request_type = 'email_otp' THEN
      UPDATE public.users
      SET verified = true,
          professional_verified = true,
          work_email_verified = true,
          work_email = COALESCE(work_email, v_work_email),
          work_verification_method = 'email_otp'
      WHERE id = v_user_id;
    ELSIF v_request_type = 'id_card' THEN
      UPDATE public.users
      SET verified = true,
          professional_verified = true,
          work_verification_method = 'id_card',
          id_card_url = COALESCE(id_card_url, v_id_card_url)
      WHERE id = v_user_id;
    END IF;
  END IF;
END;
$$;
