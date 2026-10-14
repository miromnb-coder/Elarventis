-- Elarventis: initial, additive schema. Run only after a tested backup and restore.
create extension if not exists pgcrypto;
create extension if not exists btree_gist;
create schema if not exists app_private;
revoke all on schema app_private from public, anon, authenticated;
create type public.member_role as enum ('owner','admin','analyst','viewer');
create type public.review_state as enum ('draft','pending_review','approved','superseded','archived');

create table public.organizations (
 id uuid primary key default gen_random_uuid(), name text not null check (length(trim(name)) between 2 and 160),
 status text not null default 'active' check (status in ('active','archived')),
 created_at timestamptz not null default now()
);
create table public.profiles (
 user_id uuid primary key references auth.users(id) on delete cascade,
 display_name text check (length(display_name) <= 120), created_at timestamptz not null default now()
);
create table public.memberships (
 org_id uuid not null references public.organizations(id) on delete restrict,
 user_id uuid not null references auth.users(id) on delete cascade,
 role public.member_role not null, status text not null default 'active' check (status in ('active','removed')),
 created_at timestamptz not null default now(), primary key(org_id,user_id)
);
create index memberships_user on public.memberships(user_id,status);
create table public.invitations (
 id uuid primary key default gen_random_uuid(), org_id uuid not null references public.organizations(id) on delete restrict,
 invited_email text not null, role public.member_role not null check(role <> 'owner'),
 invited_by uuid not null references auth.users(id), expires_at timestamptz not null,
 state text not null default 'pending' check(state in ('pending','accepted','revoked','expired')),
 created_at timestamptz not null default now(), unique(org_id,id)
);
create table public.carriers (
 id uuid primary key default gen_random_uuid(), org_id uuid not null references public.organizations(id) on delete restrict,
 name text not null check(length(trim(name)) between 2 and 160), code text,
 archived_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(org_id,id), unique(org_id,name)
);
create table public.documents (
 id uuid primary key default gen_random_uuid(), org_id uuid not null references public.organizations(id) on delete restrict,
 kind text not null check(kind in ('contract_pdf','rate_csv','rate_xlsx','invoice_pdf','invoice_csv','invoice_xlsx','report_pdf','report_csv','report_xlsx')),
 original_name text not null check(length(original_name) between 1 and 240),
 storage_path text not null unique, sha256 text not null check(sha256 ~ '^[0-9a-f]{64}$'),
 mime text not null check((kind like '%_pdf' and mime='application/pdf') or (kind like '%_csv' and mime='text/csv') or (kind like '%_xlsx' and mime='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')), size_bytes integer not null check(size_bytes between 1 and 10485760),
 uploader_id uuid not null references auth.users(id), state text not null default 'uploading' check(state in ('uploading','stored','failed','invalid','archived')),
 created_at timestamptz not null default now(), verified_at timestamptz, unique(org_id,id), unique(org_id,kind,sha256),
 check(state <> 'stored' or verified_at is not null),
 check(storage_path = org_id::text || '/' || id::text)
);
create table public.document_extractions (
 id uuid primary key default gen_random_uuid(), org_id uuid not null, document_id uuid not null,
 parser_version text not null, model_version text, proposed_fields jsonb not null default '{}'::jsonb,
 confidence numeric(4,3), review_state public.review_state not null default 'draft',
 created_at timestamptz not null default now(), unique(org_id,id), unique(org_id,document_id,parser_version),
 foreign key(org_id,document_id) references public.documents(org_id,id) on delete restrict
);
create table public.contracts (
 id uuid primary key default gen_random_uuid(), org_id uuid not null references public.organizations(id) on delete restrict,
 carrier_id uuid not null, label text not null check(length(trim(label)) between 2 and 160),
 state public.review_state not null default 'draft', created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(), unique(org_id,id),
 foreign key(org_id,carrier_id) references public.carriers(org_id,id) on delete restrict
);
create table public.contract_versions (
 id uuid primary key default gen_random_uuid(), org_id uuid not null, contract_id uuid not null,
 version_number integer not null check(version_number > 0), document_id uuid,
 effective_from date not null, effective_to date,
 state public.review_state not null default 'draft', approved_at timestamptz, approved_by uuid references auth.users(id),
 change_summary text, created_at timestamptz not null default now(), unique(org_id,id), unique(org_id,contract_id,version_number),
 foreign key(org_id,contract_id) references public.contracts(org_id,id) on delete restrict,
 foreign key(org_id,document_id) references public.documents(org_id,id) on delete restrict,
 check(effective_to is null or effective_to >= effective_from),
 check((state = 'approved' and approved_at is not null and approved_by is not null) or state <> 'approved')
);
create index contract_versions_contract on public.contract_versions(org_id,contract_id,version_number desc);
create table public.rate_rules (
 id uuid primary key default gen_random_uuid(), org_id uuid not null, contract_version_id uuid not null,
 rule_type text not null check(rule_type in ('base_freight','weight_band','zone_price','service_price')),
 service_code text not null check(length(trim(service_code)) between 1 and 80),
 origin_zone text, destination_zone text, zone text,
 min_weight_g integer, max_weight_g integer, weight_basis text check(weight_basis in ('actual','volumetric','billable')),
 price_minor integer not null check(price_minor >= 0), currency text not null default 'EUR' check(currency = 'EUR'),
 vat_basis text not null check(vat_basis in ('excluding_vat','including_vat')),
 source_document_id uuid, source_row integer check(source_row > 0),
 effective_from date, effective_to date,
 created_at timestamptz not null default now(), unique(org_id,id), unique(org_id,contract_version_id,id),
 foreign key(org_id,contract_version_id) references public.contract_versions(org_id,id) on delete restrict,
 foreign key(org_id,source_document_id) references public.documents(org_id,id) on delete restrict,
 check((min_weight_g is null and max_weight_g is null) or (min_weight_g >= 0 and max_weight_g > min_weight_g)),
 check((rule_type <> 'weight_band') or (min_weight_g is not null and max_weight_g is not null and weight_basis is not null and zone is not null)),
 check((rule_type <> 'zone_price') or zone is not null)
 ,check(effective_to is null or effective_from is not null and effective_to>=effective_from)
);
create index rate_rules_version on public.rate_rules(org_id,contract_version_id);
alter table public.rate_rules add constraint rate_weight_band_no_overlap exclude using gist (org_id with =, contract_version_id with =, service_code with =, zone with =, int4range(min_weight_g,max_weight_g,'[)') with &&) where (rule_type='weight_band');
create table public.audit_events (
 id uuid primary key default gen_random_uuid(), org_id uuid not null references public.organizations(id),
 actor_id uuid references auth.users(id), action text not null, entity_type text not null,
 entity_id uuid not null, details jsonb not null default '{}'::jsonb, created_at timestamptz not null default now(), unique(org_id,id)
);

create function app_private.has_role(p_org uuid, p_roles public.member_role[]) returns boolean
language sql stable security definer set search_path = '' as $$
 select auth.uid() is not null and exists (
  select 1 from public.memberships m join public.organizations o on o.id=m.org_id
  where m.org_id=p_org and m.user_id=auth.uid() and m.status='active' and o.status='active' and m.role=any(p_roles)
 );
$$;
revoke all on function app_private.has_role(uuid,public.member_role[]) from public,anon;
grant usage on schema app_private to authenticated;
grant execute on function app_private.has_role(uuid,public.member_role[]) to authenticated;

create function public.create_organization(p_name text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
 if auth.uid() is null or length(trim(p_name)) not between 2 and 160 then raise exception 'Invalid request'; end if;
 insert into public.organizations(name) values(trim(p_name)) returning id into v_id;
 insert into public.memberships(org_id,user_id,role) values(v_id,auth.uid(),'owner');
 return v_id;
end; $$;
revoke all on function public.create_organization(text) from public,anon;
grant execute on function public.create_organization(text) to authenticated;

create function public.change_member_role(p_org uuid,p_user uuid,p_role public.member_role) returns void
language plpgsql security definer set search_path = '' as $$
declare v_actor public.member_role; v_old public.member_role;
begin
 perform 1 from public.organizations where id=p_org for update;
 select role into v_actor from public.memberships where org_id=p_org and user_id=auth.uid() and status='active';
 select role into v_old from public.memberships where org_id=p_org and user_id=p_user and status='active' for update;
 if v_actor is null or v_actor not in ('owner','admin') or v_old is null then raise exception 'Forbidden'; end if;
 if v_actor='admin' and (v_old in ('owner','admin') or p_role in ('owner','admin')) then raise exception 'Owner action required'; end if;
 if p_user=auth.uid() and p_role='owner' and v_old<>'owner' then raise exception 'Self promotion forbidden'; end if;
 if v_old='owner' and p_role<>'owner' and
  (select count(*) from public.memberships where org_id=p_org and status='active' and role='owner')<=1 then raise exception 'Last owner cannot be removed'; end if;
 update public.memberships set role=p_role where org_id=p_org and user_id=p_user;
 insert into public.audit_events(org_id,actor_id,action,entity_type,entity_id,details)
 values(p_org,auth.uid(),'member_role_changed','membership',p_user,jsonb_build_object('before',v_old,'after',p_role));
end; $$;
revoke all on function public.change_member_role(uuid,uuid,public.member_role) from public,anon;
grant execute on function public.change_member_role(uuid,uuid,public.member_role) to authenticated;

create function public.remove_member(p_org uuid,p_user uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare v_actor public.member_role; v_old public.member_role;
begin
 perform 1 from public.organizations where id=p_org for update;
 select role into v_actor from public.memberships where org_id=p_org and user_id=auth.uid() and status='active';
 select role into v_old from public.memberships where org_id=p_org and user_id=p_user and status='active' for update;
 if v_actor is null or v_actor not in ('owner','admin') or v_old is null then raise exception 'Forbidden'; end if;
 if v_actor='admin' and v_old in ('owner','admin') then raise exception 'Owner action required'; end if;
 if v_old='owner' and (select count(*) from public.memberships where org_id=p_org and status='active' and role='owner')<=1 then raise exception 'Last owner cannot be removed'; end if;
 update public.memberships set status='removed' where org_id=p_org and user_id=p_user;
 insert into public.audit_events(org_id,actor_id,action,entity_type,entity_id)
 values(p_org,auth.uid(),'member_removed','membership',p_user);
end; $$;
revoke all on function public.remove_member(uuid,uuid) from public,anon;
grant execute on function public.remove_member(uuid,uuid) to authenticated;

create function public.approve_version(p_org uuid,p_version uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare v public.contract_versions%rowtype; v_count integer;
begin
 if not app_private.has_role(p_org,array['owner','admin']::public.member_role[]) then raise exception 'Forbidden'; end if;
 select * into v from public.contract_versions where org_id=p_org and id=p_version for update;
 if not found or v.state not in ('draft','pending_review') then raise exception 'Invalid version state'; end if;
 perform 1 from public.contracts where org_id=p_org and id=v.contract_id for update;
 select count(*) into v_count from public.rate_rules where org_id=p_org and contract_version_id=p_version;
 if v_count=0 then raise exception 'Version has no rates'; end if;
 if v.document_id is null or not exists(select 1 from public.documents d where d.org_id=p_org and d.id=v.document_id and d.kind='contract_pdf' and d.state='stored') then raise exception 'Contract PDF is required'; end if;
 if exists(select 1 from public.rate_rules where org_id=p_org and contract_version_id=p_version and (source_document_id is null or source_row is null)) then raise exception 'Missing rate source'; end if;
 if exists(select 1 from public.contract_versions other where other.org_id=p_org and other.contract_id=v.contract_id
  and other.id<>p_version and other.state='approved'
  and daterange(other.effective_from,coalesce(other.effective_to + 1,'infinity'::date),'[)')
    && daterange(v.effective_from,coalesce(v.effective_to + 1,'infinity'::date),'[)')) then raise exception 'Overlapping approved period'; end if;
 update public.contract_versions set state='approved',approved_at=now(),approved_by=auth.uid() where org_id=p_org and id=p_version;
 update public.contracts set state='approved',updated_at=now() where org_id=p_org and id=v.contract_id;
 insert into public.audit_events(org_id,actor_id,action,entity_type,entity_id) values(p_org,auth.uid(),'approve','contract_version',p_version);
end; $$;
revoke all on function public.approve_version(uuid,uuid) from public,anon;
grant execute on function public.approve_version(uuid,uuid) to authenticated;

create function app_private.guard_version() returns trigger language plpgsql set search_path = '' as $$
begin
 if old.state in ('approved','superseded','archived') then
  if old.state='approved' and new.state='superseded' and
   (to_jsonb(new) - 'state') = (to_jsonb(old) - 'state') then return new; end if;
  raise exception 'Historical version is immutable';
 end if;
 if new.org_id<>old.org_id or new.contract_id<>old.contract_id or new.version_number<>old.version_number then raise exception 'Invalid version update'; end if;
 if not ((old.state='draft' and new.state in ('draft','pending_review','approved')) or
   (old.state='pending_review' and new.state in ('pending_review','draft','approved'))) then raise exception 'Invalid version transition'; end if;
 return new;
end; $$;
create trigger guard_version before update on public.contract_versions for each row execute function app_private.guard_version();
create function app_private.guard_rate() returns trigger language plpgsql set search_path = '' as $$
declare v_state public.review_state;
begin
 select state into v_state from public.contract_versions where org_id=coalesce(new.org_id,old.org_id)
 and id=coalesce(new.contract_version_id,old.contract_version_id);
 if v_state not in ('draft','pending_review') then raise exception 'Approved rates are immutable'; end if;
 if tg_op='UPDATE' and (new.org_id<>old.org_id or new.contract_version_id<>old.contract_version_id) then raise exception 'Rate parent is immutable'; end if;
 return coalesce(new,old);
end; $$;
create trigger guard_rate before insert or update or delete on public.rate_rules for each row execute function app_private.guard_rate();

alter table public.organizations enable row level security;
alter table public.profiles enable row level security;
alter table public.memberships enable row level security;
alter table public.invitations enable row level security;
alter table public.carriers enable row level security;
alter table public.documents enable row level security;
alter table public.document_extractions enable row level security;
alter table public.contracts enable row level security;
alter table public.contract_versions enable row level security;
alter table public.rate_rules enable row level security;
alter table public.audit_events enable row level security;

create policy organizations_read on public.organizations for select to authenticated using (app_private.has_role(id,array['owner','admin','analyst','viewer']::public.member_role[]));
create policy profiles_self_read on public.profiles for select to authenticated using (user_id=auth.uid());
create policy profiles_self_insert on public.profiles for insert to authenticated with check (user_id=auth.uid());
create policy profiles_self_update on public.profiles for update to authenticated using (user_id=auth.uid()) with check(user_id=auth.uid());
create policy memberships_read on public.memberships for select to authenticated using (app_private.has_role(org_id,array['owner','admin','analyst','viewer']::public.member_role[]));
create policy invitations_read on public.invitations for select to authenticated using (app_private.has_role(org_id,array['owner','admin']::public.member_role[]));
create policy carriers_read on public.carriers for select to authenticated using (app_private.has_role(org_id,array['owner','admin','analyst','viewer']::public.member_role[]));
create policy carriers_insert on public.carriers for insert to authenticated with check(app_private.has_role(org_id,array['owner','admin']::public.member_role[]));
create policy carriers_update on public.carriers for update to authenticated using(app_private.has_role(org_id,array['owner','admin']::public.member_role[])) with check(app_private.has_role(org_id,array['owner','admin']::public.member_role[]));
create policy documents_read on public.documents for select to authenticated using(app_private.has_role(org_id,array['owner','admin','analyst','viewer']::public.member_role[]));
create policy documents_insert on public.documents for insert to authenticated with check(state='uploading' and uploader_id=auth.uid() and
 (app_private.has_role(org_id,array['owner','admin']::public.member_role[]) or
 (kind like 'invoice_%' and app_private.has_role(org_id,array['analyst']::public.member_role[]))));
create policy extractions_read on public.document_extractions for select to authenticated using(app_private.has_role(org_id,array['owner','admin','analyst','viewer']::public.member_role[]));
create policy extractions_insert on public.document_extractions for insert to authenticated with check(review_state='draft' and app_private.has_role(org_id,array['owner','admin','analyst']::public.member_role[]));
create policy contracts_read on public.contracts for select to authenticated using(app_private.has_role(org_id,array['owner','admin','analyst','viewer']::public.member_role[]));
create policy contracts_insert on public.contracts for insert to authenticated with check(app_private.has_role(org_id,array['owner','admin']::public.member_role[]));
create policy contracts_update on public.contracts for update to authenticated using(app_private.has_role(org_id,array['owner','admin']::public.member_role[])) with check(app_private.has_role(org_id,array['owner','admin']::public.member_role[]));
create policy versions_read on public.contract_versions for select to authenticated using(app_private.has_role(org_id,array['owner','admin','analyst','viewer']::public.member_role[]));
create policy versions_insert on public.contract_versions for insert to authenticated with check(state='draft' and approved_at is null and approved_by is null and app_private.has_role(org_id,array['owner','admin']::public.member_role[]));
create policy versions_update on public.contract_versions for update to authenticated using(state in ('draft','pending_review') and app_private.has_role(org_id,array['owner','admin']::public.member_role[])) with check(state in ('draft','pending_review') and app_private.has_role(org_id,array['owner','admin']::public.member_role[]));
create policy rates_read on public.rate_rules for select to authenticated using(app_private.has_role(org_id,array['owner','admin','analyst','viewer']::public.member_role[]));
create policy rates_insert on public.rate_rules for insert to authenticated with check(app_private.has_role(org_id,array['owner','admin']::public.member_role[]));
create policy rates_update on public.rate_rules for update to authenticated using(app_private.has_role(org_id,array['owner','admin']::public.member_role[])) with check(app_private.has_role(org_id,array['owner','admin']::public.member_role[]));
create policy rates_delete on public.rate_rules for delete to authenticated using(app_private.has_role(org_id,array['owner','admin']::public.member_role[]));
create policy events_read on public.audit_events for select to authenticated using(app_private.has_role(org_id,array['owner','admin','analyst','viewer']::public.member_role[]));

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
 values('elarventis-documents','elarventis-documents',false,10485760,array['application/pdf','text/csv','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']);
create policy elarventis_storage_read on storage.objects for select to authenticated using (
 bucket_id='elarventis-documents' and exists(select 1 from public.documents d where d.storage_path=name
 and ((d.state='stored' and app_private.has_role(d.org_id,array['owner','admin','analyst','viewer']::public.member_role[]))
 or (d.state='uploading' and d.uploader_id=auth.uid() and
 (app_private.has_role(d.org_id,array['owner','admin']::public.member_role[]) or
 (d.kind like 'invoice_%' and app_private.has_role(d.org_id,array['analyst']::public.member_role[]))))))
);
create policy elarventis_storage_insert on storage.objects for insert to authenticated with check (
 bucket_id='elarventis-documents' and exists(select 1 from public.documents d where d.storage_path=name and d.state='uploading'
 and d.uploader_id=auth.uid() and
 (app_private.has_role(d.org_id,array['owner','admin']::public.member_role[]) or
 (d.kind like 'invoice_%' and app_private.has_role(d.org_id,array['analyst']::public.member_role[]))))
);
-- A failed or incomplete upload can be removed by its uploader, never a verified object.
create policy elarventis_storage_retry_delete on storage.objects for delete to authenticated using (
 bucket_id='elarventis-documents' and exists(select 1 from public.documents d where d.storage_path=name
 and d.state in ('uploading','failed') and d.uploader_id=auth.uid()
 and app_private.has_role(d.org_id,array['owner','admin','analyst']::public.member_role[]))
);
grant select on public.organizations,public.profiles,public.memberships,public.invitations,public.carriers,public.documents,public.document_extractions,public.contracts,public.contract_versions,public.rate_rules,public.audit_events to authenticated;
grant insert,update on public.profiles,public.carriers,public.contracts,public.contract_versions,public.rate_rules to authenticated;
grant delete on public.rate_rules to authenticated;
grant insert on public.documents to authenticated;
grant insert on public.document_extractions to authenticated;
-- The browser cannot finalize documents. Only the narrowly scoped server verifier
-- downloads the stored bytes and invokes this service-role RPC with their digest.
create function public.verify_document(p_org uuid,p_document uuid,p_actor uuid,p_sha256 text,p_size integer) returns void
language plpgsql security definer set search_path = '' as $$
begin
 if not exists(select 1 from public.memberships m join public.organizations o on o.id=m.org_id
  where m.org_id=p_org and m.user_id=p_actor and m.status='active' and o.status='active'
  and (m.role in ('owner','admin') or (m.role='analyst' and exists
   (select 1 from public.documents d where d.org_id=p_org and d.id=p_document and d.kind like 'invoice_%')))) then raise exception 'Forbidden'; end if;
 update public.documents set state='stored',verified_at=now()
 where org_id=p_org and id=p_document and uploader_id=p_actor and state='uploading'
  and sha256=p_sha256 and size_bytes=p_size and
  exists(select 1 from storage.objects o where o.bucket_id='elarventis-documents' and o.name=public.documents.storage_path);
 if not found then raise exception 'Document unavailable or digest mismatch'; end if;
 insert into public.audit_events(org_id,actor_id,action,entity_type,entity_id,details)
 values(p_org,p_actor,'document_verified','document',p_document,jsonb_build_object('sha256',p_sha256,'size',p_size));
end; $$;
revoke all on function public.verify_document(uuid,uuid,uuid,text,integer) from public,anon,authenticated;
grant execute on function public.verify_document(uuid,uuid,uuid,text,integer) to service_role;

create function app_private.guard_document() returns trigger language plpgsql set search_path = '' as $$
begin
 if old.state in ('stored','archived') and (to_jsonb(new)-'state') <> (to_jsonb(old)-'state') then raise exception 'Verified document is immutable'; end if;
 if old.state='stored' and new.state not in ('stored','archived') then raise exception 'Verified document cannot reopen'; end if;
 if old.state='archived' and new.state<>'archived' then raise exception 'Archived document cannot reopen'; end if;
 return new;
end; $$;
create trigger guard_document before update on public.documents for each row execute function app_private.guard_document();

create function public.fail_document(p_org uuid,p_document uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
 if not app_private.has_role(p_org,array['owner','admin','analyst']::public.member_role[]) then raise exception 'Forbidden'; end if;
 update public.documents set state='failed' where org_id=p_org and id=p_document
  and uploader_id=auth.uid() and state='uploading' and
  (kind like 'invoice_%' or app_private.has_role(p_org,array['owner','admin']::public.member_role[]));
end; $$;
revoke all on function public.fail_document(uuid,uuid) from public,anon;
grant execute on function public.fail_document(uuid,uuid) to authenticated;

create function public.retry_document(p_org uuid,p_document uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
 if not app_private.has_role(p_org,array['owner','admin','analyst']::public.member_role[]) then raise exception 'Forbidden'; end if;
 update public.documents set state='uploading' where org_id=p_org and id=p_document
  and uploader_id=auth.uid() and state='failed' and
  (kind like 'invoice_%' or app_private.has_role(p_org,array['owner','admin']::public.member_role[]));
 if not found then raise exception 'Document unavailable'; end if;
end; $$;
revoke all on function public.retry_document(uuid,uuid) from public,anon;
grant execute on function public.retry_document(uuid,uuid) to authenticated;

create function public.cleanup_failed_document(p_org uuid,p_document uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare v public.documents%rowtype;
begin
 if not app_private.has_role(p_org,array['owner','admin']::public.member_role[]) then raise exception 'Forbidden'; end if;
 select * into v from public.documents where org_id=p_org and id=p_document for update;
 if not found or v.state<>'failed' then raise exception 'Only failed documents can be cleaned'; end if;
 if exists(select 1 from storage.objects where bucket_id='elarventis-documents' and name=v.storage_path) then raise exception 'Storage object still exists'; end if;
 delete from public.documents where org_id=p_org and id=p_document;
 insert into public.audit_events(org_id,actor_id,action,entity_type,entity_id,details)
 values(p_org,auth.uid(),'failed_document_cleaned','document',p_document,jsonb_build_object('sha256',v.sha256));
end; $$;
revoke all on function public.cleanup_failed_document(uuid,uuid) from public,anon;
grant execute on function public.cleanup_failed_document(uuid,uuid) to authenticated;

create function public.supersede_version(p_org uuid,p_version uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
 if not app_private.has_role(p_org,array['owner','admin']::public.member_role[]) then raise exception 'Forbidden'; end if;
 update public.contract_versions set state='superseded' where org_id=p_org and id=p_version and state='approved';
 if not found then raise exception 'Approved version not found'; end if;
 insert into public.audit_events(org_id,actor_id,action,entity_type,entity_id)
 values(p_org,auth.uid(),'supersede','contract_version',p_version);
end; $$;
revoke all on function public.supersede_version(uuid,uuid) from public,anon;
grant execute on function public.supersede_version(uuid,uuid) to authenticated;
create function public.save_rate_draft(p_org uuid,p_version uuid,p_document uuid,p_rows jsonb) returns integer
language plpgsql security definer set search_path = '' as $$
declare v public.contract_versions%rowtype; r jsonb; n integer := 0;
begin
 if not app_private.has_role(p_org,array['owner','admin']::public.member_role[]) then raise exception 'Forbidden'; end if;
 select * into v from public.contract_versions where org_id=p_org and id=p_version for update;
 if not found or v.state not in ('draft','pending_review') then raise exception 'Invalid version'; end if;
 if not exists(select 1 from public.documents where org_id=p_org and id=p_document and kind in ('rate_csv','rate_xlsx') and state='stored') then raise exception 'Invalid document'; end if;
 if jsonb_typeof(p_rows)<>'array' or jsonb_array_length(p_rows) not between 1 and 1000 then raise exception 'Invalid rate rows'; end if;
 delete from public.rate_rules where org_id=p_org and contract_version_id=p_version;
 for r in select value from jsonb_array_elements(p_rows) loop
  if r->>'service_code' is null or r->>'zone' is null or r->>'vat_basis' is null then raise exception 'Missing rate field'; end if;
  insert into public.rate_rules(org_id,contract_version_id,rule_type,service_code,zone,min_weight_g,max_weight_g,weight_basis,price_minor,vat_basis,source_document_id,source_row)
  values(p_org,p_version,'weight_band',r->>'service_code',r->>'zone',(r->>'min_weight_g')::integer,(r->>'max_weight_g')::integer,'actual',(r->>'price_minor')::integer,(r->>'vat_basis'),p_document,(r->>'source_row')::integer);
  n := n+1;
 end loop;
 insert into public.audit_events(org_id,actor_id,action,entity_type,entity_id) values(p_org,auth.uid(),'rate_draft_saved','contract_version',p_version);
 return n;
end; $$;
revoke all on function public.save_rate_draft(uuid,uuid,uuid,jsonb) from public,anon;
grant execute on function public.save_rate_draft(uuid,uuid,uuid,jsonb) to authenticated;

-- Phases 7-9: all cross-entity links carry org_id.
create table public.invoices (
 id uuid primary key default gen_random_uuid(), org_id uuid not null references public.organizations(id), carrier_id uuid not null,
 document_id uuid not null, invoice_number text not null check(length(invoice_number) between 1 and 100),
 invoice_date date not null, currency text not null default 'EUR' check(currency='EUR'),
 total_minor bigint not null check(total_minor>=0), vat_basis text check(vat_basis in ('including_vat','excluding_vat','mixed')),
 extraction_state text not null default 'pending' check(extraction_state in ('pending','review','approved','error')),
 audit_state text not null default 'pending' check(audit_state in ('pending','partial','completed','error')),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(org_id,id), unique(org_id,carrier_id,invoice_number), unique(org_id,document_id),
 foreign key(org_id,carrier_id) references public.carriers(org_id,id), foreign key(org_id,document_id) references public.documents(org_id,id)
);
create function app_private.guard_invoice_document() returns trigger language plpgsql set search_path = '' as $$
begin
 if not exists(select 1 from public.documents d where d.org_id=new.org_id and d.id=new.document_id
  and d.state='stored' and d.kind in ('invoice_pdf','invoice_csv','invoice_xlsx')) then raise exception 'Stored invoice document required'; end if;
 return new;
end; $$;
create trigger guard_invoice_document before insert or update on public.invoices for each row execute function app_private.guard_invoice_document();
create table public.shipments (
 id uuid primary key default gen_random_uuid(), org_id uuid not null, invoice_id uuid not null, shipment_ref text not null,
 service_date date, service_code text, weight_g integer check(weight_g>=0), zone text,
 unique(org_id,id), unique(org_id,invoice_id,id), unique(org_id,invoice_id,shipment_ref), foreign key(org_id,invoice_id) references public.invoices(org_id,id)
);
create table public.invoice_lines (
 id uuid primary key default gen_random_uuid(), org_id uuid not null, invoice_id uuid not null, shipment_id uuid,
 service_code text, shipment_ref text, service_date date, charge_type text not null, quantity integer check(quantity>0), unit text,
 weight_g integer check(weight_g>=0), zone text, billed_minor bigint not null check(billed_minor>=0),
 vat_basis text not null check(vat_basis in ('including_vat','excluding_vat')), source_row integer, source_page integer,
 confidence numeric(4,3) check(confidence between 0 and 1), review_state text not null default 'pending' check(review_state in ('pending','approved','rejected')),
 reviewed_by uuid references auth.users(id), reviewed_at timestamptz, created_at timestamptz not null default now(),
 unique(org_id,id), unique(org_id,invoice_id,id), unique(org_id,id,invoice_id), foreign key(org_id,invoice_id) references public.invoices(org_id,id),
 foreign key(org_id,invoice_id,shipment_id) references public.shipments(org_id,invoice_id,id)
);
create table public.invoice_imports (
 id uuid primary key default gen_random_uuid(), org_id uuid not null, document_id uuid not null,
 invoice_id uuid, parser_version text not null, column_map jsonb not null default '{}'::jsonb,
 state text not null default 'queued' check(state in ('queued','processing','review','failed')),
 error_code text, created_at timestamptz not null default now(), unique(org_id,id), unique(org_id,document_id,parser_version),
 foreign key(org_id,document_id) references public.documents(org_id,id), foreign key(org_id,invoice_id) references public.invoices(org_id,id)
);
create table public.jobs (
 id uuid primary key default gen_random_uuid(), org_id uuid not null references public.organizations(id), kind text not null check(kind in ('invoice_extract','audit','report')),
 dedupe_key text not null, payload jsonb not null default '{}'::jsonb,
 state text not null default 'queued' check(state in ('queued','leased','retry','done','dead')),
 attempts integer not null default 0 check(attempts between 0 and 3), lease_until timestamptz, leased_by uuid references auth.users(id), next_attempt_at timestamptz not null default now(),
 error_code text, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(org_id,id), unique(org_id,kind,dedupe_key)
);
create table public.audit_runs (
 id uuid primary key default gen_random_uuid(), org_id uuid not null, invoice_id uuid not null,
 engine_version text not null, input_snapshot jsonb not null, input_sha256 text not null check(input_sha256 ~ '^[0-9a-f]{64}$'),
 contract_version_ids uuid[] not null default '{}', finished_at timestamptz, error_code text,
 state text not null check(state in ('processing','partial','completed','error')),
 created_by uuid not null references auth.users(id), created_at timestamptz not null default now(), unique(org_id,id), unique(org_id,invoice_id,input_sha256), unique(org_id,id,invoice_id),
 foreign key(org_id,invoice_id) references public.invoices(org_id,id)
);
create table public.audit_results (
 id uuid primary key default gen_random_uuid(), org_id uuid not null, run_id uuid not null, invoice_id uuid not null, invoice_line_id uuid not null,
 contract_version_id uuid, rate_rule_id uuid, status text not null check(status in ('OK','DISCREPANCY_REVIEW','MISSING_DATA','UNSUPPORTED_RULE','PARSER_REVIEW','ERROR')),
 billed_minor bigint not null, expected_minor bigint, difference_minor bigint,
 calculation_trace jsonb not null, evidence_refs jsonb not null, created_at timestamptz not null default now(),
 unique(org_id,id), unique(org_id,run_id,invoice_line_id), foreign key(org_id,run_id,invoice_id) references public.audit_runs(org_id,id,invoice_id),
 foreign key(org_id,invoice_line_id,invoice_id) references public.invoice_lines(org_id,id,invoice_id),
 foreign key(org_id,contract_version_id) references public.contract_versions(org_id,id),
 foreign key(org_id,contract_version_id,rate_rule_id) references public.rate_rules(org_id,contract_version_id,id)
);
create table public.finding_decisions (
 id uuid primary key default gen_random_uuid(), org_id uuid not null, result_id uuid not null,
 decision text not null check(decision in ('accepted','rejected','needs_review')),
 comment text check(length(comment)<=2000), actor_id uuid not null references auth.users(id), created_at timestamptz not null default now(),
 unique(org_id,id), foreign key(org_id,result_id) references public.audit_results(org_id,id)
);
create table public.reports (
 id uuid primary key default gen_random_uuid(), org_id uuid not null, run_id uuid not null, document_id uuid not null,
 format text not null check(format in ('pdf','csv','xlsx')), report_version text not null, created_by uuid not null references auth.users(id),
 created_at timestamptz not null default now(), unique(org_id,id), foreign key(org_id,run_id) references public.audit_runs(org_id,id),
 foreign key(org_id,document_id) references public.documents(org_id,id)
);
do $$ declare t text; begin
 foreach t in array array['invoices','shipments','invoice_lines','invoice_imports','jobs','audit_runs','audit_results','finding_decisions','reports'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('create policy tenant_read on public.%I for select to authenticated using (app_private.has_role(org_id,array[''owner'',''admin'',''analyst'',''viewer'']::public.member_role[]))',t);
  execute format('grant select on public.%I to authenticated',t);
 end loop;
end $$;
create policy invoices_insert on public.invoices for insert to authenticated with check(extraction_state='pending' and audit_state='pending' and app_private.has_role(org_id,array['owner','admin','analyst']::public.member_role[]));
create policy lines_insert on public.invoice_lines for insert to authenticated with check(review_state='pending' and reviewed_by is null and reviewed_at is null and app_private.has_role(org_id,array['owner','admin','analyst']::public.member_role[]));
create policy imports_insert on public.invoice_imports for insert to authenticated with check(app_private.has_role(org_id,array['owner','admin','analyst']::public.member_role[]));
create policy decisions_insert on public.finding_decisions for insert to authenticated with check(actor_id=auth.uid() and app_private.has_role(org_id,array['owner','admin','analyst']::public.member_role[])
 and exists(select 1 from public.audit_results r where r.org_id=public.finding_decisions.org_id and r.id=public.finding_decisions.result_id and r.status='DISCREPANCY_REVIEW'));
grant insert on public.invoices,public.invoice_lines to authenticated;
grant insert on public.invoice_imports,public.finding_decisions to authenticated;

create function public.review_invoice_line(p_org uuid,p_line uuid,p_shipment text,p_service text,p_date date,p_charge text,p_weight integer,p_zone text,p_amount bigint,p_vat text) returns void
language plpgsql security definer set search_path = '' as $$
declare v_old public.invoice_lines%rowtype;
begin
 if not app_private.has_role(p_org,array['owner','admin','analyst']::public.member_role[]) then raise exception 'Forbidden'; end if;
 select * into v_old from public.invoice_lines where org_id=p_org and id=p_line for update;
 if not found or p_shipment is null or length(trim(p_shipment)) not between 1 and 120 or
 p_service is null or length(trim(p_service)) not between 1 and 80 or p_date is null or
 p_charge is null or p_charge not in ('base_freight','fuel','discount','minimum','other') or
 p_vat is null or p_vat not in ('including_vat','excluding_vat') or
 p_amount is null or p_amount<0 or p_amount>2147483647
 or (p_weight is not null and (p_weight<0 or p_weight>100000000)) then raise exception 'Invalid line'; end if;
 update public.invoice_lines set shipment_ref=trim(p_shipment),service_code=trim(p_service),service_date=p_date,charge_type=p_charge,
 weight_g=p_weight,zone=nullif(trim(p_zone),''),billed_minor=p_amount,vat_basis=p_vat,
 review_state='approved',reviewed_by=auth.uid(),reviewed_at=now() where org_id=p_org and id=p_line;
 insert into public.audit_events(org_id,actor_id,action,entity_type,entity_id,details)
 values(p_org,auth.uid(),'invoice_line_reviewed','invoice_line',p_line,
 jsonb_build_object('before',to_jsonb(v_old),'after',jsonb_build_object('shipment',p_shipment,'service',p_service,'date',p_date,'charge',p_charge,'weight',p_weight,'zone',p_zone,'amount',p_amount,'vat',p_vat)));
end; $$;
revoke all on function public.review_invoice_line(uuid,uuid,text,text,date,text,integer,text,bigint,text) from public,anon;
grant execute on function public.review_invoice_line(uuid,uuid,text,text,date,text,integer,text,bigint,text) to authenticated;

create function public.enqueue_invoice_extract(p_org uuid,p_document uuid,p_carrier uuid,p_columns jsonb default '{}'::jsonb) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
 if not app_private.has_role(p_org,array['owner','admin','analyst']::public.member_role[]) then raise exception 'Forbidden'; end if;
 if not exists(select 1 from public.documents where org_id=p_org and id=p_document and state='stored' and kind in ('invoice_pdf','invoice_csv','invoice_xlsx')) then raise exception 'Document unavailable'; end if;
 if not exists(select 1 from public.carriers where org_id=p_org and id=p_carrier and archived_at is null) then raise exception 'Carrier unavailable'; end if;
 if jsonb_typeof(p_columns)<>'object' or length(p_columns::text)>2048 then raise exception 'Invalid column map'; end if;
 if (select count(*) from public.jobs where org_id=p_org and state in ('queued','leased','retry')) >= 100 then raise exception 'Queue limit'; end if;
 insert into public.jobs(org_id,kind,dedupe_key,payload) values(p_org,'invoice_extract',p_document::text,jsonb_build_object('document_id',p_document,'carrier_id',p_carrier,'columns',p_columns))
 on conflict(org_id,kind,dedupe_key) do update set updated_at=public.jobs.updated_at returning id into v_id;
 return v_id;
end; $$;
revoke all on function public.enqueue_invoice_extract(uuid,uuid,uuid,jsonb) from public,anon;
grant execute on function public.enqueue_invoice_extract(uuid,uuid,uuid,jsonb) to authenticated;

-- Claim/finish are server-only. A lease token fences delayed or duplicated workers.
alter table public.jobs add column lease_token uuid;
create function public.claim_invoice_job(p_org uuid,p_actor uuid) returns public.jobs
language plpgsql security definer set search_path = '' as $$
declare v_job public.jobs%rowtype;
begin
 if not exists(select 1 from public.memberships m where m.org_id=p_org and m.user_id=p_actor
  and m.status='active' and m.role in ('owner','admin','analyst')) then raise exception 'Forbidden'; end if;
 update public.jobs set state='dead',error_code='LEASE_TIMEOUT',lease_until=null,lease_token=null,leased_by=null,updated_at=now()
 where org_id=p_org and kind='invoice_extract' and state='leased' and lease_until<now() and attempts>=3;
 select * into v_job from public.jobs where org_id=p_org and kind='invoice_extract'
 and ((state in ('queued','retry') and next_attempt_at<=now()) or (state='leased' and lease_until<now())) and attempts<3
 order by created_at limit 1 for update skip locked;
 if not found then return null; end if;
 update public.jobs set state='leased',attempts=attempts+1,lease_until=now()+interval '2 minutes',
  lease_token=gen_random_uuid(),leased_by=p_actor,updated_at=now()
 where id=v_job.id returning * into v_job;
 return v_job;
end; $$;
revoke all on function public.claim_invoice_job(uuid,uuid) from public,anon,authenticated;
grant execute on function public.claim_invoice_job(uuid,uuid) to service_role;

create function public.finish_invoice_job(p_org uuid,p_job uuid,p_token uuid,p_actor uuid,p_ok boolean,p_error text default null) returns void
language plpgsql security definer set search_path = '' as $$
begin
 if not exists(select 1 from public.memberships m where m.org_id=p_org and m.user_id=p_actor
  and m.status='active' and m.role in ('owner','admin','analyst')) then raise exception 'Forbidden'; end if;
 update public.jobs set state=case when p_ok then 'done' when attempts>=3 then 'dead' else 'retry' end,
  error_code=case when p_ok then null else left(coalesce(p_error,'PROCESSING_ERROR'),80) end,
  next_attempt_at=now()+power(2,attempts)::double precision * interval '1 minute',
  lease_until=null,lease_token=null,leased_by=null,updated_at=now()
 where org_id=p_org and id=p_job and state='leased' and lease_token=p_token and leased_by=p_actor and lease_until>now();
 if not found then raise exception 'Lease unavailable'; end if;
end; $$;
revoke all on function public.finish_invoice_job(uuid,uuid,uuid,uuid,boolean,text) from public,anon,authenticated;
grant execute on function public.finish_invoice_job(uuid,uuid,uuid,uuid,boolean,text) to service_role;

-- Atomic publish: callers cannot insert rows or mark runs completed separately.
create function public.commit_audit_run(p_org uuid,p_invoice uuid,p_actor uuid,p_engine text,p_input text,p_hash text,p_results jsonb)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_run uuid; v_item jsonb; v_count integer; v_versions uuid[];
begin
 if not exists(select 1 from public.memberships m join public.organizations o on o.id=m.org_id
  where m.org_id=p_org and m.user_id=p_actor and m.status='active' and o.status='active' and m.role in ('owner','admin','analyst'))
 then raise exception 'Forbidden'; end if;
 if p_engine <> '1.0.0' or p_hash !~ '^[0-9a-f]{64}$' or
  encode(digest(convert_to(p_input,'UTF8'),'sha256'),'hex') <> p_hash or
  jsonb_typeof(p_results)<>'array' or jsonb_array_length(p_results) not between 1 and 1000
 then raise exception 'Invalid audit payload'; end if;
 perform 1 from public.invoices where org_id=p_org and id=p_invoice for update;
 if not found then raise exception 'Invoice unavailable'; end if;
 select count(*) into v_count from public.invoice_lines where org_id=p_org and invoice_id=p_invoice;
 if v_count<>jsonb_array_length(p_results) then raise exception 'Incomplete audit'; end if;
 select array_agg(distinct (r->>'contractVersionId')::uuid) into v_versions
 from jsonb_array_elements(p_results) r where r->>'contractVersionId' is not null;
 if exists(select 1 from unnest(coalesce(v_versions,'{}'::uuid[])) id
  where not exists(select 1 from public.contract_versions c where c.org_id=p_org and c.id=id and c.state='approved'))
 then raise exception 'Unapproved contract'; end if;
 insert into public.audit_runs(org_id,invoice_id,created_by,engine_version,input_snapshot,input_sha256,contract_version_ids,state,finished_at)
 values(p_org,p_invoice,p_actor,p_engine,p_input::jsonb,p_hash,coalesce(v_versions,'{}'::uuid[]),'completed',now())
 on conflict(org_id,invoice_id,input_sha256) do nothing returning id into v_run;
 if v_run is null then
  select id into v_run from public.audit_runs where org_id=p_org and invoice_id=p_invoice and input_sha256=p_hash;
  return v_run;
 end if;
 for v_item in select value from jsonb_array_elements(p_results) loop
  if not exists(select 1 from public.invoice_lines l where l.org_id=p_org and l.invoice_id=p_invoice
   and l.id=(v_item->>'lineId')::uuid and l.billed_minor=(v_item->>'billedMinor')::bigint)
   or (v_item->>'status') not in ('OK','DISCREPANCY_REVIEW','MISSING_DATA','UNSUPPORTED_RULE','PARSER_REVIEW','ERROR')
  then raise exception 'Invalid audit line'; end if;
  insert into public.audit_results(org_id,run_id,invoice_id,invoice_line_id,contract_version_id,rate_rule_id,
   status,billed_minor,expected_minor,difference_minor,calculation_trace,evidence_refs)
  values(p_org,v_run,p_invoice,(v_item->>'lineId')::uuid,(v_item->>'contractVersionId')::uuid,(v_item->>'ruleId')::uuid,
   v_item->>'status',(v_item->>'billedMinor')::bigint,(v_item->>'expectedMinor')::bigint,(v_item->>'differenceMinor')::bigint,
   jsonb_build_object('formula',v_item->>'formula','reason',v_item->>'reason','engineVersion',p_engine),coalesce(v_item->'sources','[]'::jsonb));
 end loop;
 insert into public.audit_events(org_id,actor_id,action,entity_type,entity_id,details)
 values(p_org,p_actor,'audit_committed','audit_run',v_run,jsonb_build_object('input_sha256',p_hash,'engine',p_engine));
 return v_run;
end; $$;
revoke all on function public.commit_audit_run(uuid,uuid,uuid,text,text,text,jsonb) from public,anon,authenticated;
grant execute on function public.commit_audit_run(uuid,uuid,uuid,text,text,text,jsonb) to service_role;

create function app_private.guard_audit_history() returns trigger language plpgsql set search_path = '' as $$
begin raise exception 'Published audit history is immutable'; end; $$;
create trigger guard_audit_runs before update or delete on public.audit_runs for each row execute function app_private.guard_audit_history();
create trigger guard_audit_results before update or delete on public.audit_results for each row execute function app_private.guard_audit_history();
create index jobs_ready on public.jobs(org_id,next_attempt_at,created_at) where state in ('queued','retry');
create index jobs_expired on public.jobs(org_id,lease_until) where state='leased';
