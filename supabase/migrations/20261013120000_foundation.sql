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
 kind text not null check(kind in ('contract_pdf','rate_csv','rate_xlsx')),
 original_name text not null check(length(original_name) between 1 and 240),
 storage_path text not null unique, sha256 text not null check(sha256 ~ '^[0-9a-f]{64}$'),
 mime text not null check((kind='contract_pdf' and mime='application/pdf') or (kind='rate_csv' and mime='text/csv') or (kind='rate_xlsx' and mime='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')), size_bytes integer not null check(size_bytes between 1 and 10485760),
 uploader_id uuid not null references auth.users(id), state text not null default 'stored' check(state in ('stored','invalid','archived')),
 created_at timestamptz not null default now(), unique(org_id,id), unique(org_id,kind,sha256),
 check(storage_path = org_id::text || '/' || id::text)
);
create table public.document_extractions (
 id uuid primary key default gen_random_uuid(), org_id uuid not null, document_id uuid not null,
 parser_version text not null, model_version text, proposed_fields jsonb not null default '{}'::jsonb,
 confidence numeric(4,3), review_state public.review_state not null default 'draft',
 created_at timestamptz not null default now(), unique(org_id,id),
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
 created_at timestamptz not null default now(), unique(org_id,id),
 foreign key(org_id,contract_version_id) references public.contract_versions(org_id,id) on delete restrict,
 foreign key(org_id,source_document_id) references public.documents(org_id,id) on delete restrict,
 check((min_weight_g is null and max_weight_g is null) or (min_weight_g >= 0 and max_weight_g > min_weight_g)),
 check((rule_type <> 'weight_band') or (min_weight_g is not null and max_weight_g is not null and weight_basis is not null and zone is not null)),
 check((rule_type <> 'zone_price') or zone is not null)
);
create index rate_rules_version on public.rate_rules(org_id,contract_version_id);
alter table public.rate_rules add constraint rate_weight_band_no_overlap exclude using gist (org_id with =, contract_version_id with =, service_code with =, zone with =, int4range(min_weight_g,max_weight_g,'[)') with &&) where (rule_type='weight_band');
create table public.audit_events (
 id uuid primary key default gen_random_uuid(), org_id uuid not null references public.organizations(id),
 actor_id uuid references auth.users(id), action text not null, entity_type text not null,
 entity_id uuid not null, created_at timestamptz not null default now(), unique(org_id,id)
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
 if old.state in ('approved','superseded','archived') then raise exception 'Historical version is immutable'; end if;
 if new.org_id<>old.org_id or new.contract_id<>old.contract_id or new.version_number<>old.version_number then raise exception 'Invalid version update'; end if;
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
create policy documents_insert on public.documents for insert to authenticated with check(uploader_id=auth.uid() and app_private.has_role(org_id,array['owner','admin']::public.member_role[]));
create policy extractions_read on public.document_extractions for select to authenticated using(app_private.has_role(org_id,array['owner','admin','analyst','viewer']::public.member_role[]));
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
 bucket_id='elarventis-documents' and exists(select 1 from public.documents d where d.storage_path=name and d.state='stored'
 and app_private.has_role(d.org_id,array['owner','admin','analyst','viewer']::public.member_role[]))
);
create policy elarventis_storage_insert on storage.objects for insert to authenticated with check (
 bucket_id='elarventis-documents' and exists(select 1 from public.documents d where d.storage_path=name and d.state='stored'
 and d.uploader_id=auth.uid() and app_private.has_role(d.org_id,array['owner','admin']::public.member_role[]))
);
grant select on public.organizations,public.profiles,public.memberships,public.invitations,public.carriers,public.documents,public.document_extractions,public.contracts,public.contract_versions,public.rate_rules,public.audit_events to authenticated;
grant insert,update on public.profiles,public.carriers,public.contracts,public.contract_versions,public.rate_rules to authenticated;
grant delete on public.rate_rules to authenticated;
grant insert on public.documents to authenticated;
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
