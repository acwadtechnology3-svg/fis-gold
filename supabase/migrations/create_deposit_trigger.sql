-- Function to handle deposit approval
-- This updates the user's wallet balance when admin changes deposit status to 'approved'

create or replace function handle_deposit_approval()
returns trigger as $$
declare
  v_new_balance decimal(18, 4);
begin
  -- Only proceed if status changed to 'approved' and it wasn't approved before
  if NEW.status = 'approved' and OLD.status != 'approved' then
    
    -- 1. Update Wallet Balance and get new balance
    update wallet_accounts
    set available_balance = available_balance + NEW.amount,
        updated_at = now()
    where user_id = NEW.user_id
    returning available_balance into v_new_balance;

    -- If wallet doesn't exist, create it (safety mechanism)
    if not found then
      insert into wallet_accounts (user_id, available_balance)
      values (NEW.user_id, NEW.amount)
      returning available_balance into v_new_balance;
    end if;

    -- 2. Create Ledger Entry
    insert into wallet_ledger (
      user_id,
      event_type,
      direction,
      amount,
      currency,
      balance_type,
      balance_after,
      related_table,
      related_id,
      description
    )
    values (
      NEW.user_id,
      'deposit_credit'::ledger_event_type, -- Cast to enum
      'credit'::ledger_direction, -- Cast to enum
      NEW.amount,
      'EGP',
      'available',
      v_new_balance,
      'deposits',
      NEW.id,
      'Deposit Approved via Admin Dashboard'
    );
      
  end if;
  return NEW;
end;
$$ language plpgsql security definer;

-- Drop existing trigger if any (to avoid duplicates or errors)
drop trigger if exists on_deposit_approved on deposits;

create trigger on_deposit_approved
  after update on deposits
  for each row
  execute function handle_deposit_approval();
