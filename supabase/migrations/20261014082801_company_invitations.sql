-- Forward-only proposal. Do not apply without explicit approval and a verified
-- migration-history reconciliation against applied version 20261014074833.
-- Email delivery is deliberately outside these database functions.
create unique index if not exists invitations_one_pending_email
  on public.invitations (org_id, lower(invited_email))
  where state = 'pending';

create function public.create_company_invitation(p_org uuid, p_email text, p_role public.member_role)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_actor public.member_role; v_id uuid; v_email text;
begin
  v_email := lower(trim(p_email));
  if length(v_email) > 254 or v_email !~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'
    or p_role not in ('admin','analyst','viewer') then raise exception 'Invalid invitation'; end if;
  perform 1 from public.organizations where id = p_org and status = 'active' for update;
  if not found then raise exception 'Organization unavailable'; end if;
  select role into v_actor from public.memberships
    where org_id = p_org and user_id = auth.uid() and status = 'active';
  if v_actor not in ('owner','admin') or (v_actor = 'admin' and p_role = 'admin')
    then raise exception 'Forbidden'; end if;
  if exists (select 1 from auth.users u join public.memberships m on m.user_id = u.id
    where m.org_id = p_org and m.status = 'active' and lower(u.email) = v_email)
    then raise exception 'Already a member'; end if;
  update public.invitations set state = 'expired'
    where org_id = p_org and lower(invited_email) = v_email
      and state = 'pending' and expires_at <= now();
  if exists (select 1 from public.invitations
    where org_id = p_org and lower(invited_email) = v_email and state = 'pending')
    then raise exception 'Invitation already pending'; end if;
  insert into public.invitations(org_id, invited_email, role, invited_by, expires_at)
    values(p_org, v_email, p_role, auth.uid(), now() + interval '7 days')
    returning id into v_id;
  insert into public.audit_events(org_id, actor_id, action, entity_type, entity_id)
    values(p_org, auth.uid(), 'invitation_created', 'invitation', v_id);
  return v_id;
end; $$;

create function public.accept_company_invitation(p_invitation uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v public.invitations%rowtype; v_email text;
begin
  select lower(email) into v_email from auth.users
    where id = auth.uid() and email_confirmed_at is not null;
  if v_email is null then raise exception 'Verified email required'; end if;
  select * into v from public.invitations where id = p_invitation for update;
  if not found or v.state <> 'pending' or lower(v.invited_email) <> v_email
    or not exists (select 1 from public.organizations where id = v.org_id and status = 'active')
    then raise exception 'Invitation unavailable'; end if;
  if v.expires_at <= now() then
    update public.invitations set state = 'expired' where id = p_invitation;
    raise exception 'Invitation expired';
  end if;
  if exists (select 1 from public.memberships
    where org_id = v.org_id and user_id = auth.uid() and status = 'active')
    then raise exception 'Already a member'; end if;
  insert into public.memberships(org_id, user_id, role, status)
    values(v.org_id, auth.uid(), v.role, 'active')
    on conflict(org_id,user_id) do update
    set role = excluded.role, status = 'active';
  update public.invitations set state = 'accepted' where id = p_invitation;
  insert into public.audit_events(org_id, actor_id, action, entity_type, entity_id)
    values(v.org_id, auth.uid(), 'invitation_accepted', 'invitation', p_invitation);
  return v.org_id;
end; $$;

create function public.revoke_company_invitation(p_invitation uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v public.invitations%rowtype; v_actor public.member_role;
begin
  select * into v from public.invitations where id = p_invitation for update;
  if not found or v.state <> 'pending' then raise exception 'Invitation unavailable'; end if;
  select role into v_actor from public.memberships
    where org_id = v.org_id and user_id = auth.uid() and status = 'active';
  if v_actor not in ('owner','admin') or (v_actor = 'admin' and v.role = 'admin')
    then raise exception 'Forbidden'; end if;
  update public.invitations set state = 'revoked' where id = p_invitation;
  insert into public.audit_events(org_id, actor_id, action, entity_type, entity_id)
    values(v.org_id, auth.uid(), 'invitation_revoked', 'invitation', p_invitation);
end; $$;

revoke all on function public.create_company_invitation(uuid,text,public.member_role) from public,anon;
revoke all on function public.accept_company_invitation(uuid) from public,anon;
revoke all on function public.revoke_company_invitation(uuid) from public,anon;
grant execute on function public.create_company_invitation(uuid,text,public.member_role) to authenticated;
grant execute on function public.accept_company_invitation(uuid) to authenticated;
grant execute on function public.revoke_company_invitation(uuid) to authenticated;
