/** Tipos de evento atendidos (multibox do perfil do artista). */
export const EVENT_TYPES = [
  'Aniversário',
  'Festa particular',
  'Casamento ou bodas',
  'Despedida de solteiro(a)',
  'Reunião',
  'Festa local',
  'Festival',
  'Feira',
  'Evento empresarial',
  'Evento escolar',
  'Outro',
]

const MUSICAL_STYLES = [
  'Cover',
  'Clássicos internacionais',
  'Pop',
  'Rock',
  'Jazz',
  'Música latina',
  'MPB',
  'Instrumental',
  'Indie',
  'Forró',
  'Sertanejo',
  'Anos 80',
  'Samba',
  'Pagode',
  'Outro',
]

const ACTING_STYLES = [
  'Comédia',
  'Drama',
  'Ação',
  'Musical',
  'Teatro de rua',
  'Improviso',
  'Teatro infantil',
  'Dublagem',
  'Outro',
]

const COMEDY_STYLES = [
  'Stand-up',
  'Improviso',
  'Esquetes',
  'Personagens',
  'Humor corporativo',
  'Humor limpo',
  'Roasts',
  'Outro',
]

const DANCE_STYLES = [
  'Samba',
  'Axé',
  'Funk',
  'Ballet',
  'Dança de salão',
  'Hip hop',
  'Dança do ventre',
  'Zouk',
  'Forró',
  'Outro',
]

const MAGIC_STYLES = [
  'Close-up',
  'Palco',
  'Ilusionismo',
  'Magia infantil',
  'Mentalismo',
  'Cardismo',
  'Outro',
]

function normalizeCategory(name: string | undefined): string {
  return (name ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
}

/**
 * Opções de estilo sugeridas por categoria do artista:
 * cantor/banda/músico/DJ recebem estilos musicais; ator, comediante, dançarino e mágico
 * recebem subcategorias próprias. Retorna null quando a categoria não tem lista
 * (ex.: "Outro") — o perfil então usa preenchimento livre.
 */
export function styleOptionsForCategory(categoryName: string | undefined): string[] | null {
  const table: Record<string, string[]> = {
    cantor: MUSICAL_STYLES,
    banda: MUSICAL_STYLES,
    dj: MUSICAL_STYLES,
    musico: MUSICAL_STYLES,
    ator: ACTING_STYLES,
    comediante: COMEDY_STYLES,
    'stand-up': COMEDY_STYLES,
    dancarino: DANCE_STYLES,
    magico: MAGIC_STYLES,
  }
  return table[normalizeCategory(categoryName)] ?? null
}
