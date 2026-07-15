import { describe, it, expect } from 'vitest';
import { recordAlert } from '@/lib/alert-hub';

/**
 * Regression guard for the DNA-GOV-011 / DNA-GOV-014 main-break.
 *
 * Those endpoints called `recordAlert(alertObject)`, but recordAlert takes its
 * fields POSITIONALLY — (source, severity, title, description, recommendation?).
 * That mistake is a *type* error, so the strongest guard is type-level: the
 * `@ts-expect-error` directives below assert that the invalid call shapes do
 * NOT type-check. If recordAlert's signature ever drifts to accept them, the
 * directives become unused and `tsc --noEmit` fails — and CI runs `tsc` on
 * every PR merge candidate, so the regression is caught before merge.
 *
 * This function is never called; only type-checked.
 */
function _recordAlertTypeContract() {
  // @ts-expect-error recordAlert takes positional fields, not a single object.
  recordAlert({
    source: 'security',
    severity: 'info',
    title: 't',
    description: 'd',
  });

  // @ts-expect-error recordAlert requires at least source, severity, title, description.
  recordAlert('security');

  // A correct positional call must type-check.
  recordAlert('security', 'info', 'Title', 'Description', 'Recommendation');
}
void _recordAlertTypeContract;

describe('recordAlert contract', () => {
  it('builds an alert from positional fields', () => {
    const alert = recordAlert(
      'cost-anomaly',
      'critical',
      'Contract guard — positional recordAlert',
      'description body',
      'do the thing'
    );
    expect(alert).toMatchObject({
      source: 'cost-anomaly',
      severity: 'critical',
      title: 'Contract guard — positional recordAlert',
      description: 'description body',
      recommendation: 'do the thing',
    });
    expect(typeof alert.id).toBe('string');
    expect(typeof alert.timestamp).toBe('string');
  });
});
