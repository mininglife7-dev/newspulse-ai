import { NextResponse } from 'next/server';
import {
  initializeMonitoring,
  isMonitoringInitialized,
} from '@/lib/init-monitoring';

export async function GET() {
  const alreadyInitialized = isMonitoringInitialized();

  if (!alreadyInitialized) {
    await initializeMonitoring();
  }

  return NextResponse.json(
    {
      status: 'ok',
      monitoring: {
        initialized: isMonitoringInitialized(),
        message: alreadyInitialized
          ? 'Monitoring loop already running'
          : 'Monitoring loop initialized',
      },
    },
    { status: 200 }
  );
}
