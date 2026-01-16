-- Add image_url column to banners table if it doesn't exist
do $$
begin
    if not exists (select 1 from information_schema.columns where table_name = 'banners' and column_name = 'image_url') then
        alter table public.banners add column image_url text;
    end if;
end $$;
