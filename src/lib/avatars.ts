// Avatares de perfil (fotos de Brody, negro/plomo → van sobre un CÍRCULO BLANCO en la UI).
// Angel irá agregando más → solo sumar {id, src} aquí y aparecen solos.
export type Avatar = { id: string; src: string }

export const AVATARS: Avatar[] = [
  { id: 'study', src: '/perfilstudy.png' },
  { id: 'sleep', src: '/perfilsleep.png' },
  { id: 'angry', src: '/perfilangry.png' },
]

export function avatarSrc(id: string): string {
  return (AVATARS.find((a) => a.id === id) ?? AVATARS[0]).src
}
