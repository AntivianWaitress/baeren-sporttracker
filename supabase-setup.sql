-- ============================================================
-- Sport-Tracker: Supabase-Setup
-- Einmalig im Supabase SQL-Editor ausführen (Run).
-- Die letzte Abfrage zeigt den Token für den Geheimlink an.
-- ============================================================

create table if not exists tracker (
  id int primary key,
  secret text not null,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- RLS aktivieren, ohne Policies anzulegen:
-- Damit ist KEIN direkter Tabellenzugriff über die API möglich.
-- Zugriff geht ausschließlich über die beiden Funktionen unten,
-- die den Token prüfen.
alter table tracker enable row level security;

-- Eine Datenzeile mit zufälligem Token anlegen (36 Hex-Zeichen)
insert into tracker (id, secret, data)
values (1, encode(gen_random_bytes(18), 'hex'), '{}'::jsonb)
on conflict (id) do nothing;

-- Daten lesen (wirft Fehler bei falschem Token)
create or replace function get_tracker_data(p_secret text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  result jsonb;
begin
  select data into result
    from tracker
   where id = 1 and secret = p_secret;
  if result is null then
    raise exception 'invalid token';
  end if;
  return result;
end;
$$;

-- Daten schreiben (wirft Fehler bei falschem Token)
create or replace function set_tracker_data(p_secret text, p_data jsonb)
returns timestamptz
language plpgsql
security definer
set search_path = public
as $$
declare
  ts timestamptz;
begin
  update tracker
     set data = p_data,
         updated_at = now()
   where id = 1 and secret = p_secret
  returning updated_at into ts;
  if ts is null then
    raise exception 'invalid token';
  end if;
  return ts;
end;
$$;

-- Token anzeigen → kommt in den Geheimlink: https://…/sport-tracker/#k=TOKEN
select secret as token from tracker where id = 1;

-- ------------------------------------------------------------
-- Falls der Link jemals leakt: Token tauschen und neuen Link
-- verteilen (Zeile auskommentieren und ausführen):
--
-- update tracker
--    set secret = encode(gen_random_bytes(18), 'hex')
--  where id = 1
-- returning secret as neuer_token;
-- ------------------------------------------------------------
