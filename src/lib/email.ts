function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

const LOGO_IMG = '<img src="https://www.directrefer.in/logo-letters.svg" alt="Direct Refer" style="height:32px;width:auto;vertical-align:middle;" />'

const EMAIL_HEADER = `
  <div style="text-align:center;margin-bottom:32px;">
    <a href="https://www.directrefer.in" style="text-decoration:none;display:inline-flex;align-items:center;gap:10px;">
      ${LOGO_IMG}
      <span style="font-size:22px;font-weight:700;color:#1B202C;letter-spacing:-0.5px;">Direct Refer</span>
    </a>
  </div>
`

const EMAIL_FOOTER = `
  <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;" />
  <p style="text-align:center;font-size:12px;color:#A3AEC2;margin:0 0 4px;">
    Direct Refer — Get referred, not ignored.
  </p>
  <p style="text-align:center;font-size:11px;color:#C4C9D4;margin:0;">
    You received this email because you have an account on Direct Refer.
  </p>
`

export async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  try {
    const res = await fetch('/api/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to, subject, html }),
    })
    if (!res.ok) return false
    const data = await res.json().catch(() => null)
    return data?.ok === true
  } catch {
    return false
  }
}

export async function sendVerificationEmail(to: string, verifyUrl: string) {
  const safeUrl = esc(verifyUrl)
  return sendEmail(to, 'Verify your Direct Refer email', `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Oxygen,Ubuntu,sans-serif;max-width:480px;margin:0 auto;padding:40px 32px;background:#ffffff;border-radius:16px;border:1px solid #e5e7eb;">
      ${EMAIL_HEADER}
      <div style="text-align:center;margin-bottom:32px;">
        <div style="display:inline-flex;align-items:center;justify-content:center;width:64px;height:64px;border-radius:50%;background:linear-gradient(135deg,#EEF2FF,#E0E7FF);">
          <span style="font-size:28px;">✉️</span>
        </div>
      </div>
      <h2 style="text-align:center;font-size:24px;font-weight:700;color:#1B202C;margin:0 0 12px;">Welcome to Direct Refer!</h2>
      <p style="text-align:center;font-size:15px;color:#7D8798;margin:0 0 32px;line-height:1.6;">
        Click below to verify your email and start getting referred.
      </p>
      <div style="text-align:center;margin-bottom:32px;">
        <a href="${safeUrl}" style="display:inline-block;padding:14px 36px;background:linear-gradient(135deg,#4F7CFF,#7C5CFF);color:#ffffff;border-radius:12px;text-decoration:none;font-weight:600;font-size:15px;letter-spacing:0.3px;">
          Verify Email
        </a>
      </div>
      <p style="text-align:center;font-size:12px;color:#A3AEC2;margin:0 0 8px;">
        Or copy this link: <a href="${safeUrl}" style="color:#4F7CFF;text-decoration:none;">${safeUrl}</a>
      </p>
      ${EMAIL_FOOTER}
    </div>
  `)
}

export async function sendPasswordResetOtpEmail(to: string, otp: string) {
  const safeOtp = esc(otp)
  return sendEmail(to, 'Your Direct Refer password reset code', `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Oxygen,Ubuntu,sans-serif;max-width:480px;margin:0 auto;padding:40px 32px;background:#ffffff;border-radius:16px;border:1px solid #e5e7eb;">
      ${EMAIL_HEADER}
      <div style="text-align:center;margin-bottom:32px;">
        <div style="display:inline-flex;align-items:center;justify-content:center;width:64px;height:64px;border-radius:50%;background:linear-gradient(135deg,#EEF2FF,#E0E7FF);">
          <span style="font-size:28px;">🔐</span>
        </div>
      </div>
      <h2 style="text-align:center;font-size:24px;font-weight:700;color:#1B202C;margin:0 0 12px;">Password reset code</h2>
      <p style="text-align:center;font-size:15px;color:#7D8798;margin:0 0 32px;line-height:1.6;">
        Use the code below to reset your password. It expires in 10 minutes.
      </p>
      <div style="text-align:center;margin-bottom:32px;">
        <div style="display:inline-block;padding:20px 40px;background:#F8FAFC;border:2px dashed #4F7CFF;border-radius:14px;">
          <span style="font-size:36px;font-weight:700;color:#4F7CFF;letter-spacing:10px;font-family:monospace;">${safeOtp}</span>
        </div>
      </div>
      <p style="text-align:center;font-size:13px;color:#A3AEC2;margin:0 0 8px;line-height:1.5;">
        If you didn't request this, you can safely ignore this email.
      </p>
      ${EMAIL_FOOTER}
    </div>
  `)
}

export async function sendReferralStatusEmail(
  studentEmail: string,
  studentName: string,
  professionalName: string,
  jobTitle: string,
  status: 'accepted' | 'rejected',
) {
  const isAccepted = status === 'accepted'
  const siteUrl = typeof window !== 'undefined' ? window.location.origin : 'https://www.directrefer.in'
  return sendEmail(
    studentEmail,
    `Your referral request was ${status} — Direct Refer`,
    `
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Oxygen,Ubuntu,sans-serif;max-width:480px;margin:0 auto;padding:40px 32px;background:#ffffff;border-radius:16px;border:1px solid #e5e7eb;">
        ${EMAIL_HEADER}
        <div style="text-align:center;margin-bottom:32px;">
          <div style="display:inline-flex;align-items:center;justify-content:center;width:64px;height:64px;border-radius:50%;background:${isAccepted ? 'linear-gradient(135deg,#ECFDF5,#D1FAE5)' : 'linear-gradient(135deg,#FEF2F2,#FEE2E2)'};">
            <span style="font-size:28px;">${isAccepted ? '🎉' : '📋'}</span>
          </div>
        </div>
        <h2 style="text-align:center;font-size:24px;font-weight:700;color:#1B202C;margin:0 0 12px;">Referral ${isAccepted ? 'Accepted' : 'Declined'}</h2>
        <p style="text-align:center;font-size:15px;color:#7D8798;margin:0 0 24px;line-height:1.6;">
          Hi ${esc(studentName)}, your referral request for <strong style="color:#1B202C;">${esc(jobTitle)}</strong> at <strong style="color:#1B202C;">${esc(professionalName)}</strong> has been <strong style="color:${isAccepted ? '#22C55E' : '#EF4444'};">${status}</strong>.
        </p>
        <div style="text-align:center;margin-bottom:16px;">
          ${isAccepted
            ? `<a href="${siteUrl}/job-seeker/applications" style="display:inline-block;padding:14px 36px;background:linear-gradient(135deg,#22C55E,#16A34A);color:#ffffff;border-radius:12px;text-decoration:none;font-weight:600;font-size:15px;">View Referral</a>
               <p style="text-align:center;font-size:14px;color:#7D8798;margin:16px 0 0;line-height:1.6;">You can now message ${esc(professionalName)} directly for next steps.</p>`
            : `<p style="font-size:14px;color:#7D8798;margin:0 0 16px;line-height:1.6;">Don't be discouraged! Try reaching out to other professionals.</p>
               <a href="${siteUrl}/job-seeker/professionals" style="display:inline-block;padding:14px 36px;background:linear-gradient(135deg,#4F7CFF,#7C5CFF);color:#ffffff;border-radius:12px;text-decoration:none;font-weight:600;font-size:15px;">Find Professionals</a>`
          }
        </div>
        ${EMAIL_FOOTER}
      </div>
    `,
  )
}

export async function sendReminderEmail(
  professionalEmail: string,
  professionalName: string,
  studentName: string,
  jobTitle: string,
  daysPending: number,
) {
  const siteUrl = typeof window !== 'undefined' ? window.location.origin : 'https://www.directrefer.in'
  return sendEmail(
    professionalEmail,
    `Reminder: ${studentName}'s referral request is waiting — Direct Refer`,
    `
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Oxygen,Ubuntu,sans-serif;max-width:480px;margin:0 auto;padding:40px 32px;background:#ffffff;border-radius:16px;border:1px solid #e5e7eb;">
        ${EMAIL_HEADER}
        <div style="text-align:center;margin-bottom:32px;">
          <div style="display:inline-flex;align-items:center;justify-content:center;width:64px;height:64px;border-radius:50%;background:linear-gradient(135deg,#FEF3C7,#FDE68A);">
            <span style="font-size:28px;">⏰</span>
          </div>
        </div>
        <h2 style="text-align:center;font-size:24px;font-weight:700;color:#1B202C;margin:0 0 12px;">Pending Referral Reminder</h2>
        <p style="text-align:center;font-size:15px;color:#7D8798;margin:0 0 24px;line-height:1.6;">
          Hi ${esc(professionalName)}, <strong style="color:#1B202C;">${esc(studentName)}</strong> sent you a referral request for <strong style="color:#1B202C;">${esc(jobTitle)}</strong> <strong style="color:#F59E0B;">${daysPending} days ago</strong> and hasn't heard back yet.
        </p>
        <div style="text-align:center;margin-bottom:16px;">
          <a href="${siteUrl}/professional/referrals" style="display:inline-block;padding:14px 36px;background:linear-gradient(135deg,#4F7CFF,#7C5CFF);color:#ffffff;border-radius:12px;text-decoration:none;font-weight:600;font-size:15px;">Review Request</a>
        </div>
        <p style="text-align:center;font-size:13px;color:#A3AEC2;margin:0;line-height:1.5;">
          Candidates with a timely response are 3× more likely to be a great fit for your team.
        </p>
        ${EMAIL_FOOTER}
      </div>
    `,
  )
}
