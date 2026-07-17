import { NextRequest, NextResponse } from 'next/server';
import { createRouteClient } from '@/lib/supabase-server';
import { logger } from '@/lib/logger';
import { getClientIp } from '@/lib/audit-logger';
import { validators, validate } from '@/lib/input-validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface ConsentRequest {
  gdprConsent: boolean;
  marketingConsent?: boolean;
  consentVersion: string;
}

/**
 * POST /api/consent — record user GDPR Article 7 consent (lawful basis)
 *
 * Called during signup or when user updates consent preferences.
 * Stores consent timestamp, version, and audit trail for compliance.
 */
export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: 'Invalid JSON body' },
      { status: 400 }
    );
  }

  const validationResult = validate(body, {
    gdprConsent: validators.boolean(),
    marketingConsent: validators.optional(validators.boolean()),
    consentVersion: validators.string({ minLength: 1, maxLength: 20 }),
  });

  if (!validationResult.ok) {
    return NextResponse.json(
      { ok: false, error: 'Invalid input', errors: validationResult.errors },
      { status: 400 }
    );
  }

  const validated = validationResult.value as ConsentRequest;

  const supabase = await createRouteClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { ok: false, error: 'Authentication required' },
      { status: 401 }
    );
  }

  // GDPR Article 7: Consent must be freely given, specific, and informed
  // We require explicit GDPR consent for lawful basis
  if (!validated.gdprConsent) {
    return NextResponse.json(
      {
        ok: false,
        error: 'GDPR data processing consent is required to continue',
      },
      { status: 400 }
    );
  }

  try {
    // Update profile with consent information
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        consents_accepted_at: new Date().toISOString(),
        consent_version: validated.consentVersion,
        gdpr_consent: validated.gdprConsent,
        marketing_consent: validated.marketingConsent || false,
      })
      .eq('id', user.id);

    if (updateError) {
      logger.error(
        'Consent update failed',
        'CONSENT_UPDATE_ERROR',
        updateError
      );
      return NextResponse.json(
        { ok: false, error: 'Failed to record consent' },
        { status: 500 }
      );
    }

    // Log consent to audit trail (GDPR Article 30)
    const ipAddress = getClientIp(request);
    const userAgent = request.headers.get('user-agent') || undefined;
    const { error: logError } = await supabase
      .from('consent_audit_log')
      .insert({
        user_id: user.id,
        action: 'consent_given',
        gdpr_consent: validated.gdprConsent,
        marketing_consent: validated.marketingConsent || false,
        consent_version: validated.consentVersion,
        ip_address: ipAddress,
        user_agent: userAgent,
      });

    if (logError) {
      // Non-blocking: log consent was recorded even if audit fails
      logger.warn(
        'Consent audit logging failed (non-blocking)',
        'CONSENT_AUDIT_LOG_ERROR',
        { message: logError.message }
      );
    }

    return NextResponse.json({
      ok: true,
      message: 'Consent recorded successfully',
      consent: {
        gdprConsent: validated.gdprConsent,
        marketingConsent: validated.marketingConsent,
        acceptedAt: new Date().toISOString(),
      },
    });
  } catch (err) {
    logger.error('Consent recording failed', 'CONSENT_RECORD_ERROR', err);
    return NextResponse.json(
      { ok: false, error: 'Failed to record consent' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/consent — fetch user's current consent status
 */
export async function GET(request: NextRequest) {
  const supabase = await createRouteClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { ok: false, error: 'Authentication required' },
      { status: 401 }
    );
  }

  const { data: profile, error } = await supabase
    .from('profiles')
    .select(
      'consents_accepted_at, consent_version, gdpr_consent, marketing_consent'
    )
    .eq('id', user.id)
    .maybeSingle();

  if (error) {
    logger.error('Consent fetch failed', 'CONSENT_FETCH_ERROR', error);
    return NextResponse.json(
      { ok: false, error: 'Failed to fetch consent status' },
      { status: 500 }
    );
  }

  if (!profile) {
    return NextResponse.json(
      {
        ok: true,
        consent: {
          gdprConsent: false,
          marketingConsent: false,
          acceptedAt: null,
          consentVersion: null,
        },
      },
      { status: 200 }
    );
  }

  return NextResponse.json({
    ok: true,
    consent: {
      gdprConsent: profile.gdpr_consent || false,
      marketingConsent: profile.marketing_consent || false,
      acceptedAt: profile.consents_accepted_at,
      consentVersion: profile.consent_version,
    },
  });
}
