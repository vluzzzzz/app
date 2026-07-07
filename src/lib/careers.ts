// Carreras de Latinoamérica para el dropdown del perfil (SELECT, no texto libre).
// Se usa "Ing." abreviado. La búsqueda es flexible (ignora tildes, puntos y mayúsculas).
export const CAREERS: string[] = [
  // Ingenierías Civiles
  'Ing. Civil',
  'Ing. Civil Industrial',
  'Ing. Civil en Computación e Informática',
  'Ing. Civil Informática',
  'Ing. Civil Eléctrica',
  'Ing. Civil Mecánica',
  'Ing. Civil Química',
  'Ing. Civil Electrónica',
  'Ing. Civil en Obras Civiles',
  'Ing. Civil Ambiental',
  'Ing. Civil de Minas',
  'Ing. Civil Matemática',
  'Ing. Civil Biomédica',
  // Ingenierías (ejecución / comercial / otras)
  'Ing. Comercial',
  'Ing. Industrial',
  'Ing. en Informática',
  'Ing. de Software',
  'Ing. en Computación',
  'Ing. en Sistemas',
  'Ing. Mecánica',
  'Ing. Eléctrica',
  'Ing. Electrónica',
  'Ing. Mecatrónica',
  'Ing. Química',
  'Ing. Ambiental',
  'Ing. Biomédica',
  'Ing. en Telecomunicaciones',
  'Ing. de Minas',
  'Ing. en Construcción',
  'Ing. Agrónoma',
  'Ing. en Alimentos',
  'Ing. Comercial en Economía',
  // Tecnología / Datos
  'Ciencia de Datos',
  'Analista Programador',
  'Ciberseguridad',
  'Técnico en Informática',
  // Salud
  'Medicina',
  'Enfermería',
  'Odontología',
  'Kinesiología',
  'Nutrición y Dietética',
  'Obstetricia',
  'Tecnología Médica',
  'Fonoaudiología',
  'Terapia Ocupacional',
  'Química y Farmacia',
  'Medicina Veterinaria',
  'Psicología',
  // Ciencias
  'Biología',
  'Bioquímica',
  'Biotecnología',
  'Química',
  'Física',
  'Matemáticas',
  'Geología',
  'Astronomía',
  // Negocios / Economía
  'Administración de Empresas',
  'Contabilidad / Contador Auditor',
  'Economía',
  'Marketing',
  'Negocios Internacionales',
  'Recursos Humanos',
  'Finanzas',
  // Derecho / Sociales / Humanidades
  'Derecho',
  'Ciencia Política',
  'Relaciones Internacionales',
  'Sociología',
  'Trabajo Social',
  'Antropología',
  'Historia',
  'Filosofía',
  'Geografía',
  // Comunicación
  'Periodismo',
  'Comunicación Social',
  'Publicidad',
  'Relaciones Públicas',
  'Cine y Audiovisual',
  // Arte / Diseño / Arquitectura
  'Arquitectura',
  'Diseño Gráfico',
  'Diseño Industrial',
  'Diseño de Vestuario',
  'Artes Visuales',
  'Música',
  'Actuación / Teatro',
  // Educación
  'Educación Parvularia',
  'Pedagogía en Educación Básica',
  'Pedagogía en Educación Media',
  'Pedagogía en Educación Física',
  'Educación Diferencial',
  // Otros
  'Gastronomía',
  'Turismo',
  'Traducción / Idiomas',
  'Agronomía',
  // Comodines válidos
  'Estoy en el colegio',
  'Otra / Aún no sé',
]

/** Normaliza para búsqueda flexible: minúsculas, sin tildes, sin puntos, espacios simples. */
export function normalizeSearch(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\./g, '')
    .replace(/\s+/g, ' ')
    .trim()
}
