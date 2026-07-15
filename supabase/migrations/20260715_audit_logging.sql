-- =============================================================
-- Audit Logging System
-- Tracks all security-relevant operations for compliance
-- =============================================================

-- Audit Logs Table
create table if not exists public.audit_logs (
    id                uuid        primary key default gen_random_uuid(),
    workspace_id      uuid        references public.workspaces(id) on delete cascade,
    user_id           uuid        references auth.users(id) on delete set null,
    action            text        not null,
    severity          text        not null check (severity in ('info', 'warning', 'critical')),
    resource_type     text,
    resource_id       uuid,
    status            text        not null check (status in ('success', 'failure')),
    error_message     text,
    changes           jsonb,
    metadata          jsonb,
    ip_address        text,
    user_agent        text,
    created_at        timestamptz not null default now()
);

-- Indexes for common queries
create index if not exists audit_logs_workspace_idx on public.audit_logs (workspace_id);
create index if not exists audit_logs_user_idx on public.audit_logs (user_id);
create index if not exists audit_logs_action_idx on public.audit_logs (action);
create index if not exists audit_logs_severity_idx on public.audit_logs (severity);
create index if not exists audit_logs_resource_idx on public.audit_logs (resource_type, resource_id);
create index if not exists audit_logs_created_idx on public.audit_logs (created_at desc);

-- Composite index for common queries
create index if not exists audit_logs_workspace_action_created_idx
  on public.audit_logs (workspace_id, action, created_at desc);

-- RLS Policies
alter table public.audit_logs enable row level security;

-- Users can only see audit logs for their workspace
create policy "Users can view their workspace audit logs"
  on public.audit_logs
  for select
  using (
    workspace_id in (
      select workspace_id from public.workspace_members
      where user_id = auth.uid() and status = 'active'
    )
  );

-- Only service role can insert audit logs
create policy "Only service role can insert audit logs"
  on public.audit_logs
  for insert
  with check (true);

-- Users cannot update or delete audit logs
create policy "Users cannot modify audit logs"
  on public.audit_logs
  for update
  using (false);

create policy "Users cannot delete audit logs"
  on public.audit_logs
  for delete
  using (false);

-- RPC Function: Get audit log summary for a workspace
create or replace function public.get_audit_summary(
  p_workspace_id uuid,
  p_days integer default 30
)
returns table (
  total_events bigint,
  success_count bigint,
  failure_count bigint,
  critical_count bigint,
  last_event_at timestamptz
) as $$
begin
  return query
  select
    count(*) as total_events,
    count(*) filter (where status = 'success') as success_count,
    count(*) filter (where status = 'failure') as failure_count,
    count(*) filter (where severity = 'critical') as critical_count,
    max(created_at) as last_event_at
  from public.audit_logs
  where workspace_id = p_workspace_id
    and created_at >= now() - make_interval(days => p_days);
end;
$$ language plpgsql security definer;

-- RPC Function: Get critical events
create or replace function public.get_critical_events(
  p_workspace_id uuid,
  p_limit integer default 50
)
returns table (
  id uuid,
  user_id uuid,
  action text,
  resource_type text,
  resource_id uuid,
  error_message text,
  metadata jsonb,
  created_at timestamptz
) as $$
begin
  return query
  select
    audit_logs.id,
    audit_logs.user_id,
    audit_logs.action,
    audit_logs.resource_type,
    audit_logs.resource_id,
    audit_logs.error_message,
    audit_logs.metadata,
    audit_logs.created_at
  from public.audit_logs
  where workspace_id = p_workspace_id
    and severity = 'critical'
  order by created_at desc
  limit p_limit;
end;
$$ language plpgsql security definer;

-- Grant permissions
grant select on public.audit_logs to authenticated;
grant execute on function public.get_audit_summary to authenticated;
grant execute on function public.get_critical_events to authenticated;
