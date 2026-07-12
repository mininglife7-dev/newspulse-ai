/**
 * Input Validation Framework
 *
 * Provides composable validators for API input sanitization.
 * All validators return { ok: boolean, value?: T, error?: string }
 *
 * Usage:
 *   const schema = {
 *     email: validators.email(),
 *     age: validators.number({ min: 0, max: 150 }),
 *     role: validators.enum(['admin', 'user']),
 *   };
 *   const result = validate(body, schema);
 *   if (!result.ok) return error(result.error);
 */

export interface ValidationResult<T = unknown> {
  ok: boolean;
  value?: T;
  error?: string;
  errors?: Record<string, string>;
}

export interface FieldValidator<T = unknown> {
  validate(value: unknown): ValidationResult<T>;
}

// Core validators
export const validators = {
  string: (opts?: { minLength?: number; maxLength?: number; pattern?: RegExp }): FieldValidator<string> => ({
    validate(value: unknown): ValidationResult<string> {
      if (typeof value !== 'string') {
        return { ok: false, error: 'Must be a string' };
      }
      const trimmed = value.trim();
      if (opts?.minLength && trimmed.length < opts.minLength) {
        return { ok: false, error: `Must be at least ${opts.minLength} characters` };
      }
      if (opts?.maxLength && trimmed.length > opts.maxLength) {
        return { ok: false, error: `Must be at most ${opts.maxLength} characters` };
      }
      if (opts?.pattern && !opts.pattern.test(trimmed)) {
        return { ok: false, error: 'Invalid format' };
      }
      return { ok: true, value: trimmed };
    },
  }),

  number: (opts?: { min?: number; max?: number; integer?: boolean }): FieldValidator<number> => ({
    validate(value: unknown): ValidationResult<number> {
      const num = typeof value === 'string' ? parseFloat(value) : value;
      if (typeof num !== 'number' || isNaN(num)) {
        return { ok: false, error: 'Must be a number' };
      }
      if (opts?.integer && !Number.isInteger(num)) {
        return { ok: false, error: 'Must be an integer' };
      }
      if (opts?.min !== undefined && num < opts.min) {
        return { ok: false, error: `Must be at least ${opts.min}` };
      }
      if (opts?.max !== undefined && num > opts.max) {
        return { ok: false, error: `Must be at most ${opts.max}` };
      }
      return { ok: true, value: num };
    },
  }),

  email: (): FieldValidator<string> => ({
    validate(value: unknown): ValidationResult<string> {
      if (typeof value !== 'string') {
        return { ok: false, error: 'Must be a string' };
      }
      const trimmed = value.trim().toLowerCase();
      // RFC 5322 simplified pattern
      const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!pattern.test(trimmed)) {
        return { ok: false, error: 'Invalid email format' };
      }
      if (trimmed.length > 254) {
        return { ok: false, error: 'Email too long' };
      }
      return { ok: true, value: trimmed };
    },
  }),

  url: (opts?: { allowedProtocols?: string[] }): FieldValidator<string> => ({
    validate(value: unknown): ValidationResult<string> {
      if (typeof value !== 'string') {
        return { ok: false, error: 'Must be a string' };
      }
      const trimmed = value.trim();
      try {
        const url = new URL(trimmed);
        if (opts?.allowedProtocols && !opts.allowedProtocols.includes(url.protocol)) {
          return { ok: false, error: `Protocol must be one of: ${opts.allowedProtocols.join(', ')}` };
        }
        return { ok: true, value: url.toString() };
      } catch {
        return { ok: false, error: 'Invalid URL format' };
      }
    },
  }),

  enum: <T extends readonly string[]>(values: T): FieldValidator<T[number]> => ({
    validate(value: unknown): ValidationResult<T[number]> {
      if (typeof value !== 'string') {
        return { ok: false, error: 'Must be a string' };
      }
      if (!values.includes(value)) {
        return { ok: false, error: `Must be one of: ${values.join(', ')}` };
      }
      return { ok: true, value };
    },
  }),

  boolean: (): FieldValidator<boolean> => ({
    validate(value: unknown): ValidationResult<boolean> {
      if (typeof value === 'boolean') {
        return { ok: true, value };
      }
      if (typeof value === 'string') {
        if (value.toLowerCase() === 'true') return { ok: true, value: true };
        if (value.toLowerCase() === 'false') return { ok: true, value: false };
      }
      return { ok: false, error: 'Must be a boolean' };
    },
  }),

  array: <T>(itemValidator: FieldValidator<T>, opts?: { minLength?: number; maxLength?: number }): FieldValidator<T[]> => ({
    validate(value: unknown): ValidationResult<T[]> {
      if (!Array.isArray(value)) {
        return { ok: false, error: 'Must be an array' };
      }
      if (opts?.minLength && value.length < opts.minLength) {
        return { ok: false, error: `Array must have at least ${opts.minLength} items` };
      }
      if (opts?.maxLength && value.length > opts.maxLength) {
        return { ok: false, error: `Array must have at most ${opts.maxLength} items` };
      }
      const validated: T[] = [];
      for (let i = 0; i < value.length; i++) {
        const result = itemValidator.validate(value[i]);
        if (!result.ok) {
          return { ok: false, error: `Item ${i}: ${result.error}` };
        }
        if (result.value !== undefined) {
          validated.push(result.value);
        }
      }
      return { ok: true, value: validated };
    },
  }),

  object: <T extends Record<string, FieldValidator>>(schema: T, opts?: { allowExtraFields?: boolean }): FieldValidator<Record<keyof T, unknown>> => ({
    validate(value: unknown): ValidationResult<Record<keyof T, unknown>> {
      if (typeof value !== 'object' || value === null) {
        return { ok: false, error: 'Must be an object' };
      }

      const obj = value as Record<string, unknown>;
      const result: Record<keyof T, unknown> = {} as any;
      const errors: Record<string, string> = {};

      for (const [key, validator] of Object.entries(schema)) {
        const fieldValue = obj[key];
        const validation = validator.validate(fieldValue);
        if (!validation.ok) {
          errors[key] = validation.error || 'Invalid value';
        } else {
          result[key as keyof T] = validation.value;
        }
      }

      if (Object.keys(errors).length > 0) {
        return { ok: false, error: 'Validation failed', errors };
      }

      return { ok: true, value: result };
    },
  }),

  optional: <T>(validator: FieldValidator<T>): FieldValidator<T | undefined> => ({
    validate(value: unknown): ValidationResult<T | undefined> {
      if (value === undefined || value === null) {
        return { ok: true, value: undefined };
      }
      return validator.validate(value) as ValidationResult<T | undefined>;
    },
  }),
};

/**
 * Validate input against a schema
 * @param input The input object to validate
 * @param schema Schema validators for each field
 * @returns Validation result with typed value or errors
 */
export function validate<T extends Record<string, FieldValidator>>(
  input: unknown,
  schema: T
): ValidationResult<{ [K in keyof T]: unknown }> {
  if (typeof input !== 'object' || input === null) {
    return { ok: false, error: 'Input must be an object' };
  }

  const obj = input as Record<string, unknown>;
  const result: Record<string, unknown> = {};
  const errors: Record<string, string> = {};

  for (const [key, validator] of Object.entries(schema)) {
    const fieldValue = obj[key];
    const validation = validator.validate(fieldValue);
    if (!validation.ok) {
      errors[key] = validation.error || 'Invalid value';
    } else {
      result[key] = validation.value;
    }
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, error: 'Validation failed', errors };
  }

  return { ok: true, value: result as { [K in keyof T]: unknown } };
}

/**
 * Sanitize string to prevent injection attacks
 * @param input Raw string input
 * @returns Sanitized string safe for storage/output
 */
export function sanitizeString(input: string): string {
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove angle brackets to prevent HTML injection
    .slice(0, 10000); // Limit length to prevent DoS
}

/**
 * Sanitize array of strings
 * @param input Array of strings
 * @returns Array of sanitized strings
 */
export function sanitizeStringArray(input: string[]): string[] {
  return Array.isArray(input) ? input.map(sanitizeString) : [];
}
