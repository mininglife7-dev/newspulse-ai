import { describe, it, expect } from 'vitest';
import {
  ErrorCode,
  badRequest,
  unauthorized,
  forbidden,
  notFound,
  conflict,
  rateLimited,
  serverError,
  databaseError,
  unavailable,
  missingRequiredField,
  validationFailed,
  handleSupabaseError,
} from '@/lib/error-handler';

describe('error-handler', () => {
  it('creates a 400 bad request response', async () => {
    const response = badRequest('Invalid input provided');
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.ok).toBe(false);
    expect(json.status).toBe(400);
    expect(json.error).toBe('Invalid input provided');
    expect(json.code).toBe(ErrorCode.INVALID_INPUT);
    expect(json.timestamp).toBeDefined();
  });

  it('includes details in bad request response', async () => {
    const details = { field: 'email', reason: 'Invalid format' };
    const response = badRequest('Validation error', details);
    const json = await response.json();

    expect(json.details).toEqual(details);
  });

  it('creates a 401 unauthorized response', async () => {
    const response = unauthorized('Token expired');
    const json = await response.json();

    expect(response.status).toBe(401);
    expect(json.code).toBe(ErrorCode.AUTHENTICATION_REQUIRED);
    expect(json.error).toBe('Token expired');
  });

  it('creates a 403 forbidden response', async () => {
    const response = forbidden('You cannot access this resource');
    const json = await response.json();

    expect(response.status).toBe(403);
    expect(json.code).toBe(ErrorCode.INSUFFICIENT_PERMISSIONS);
  });

  it('creates a 404 not found response with resource type', async () => {
    const response = notFound('User', 'user-123');
    const json = await response.json();

    expect(response.status).toBe(404);
    expect(json.code).toBe(ErrorCode.RESOURCE_NOT_FOUND);
    expect(json.error).toBe('User "user-123" not found');
    expect(json.details.resourceType).toBe('User');
    expect(json.details.resourceId).toBe('user-123');
  });

  it('creates a 404 not found response without resource id', async () => {
    const response = notFound('Assessment');
    const json = await response.json();

    expect(json.error).toBe('Assessment not found');
    expect(json.details.resourceId).toBeUndefined();
  });

  it('creates a 409 conflict response', async () => {
    const response = conflict('Email already exists');
    const json = await response.json();

    expect(response.status).toBe(409);
    expect(json.code).toBe(ErrorCode.RESOURCE_CONFLICT);
  });

  it('creates a 429 rate limited response', async () => {
    const response = rateLimited(60);
    const json = await response.json();

    expect(response.status).toBe(429);
    expect(json.code).toBe(ErrorCode.RATE_LIMIT_EXCEEDED);
    expect(response.headers.get('Retry-After')).toBe('60');
    expect(json.details.retryAfterSeconds).toBe(60);
  });

  it('creates a 429 rate limited response without retry after', async () => {
    const response = rateLimited();
    const json = await response.json();

    expect(response.status).toBe(429);
    expect(response.headers.get('Retry-After')).toBeNull();
  });

  it('creates a 500 internal server error response', async () => {
    const error = new Error('Database connection failed');
    const response = serverError('Failed to fetch data', error);
    const json = await response.json();

    expect(response.status).toBe(500);
    expect(json.code).toBe(ErrorCode.INTERNAL_SERVER_ERROR);
    expect(json.error).toBe('Failed to fetch data');
    expect(json.details.errorMessage).toBe('Database connection failed');
  });

  it('creates a database error response', async () => {
    const error = new Error('Connection timeout');
    const response = databaseError('select', error);
    const json = await response.json();

    expect(response.status).toBe(500);
    expect(json.code).toBe(ErrorCode.DATABASE_ERROR);
    expect(json.error).toBe('Database select failed');
    expect(json.details.operation).toBe('select');
  });

  it('creates a 503 unavailable response', async () => {
    const response = unavailable();
    const json = await response.json();

    expect(response.status).toBe(503);
    expect(json.code).toBe(ErrorCode.SERVICE_UNAVAILABLE);
  });

  it('creates missing required field error', async () => {
    const response = missingRequiredField('email');
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.code).toBe(ErrorCode.MISSING_REQUIRED_FIELD);
    expect(json.error).toBe('Missing required field: email');
    expect(json.details.fieldName).toBe('email');
  });

  it('creates validation failed error with multiple failures', async () => {
    const failures = {
      email: 'Invalid email format',
      password: 'Password too short',
    };
    const response = validationFailed(failures);
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.code).toBe(ErrorCode.VALIDATION_FAILED);
    expect(json.details.failures).toEqual(failures);
  });

  it('handles unique constraint violation (23505)', async () => {
    const error = { code: '23505', message: 'duplicate key value' };
    const response = handleSupabaseError(error);
    const json = await response.json();

    expect(response.status).toBe(409);
    expect(json.code).toBe(ErrorCode.RESOURCE_CONFLICT);
    expect(json.error).toContain('already exists');
  });

  it('handles foreign key violation (23503)', async () => {
    const error = { code: '23503', message: 'foreign key constraint' };
    const response = handleSupabaseError(error);
    const json = await response.json();

    expect(response.status).toBe(409);
    expect(json.error).toContain('related data');
  });

  it('handles table not found (42P01)', async () => {
    const error = { code: '42P01', message: 'table does not exist' };
    const response = handleSupabaseError(error);
    const json = await response.json();

    expect(response.status).toBe(500);
    expect(json.error).toContain('schema error');
  });

  it('handles column not found (42703)', async () => {
    const error = { code: '42703', message: 'column does not exist' };
    const response = handleSupabaseError(error);
    const json = await response.json();

    expect(response.status).toBe(500);
    expect(json.error).toContain('schema error');
  });

  it('handles generic database error', async () => {
    const error = { code: 'PGSQL_ERROR', message: 'Unexpected error' };
    const response = handleSupabaseError(error);
    const json = await response.json();

    expect(response.status).toBe(500);
    expect(json.code).toBe(ErrorCode.DATABASE_ERROR);
  });

  it('handles null error gracefully', async () => {
    const response = handleSupabaseError(null);
    const json = await response.json();

    expect(response.status).toBe(500);
    expect(json.code).toBe(ErrorCode.INTERNAL_SERVER_ERROR);
  });

  it('error codes are exported correctly', () => {
    expect(ErrorCode.INVALID_INPUT).toBe('INVALID_INPUT');
    expect(ErrorCode.AUTHENTICATION_REQUIRED).toBe('AUTHENTICATION_REQUIRED');
    expect(ErrorCode.INSUFFICIENT_PERMISSIONS).toBe('INSUFFICIENT_PERMISSIONS');
    expect(ErrorCode.RESOURCE_NOT_FOUND).toBe('RESOURCE_NOT_FOUND');
    expect(ErrorCode.RESOURCE_CONFLICT).toBe('RESOURCE_CONFLICT');
    expect(ErrorCode.RATE_LIMIT_EXCEEDED).toBe('RATE_LIMIT_EXCEEDED');
    expect(ErrorCode.INTERNAL_SERVER_ERROR).toBe('INTERNAL_SERVER_ERROR');
    expect(ErrorCode.DATABASE_ERROR).toBe('DATABASE_ERROR');
    expect(ErrorCode.SERVICE_UNAVAILABLE).toBe('SERVICE_UNAVAILABLE');
  });

  it('all error responses include timestamp', async () => {
    const responses = [
      badRequest('test'),
      unauthorized(),
      forbidden(),
      notFound('test'),
      conflict('test'),
      rateLimited(),
      serverError('test'),
      unavailable(),
    ];

    for (const response of responses) {
      const json = await response.json();
      expect(json.timestamp).toBeDefined();
      expect(typeof json.timestamp).toBe('string');
      // Verify it's a valid ISO string
      expect(() => new Date(json.timestamp)).not.toThrow();
    }
  });

  it('all error responses have ok: false', async () => {
    const responses = [
      badRequest('test'),
      unauthorized(),
      forbidden(),
      notFound('test'),
      conflict('test'),
      rateLimited(),
      serverError('test'),
      unavailable(),
    ];

    for (const response of responses) {
      const json = await response.json();
      expect(json.ok).toBe(false);
    }
  });
});
