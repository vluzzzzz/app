# Activar el login con Firebase (Google + Email) — guía

El login usa **Firebase Auth**. Se **activa solo** cuando pongas las variables
`VITE_FIREBASE_*` (mientras tanto, la app corre local sin pedir cuenta).
La **IA (Brody) sigue en Supabase** — eso no cambia.

## 1) Crear el proyecto en Firebase
1. Entra a **console.firebase.google.com** → **Crear un proyecto**.
2. Nombre: `Brody`. (Puedes desactivar Google Analytics, no hace falta.)
3. Espera a que se cree y entra al proyecto.

## 2) Registrar la app web (para obtener las claves)
1. En el inicio del proyecto, toca el ícono **`</>`** (Web).
2. Apodo de la app: `Brody`. **No** marques "Firebase Hosting" por ahora.
3. Registrar. Te mostrará un bloque `firebaseConfig` con estos valores:
   ```js
   const firebaseConfig = {
     apiKey: "...",
     authDomain: "brody-xxxx.firebaseapp.com",
     projectId: "brody-xxxx",
     storageBucket: "brody-xxxx.appspot.com",
     messagingSenderId: "000000000000",
     appId: "1:000000000000:web:xxxxxxxx",
   }
   ```
   👉 **Copia esos 6 valores** (los pones en Vercel en el paso 5). Son públicos, no son secretos.

## 3) Activar los métodos de login
En **Authentication → Get started → Sign-in method**, activa:
- **Correo electrónico/contraseña** → Habilitar → Guardar.
- **Google** → Habilitar → elige tu correo de soporte → Guardar.

## 4) Dominios autorizados
En **Authentication → Settings → Authorized domains**, agrega:
- Tu URL de Vercel (ej: `livid-psi-83.vercel.app`, **sin** `https://`).
- `localhost` (ya suele venir) para probar en tu compu.
- (Cuando compres tu dominio en Hostinger, agregas `brody.cl` aquí también.)

## 5) Variables en Vercel
En **Vercel → tu proyecto → Settings → Environment Variables**, agrega las 6
(ver `.env.example`) y haz **Redeploy**:
```
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=brody-xxxx.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=brody-xxxx
VITE_FIREBASE_STORAGE_BUCKET=brody-xxxx.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=000000000000
VITE_FIREBASE_APP_ID=1:000000000000:web:xxxxxxxx
```
(Para probar local: ponlas en un archivo `.env` — ver `.env.example`.)

## 6) Listo
Con las variables puestas y el redeploy, la app pedirá **iniciar sesión** (Google o correo).
En la pantalla de Google ahora dirá **`brody-xxxx.firebaseapp.com`** (mucho mejor que la
URL fea de antes). Cuando compres tu dominio propio, se puede dejar `brody.cl` — gratis
con Firebase Hosting.

---

## Próximo: sincronización en la nube (Fase B)
Cuando el login funcione, activamos el **sync** de tus ramos/notas con **Firestore**
(base de datos de Firebase, también gratis). Lo dejo listo en el código en esa fase.
