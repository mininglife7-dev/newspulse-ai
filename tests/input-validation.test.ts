import { describe, it, expect } from 'vitest';
import { validators, validate, sanitizeString, sanitizeStringArray } from '@/lib/input-validation';

describe('Input Validation Framework', () => {
  describe('validators.string', () => {
    it('accepts valid strings', () => {
      const validator = validators.string();
      const result = validator.validate('hello');
      expect(result.ok).toBe(true);
      expect(result.value).toBe('hello');
    });

    it('trims whitespace', () => {
      const validator = validators.string();
      const result = validator.validate('  hello  ');
      expect(result.ok).toBe(true);
      expect(result.value).toBe('hello');
    });

    it('rejects non-strings', () => {
      const validator = validators.string();
      const result = validator.validate(123);
      expect(result.ok).toBe(false);
      expect(result.error).toBe('Must be a string');
    });

    it('enforces min length', () => {
      const validator = validators.string({ minLength: 5 });
      expect(validator.validate('hi').ok).toBe(false);
      expect(validator.validate('hello').ok).toBe(true);
    });

    it('enforces max length', () => {
      const validator = validators.string({ maxLength: 5 });
      expect(validator.validate('hello').ok).toBe(true);
      expect(validator.validate('toolong').ok).toBe(false);
    });

    it('validates pattern', () => {
      const validator = validators.string({ pattern: /^[a-z]+$/ });
      expect(validator.validate('abc').ok).toBe(true);
      expect(validator.validate('ABC').ok).toBe(false);
    });
  });

  describe('validators.number', () => {
    it('accepts numbers', () => {
      const validator = validators.number();
      expect(validator.validate(42).ok).toBe(true);
      expect(validator.validate('42').value).toBe(42);
    });

    it('enforces min value', () => {
      const validator = validators.number({ min: 0 });
      expect(validator.validate(-1).ok).toBe(false);
      expect(validator.validate(0).ok).toBe(true);
    });

    it('enforces max value', () => {
      const validator = validators.number({ max: 100 });
      expect(validator.validate(100).ok).toBe(true);
      expect(validator.validate(101).ok).toBe(false);
    });

    it('validates integers', () => {
      const validator = validators.number({ integer: true });
      expect(validator.validate(42).ok).toBe(true);
      expect(validator.validate(42.5).ok).toBe(false);
    });
  });

  describe('validators.email', () => {
    it('accepts valid emails', () => {
      const validator = validators.email();
      expect(validator.validate('user@example.com').ok).toBe(true);
      expect(validator.validate('  user@example.com  ').value).toBe('user@example.com');
    });

    it('converts to lowercase', () => {
      const validator = validators.email();
      const result = validator.validate('User@Example.Com');
      expect(result.value).toBe('user@example.com');
    });

    it('rejects invalid emails', () => {
      const validator = validators.email();
      expect(validator.validate('notanemail').ok).toBe(false);
      expect(validator.validate('@example.com').ok).toBe(false);
      expect(validator.validate('user@').ok).toBe(false);
    });

    it('enforces length limit', () => {
      const validator = validators.email();
      const longEmail = 'a'.repeat(250) + '@example.com';
      expect(validator.validate(longEmail).ok).toBe(false);
    });
  });

  describe('validators.url', () => {
    it('accepts valid URLs', () => {
      const validator = validators.url();
      expect(validator.validate('https://example.com').ok).toBe(true);
      expect(validator.validate('http://example.com/path').ok).toBe(true);
    });

    it('enforces allowed protocols', () => {
      const validator = validators.url({ allowedProtocols: ['https'] });
      expect(validator.validate('https://example.com').ok).toBe(true);
      expect(validator.validate('http://example.com').ok).toBe(false);
    });

    it('rejects invalid URLs', () => {
      const validator = validators.url();
      expect(validator.validate('not a url').ok).toBe(false);
      expect(validator.validate('example.com').ok).toBe(false);
    });
  });

  describe('validators.enum', () => {
    it('accepts valid enum values', () => {
      const validator = validators.enum(['admin', 'user', 'guest'] as const);
      expect(validator.validate('admin').ok).toBe(true);
      expect(validator.validate('user').ok).toBe(true);
    });

    it('rejects invalid enum values', () => {
      const validator = validators.enum(['admin', 'user'] as const);
      expect(validator.validate('superuser').ok).toBe(false);
    });
  });

  describe('validators.boolean', () => {
    it('accepts boolean values', () => {
      const validator = validators.boolean();
      expect(validator.validate(true).value).toBe(true);
      expect(validator.validate(false).value).toBe(false);
    });

    it('converts string booleans', () => {
      const validator = validators.boolean();
      expect(validator.validate('true').value).toBe(true);
      expect(validator.validate('false').value).toBe(false);
    });

    it('rejects non-boolean values', () => {
      const validator = validators.boolean();
      expect(validator.validate('yes').ok).toBe(false);
      expect(validator.validate(1).ok).toBe(false);
    });
  });

  describe('validators.array', () => {
    it('accepts arrays', () => {
      const validator = validators.array(validators.string());
      expect(validator.validate(['a', 'b']).ok).toBe(true);
    });

    it('validates array items', () => {
      const validator = validators.array(validators.number());
      expect(validator.validate([1, 2, 3]).ok).toBe(true);
      expect(validator.validate([1, 'two', 3]).ok).toBe(false);
    });

    it('enforces min length', () => {
      const validator = validators.array(validators.string(), { minLength: 2 });
      expect(validator.validate([]).ok).toBe(false);
      expect(validator.validate(['a']).ok).toBe(false);
      expect(validator.validate(['a', 'b']).ok).toBe(true);
    });

    it('enforces max length', () => {
      const validator = validators.array(validators.string(), { maxLength: 2 });
      expect(validator.validate(['a', 'b', 'c']).ok).toBe(false);
    });

    it('rejects non-arrays', () => {
      const validator = validators.array(validators.string());
      expect(validator.validate('not an array').ok).toBe(false);
    });
  });

  describe('validators.optional', () => {
    it('accepts undefined', () => {
      const validator = validators.optional(validators.string());
      const result = validator.validate(undefined);
      expect(result.ok).toBe(true);
      expect(result.value).toBeUndefined();
    });

    it('accepts null', () => {
      const validator = validators.optional(validators.string());
      const result = validator.validate(null);
      expect(result.ok).toBe(true);
      expect(result.value).toBeUndefined();
    });

    it('validates non-undefined values', () => {
      const validator = validators.optional(validators.string());
      expect(validator.validate('hello').value).toBe('hello');
      expect(validator.validate(123).ok).toBe(false);
    });

    it('does NOT treat a blank string as absent (JSON APIs stay strict)', () => {
      // A blank '' is only "absent" for HTML forms, so that normalization lives
      // in the form-facing routes (ai-systems, workspace), NOT here. Keeping the
      // validator strict means a malformed blank on a non-string JSON field
      // (e.g. optional(boolean()) on POST /api/knowledge) is still rejected
      // rather than silently coerced.
      expect(validators.optional(validators.boolean()).validate('').ok).toBe(
        false
      );
      expect(validators.optional(validators.url()).validate('').ok).toBe(false);
    });
  });

  describe('validate (schema validation)', () => {
    it('validates complete schema', () => {
      const schema = {
        name: validators.string({ minLength: 1 }),
        age: validators.number({ min: 0, max: 150 }),
        email: validators.email(),
      };

      const input = {
        name: 'John',
        age: 30,
        email: 'john@example.com',
      };

      const result = validate(input, schema);
      expect(result.ok).toBe(true);
      expect(result.value?.name).toBe('John');
      expect(result.value?.age).toBe(30);
    });

    it('collects multiple field errors', () => {
      const schema = {
        name: validators.string({ minLength: 1 }),
        age: validators.number({ min: 0 }),
        email: validators.email(),
      };

      const input = {
        name: '',
        age: -5,
        email: 'invalid',
      };

      const result = validate(input, schema);
      expect(result.ok).toBe(false);
      expect(result.errors).toBeDefined();
      expect(Object.keys(result.errors!).length).toBe(3);
    });

    it('rejects non-object input', () => {
      const schema = { name: validators.string() };
      const result = validate('not an object', schema);
      expect(result.ok).toBe(false);
      expect(result.error).toContain('must be an object');
    });
  });

  describe('sanitizeString', () => {
    it('removes angle brackets', () => {
      expect(sanitizeString('<script>alert("xss")</script>')).toBe('scriptalert("xss")/script');
    });

    it('trims whitespace', () => {
      expect(sanitizeString('  hello  ')).toBe('hello');
    });

    it('enforces max length', () => {
      const long = 'a'.repeat(20000);
      const result = sanitizeString(long);
      expect(result.length).toBe(10000);
    });
  });

  describe('sanitizeStringArray', () => {
    it('sanitizes all array items', () => {
      const input = ['<hello>', '  world  ', '<script>'];
      const result = sanitizeStringArray(input);
      expect(result[0]).toBe('hello');
      expect(result[1]).toBe('world');
      expect(result[2]).toBe('script');
    });

    it('returns empty array for non-array input', () => {
      expect(sanitizeStringArray('not an array' as any)).toEqual([]);
    });
  });

  describe('Real-world scenarios', () => {
    it('validates workspace setup', () => {
      const schema = {
        companyName: validators.string({ minLength: 1, maxLength: 255 }),
        country: validators.string({ minLength: 1, maxLength: 255 }),
        industry: validators.string({ minLength: 1, maxLength: 255 }),
        website: validators.optional(validators.url()),
        description: validators.optional(validators.string({ maxLength: 2000 })),
      };

      const valid = {
        companyName: 'Acme Corp',
        country: 'USA',
        industry: 'Technology',
        website: 'https://acme.com',
        description: 'A great company',
      };

      const result = validate(valid, schema);
      expect(result.ok).toBe(true);
    });

    it('validates incident trigger', () => {
      const schema = {
        type: validators.enum(['error_rate', 'latency', 'availability'] as const),
        severity: validators.enum(['warning', 'critical'] as const),
        current: validators.number({ min: 0 }),
        threshold: validators.number({ min: 0 }),
      };

      const valid = {
        type: 'error_rate',
        severity: 'critical',
        current: 0.15,
        threshold: 0.05,
      };

      const result = validate(valid, schema);
      expect(result.ok).toBe(true);
    });

    it('validates knowledge entry', () => {
      const schema = {
        type: validators.enum(['decision', 'learning', 'pattern', 'fix', 'risk'] as const),
        title: validators.string({ minLength: 1, maxLength: 255 }),
        description: validators.string({ minLength: 1, maxLength: 5000 }),
        evidence: validators.array(validators.string(), { minLength: 1 }),
        impact: validators.enum(['high', 'medium', 'low'] as const),
        tags: validators.array(validators.string(), { minLength: 1 }),
      };

      const valid = {
        type: 'learning',
        title: 'PostgreSQL connection pooling improvement',
        description: 'Connection pooling reduces latency by 40%',
        evidence: ['PR #123', 'Performance test results'],
        impact: 'high',
        tags: ['database', 'performance'],
      };

      const result = validate(valid, schema);
      expect(result.ok).toBe(true);
      expect(result.value?.tags).toHaveLength(2);
    });
  });
});
