import { useState, useCallback, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'

export type VerificationTab = 'email_otp' | 'id_card'

export interface VerificationStatus {
  professionalVerified: boolean
  recruiterVerified: boolean
  workEmailVerified: boolean
  workEmail: string | null
  workVerificationMethod: string | null
  idCardUrl: string | null
  hasPendingRequest: boolean
}

export function useVerification() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [otpSent, setOtpSent] = useState(false)
  const [otpCode, setOtpCode] = useState('')
  const [workEmail, setWorkEmail] = useState('')
  const [idCardFile, setIdCardFile] = useState<File | null>(null)
  const [idCardPreview, setIdCardPreview] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<VerificationTab>('email_otp')
  const [status, setStatus] = useState<VerificationStatus>({
    professionalVerified: false,
    recruiterVerified: false,
    workEmailVerified: false,
    workEmail: null,
    workVerificationMethod: null,
    idCardUrl: null,
    hasPendingRequest: false,
  })

  const fetchStatus = useCallback(async () => {
    if (!user) return
    try {
      const { data } = await supabase
        .from('users')
        .select('professional_verified, recruiter_verified, work_email_verified, work_email, work_verification_method, id_card_url')
        .eq('id', user.id)
        .maybeSingle()

      if (!data) {
        setStatus({
          professionalVerified: false,
          recruiterVerified: false,
          workEmailVerified: false,
          workEmail: null,
          workVerificationMethod: null,
          idCardUrl: null,
          hasPendingRequest: false,
        })
        return
      }

      const { count } = await supabase
        .from('verification_requests')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('status', 'pending')

      setStatus({
        professionalVerified: data.professional_verified ?? false,
        recruiterVerified: data.recruiter_verified ?? false,
        workEmailVerified: data.work_email_verified ?? false,
        workEmail: data.work_email ?? null,
        workVerificationMethod: data.work_verification_method ?? null,
        idCardUrl: data.id_card_url ?? null,
        hasPendingRequest: (count ?? 0) > 0,
      })
    } catch (err) {
      console.error('Failed to fetch verification status:', err)
    }
  }, [user])

  // Auto-fetch status on mount
  useEffect(() => {
    fetchStatus()
  }, [fetchStatus])

  const sendOtp = useCallback(async (email: string) => {
    if (!user) return { error: 'Not authenticated' }
    setLoading(true)
    try {
      const { data, error } = await supabase.rpc('send_work_email_otp', {
        p_user_id: user.id,
        p_email: email,
      })
      if (error) throw error
      if (data?.success) {
        setOtpSent(true)
        setWorkEmail(email)
        return { success: true, message: data.message }
      }
      return { error: data?.message || 'Failed to send OTP' }
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'Failed to send OTP' }
    } finally {
      setLoading(false)
    }
  }, [user])

  const verifyOtp = useCallback(async (code: string) => {
    if (!user) return { error: 'Not authenticated' }
    setLoading(true)
    try {
      const { data, error } = await supabase.rpc('verify_work_email_otp', {
        p_user_id: user.id,
        p_code: code,
      })
      if (error) throw error
      if (data?.success) {
        setOtpSent(false)
        setOtpCode('')
        setWorkEmail('')
        await fetchStatus()
        return { success: true, message: data.message }
      }
      return { error: data?.message || 'Verification failed' }
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'Verification failed' }
    } finally {
      setLoading(false)
    }
  }, [user, fetchStatus])

  const uploadIdCard = useCallback(async (file: File) => {
    if (!user) return { error: 'Not authenticated' }
    setLoading(true)
    try {
      const ext = file.name.split('.').pop() || 'jpg'
      const path = `${user.id}/id-card-${Date.now()}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('id-cards')
        .upload(path, file, { contentType: file.type, upsert: true })

      if (uploadError) throw uploadError

      const { data: signedData, error: signedError } = await supabase.storage
        .from('id-cards')
        .createSignedUrl(path, 3600)
      if (signedError || !signedData?.signedUrl) throw new Error('Failed to get upload URL')

      const { error: insertError } = await supabase.from('verification_requests').insert({
        user_id: user.id,
        type: 'id_card',
        id_card_url: signedData.signedUrl,
        status: 'pending',
      })

      if (insertError) throw insertError

      await fetchStatus()
      return { success: true, message: 'ID card submitted for review. You will be notified once approved.' }
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'Upload failed' }
    } finally {
      setLoading(false)
    }
  }, [user, fetchStatus])

  const reset = useCallback(() => {
    setLoading(false)
    setOtpSent(false)
    setOtpCode('')
    setWorkEmail('')
    setIdCardFile(null)
    setIdCardPreview(null)
  }, [])

  return {
    loading,
    otpSent,
    otpCode,
    setOtpCode,
    workEmail,
    setWorkEmail,
    idCardFile,
    setIdCardFile,
    idCardPreview,
    setIdCardPreview,
    activeTab,
    setActiveTab,
    status,
    fetchStatus,
    sendOtp,
    verifyOtp,
    uploadIdCard,
    reset,
  }
}
