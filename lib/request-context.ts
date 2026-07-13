import { randomUUID } from 'crypto';

let requestId: string | undefined;

export function getRequestId(): string {
  if (!requestId) {
    requestId = randomUUID();
  }
  return requestId;
}

export function resetRequestId(): void {
  requestId = undefined;
}

export function generateRequestId(): string {
  requestId = randomUUID();
  return requestId;
}
