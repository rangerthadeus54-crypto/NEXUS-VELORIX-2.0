create schema nexus_private;
revoke all on schema nexus_private from public, anon, authenticated;
grant usage on schema nexus_private to authenticated;

create table nexus_private.community_creation_requests (
    owner_id uuid not null references auth.users (id) on delete cascade,
    idempotency_key uuid not null,
    request_payload jsonb not null check (jsonb_typeof(request_payload) = 'object'),
    community_id uuid references public.communities (id) on delete cascade,
    created_at timestamptz not null default now(),
    primary key (owner_id, idempotency_key)
);

alter table nexus_private.community_creation_requests enable row level security;

create policy "users can access their own community creation requests"
    on nexus_private.community_creation_requests for all to authenticated
    using (owner_id = (select auth.uid()))
    with check (owner_id = (select auth.uid()));

revoke all on table nexus_private.community_creation_requests
    from public, anon, authenticated;
grant select, insert, update on table nexus_private.community_creation_requests
    to authenticated;

create function public.create_community_idempotently(
    p_idempotency_key uuid,
    p_name text,
    p_game_id uuid,
    p_region text,
    p_description text,
    p_logo_url text,
    p_banner_url text
)
returns table (community_id uuid)
language plpgsql
security invoker
set search_path = ''
as $function$
declare
    v_owner_id uuid := auth.uid();
    v_payload jsonb := pg_catalog.jsonb_build_object(
        'name', p_name,
        'game_id', p_game_id,
        'region', p_region,
        'description', p_description,
        'logo_url', p_logo_url,
        'banner_url', p_banner_url
    );
    v_request nexus_private.community_creation_requests%rowtype;
    v_community_id uuid;
begin
    if v_owner_id is null then
        raise exception using
            errcode = '42501',
            message = 'Authentication is required.';
    end if;

    insert into nexus_private.community_creation_requests (
        owner_id,
        idempotency_key,
        request_payload
    )
    values (v_owner_id, p_idempotency_key, v_payload)
    on conflict (owner_id, idempotency_key) do nothing;

    select *
    into v_request
    from nexus_private.community_creation_requests
    where owner_id = v_owner_id
      and idempotency_key = p_idempotency_key
    for update;

    if not found then
        raise exception using
            errcode = '42501',
            message = 'The community creation request is unavailable.';
    end if;

    if v_request.request_payload is distinct from v_payload then
        raise exception using
            errcode = 'P0001',
            message = 'COMMUNITY_IDEMPOTENCY_CONFLICT';
    end if;

    if v_request.community_id is null then
        insert into public.communities (
            owner_id,
            name,
            game_id,
            region,
            description,
            logo_url,
            banner_url
        )
        values (
            v_owner_id,
            p_name,
            p_game_id,
            p_region,
            p_description,
            p_logo_url,
            p_banner_url
        )
        returning id into v_community_id;

        update nexus_private.community_creation_requests
        set community_id = v_community_id
        where owner_id = v_owner_id
          and idempotency_key = p_idempotency_key;
    else
        v_community_id := v_request.community_id;
    end if;

    return query select v_community_id;
end;
$function$;

revoke all on function public.create_community_idempotently(
    uuid, text, uuid, text, text, text, text
) from public, anon, authenticated;
grant execute on function public.create_community_idempotently(
    uuid, text, uuid, text, text, text, text
) to authenticated;
