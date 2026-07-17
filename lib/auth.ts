import { supabase } from './supabase';

export interface AuthUser {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
}

export async function signUp(
  email: string,
  password: string,
  firstName?: string,
  lastName?: string
) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        first_name: firstName,
        last_name: lastName,
      },
      // Email confirmation links land on our handler, which completes
      // verification and signs the user in.
      ...(typeof window !== 'undefined'
        ? { emailRedirectTo: `${window.location.origin}/auth/confirm` }
        : {}),
    },
  });

  if (error) throw error;
  return data;
}

/**
 * Resend the signup confirmation email. Used by the "resend verification link"
 * action when the first email never arrived. Mirrors signUp's redirect so the
 * new link lands on the same /auth/confirm handler.
 */
export async function resendVerification(email: string) {
  const { error } = await supabase.auth.resend({
    type: 'signup',
    email,
    ...(typeof window !== 'undefined'
      ? {
          options: {
            emailRedirectTo: `${window.location.origin}/auth/confirm`,
          },
        }
      : {}),
  });

  if (error) throw error;
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  return {
    id: user.id,
    email: user.email || '',
    firstName: user.user_metadata?.first_name,
    lastName: user.user_metadata?.last_name,
  };
}

export async function resetPassword(email: string) {
  // Route the recovery link through /auth/confirm — the same handler signup
  // uses — so the code is exchanged for a session server-side, then forwarded
  // to the set-new-password page. Using window.location.origin keeps this
  // correct across preview/prod deploys without relying on NEXT_PUBLIC_SITE_URL.
  const redirectTo =
    typeof window !== 'undefined'
      ? `${window.location.origin}/auth/confirm?next=/auth/reset-password`
      : undefined;

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    ...(redirectTo ? { redirectTo } : {}),
  });

  if (error) throw error;
}

export async function updatePassword(newPassword: string) {
  const { error } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (error) throw error;
}

/**
 * Record user GDPR Article 7 consent (lawful basis for data processing)
 * Called immediately after successful signup/email verification.
 */
export async function recordConsent(
  gdprConsent: boolean,
  marketingConsent: boolean = false,
  consentVersion: string = '1.0'
) {
  const response = await fetch('/api/consent', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      gdprConsent,
      marketingConsent,
      consentVersion,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to record consent');
  }

  return response.json();
}
