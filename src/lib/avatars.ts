// Avatares de perfil. Por ahora los fantasmitas de colores (public/bro*.png).
// Angel enviará avatares propios luego → se agregan aquí (id + src) y aparecen solos.
export type Avatar = { id: string; src: string }

export const AVATARS: Avatar[] = [
  { id: 'brogray', src: '/brogray.png' },
  { id: 'broblack', src: '/broblack.png' },
  { id: 'brored', src: '/brored.png' },
  { id: 'broorange', src: '/broorange.png' },
  { id: 'brogreen', src: '/brogreen.png' },
  { id: 'brocyan', src: '/brocyan.png' },
  { id: 'broceleste', src: '/broceleste.png' },
  { id: 'bropurple', src: '/bropurple.png' },
  { id: 'bropurple2', src: '/bropurple2.png' },
  { id: 'bropink', src: '/bropink.png' },
]

export function avatarSrc(id: string): string {
  return (AVATARS.find((a) => a.id === id) ?? AVATARS[0]).src
}
