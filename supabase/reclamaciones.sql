-- ============================================================
-- Rental Smart · Libro de Reclamaciones
-- Crea la tabla, el correlativo automático (000001-AAAA) y la seguridad.
-- Ejecutar en Supabase → SQL Editor → New query → pegar → Run.
-- ============================================================

create sequence if not exists public.reclamo_seq;

create table if not exists public.reclamaciones (
  id                  uuid primary key default gen_random_uuid(),
  created_at          timestamptz not null default now(),
  codigo              text unique,
  -- consumidor
  nombre              text not null,
  documento           text not null,
  telefono            text not null,
  email               text not null,
  es_menor            boolean default false,
  apoderado           text,
  -- bien contratado
  tipo_bien           text,            -- 'Producto' | 'Servicio'
  monto               numeric,
  descripcion_bien    text not null,
  -- reclamación
  tipo_reclamo        text not null,   -- 'Reclamo' | 'Queja'
  detalle             text not null,
  pedido              text not null,
  acciones_proveedor  text,            -- lo completa la empresa al responder
  -- consentimiento + estado
  acepta_privacidad   boolean default false,
  estado              text default 'pendiente'
);

create index if not exists reclamaciones_created_at_idx on public.reclamaciones (created_at desc);

-- Correlativo automático: 000001-2026, 000002-2026, ...
create or replace function public.set_reclamo_codigo()
returns trigger language plpgsql as $$
begin
  if new.codigo is null then
    new.codigo := lpad(nextval('public.reclamo_seq')::text, 6, '0')
                  || '-' || extract(year from now())::text;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_reclamo_codigo on public.reclamaciones;
create trigger trg_reclamo_codigo
  before insert on public.reclamaciones
  for each row execute function public.set_reclamo_codigo();

-- Seguridad: solo la función serverless (service_role) puede insertar/leer.
alter table public.reclamaciones enable row level security;
