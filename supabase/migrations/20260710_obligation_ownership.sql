-- Add obligation ownership/assignment tracking
-- Allows delegating obligations to team members with accountability

alter table public.obligations
add column if not exists owner_id uuid references auth.users(id) on delete set null,
add column if not exists assigned_at timestamptz,
add column if not exists assigned_by uuid references auth.users(id) on delete set null;

create index if not exists obligations_owner_idx on public.obligations (owner_id);
create index if not exists obligations_assigned_at_idx on public.obligations (assigned_at desc);

-- RLS: Select if you're the owner or workspace member
create policy if not exists "obligations_select_by_owner"
  on public.obligations
  for select
  using (
    owner_id = auth.uid()
    or workspace_id in (
      select workspace_id from public.workspace_members
      where user_id = auth.uid() and status = 'active'
    )
  );

-- RLS: Update obligation (assign owner) if you're a workspace member
create policy if not exists "obligations_update_by_member"
  on public.obligations
  for update
  using (
    workspace_id in (
      select workspace_id from public.workspace_members
      where user_id = auth.uid() and status = 'active'
    )
  )
  with check (
    workspace_id in (
      select workspace_id from public.workspace_members
      where user_id = auth.uid() and status = 'active'
    )
  );

-- Helper function to assign obligation to a user
create or replace function public.assign_obligation(
  p_obligation_id uuid,
  p_owner_id uuid,
  p_assigned_by uuid
) returns json as $$
declare
  v_obligation obligations;
  v_workspace_id uuid;
begin
  -- Fetch obligation and verify workspace
  select * into v_obligation from public.obligations where id = p_obligation_id;
  if not found then
    return json_build_object('error', 'Obligation not found', 'code', 'NOT_FOUND');
  end if;

  v_workspace_id := v_obligation.workspace_id;

  -- Verify assigner is workspace member
  if not exists (
    select 1 from public.workspace_members
    where workspace_id = v_workspace_id
      and user_id = p_assigned_by
      and status = 'active'
  ) then
    return json_build_object('error', 'Not authorized', 'code', 'FORBIDDEN');
  end if;

  -- Update obligation with new owner
  update public.obligations
  set owner_id = p_owner_id,
      assigned_at = now(),
      assigned_by = p_assigned_by,
      updated_at = now()
  where id = p_obligation_id;

  return json_build_object('ok', true, 'obligation_id', p_obligation_id);
end;
$$ language plpgsql security definer;

-- Helper function to get obligations for a user
create or replace function public.get_user_obligations(
  p_user_id uuid
) returns table (
  id uuid,
  title text,
  description text,
  status text,
  priority text,
  owner_id uuid,
  assigned_at timestamptz,
  created_at timestamptz
) as $$
begin
  return query
  select o.id, o.title, o.description, o.status, o.priority, o.owner_id, o.assigned_at, o.created_at
  from public.obligations o
  where o.owner_id = p_user_id
  order by o.assigned_at desc nulls last;
end;
$$ language plpgsql security definer;
