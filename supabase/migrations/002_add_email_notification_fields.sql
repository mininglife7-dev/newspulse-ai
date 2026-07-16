-- =============================================================
-- Email Notification Fields
-- Add fields to support email notification tracking
-- =============================================================

-- Add reminder tracking to obligations table
alter table public.obligations
add column if not exists reminder_sent_at timestamptz,
add column if not exists email_notification_enabled boolean not null default true;

-- Create email_events table for monitoring delivery
create table if not exists public.email_events (
    id                uuid        primary key default gen_random_uuid(),
    workspace_id      uuid        not null references public.workspaces(id) on delete cascade,
    recipient_email   text        not null,
    event_type        text        not null, -- sent, delivered, opened, clicked, bounced, complained, unsubscribed
    email_category    text,
    obligation_id     uuid        references public.obligations(id) on delete set null,
    metadata          jsonb       default '{}',
    created_at        timestamptz not null default now()
);

create index if not exists email_events_workspace_idx on public.email_events (workspace_id);
create index if not exists email_events_recipient_idx on public.email_events (recipient_email);
create index if not exists email_events_event_type_idx on public.email_events (event_type);
create index if not exists email_events_category_idx on public.email_events (email_category);

-- Enable RLS on email_events
alter table public.email_events enable row level security;

create policy "Members can read workspace email events"
    on public.email_events for select
    using (
        exists (
            select 1 from public.workspace_members
            where workspace_id = email_events.workspace_id
            and user_id = auth.uid()
            and status = 'active'
        )
    );

-- Add email preferences table
create table if not exists public.email_preferences (
    id                uuid        primary key default gen_random_uuid(),
    user_id           uuid        not null references auth.users(id) on delete cascade,
    workspace_id      uuid        not null references public.workspaces(id) on delete cascade,
    deadline_reminders boolean     not null default true,
    obligation_updates boolean     not null default true,
    weekly_digest      boolean     not null default true,
    team_invitations   boolean     not null default true,
    unsubscribe_all    boolean     not null default false,
    created_at        timestamptz not null default now(),
    updated_at        timestamptz not null default now(),
    unique(user_id, workspace_id)
);

create index if not exists email_preferences_user_workspace_idx on public.email_preferences (user_id, workspace_id);

alter table public.email_preferences enable row level security;

create policy "Users can manage their own email preferences"
    on public.email_preferences for all
    using (auth.uid() = user_id);

create policy "Workspace members can view team email preferences"
    on public.email_preferences for select
    using (
        exists (
            select 1 from public.workspace_members
            where workspace_id = email_preferences.workspace_id
            and user_id = auth.uid()
            and status = 'active'
        )
    );
