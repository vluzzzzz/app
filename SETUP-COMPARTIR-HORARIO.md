# Compartir horario con un link — setup (2 pasos en Supabase)

El código ya está en la app: botón de compartir en el Horario → crea un link tipo
`https://www.brrody.app/?h=abc123...` que cualquiera abre SIN cuenta y ve el horario
en modo solo lectura (siempre actualizado). Solo faltan estos 2 pasos:

## 1) Columna en la tabla `perfiles`

En **Supabase → SQL Editor**:

```sql
alter table public.perfiles
  add column if not exists share_horario text;
```

## 2) Crear la Edge Function `horario-publico`

En **Supabase → Edge Functions → Deploy new function** (o "Create function"):

- Nombre: `horario-publico`
- Pega el contenido de `supabase/functions/horario-publico/index.ts` de este repo
- Deploy (igual que hiciste con `perfil`)

> Si usas el CLI: `supabase functions deploy horario-publico --no-verify-jwt`

## 3) Probar

1. En Brody → Horario → botón de compartir (arriba, junto al "+") → **Crear link**.
2. Copia el link y ábrelo en una ventana de incógnito: debe verse tu horario
   sin pedir login.
3. "Desactivar link" hace que el link deje de funcionar al instante.

**Qué ve la familia:** solo las clases (nombre del ramo, horario, sala, profesor y
color). Nada de notas ni promedios.
