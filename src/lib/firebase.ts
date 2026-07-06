import { initializeApp, type FirebaseApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider, type Auth } from 'firebase/auth'

// Config pública de Firebase (va en el frontend; no son secretos). Se toma de las
// variables de entorno VITE_FIREBASE_* (Vercel / archivo .env). Ver SETUP-FIREBASE.md.
const cfg = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string | undefined,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID as string | undefined,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET as string | undefined,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as
    | string
    | undefined,
  appId: import.meta.env.VITE_FIREBASE_APP_ID as string | undefined,
}

/** true si hay credenciales de Firebase → el login está activo. */
export const firebaseReady = !!(
  cfg.apiKey &&
  cfg.authDomain &&
  cfg.projectId &&
  cfg.appId
)

const app: FirebaseApp | null = firebaseReady
  ? initializeApp(cfg as Record<string, string>)
  : null

/** Instancia de Auth (null si Firebase aún no está configurado → la app corre local). */
export const auth: Auth | null = app ? getAuth(app) : null

/** Proveedor de Google para el login. */
export const googleProvider = new GoogleAuthProvider()
