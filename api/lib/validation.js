import { z } from 'zod';

/**
 * Validate request body against a Zod schema.
 * Returns { data, error } where data is the parsed result or error is the formatted issues.
 */
export function validateBody(schema, body) {
  const result = schema.safeParse(body);
  if (!result.success) {
    const issues = result.error.issues.map(i => ({
      path: i.path.join('.'),
      message: i.message,
    }));
    return { data: null, error: issues };
  }
  return { data: result.data, error: null };
}

// ── Shared Schemas ──

export const PaginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().max(200).optional(),
  sort: z.enum(['created_at', 'updated_at', 'title', 'name']).default('created_at'),
  order: z.enum(['asc', 'desc']).default('desc'),
});

export const UuidParamSchema = z.object({
  id: z.string().uuid('Invalid UUID format'),
});

// ── Job Schemas ──

export const CreateJobSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  company_name: z.string().max(200).optional(),
  department: z.string().max(100).optional(),
  location: z.string().max(200).optional(),
  description: z.string().max(5000).optional(),
  type: z.enum(['Full-time', 'Part-time', 'Contract', 'Internship', 'Remote']).default('Full-time'),
  salary_range: z.string().max(100).optional(),
  stage: z.enum(['active', 'paused', 'draft', 'closed']).default('draft'),
});

export const UpdateJobSchema = CreateJobSchema.partial();

export const JobStatusSchema = z.object({
  stage: z.enum(['active', 'paused', 'draft', 'closed']),
});

// ── Referral Schemas ──

export const CreateReferralSchema = z.object({
  professional_id: z.string().uuid('Invalid professional ID'),
  job_id: z.string().uuid().optional(),
  job_title: z.string().min(1, 'Job title is required').max(200),
  note: z.string().max(2000).optional(),
});

export const UpdateReferralStatusSchema = z.object({
  status: z.enum(['accepted', 'rejected', 'offered', 'hired']),
});

// ── User/Admin Schemas ──

export const UpdateUserRoleSchema = z.object({
  role: z.enum(['job_seeker', 'professional', 'recruiter', 'admin']),
});

export const BanUserSchema = z.object({
  status: z.enum(['suspended', 'deactivated', 'active']),
  reason: z.string().max(500).optional(),
});

export const AdminJobUpdateSchema = z.object({
  stage: z.enum(['active', 'paused', 'draft', 'closed']),
});

// ── Report Schema ──

export const CreateReportSchema = z.object({
  target_id: z.string().uuid('Invalid target user ID'),
  reason: z.string().min(1, 'Reason is required').max(200),
  description: z.string().max(2000).optional(),
});
