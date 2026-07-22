// Minimal ESM runner for test-runner
import * as mod from './test-runner.ts';

const { runOperationalAcceptanceGate } = mod;
await runOperationalAcceptanceGate();
