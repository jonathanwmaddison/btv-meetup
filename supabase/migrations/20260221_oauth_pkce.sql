do $$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public' and table_name = 'oauth_codes'
  ) then
    alter table public.oauth_codes
      add column if not exists code_challenge text,
      add column if not exists code_challenge_method text,
      add column if not exists resource text;
  end if;
end $$;
