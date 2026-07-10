/**
 * A tiny in-memory stand-in for a Supabase client that actually honours the
 * query filters used by our data layer. Because it enforces `.eq('user_id',…)`
 * for real, cross-user isolation tests prove behavior, not just that a method
 * was called.
 *
 * Supports exactly the chain shapes our helpers use:
 *   insert(row).select().single()
 *   select('*').eq().order().limit()            (awaited)
 *   select('*').eq().eq().maybeSingle()
 *   select('id',{count,head}).eq()              (awaited)
 *   delete().eq().eq().select('id')             (awaited)
 *   delete().eq()                               (awaited)
 */

export interface Row {
  id: string;
  user_id: string | null;
  keyword: string;
  results: unknown[];
  result_count: number;
  created_at: string;
  [k: string]: unknown;
}

type Filter = { col: string; val: unknown };

let idCounter = 1;

class QueryBuilder implements PromiseLike<{ data: any; error: any }> {
  private op: 'select' | 'insert' | 'delete' = 'select';
  private filters: Filter[] = [];
  private payload: Record<string, unknown> | null = null;
  private headCount = false;
  private selectAfterMutate = false;
  private limitN: number | null = null;

  constructor(
    private rows: Row[],
    private failWith: string | null
  ) {}

  private matched(): Row[] {
    return this.rows.filter((r) =>
      this.filters.every((f) => (r as any)[f.col] === f.val)
    );
  }

  insert(payload: Record<string, unknown>) {
    this.op = 'insert';
    this.payload = payload;
    return this;
  }

  delete() {
    this.op = 'delete';
    return this;
  }

  select(_cols?: string, opts?: { count?: string; head?: boolean }) {
    if (this.op === 'delete' || this.op === 'insert') {
      this.selectAfterMutate = true;
    } else {
      this.op = 'select';
    }
    if (opts?.head) this.headCount = true;
    return this;
  }

  eq(col: string, val: unknown) {
    this.filters.push({ col, val });
    return this;
  }

  order() {
    return this;
  }

  limit(n: number) {
    this.limitN = n;
    return this;
  }

  single(): Promise<{ data: any; error: any }> {
    return this.exec('single');
  }

  maybeSingle(): Promise<{ data: any; error: any }> {
    return this.exec('maybe');
  }

  then<TResult1 = { data: any; error: any }, TResult2 = never>(
    onfulfilled?:
      | ((value: { data: any; error: any }) => TResult1 | PromiseLike<TResult1>)
      | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2> {
    return this.exec('list').then(onfulfilled, onrejected);
  }

  private async exec(
    shape: 'single' | 'maybe' | 'list'
  ): Promise<{ data: any; error: any; count?: number }> {
    if (this.failWith) {
      return { data: null, error: { message: this.failWith } };
    }

    if (this.op === 'insert') {
      const row: Row = {
        id: `row-${idCounter++}`,
        created_at: new Date('2026-01-01T00:00:00Z').toISOString(),
        ...(this.payload as any),
      } as Row;
      this.rows.push(row);
      return { data: row, error: null };
    }

    if (this.op === 'delete') {
      const toDelete = this.matched();
      for (const r of toDelete) {
        const i = this.rows.indexOf(r);
        if (i >= 0) this.rows.splice(i, 1);
      }
      const data = this.selectAfterMutate
        ? toDelete.map((r) => ({ id: r.id }))
        : null;
      return { data, error: null };
    }

    // select
    let result = this.matched();
    if (this.limitN != null) result = result.slice(0, this.limitN);
    if (this.headCount) return { data: null, error: null, count: result.length };
    if (shape === 'single') return { data: result[0] ?? null, error: null };
    if (shape === 'maybe') return { data: result[0] ?? null, error: null };
    return { data: result, error: null };
  }
}

export function makeMockClient(initialRows: Row[] = [], failWith: string | null = null) {
  const rows = [...initialRows];
  return {
    rows,
    from(_table: string) {
      return new QueryBuilder(rows, failWith);
    },
  };
}

export function makeRow(overrides: Partial<Row> = {}): Row {
  return {
    id: overrides.id ?? `row-${idCounter++}`,
    user_id: overrides.user_id ?? 'user-a',
    keyword: overrides.keyword ?? 'test',
    results: overrides.results ?? [],
    result_count: overrides.result_count ?? 0,
    created_at: overrides.created_at ?? new Date('2026-01-01T00:00:00Z').toISOString(),
    ...overrides,
  };
}
