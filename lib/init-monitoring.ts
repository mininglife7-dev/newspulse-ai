import { monitoringLoop } from './observability/monitoring-loop';

let isInitialized = false;

export async function initializeMonitoring(): Promise<void> {
  if (isInitialized) {
    return;
  }

  try {
    console.log('[Governor] Initializing autonomous monitoring loop...');
    await monitoringLoop.start();
    isInitialized = true;
    console.log('[Governor] Monitoring loop initialized successfully');
  } catch (error) {
    console.error('[Governor] Failed to initialize monitoring loop:', error);
  }
}

export function isMonitoringInitialized(): boolean {
  return isInitialized;
}
