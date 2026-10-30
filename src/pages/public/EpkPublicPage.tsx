import { useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  ArrowRight,
  Briefcase,
  ClipboardList,
  Clock,
  Disc3,
  Instagram,
  MapPin,
  Music,
  Play,
  Send,
  Speaker,
  Star,
  User,
} from 'lucide-react'
import { artistsApi, epkApi, socialLinksApi } from '@/services'
import { SoundCloudIcon, SpotifyIcon, YoutubeIcon } from '@/components/ui/streaming-icons'
import { BrandLogo } from '@/components/ui/brand-logo'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/badges'
import { formatMoney } from '@/lib/utils'
import { cn } from '@/lib/utils'

/**
 * EPK público do artista — landing page "one page" fora do sistema de login
 * (rota /epk/:slug). Visual fixo dark (independente do tema do site), no estilo
 * kit de imprensa: hero com foto, sobre, galeria, cachês e contato.
 *
 * As seções sem dados ainda (músicas/repertório, rider) entram nas próximas
 * etapas do EPK — por ora a página usa apenas o que já é público no perfil.
 */
export function EpkPublicPage() {
  const { slug } = useParams()

  const { data: artist, isLoading } = useQuery({
    queryKey: ['artist-slug', slug],
    queryFn: async () => (await artistsApi.getBySlug(slug!)).data,
    enabled: !!slug,
  })

  const { data: socialLinks = [] } = useQuery({
    queryKey: ['artist-social-links', artist?.id],
    queryFn: async () => (await socialLinksApi.list(artist!.id)).data,
    enabled: !!artist?.id,
  })
  const instagram = socialLinks.find((l) => l.platform === 'Instagram')

  // Conteúdo próprio do EPK (editável em "Meu EPK"); mídia/bio vazias usam o perfil.
  const { data: epk } = useQuery({
    queryKey: ['epk', artist?.id],
    queryFn: async () => (await epkApi.get(artist!.id)).data,
    enabled: !!artist?.id,
  })

  useEffect(() => {
    if (artist) document.title = `${artist.artisticName} — EPK | reprissa`
  }, [artist])

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a12]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-violet-500 border-t-transparent" />
      </div>
    )
  }

  if (!artist) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a12] px-4">
        <div className="w-full max-w-md">
          <EmptyState title="Artista não encontrado" />
          <div className="mt-4 text-center">
            <Button asChild variant="outline" className="border-white/20 bg-transparent text-white hover:bg-white/10">
              <Link to="/artistas">Ver todos os artistas</Link>
            </Button>
          </div>
        </div>
      </div>
    )
  }

  const tipo = artist.artistType === 'Band' ? 'Banda/Grupo' : 'Solo'

  // Mídia do EPK com fallback para a do perfil; vídeo MP4 toca embutido,
  // link (YouTube/Vimeo) abre em nova aba.
  const epkPhotos = epk?.photoUrls ?? []
  const epkVideos = epk?.videoUrls ?? []
  const fotosGaleria = epkPhotos.length > 0 ? epkPhotos : artist.galleryUrls
  const videoDestaque = epkVideos[0] ?? artist.videoUrls[0] ?? null
  const temGaleria = fotosGaleria.length > 0
  const temVideo = videoDestaque != null
  const isVideoArquivo = (url: string) => !/^https?:\/\/(www\.)?(youtube\.com|youtu\.be|vimeo\.com)\//i.test(url)

  // Sobre — bio específica do EPK (fallback: descrição do perfil), nome do
  // artista em destaque e linhas de informação.
  const bio = (epk?.bio ?? '').trim() || artist.description
  const bioParagrafos = bio
    .split(/\n+/)
    .map((p) => p.trim())
    .filter(Boolean)
  const destaqueNome = (texto: string) => {
    if (!artist.artisticName || !texto.includes(artist.artisticName)) return texto
    return texto
      .split(artist.artisticName)
      .flatMap((parte, i, todas) =>
        i === todas.length - 1 ? [parte] : [parte, artist.artisticName]
      )
      .map((parte, i) =>
        parte === artist.artisticName ? (
          // eslint-disable-next-line react/no-array-index-key
          <strong key={i} className="font-semibold text-white">
            {parte}
          </strong>
        ) : (
          // eslint-disable-next-line react/no-array-index-key
          <span key={i}>{parte}</span>
        )
      )
  }
  const infoRows = [
    { icon: User, label: 'Categoria', value: `${artist.categoryName} - ${tipo}` },
    artist.styles.length > 0 && { icon: Music, label: 'Estilo musical', value: artist.styles.join(', ') },
    { icon: MapPin, label: 'Cidade', value: `${artist.city}, ${artist.state}` },
    artist.eventTypes.length > 0 && { icon: Briefcase, label: 'Atuação', value: artist.eventTypes.join(', ') },
  ].filter(Boolean) as { icon: typeof User; label: string; value: string }[]
  const habilidades = [...artist.styles, ...artist.specialties]

  // Repertório — músicas, plataformas e playlist oficial (editáveis em "Meu EPK").
  const epkSongs = epk?.songs ?? []
  const plataformas = [
    { nome: 'Spotify', url: epk?.spotifyUrl ?? null, Icon: SpotifyIcon },
    { nome: 'YouTube', url: epk?.youTubeUrl ?? null, Icon: YoutubeIcon },
    { nome: 'SoundCloud', url: epk?.soundCloudUrl ?? null, Icon: SoundCloudIcon },
  ].filter((p) => !!p.url)
  const temRepertorio = epkSongs.length > 0 || plataformas.length > 0 || !!epk?.spotifyPlaylistUrl

  // Contratação — informações comerciais. Duração/estrutura/rider ainda não têm
  // campo no perfil: usam o texto padrão do kit até a etapa de edição do EPK.
  const comercial = [
    {
      icon: Disc3,
      label: 'Formatos de apresentação',
      value: artist.eventTypes.length > 0 ? artist.eventTypes.join(' / ') : `Show · ${tipo}`,
    },
    { icon: Clock, label: 'Duração dos shows', value: '1h, 2h ou 3h' },
    { icon: ClipboardList, label: 'Rider técnico', value: 'Disponível mediante solicitação' },
  ]

  const navItems = [
    { href: '#epk-inicio', label: 'Início' },
    { href: '#epk-sobre', label: 'Sobre' },
    ...(temGaleria ? [{ href: '#epk-galeria', label: 'Galeria' }] : []),
    ...(temRepertorio ? [{ href: '#epk-musicas', label: 'Músicas' }] : []),
    { href: '#epk-contratacao', label: 'Contratação' },
  ]

  return (
    <div className="min-h-screen scroll-smooth bg-[#0a0a12] font-sans text-white">
      {/* ───────────────────────── Header fixo ───────────────────────── */}
      <header className="fixed inset-x-0 top-0 z-40 border-b border-white/10 bg-[#0a0a12]/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2">
            <BrandLogo className="h-8 w-8" />
            <span className="text-xl font-extrabold lowercase tracking-tight text-white">reprissa</span>
          </Link>

          <nav className="hidden items-center gap-6 text-sm font-medium text-white/60 md:flex">
            {navItems.map((item) => (
              <a key={item.href} href={item.href} className="transition-colors hover:text-white">
                {item.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            {instagram && (
              <a
                href={instagram.url}
                target="_blank"
                rel="noopener noreferrer"
                title={`@${instagram.handle} no Instagram`}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 text-white/70 transition-colors hover:border-violet-400/60 hover:text-white"
              >
                <Instagram className="h-4 w-4" />
              </a>
            )}
            <Button asChild className="rounded-full bg-violet-600 px-5 hover:bg-violet-500">
              <a href="#epk-contratacao">Contratar</a>
            </Button>
          </div>
        </div>
      </header>

      {/* ───────────────────────── Hero ───────────────────────── */}
      <section id="epk-inicio" className="relative overflow-hidden pt-16">
        {/* brilho violeta ao fundo */}
        <div
          aria-hidden
          className="pointer-events-none absolute -top-40 left-1/2 h-[420px] w-[720px] -translate-x-1/2 rounded-full bg-violet-600/20 blur-[120px]"
        />
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 pb-16 pt-14 lg:grid-cols-2 lg:pb-24 lg:pt-20">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-violet-400">
              {artist.categoryName} · {tipo}
            </p>
            <h1 className="mt-3 text-4xl font-black leading-tight tracking-tight sm:text-5xl lg:text-6xl">
              {artist.artisticName}
            </h1>
            <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-white/60">
              <span className="flex items-center gap-1.5">
                <MapPin className="h-4 w-4 text-violet-400" /> {artist.city}, {artist.state}
              </span>
              <span className="flex items-center gap-1.5">
                <Music className="h-4 w-4 text-violet-400" /> {artist.categoryName}
              </span>
            </div>

            {artist.description && (
              <p className="mt-5 max-w-lg text-base leading-relaxed text-white/70">{artist.description}</p>
            )}

            <div className="mt-7 flex flex-wrap gap-3">
              <Button asChild size="lg" className="rounded-full bg-violet-600 px-7 hover:bg-violet-500">
                <a href="#epk-contratacao">
                  Entrar em contato <ArrowRight className="h-4 w-4" />
                </a>
              </Button>
              {temVideo && (
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="rounded-full border-white/20 bg-transparent px-7 text-white hover:bg-white/10 hover:text-white"
                >
                  <a
                    href={isVideoArquivo(videoDestaque) ? '#epk-galeria' : videoDestaque}
                    target={isVideoArquivo(videoDestaque) ? undefined : '_blank'}
                    rel="noopener noreferrer"
                  >
                    <Play className="h-4 w-4" /> Ver vídeo de apresentação
                  </a>
                </Button>
              )}
            </div>

            {/* números do artista */}
            <div className="mt-9 flex flex-wrap gap-x-10 gap-y-4">
              {artist.averageRating != null && (
                <div>
                  <div className="flex items-center gap-1.5">
                    <Star className="h-5 w-5 fill-violet-400 text-violet-400" />
                    <span className="text-2xl font-bold">{artist.averageRating.toFixed(1)}</span>
                  </div>
                  <p className="mt-1 text-xs text-white/50">{artist.reviewCount} avaliações</p>
                </div>
              )}
            </div>
          </div>

          {/* foto com glow */}
          <div className="relative mx-auto w-full max-w-md lg:max-w-none">
            <div
              aria-hidden
              className="absolute -inset-4 rounded-[2rem] bg-gradient-to-tr from-violet-600/40 via-fuchsia-500/20 to-transparent blur-2xl"
            />
            {artist.profilePhotoUrl ? (
              <img
                src={artist.profilePhotoUrl}
                alt={artist.artisticName}
                className="relative aspect-[4/5] w-full rounded-3xl border border-white/10 object-cover shadow-2xl"
              />
            ) : (
              <div className="relative flex aspect-[4/5] w-full items-center justify-center rounded-3xl border border-white/10 bg-white/5">
                <Music className="h-16 w-16 text-white/20" />
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ───────────────────────── Sobre ───────────────────────── */}
      <section id="epk-sobre" className="scroll-mt-16 bg-[#0d0a14] py-16 lg:py-24 border-t border-white/5">
        <div className="mx-auto grid max-w-6xl gap-12 px-4 lg:grid-cols-[1.5fr_1fr]">
          {/* Texto */}
          <div>
            <p className="flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.18em] text-violet-400">
              <span className="h-px w-6 bg-violet-500" />
              Sobre o artista
            </p>
            <h2 className="mt-4 text-3xl font-medium leading-tight tracking-tight text-white sm:text-4xl">
              Mais que música,
              <br />
              <span className="font-bold text-violet-400">é um estilo de vida.</span>
            </h2>
            {bioParagrafos.length > 0 && (
              <div className="mt-6 max-w-xl space-y-4 text-[15px] leading-relaxed text-white/60">
                {bioParagrafos.map((paragrafo, i) => (
                  // eslint-disable-next-line react/no-array-index-key
                  <p key={i}>{destaqueNome(paragrafo)}</p>
                ))}
              </div>
            )}
          </div>

          {/* Informações + habilidades */}
          <div className="space-y-8 lg:border-l lg:border-white/10 lg:pl-10">
            <ul className="space-y-6">
              {infoRows.map((row) => (
                <li key={row.label} className="flex items-start gap-4">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-600/15 text-violet-400">
                    <row.icon className="h-4 w-4" />
                  </span>
                  <span>
                    <span className="block text-xs text-white/40">{row.label}</span>
                    <span className="mt-0.5 block text-sm font-medium text-white">{row.value}</span>
                  </span>
                </li>
              ))}
            </ul>

            {habilidades.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-white">
                  Habilidades principais
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {habilidades.map((s) => (
                    <span
                      key={s}
                      className="rounded-full border border-white/20 px-4 py-1.5 text-xs text-white"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ───────────────────────── Galeria ───────────────────────── */}
      {temGaleria && (
        <section id="epk-galeria" className="scroll-mt-16 border-t border-white/5 py-16 lg:py-20">
          <div className="mx-auto max-w-6xl px-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-violet-400">Galeria</p>
                <h2 className="mt-2 text-3xl font-bold tracking-tight">Fotos & vídeos</h2>
              </div>
              {!isVideoArquivo(videoDestaque) && (
                <a
                  href={videoDestaque}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-semibold text-violet-400 hover:text-violet-300"
                >
                  Ver galeria completa →
                </a>
              )}
            </div>

            {/* Vídeos do EPK: MP4 toca embutido; YouTube/Vimeo vira card de link */}
            {epkVideos.length > 0 && (
              <div className={cn('mt-8 grid gap-3', epkVideos.length > 1 ? 'md:grid-cols-2' : '')}>
                {epkVideos.map((url) =>
                  isVideoArquivo(url) ? (
                    <video
                      key={url}
                      src={url}
                      controls
                      preload="metadata"
                      className="aspect-video w-full rounded-2xl border border-white/10 bg-black"
                    />
                  ) : (
                    <a
                      key={url}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group relative flex aspect-video items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-[#151221]"
                    >
                      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-violet-600 text-white transition-transform group-hover:scale-110">
                        <Play className="h-6 w-6" />
                      </span>
                      <span className="absolute bottom-3 left-4 max-w-[80%] truncate text-sm text-white/60">
                        {url}
                      </span>
                    </a>
                  )
                )}
              </div>
            )}

            <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-4">
              {fotosGaleria.slice(0, 12).map((url, i) => (
                <a
                  key={url}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    'group relative overflow-hidden rounded-2xl border border-white/10',
                    epkVideos.length === 0 && i === 0 && 'col-span-2 row-span-2'
                  )}
                >
                  <img
                    src={url}
                    alt={`Foto ${i + 1} de ${artist.artisticName}`}
                    className="aspect-square w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                </a>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ───────────────────────── Músicas e Repertório ───────────────────────── */}
      {temRepertorio && (
        <section id="epk-musicas" className="scroll-mt-16 border-t border-white/5 bg-[#101018] py-16 lg:py-20">
          <div className="mx-auto max-w-6xl px-4">
            <p className="flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.18em] text-violet-400">
              <span className="h-px w-6 bg-violet-500" />
              Músicas e repertório
            </p>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Trabalhos e Repertório
            </h2>

            <div className="mt-10 grid gap-12 lg:grid-cols-[1.1fr_1fr_1.1fr] lg:gap-10">
              {/* Principais músicas */}
              {epkSongs.length > 0 && (
                <div>
                  <p className="text-sm font-semibold text-white/70">Principais músicas</p>
                  <ul className="mt-3 divide-y divide-white/5">
                    {epkSongs.map((song, i) => (
                      // eslint-disable-next-line react/no-array-index-key
                      <li key={`${song}-${i}`} className="flex items-center gap-3 py-2.5">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/15 text-white/60">
                          <Play className="h-3 w-3" />
                        </span>
                        <span className="min-w-0 flex-1 truncate text-sm text-white">{song}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Plataformas */}
              {plataformas.length > 0 && (
                <div>
                  <p className="text-sm font-semibold text-white/70">Ouça também nas plataformas</p>
                  <div className="mt-3 flex flex-wrap gap-3">
                    {plataformas.map(({ nome, url, Icon }) => (
                      <a
                        key={nome}
                        href={url!}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-semibold text-white transition-colors hover:border-violet-500/50 hover:bg-violet-600/10"
                      >
                        <Icon className="h-5 w-5" /> {nome}
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Banner da playlist oficial */}
              {epk?.spotifyPlaylistUrl && (
                <a
                  href={epk.spotifyPlaylistUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group relative block overflow-hidden rounded-2xl border border-white/10"
                >
                  {artist.profilePhotoUrl ? (
                    <img
                      src={artist.profilePhotoUrl}
                      alt=""
                      className="absolute inset-0 h-full w-full object-cover opacity-50 transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-tr from-violet-700/40 to-transparent" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/20" />
                  <div className="relative flex min-h-48 flex-col justify-end p-5">
                    <p className="text-lg font-black uppercase leading-tight text-white">
                      {artist.artisticName}
                    </p>
                    <p className="mt-0.5 text-xs font-semibold uppercase tracking-[0.2em] text-violet-300">
                      Playlist oficial
                    </p>
                    <div className="mt-3 flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-sm font-semibold text-white">
                        <SpotifyIcon className="h-5 w-5" /> Spotify
                      </span>
                      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-600 text-white shadow-[0_0_20px_-4px_rgba(139,92,246,0.9)] transition-transform group-hover:scale-110">
                        <Play className="h-4 w-4" />
                      </span>
                    </div>
                  </div>
                </a>
              )}
            </div>
          </div>
        </section>
      )}

      {/* ───────────────────────── Contratação ───────────────────────── */}
      <section id="epk-contratacao" className="scroll-mt-16 py-16 lg:py-24 border-t border-white/5">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 lg:grid-cols-[1.6fr_1fr]">
          {/* Informações comerciais */}
          <div>
            <p className="flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.18em] text-violet-400">
              <span className="h-px w-6 bg-violet-500" />
              Contratação
            </p>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Informações comerciais
            </h2>

            <div className="mt-10 grid grid-cols-2 gap-x-8 gap-y-10 lg:grid-cols-4">
              {comercial.map((item) => (
                <div key={item.label}>
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-violet-500/30 bg-violet-600/10 text-violet-400">
                    <item.icon className="h-5 w-5" />
                  </span>
                  <p className="mt-4 text-sm font-semibold text-white">{item.label}</p>
                  <p className="mt-1 text-[13px] leading-relaxed text-white/50">{item.value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Painel de contato */}
          <div className="rounded-2xl border border-[#2c2640] bg-[#151221] p-6 shadow-[0_0_40px_-12px_rgba(139,92,246,0.35)]">
            <h3 className="text-lg font-semibold text-white">Entre em contato</h3>
            <p className="mt-2 text-[13px] leading-relaxed text-white/50">
              Solicite um orçamento ou tire suas dúvidas sobre disponibilidade e condições.
            </p>
            <Button
              asChild
              size="lg"
              className="mt-6 w-full rounded-xl bg-violet-600 shadow-[0_0_24px_-6px_rgba(139,92,246,0.8)] hover:bg-violet-500"
            >
              <Link to={`/artistas/${artist.slug}`}>
                <Send className="h-4 w-4" /> Solicitar orçamento
              </Link>
            </Button>
            {instagram && (
              <Button
                asChild
                size="lg"
                variant="outline"
                className="mt-3 w-full rounded-xl border-white/20 bg-transparent text-white hover:bg-white/10 hover:text-white"
              >
                <a href={instagram.url} target="_blank" rel="noopener noreferrer">
                  <Instagram className="h-4 w-4" /> @{instagram.handle}
                </a>
              </Button>
            )}
          </div>
        </div>
      </section>

      {/* ───────────────────────── Footer ───────────────────────── */}
      <footer className="border-t border-white/10 py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-3 px-4 text-center">
          <Link to="/" className="flex items-center gap-2">
            <BrandLogo className="h-7 w-7" />
            <span className="text-lg font-extrabold lowercase tracking-tight text-white">reprissa</span>
          </Link>
          <p className="text-sm text-white/40">
            EPK de {artist.artisticName} · conectando talentos a oportunidades
          </p>
        </div>
      </footer>
    </div>
  )
}
