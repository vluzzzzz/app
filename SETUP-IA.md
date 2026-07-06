# Conectar el chat con IA (Supabase + Groq) — guía paso a paso

El chat ya está construido en la app. Para que responda, hay que enchufar un **proxy**
(una Edge Function de Supabase) que guarda la **API key de Groq** oculta. Es **gratis**.

## 1) Conseguir una API key de Groq (gratis)
1. Entra a **https://console.groq.com** y crea cuenta (gratis, sin tarjeta).
2. Ve a **API Keys → Create API Key**. Copia la key (empieza con `gsk_...`).

## 2) Crear el proyecto en Supabase (gratis)
1. Entra a **https://supabase.com** → crea cuenta y un **New project** (elige región cercana).
2. Anota el **Project Ref** (lo ves en la URL: `https://<REF>.supabase.co`).

## 3) Instalar la CLI de Supabase y desplegar la función
En una terminal, dentro de la carpeta del proyecto:

```bash
npm install -g supabase          # instala la CLI (una vez)
supabase login                   # abre el navegador para autenticar
supabase link --project-ref TU_REF

# Guarda tu key de Groq como secreto (NO se expone al frontend):
supabase secrets set GROQ_API_KEY=gsk_tu_key_aqui

# Despliega la función (ya está en supabase/functions/chat):
supabase functions deploy chat --no-verify-jwt
```

> `--no-verify-jwt` hace la función pública (el frontend la llama sin login). Suficiente
> para empezar.

La URL queda: `https://TU_REF.supabase.co/functions/v1/chat`

## 4) Conectar el frontend (Vercel)
En **Vercel → tu proyecto → Settings → Environment Variables**, agrega:

```
VITE_AI_ENDPOINT = https://TU_REF.supabase.co/functions/v1/chat
```

Luego **Redeploy** (Deployments → ⋯ → Redeploy) para que tome la variable.

## 5) Listo ✅
Abre la app → toca la barra **"Pregúntale a la IA…"** en el Inicio y prueba:
- *"Crea Cálculo con controles 20% y pruebas 80%"*
- *"Saqué 5,5 en el control 1 de Cálculo"*
- *"¿Qué necesito para pasar Cálculo?"*

## Notas
- Modelo por defecto: `llama-3.3-70b-versatile` (Groq, gratis). Se puede cambiar con el
  secreto `GROQ_MODEL`.
- Para probar en local: crea un archivo `.env` con `VITE_AI_ENDPOINT=...` (ver `.env.example`).
- Costo: Groq tier gratis (~14.400 mensajes/día) + Supabase free. $0 para uso normal.
