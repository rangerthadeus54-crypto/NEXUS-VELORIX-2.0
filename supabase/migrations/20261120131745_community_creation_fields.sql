alter table public.communities
    add column logo_url text,
    add column banner_url text,
    add constraint communities_logo_url_https_check
        check (
            logo_url is null or (
                char_length(logo_url) <= 2048
                and logo_url ~* '^https://[^/?#@[:space:]]+([/?#][^[:space:]]*)?$'
            )
        ),
    add constraint communities_banner_url_https_check
        check (
            banner_url is null or (
                char_length(banner_url) <= 2048
                and banner_url ~* '^https://[^/?#@[:space:]]+([/?#][^[:space:]]*)?$'
            )
        );

create or replace view public.community_directory as
select
    communities.id,
    communities.name,
    communities.game_id,
    communities.region,
    count(community_members.user_id)::integer as member_count,
    communities.description,
    communities.logo_url,
    communities.banner_url
from public.communities
left join public.community_members on community_members.community_id = communities.id
group by communities.id;
