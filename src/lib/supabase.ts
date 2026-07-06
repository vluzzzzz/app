import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

/** true si hay credenciales de Supabase → el login/auth está activo. */
export const supabaseReady = !!(url && anon)

/** Cliente de Supabase (null si aún no está configurado → la app corre local). */
export const supabase: SupabaseClient | null = supabaseReady
  ? createClient(url as string, anon as string)
  : null
