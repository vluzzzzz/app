# Activar el login (Supabase Auth: Google + Email) — guía

El login ya está en la app. Se **activa solo** cuando pongas las variables de Supabase
(mientras tanto, la app corre local sin pedir cuenta, para no romper producción).

## 1) Variables de entorno (Vercel)
En **Supabase → Project Settings → API** copia:
- **Project URL** → `VITE_SUPABASE_URL` (ej: `https://trtcqkyqmminnugouxxg.supabase.co`)
- **anon public key** → `VITE_SUPABASE_ANON_KEY` (empieza con `eyJ...`; es pública, va en el frontend)

En **Vercel → Settings → Environment Variables** agrégalas y haz **Redeploy**.
(Para probar local: ponlas en un archivo `.env` — ver `.env.example`.)

## 2) Email / contraseña
Ya viene activo en Supabase (**Authentication → Providers → Email**).
Tip: para probar sin confirmar correo, desactiva **"Confirm email"** en ese mismo lugar.

## 3) Google
1. **Supabase → Authentication → Providers → Google → Enable.** Copia el **Callback URL**
   que muestra (algo como `https://TU_REF.supabase.co/auth/v1/callback`).
2. **Google Cloud Console** (console.cloud.google.com):
   - Crea un proyecto → **APIs & Services → OAuth consent screen** (External; pon nombre
     de la app y tu correo).
   - **Credentials → Create credentials → OAuth client ID → Web application**.
   - En **Authorized redirect URIs** pega el Callback URL de Supabase.
   - En **Authorized JavaScript origins** pon tu URL de Vercel (y `http://localhost:5173`
     para probar).
   - Crea → copia **Client ID** y **Client Secret**.
3. Pega Client ID + Secret en **Supabase → Providers → Google → Save**.

## 4) URLs de redirección (Supabase)
En **Authentication → URL Configuration**:
- **Site URL** = tu URL de Vercel.
- **Redirect URLs**: agrega tu URL de Vercel y `http://localhost:5173`.

## 5) Listo
Con las env puestas y redeploy, la app pedirá **iniciar sesión** (Google o email).

---

## Próximo: sincronización en la nube (Fase B)
Cuando confirmes que el login funciona, activamos el **sync** de tus datos. Deja lista
esta tabla en **Supabase → SQL Editor**:

```sql
create table if not exists public.app_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{}',
  updated_at timestamptz not null default now()
);
alter table public.app_state enable row level security;
create policy "own state" on public.app_state
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
```
