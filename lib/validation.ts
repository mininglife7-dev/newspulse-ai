import { z } from 'zod';
import { SYSTEM_TYPES, SYSTEM_STATUSES } from './ai-systems';

// Workspace validation
export const WorkspaceCreateSchema = z.object({
  companyName: z.string()
    .min(1, 'companyName is required')
    .max(100, 'companyName must be at most 100 characters')
    .trim(),
  country: z.string()
    .min(1, 'country is required')
    .max(100, 'country must be at most 100 characters')
    .trim(),
  industry: z.string()
    .min(1, 'industry is required')
    .max(100, 'industry must be at most 100 characters')
    .trim(),
  legalName: z.string()
    .max(150, 'legalName must be at most 150 characters')
    .trim()
    .optional(),
  employees: z.string()
    .max(50, 'employees must be at most 50 characters')
    .trim()
    .optional(),
  website: z.string()
    .max(200, 'website must be at most 200 characters')
    .refine(val => val === '' || /^https?:\/\//.test(val), 'website must be a valid URL')
    .optional()
    .transform(val => val === '' ? undefined : val),
  description: z.string()
    .max(500, 'description must be at most 500 characters')
    .trim()
    .optional(),
});

export type WorkspaceCreateInput = z.infer<typeof WorkspaceCreateSchema>;

// AI System validation
export const AiSystemCreateSchema = z.object({
  name: z.string()
    .min(1, 'name is required')
    .max(150, 'name must be at most 150 characters')
    .trim(),
  description: z.string()
    .max(500, 'description must be at most 500 characters')
    .trim()
    .optional(),
  systemType: z.enum(SYSTEM_TYPES as [string, ...string[]])
    .optional(),
  vendor: z.string()
    .max(100, 'vendor must be at most 100 characters')
    .trim()
    .optional(),
  purpose: z.string()
    .max(300, 'purpose must be at most 300 characters')
    .trim()
    .optional(),
  status: z.enum(SYSTEM_STATUSES as [string, ...string[]])
    .optional()
    .default('active'),
});

export type AiSystemCreateInput = z.infer<typeof AiSystemCreateSchema>;
