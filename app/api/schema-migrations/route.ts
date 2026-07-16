import { NextRequest, NextResponse } from 'next/server';
import {
  analyzeMigrationBatch,
  formatBatchReport,
  MigrationBatch,
} from '@/lib/schema-migration-validator';

/**
 * GET /api/schema-migrations
 *
 * Returns information about schema migration validation.
 * Can accept a query parameter to test with sample migrations.
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const mode = searchParams.get('mode') || 'health';

  if (mode === 'health') {
    return NextResponse.json(
      {
        status: 'operational',
        service: 'Schema Migration Validator (DNA-GOV-012)',
        description:
          'Validates Supabase schema migrations for safety and provides zero-downtime guidance',
        features: [
          'Detects dangerous patterns (dropping columns, unsafe constraints)',
          'Classifies by risk level: safe, low-risk, high-risk, breaking',
          'Provides zero-downtime execution recommendations',
          'Blocks CI for breaking migrations',
        ],
        checkMigrations: {
          method: 'POST',
          description: 'Submit migrations for analysis',
          body: {
            migrations: [
              {
                name: 'string',
                sql: 'string',
                timestamp: 'string (ISO 8601, optional)',
              },
            ],
          },
        },
      },
      { status: 200 }
    );
  }

  if (mode === 'example') {
    // Return an example analysis for demonstration
    const sampleMigrations = [
      {
        name: '20260710_create_users.sql',
        sql: `
          CREATE TABLE users (
            id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
            email TEXT NOT NULL UNIQUE,
            created_at TIMESTAMP NOT NULL DEFAULT NOW()
          );
          CREATE INDEX idx_users_email ON users(email);
        `,
      },
      {
        name: '20260711_add_verified_column.sql',
        sql: `
          ALTER TABLE users ADD COLUMN verified BOOLEAN DEFAULT false;
        `,
      },
    ];

    const batch = analyzeMigrationBatch(sampleMigrations);
    return NextResponse.json(batch, { status: 200 });
  }

  return NextResponse.json(
    {
      error: 'Invalid mode parameter',
      supportedModes: ['health', 'example'],
    },
    { status: 400 }
  );
}

/**
 * POST /api/schema-migrations
 *
 * Analyzes submitted schema migrations for safety.
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      migrations: Array<{
        name: string;
        sql: string;
        timestamp?: string;
      }>;
    };

    if (!body.migrations || !Array.isArray(body.migrations)) {
      return NextResponse.json(
        {
          error: 'Invalid request body',
          expected: {
            migrations: [
              {
                name: 'string',
                sql: 'string',
                timestamp: 'string (optional)',
              },
            ],
          },
        },
        { status: 400 }
      );
    }

    // Validate each migration has required fields
    for (const migration of body.migrations) {
      if (!migration.name || !migration.sql) {
        return NextResponse.json(
          {
            error: 'Each migration must have "name" and "sql" fields',
          },
          { status: 400 }
        );
      }
    }

    // Analyze the batch
    const batch = analyzeMigrationBatch(body.migrations);

    // Set response status based on whether migrations block CI
    const statusCode = batch.blocksCI ? 400 : 200;

    return NextResponse.json(batch, { status: statusCode });
  } catch (error) {
    console.error('[schema-migrations] POST error:', error);
    return NextResponse.json(
      {
        error: 'Failed to analyze migrations',
        message:
          error instanceof Error ? error.message : 'Unknown error occurred',
      },
      { status: 500 }
    );
  }
}
