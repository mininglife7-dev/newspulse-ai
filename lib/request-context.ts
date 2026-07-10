import { randomUUID } from 'crypto';

let requestId: string;

export function getRequestId(): string {
  if (!requestId) {
    requestId = randomUUID();
  }
  return requestId;
}

export function resetRequestId(): void {
  requestId = undefined as any;
}

export function generateRequestId(): string {
  requestId = randomUUID();
  return requestId;
}
