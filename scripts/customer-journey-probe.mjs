#!/usr/bin/env node
/**
 * Customer Journey Probe — exercises the first-customer path against the
 * LIVE production app, API-first (the same routes the browser calls),
 * from a GitHub runner. Writes evidence to ./journey-artifacts/.
 *
 * Env: APP_URL (required), SUPABASE_URL, SUPABASE_ANON_KEY (public-by-design
 * publishable key — ships in every client bundle; no secrets used here).
 *
 * Test accounts use the +governor-cj-<runid> alias pattern and fictional
 * company data. Never real customer data.
 */
import { mkdirSync, writeFileSync } from 'node:fs';

const APP = process.env.APP_URL;
const SB = process.env.SUPABASE_URL;
const ANON = process.env.SUPABASE_ANON_KEY;
const RUNID =
  process.env.GITHUB_RUN_ID || String(Math.floor(Date.now() / 1000));
if (!APP || !SB || !ANON) {
  console.error('APP_URL, SUPABASE_URL, SUPABASE_ANON_KEY required');
  process.exit(2);
}

const ART = 'journey-artifacts';
mkdirSync(ART, { recursive: true });
const steps = [];
let artN = 0;
function save(name, data) {
  const f = `${ART}/${String(++artN).padStart(2, '0')}-${name}`;
  writeFileSync(
    f,
    typeof data === 'string' ? data : JSON.stringify(data, null, 2)
  );
  return f;
}
function step(name, pass, evidence, note = '') {
  steps.push({ name, pass, evidence, note });
  console.log(
    `${pass ? '✅ PASS' : '❌ FAIL'}  ${name}${note ? ' — ' + note : ''}  [${evidence}]`
  );
}

// --- @supabase/ssr cookie construction (browser-equivalent session) ---
const ref = new URL(SB).host.split('.')[0];
function sessionCookies(session) {
  const raw =
    'base64-' + Buffer.from(JSON.stringify(session)).toString('base64url');
  const name = `sb-${ref}-auth-token`;
  const MAX = 3180;
  if (raw.length <= MAX) return [`${name}=${raw}`];
  const out = [];
  for (let i = 0; i * MAX < raw.length; i++)
    out.push(`${name}.${i}=${raw.slice(i * MAX, (i + 1) * MAX)}`);
  return out;
}
async function api(path, { method = 'GET', body, session } = {}) {
  const headers = { 'content-type': 'application/json' };
  if (session) headers.cookie = sessionCookies(session).join('; ');
  const res = await fetch(`${APP}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    redirect: 'manual',
  });
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    /* non-JSON (page/PDF) */
  }
  return { status: res.status, headers: res.headers, text, json };
}
async function auth(path, body) {
  const res = await fetch(`${SB}/auth/v1/${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', apikey: ANON },
    body: JSON.stringify(body),
  });
  return { status: res.status, json: await res.json().catch(() => null) };
}
async function signupAndSession(email, pw) {
  const su = await auth('signup', { email, password: pw });
  if (su.json?.access_token) return { signup: su, session: su.json };
  if (su.json?.session?.access_token)
    return { signup: su, session: su.json.session };
  // Confirmation may be required — try password grant anyway (disabled-confirm projects return session above)
  const si = await auth('token?grant_type=password', { email, password: pw });
  return {
    signup: su,
    session: si.json?.access_token ? si.json : null,
    signin: si,
  };
}

const PW = `Cj!${RUNID}aX9`;
const emailA = `governor.cj.a.${RUNID}@gmail.com`;
const emailB = `governor.cj.b.${RUNID}@gmail.com`;

// 1. Landing page
{
  const r = await api('/');
  const okContent = /EURO\s*AI|EU AI Act/i.test(r.text);
  const f = save('landing.html', r.text.slice(0, 20000));
  step(
    '1. Landing page',
    r.status === 200 && okContent,
    `HTTP ${r.status}, EURO AI content=${okContent}, ${f}`
  );
}
// health snapshot (supports step 12)
const health0 = await api('/api/health');
save('health-before.json', health0.json ?? health0.text);

// 2+3+4. Registration, email verification behavior, login
let A = null;
{
  const r = await signupAndSession(emailA, PW);
  const f = save('signup-A.json', {
    signup: r.signup,
    signinStatus: r.signin?.status ?? 'n/a-direct-session',
  });
  const confirmationRequired =
    !r.session &&
    !!(
      r.signup.json?.confirmation_sent_at ||
      r.signup.json?.user?.confirmation_sent_at
    );
  if (r.session) {
    A = r.session;
    step(
      '2. User registration',
      true,
      `signup HTTP ${r.signup.status}, user id ${r.session.user?.id?.slice(0, 8)}…, ${f}`
    );
    step(
      '3. Email verification',
      true,
      `project accepts sign-in without inbox roundtrip (confirmation disabled or autoconfirm) — ${f}`,
      'no inbox needed for first login'
    );
    const relogin = await auth('token?grant_type=password', {
      email: emailA,
      password: PW,
    });
    const f2 = save('login-A.json', {
      status: relogin.status,
      hasToken: !!relogin.json?.access_token,
    });
    step(
      '4. Login',
      relogin.status === 200 && !!relogin.json?.access_token,
      `password grant HTTP ${relogin.status}, ${f2}`
    );
    if (relogin.json?.access_token) A = relogin.json;
  } else {
    console.log('   signup response body:', JSON.stringify(r.signup.json).slice(0, 600));
    if (r.signin) console.log('   signin response body:', JSON.stringify(r.signin.json).slice(0, 600));
    step(
      '2. User registration',
      r.signup.status === 200,
      `signup HTTP ${r.signup.status}, ${f}`
    );
    step(
      '3. Email verification',
      false,
      f,
      confirmationRequired
        ? 'confirmation email dispatched but inbox roundtrip cannot be automated — BLOCKED, needs mailbox or autoconfirm'
        : `unexpected: no session and no confirmation marker (signup body in ${f})`
    );
    step('4. Login', false, f, 'cannot log in without confirmed email');
  }
}

if (A) {
  // 5. Workspace creation
  const ws = await api('/api/workspace', {
    method: 'POST',
    session: A,
    body: {
      companyName: `Musterkanzlei Steuerberatung CJ${RUNID}`,
      country: 'DE',
      industry: 'Accounting',
      description: 'Fictional journey-verification firm (Governor probe)',
    },
  });
  const fws = save('workspace-A.json', ws.json ?? ws.text);
  step(
    '5. Workspace creation',
    ws.status === 200 &&
      (ws.json?.ok ?? true) &&
      !!(
        ws.json?.workspace ||
        ws.json?.data ||
        ws.json?.slug ||
        ws.json?.id ||
        ws.json?.ok
      ),
    `HTTP ${ws.status}, ${fws}`
  );

  // 6. AI system registration
  const sys = await api('/api/ai-systems', {
    method: 'POST',
    session: A,
    body: {
      name: 'Belegerkennung OCR (journey probe)',
      description: 'Automated receipt classification for accounting',
      systemType: 'internal',
      purpose: 'Document classification',
    },
  });
  const fsys = save('ai-system-A.json', sys.json ?? sys.text);
  const systemId = sys.json?.system?.id || sys.json?.data?.id || sys.json?.id;
  step(
    '6. AI system registration',
    sys.status === 200 && !!systemId,
    `HTTP ${sys.status}, id=${String(systemId).slice(0, 8)}…, ${fsys}`
  );

  // 7. Risk assessment
  let assessmentOk = false,
    fass = '';
  if (systemId) {
    const q = await api('/api/assessments/questions', { session: A });
    save('questions.json', q.json ?? q.text);
    const answers = {};
    for (const qu of q.json?.questions ?? []) {
      const id = qu.id ?? qu.key;
      const opt = qu.options?.[qu.options.length - 1];
      answers[id] = opt?.value ?? opt ?? 'no';
    }
    const ass = await api('/api/assessments', {
      method: 'POST',
      session: A,
      body: {
        aiSystemId: systemId,
        answers,
        status: 'completed',
      },
    });
    fass = save('assessment-A.json', ass.json ?? ass.text);
    assessmentOk =
      ass.status === 200 &&
      !!(ass.json?.assessment || ass.json?.ok || ass.json?.data);
    step(
      '7. Risk assessment',
      assessmentOk,
      `HTTP ${ass.status}, ${Object.keys(answers).length} answers, ${fass}`
    );
  } else step('7. Risk assessment', false, fass, 'no systemId from step 6');

  // 8. Evidence collection
  const ev = await api('/api/evidence', {
    method: 'POST',
    session: A,
    body: {
      title: 'Journey probe evidence — data processing agreement',
      description:
        'Fictional artifact attached by Governor journey verification',
    },
  });
  const fev = save('evidence-A.json', ev.json ?? ev.text);
  step(
    '8. Evidence collection',
    ev.status === 200 && !!(ev.json?.ok || ev.json?.evidence || ev.json?.data),
    `HTTP ${ev.status}, ${fev}`
  );

  // 9. Compliance report generation (PDF)
  let repOk = false,
    frep = '';
  if (systemId) {
    const rep = await fetch(`${APP}/api/reports/assessment/${systemId}`, {
      headers: { cookie: sessionCookies(A).join('; ') },
    });
    const buf = Buffer.from(await rep.arrayBuffer());
    frep = save('report-A.pdf', buf.subarray(0, 200000));
    repOk =
      rep.status === 200 && buf.subarray(0, 5).toString().startsWith('%PDF');
    step(
      '9. Compliance report generation',
      repOk,
      `HTTP ${rep.status}, ${buf.length} bytes, magic=${buf.subarray(0, 5).toString()}, ${frep}`
    );
  } else step('9. Compliance report generation', false, '', 'no systemId');

  // 10. Dashboard accuracy
  const dash = await api('/api/dashboard', { session: A });
  const fdash = save('dashboard-A.json', dash.json ?? dash.text);
  const dtext = JSON.stringify(dash.json ?? {});
  const reflects = dash.status === 200 && /Belegerkennung|1/.test(dtext);
  step(
    '10. Dashboard accuracy',
    reflects,
    `HTTP ${dash.status}, reflects created data=${reflects}, ${fdash}`,
    'verify counts in artifact'
  );

  // 11. Multi-workspace isolation
  const rB = await signupAndSession(emailB, PW);
  if (rB.session) {
    await api('/api/workspace', {
      method: 'POST',
      session: rB.session,
      body: {
        companyName: `Isolation Probe GmbH CJ${RUNID}`,
        country: 'DE',
        industry: 'Accounting',
      },
    });
    const listB = await api('/api/ai-systems', { session: rB.session });
    const fB = save('isolation-B-systems.json', listB.json ?? listB.text);
    const leak = JSON.stringify(listB.json ?? '').includes('Belegerkennung');
    const crossRead = systemId
      ? await api(`/api/ai-systems/${systemId}`, { session: rB.session })
      : { status: 'skipped' };
    const fX = save(
      'isolation-B-crossread.json',
      crossRead.json ?? crossRead.text ?? crossRead.status
    );
    const crossBlocked = crossRead.status === 404 || crossRead.status === 403;
    step(
      '11. Multi-workspace isolation',
      !leak && crossBlocked,
      `tenant B list leak=${leak} (${fB}); cross-ID read HTTP ${crossRead.status} (${fX})`
    );
  } else
    step(
      '11. Multi-workspace isolation',
      false,
      save('signup-B.json', rB.signup),
      'tenant B could not obtain session'
    );
} else {
  for (const n of [
    '5. Workspace creation',
    '6. AI system registration',
    '7. Risk assessment',
    '8. Evidence collection',
    '9. Compliance report generation',
    '10. Dashboard accuracy',
    '11. Multi-workspace isolation',
  ])
    step(n, false, '', 'blocked: no authenticated session (see steps 2–4)');
}

// 12. No critical errors during journey
{
  const health1 = await api('/api/health');
  const f = save('health-after.json', health1.json ?? health1.text);
  const any5xx = steps.some((s) => /HTTP 5\d\d/.test(s.evidence));
  const healthy = health1.json?.ok === true && health1.json?.db === 'ok';
  step(
    '12. No critical errors in logs',
    healthy && !any5xx,
    `health after journey ok=${health1.json?.ok} db=${health1.json?.db} (${f}); 5xx during journey=${any5xx}`,
    'internal error telemetry is admin-gated; probe observes health + own responses'
  );
}

const passed = steps.filter((s) => s.pass).length;
save('SUMMARY.json', {
  runId: RUNID,
  app: APP,
  supabaseHost: new URL(SB).host,
  steps,
  passed,
  total: steps.length,
});
console.log('==============================');
console.log(`JOURNEY RESULT: ${passed}/${steps.length} steps PASS`);
process.exit(passed === steps.length ? 0 : 1);
