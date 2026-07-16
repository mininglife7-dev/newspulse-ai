-- =============================================================
-- Webhook Infrastructure
-- Enable real-time event notifications to external systems
-- =============================================================

-- Webhook Subscriptions Table
create table if not exists public.webhook_subscriptions (
    id                uuid        primary key default gen_random_uuid(),
    workspace_id      uuid        not null references public.workspaces(id) on delete cascade,
    url               text        not null,
    events            text[]      not null default '{}',
    secret            text        not null,
    is_active         boolean     not null default true,
    retry_count       integer     not null default 3,
    retry_delay_ms    integer     not null default 1000,
    created_by        uuid        not null references auth.users(id) on delete cascade,
    created_at        timestamptz not null default now(),
    updated_at        timestamptz not null default now(),
    last_triggered_at timestamptz
);

create index if not exists webhook_subscriptions_workspace_idx on public.webhook_subscriptions (workspace_id);
create index if not exists webhook_subscriptions_active_idx on public.webhook_subscriptions (is_active);

-- Webhook Events Log Table
create table if not exists public.webhook_events (
    id                uuid        primary key default gen_random_uuid(),
    workspace_id      uuid        not null references public.workspaces(id) on delete cascade,
    subscription_id   uuid        not null references public.webhook_subscriptions(id) on delete cascade,
    event_type        text        not null,
    entity_type       text        not null, -- obligation, evidence, remediation, ai_system, risk_assessment
    entity_id         uuid        not null,
    payload           jsonb       not null,
    http_status       integer,
    error_message     text,
    delivery_attempts integer     not null default 0,
    next_retry_at     timestamptz,
    delivered_at      timestamptz,
    created_at        timestamptz not null default now()
);

create index if not exists webhook_events_workspace_idx on public.webhook_events (workspace_id);
create index if not exists webhook_events_subscription_idx on public.webhook_events (subscription_id);
create index if not exists webhook_events_event_type_idx on public.webhook_events (event_type);
create index if not exists webhook_events_status_idx on public.webhook_events (delivered_at);

-- Row Level Security
alter table public.webhook_subscriptions enable row level security;
alter table public.webhook_events enable row level security;

-- RLS Policies for webhook_subscriptions (workspace members can manage)
create policy "Workspace admins can manage webhook subscriptions"
    on public.webhook_subscriptions for all
    using (
        exists (
            select 1 from public.workspace_members
            where workspace_id = webhook_subscriptions.workspace_id
            and user_id = auth.uid()
            and role in ('owner', 'admin')
            and status = 'active'
        )
    );

create policy "Workspace members can view webhook subscriptions"
    on public.webhook_subscriptions for select
    using (
        exists (
            select 1 from public.workspace_members
            where workspace_id = webhook_subscriptions.workspace_id
            and user_id = auth.uid()
            and status = 'active'
        )
    );

-- RLS Policies for webhook_events (workspace members can view)
create policy "Workspace members can view webhook events"
    on public.webhook_events for select
    using (
        exists (
            select 1 from public.workspace_members
            where workspace_id = webhook_events.workspace_id
            and user_id = auth.uid()
            and status = 'active'
        )
    );

-- Webhook Delivery Queue (for background job processing)
create table if not exists public.webhook_queue (
    id                uuid        primary key default gen_random_uuid(),
    event_id          uuid        not null references public.webhook_events(id) on delete cascade,
    status            text        not null default 'pending', -- pending, processing, delivered, failed
    attempts          integer     not null default 0,
    last_error        text,
    processed_at      timestamptz,
    created_at        timestamptz not null default now()
);

create index if not exists webhook_queue_status_idx on public.webhook_queue (status);
create index if not exists webhook_queue_event_idx on public.webhook_queue (event_id);
