-- ============================================================
-- Rental Smart · Tabla de leads
-- Cómo usar: Supabase → tu proyecto → "SQL Editor" → "New query"
-- → pega TODO esto → "Run". Crea la tabla y deja la seguridad lista.
-- ============================================================

create table if not exists public.leads (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  nombre      text not null,
  email       text not null,
  whatsapp    text,
  zona        text,
  mensaje     text,
  origen      text default 'landing',
  user_agent  text
);

-- Índice para ordenar por fecha rápido
create index if not exists leads_created_at_idx on public.leads (created_at desc);

-- Seguridad a nivel de fila (RLS): NADIE puede leer/escribir desde el navegador.
-- Solo la clave secreta "service_role" (que vive en Netlify, nunca en la web)
-- puede insertar. Tú igual ves todo desde el panel de Supabase (Table Editor).
alter table public.leads enable row level security;

-- (No creamos políticas públicas a propósito: con RLS activo y sin políticas,
--  el acceso anónimo queda bloqueado. La función serverless usa service_role,
--  que ignora RLS por diseño.)
