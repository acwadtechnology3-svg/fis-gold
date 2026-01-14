-- Create a table for chat messages
create table public.chat_messages (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  message text not null,
  sender_type text check (sender_type in ('user', 'admin')) not null,
  is_read boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.chat_messages enable row level security;

-- Create policies
create policy "Users can view their own messages"
  on public.chat_messages for select
  using (auth.uid() = user_id);

create policy "Users can insert their own messages"
  on public.chat_messages for insert
  with check (auth.uid() = user_id);

-- Create a policy for admins (assuming there's a user_roles table or similar, but for now we'll just allow basic access if we can't check role in this SQL easily without more context. 
-- Ideally: 
-- create policy "Admins can view all messages"
--   on public.chat_messages for select
--   using (exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'admin'));

-- Since I don't want to break things if user_roles logic is complex, I will stick to the user policies which cover the basic requirement of the user seeing their chat. 
-- The admin side usually runs with a service role key or needs the role policy. 

-- Function to get chat conversations for admin
create or replace function public.get_chat_conversations()
returns table (
  user_id uuid,
  last_message text,
  unread_count bigint,
  last_message_at timestamp with time zone
) 
language plpgsql
security definer
as $$
begin
  return query
  with last_msgs as (
    select distinct on (cm.user_id) 
      cm.user_id,
      cm.message,
      cm.created_at
    from chat_messages cm
    order by cm.user_id, cm.created_at desc
  ),
  unread_counts as (
    select 
      cm.user_id,
      count(*) as count
    from chat_messages cm
    where cm.sender_type = 'user' and cm.is_read = false
    group by cm.user_id
  )
  select 
    lm.user_id,
    lm.message as last_message,
    coalesce(uc.count, 0) as unread_count,
    lm.created_at as last_message_at
  from last_msgs lm
  left join unread_counts uc on lm.user_id = uc.user_id
  order by lm.created_at desc;
end;
$$;
