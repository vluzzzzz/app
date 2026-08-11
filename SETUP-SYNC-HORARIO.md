# Activar sync de Horario y Calendario en la nube

El **código ya está listo** (cliente + Edge Function `perfil` sincronizan `horario` y
`eventos` igual que ramos/notas/tareas). Solo faltan **2 pasos en Supabase** que hay
que hacer una sola vez.

## 1) Agregar las columnas a la tabla `perfiles`

En **Supabase → SQL Editor**, pega y ejecuta (es seguro: no borra nada, solo agrega
las columnas que falten):

```sql
alter table public.perfiles
  add column if not exists tasks   jsonb,
  add column if not exists horario jsonb,
  add column if not exists eventos jsonb;
```

## 2) Redesplegar la Edge Function `perfil`

La función que guarda los datos vive en Supabase y se despliega aparte del deploy de
Vercel. Desde la carpeta del proyecto:

```bash
supabase functions deploy perfil --no-verify-jwt
```

(Requiere tener el Supabase CLI y haber hecho `supabase login` + `supabase link`.)

## 3) Probar

1. Agrega una clase en el Horario y un evento en el Calendario.
2. Cierra sesión e inicia en otro dispositivo (o en una ventana de incógnito).
3. Deben aparecer el horario y el calendario sincronizados. ✅

> Si algo no baja, revisa en **Supabase → Table Editor → perfiles** que tu fila tenga
> datos en las columnas `horario` y `eventos`.
