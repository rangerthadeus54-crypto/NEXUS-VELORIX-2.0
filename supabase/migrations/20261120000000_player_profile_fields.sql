alter table public.player_profiles
    add column username text,
    add column avatar_url text,
    add column bio text,
    add constraint player_profiles_username_check
        check (username is null or username ~ '^[a-z0-9_]{3,24}$'),
    add constraint player_profiles_avatar_url_check
        check (
            avatar_url is null
            or (
                char_length(avatar_url) <= 2048
                and avatar_url ~ '^https://[^[:space:]]+$'
            )
        ),
    add constraint player_profiles_bio_check
        check (bio is null or char_length(bio) <= 280);

create unique index player_profiles_username_unique
    on public.player_profiles (lower(username))
    where username is not null;

drop trigger auth_user_sync_player_profile on auth.users;

create trigger auth_user_sync_player_profile_insert
    after insert on auth.users
    for each row execute function public.sync_player_profile_from_auth();

create trigger auth_user_sync_player_profile_metadata_update
    after update of raw_user_meta_data on auth.users
    for each row execute function public.sync_player_profile_from_auth();

grant update (display_name, favorite_games, platform, country, username, avatar_url, bio)
    on public.player_profiles to authenticated;
