import { runDependencyHealthChecks, formatDependencyAlert } from '@/lib/dependency-health'

export const runtime = 'nodejs'

export async function GET() {
  try {
    const report = await runDependencyHealthChecks()

    if (!report.ok) {
      console.warn(formatDependencyAlert(report))
    }

    return Response.json(report, {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Error in dependency health check:', error)
    return Response.json(
      {
        ok: false,
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
