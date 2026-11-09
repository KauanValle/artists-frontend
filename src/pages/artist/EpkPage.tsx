import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ExternalLink,
  FileText,
  Image as ImageIcon,
  ImagePlus,
  Link2,
  Loader2,
  MapPin,
  Music2,
  Play,
  RotateCcw,
  Trash2,
  Video,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { artistsApi, epkApi, uploadsApi } from '@/services'
import { extractApiError } from '@/services/api'
import { formatMoney } from '@/lib/utils'

const BIO_MAX = 300
const PHOTOS_MAX = 12
const VIDEOS_MAX = 4
const SONGS_MAX = 15
const COR_PADRAO = '#7c3aed'

/**
 * Meu EPK — kit de imprensa digital do artista, exibido na landing pública
 * /epk/{slug}. Edita bio, mídia, repertório e a cor de fundo do EPK, com uma
 * prévia ao vivo à direita. Um único "Salvar" persiste tudo em /api/epk.
 */
export function EpkPage() {
  const queryClient = useQueryClient()
  const photoInputRef = useRef<HTMLInputElement>(null)
  const videoInputRef = useRef<HTMLInputElement>(null)

  const { data: artist } = useQuery({
    queryKey: ['my-artist'],
    queryFn: async () => (await artistsApi.getMy()).data,
  })

  const { data: epk, isLoading } = useQuery({
    queryKey: ['epk', artist?.id],
    queryFn: async () => (await epkApi.get(artist!.id)).data,
    enabled: !!artist?.id,
  })

  const [bio, setBio] = useState('')
  const [photos, setPhotos] = useState<string[]>([])
  const [videos, setVideos] = useState<string[]>([])
  const [videoLink, setVideoLink] = useState('')
  const [songs, setSongs] = useState<string[]>([])
  const [songInput, setSongInput] = useState('')
  const [spotifyUrl, setSpotifyUrl] = useState('')
  const [youTubeUrl, setYouTubeUrl] = useState('')
  const [soundCloudUrl, setSoundCloudUrl] = useState('')
  const [spotifyPlaylistUrl, setSpotifyPlaylistUrl] = useState('')
  const [corDestaque, setCorDestaque] = useState(COR_PADRAO)
  const [dirty, setDirty] = useState(false)
  useEffect(() => {
    if (!epk) return
    setBio(epk.bio)
    setPhotos(epk.photoUrls)
    setVideos(epk.videoUrls)
    setSongs(epk.songs)
    setSpotifyUrl(epk.spotifyUrl ?? '')
    setYouTubeUrl(epk.youTubeUrl ?? '')
    setSoundCloudUrl(epk.soundCloudUrl ?? '')
    setSpotifyPlaylistUrl(epk.spotifyPlaylistUrl ?? '')
    setCorDestaque(epk.corDestaque ?? COR_PADRAO)
  }, [epk])

  const markDirty = () => setDirty(true)

  const uploadFile = useMutation({
    mutationFn: async ({ file, kind }: { file: File; kind: 'photo' | 'video' }) => ({
      kind,
      url: (await uploadsApi.upload(file)).data.url,
    }),
    onSuccess: ({ kind, url }) => {
      if (kind === 'photo') setPhotos((atual) => [...atual, url])
      else setVideos((atual) => [...atual, url])
      setDirty(true)
      toast.success(
        kind === 'photo' ? 'Foto carregada — clique em Salvar para publicar.' : 'Vídeo carregado — clique em Salvar para publicar.'
      )
    },
    onError: (e) => toast.error(extractApiError(e)),
  })

  const save = useMutation({
    mutationFn: async () =>
      (
        await epkApi.save({
          bio,
          photoUrls: photos,
          videoUrls: videos,
          songs,
          spotifyUrl: spotifyUrl.trim() || null,
          youTubeUrl: youTubeUrl.trim() || null,
          soundCloudUrl: soundCloudUrl.trim() || null,
          spotifyPlaylistUrl: spotifyPlaylistUrl.trim() || null,
          corDestaque: corDestaque === COR_PADRAO ? null : corDestaque,
        })
      ).data,
    onSuccess: (data) => {
      queryClient.setQueryData(['epk', artist?.id], data)
      setDirty(false)
      toast.success('EPK salvo! Sua página pública já está atualizada.')
    },
    onError: (e) => toast.error(extractApiError(e)),
  })

  const pickPhotos = (files: FileList | null) => {
    if (!files) return
    const vagas = PHOTOS_MAX - photos.length
    if (vagas <= 0) {
      toast.warning(`O EPK aceita no máximo ${PHOTOS_MAX} fotos.`)
      return
    }
    for (const file of Array.from(files).slice(0, vagas)) {
      if (!file.type.startsWith('image/')) {
        toast.error(`"${file.name}" não é uma imagem.`)
        continue
      }
      uploadFile.mutate({ file, kind: 'photo' })
    }
    if (photoInputRef.current) photoInputRef.current.value = ''
  }

  const pickVideo = (file: File | null) => {
    if (!file) return
    if (!file.type.startsWith('video/')) {
      toast.error('Selecione um arquivo de vídeo (MP4).')
      return
    }
    if (videos.length >= VIDEOS_MAX) {
      toast.warning(`O EPK aceita no máximo ${VIDEOS_MAX} vídeos.`)
      return
    }
    uploadFile.mutate({ file, kind: 'video' })
    if (videoInputRef.current) videoInputRef.current.value = ''
  }

  const addSong = () => {
    const nome = songInput.trim()
    if (!nome) return
    if (songs.length >= SONGS_MAX) {
      toast.warning(`O EPK aceita no máximo ${SONGS_MAX} músicas.`)
      return
    }
    if (songs.some((s) => s.toLowerCase() === nome.toLowerCase())) {
      toast.warning('Essa música já está na lista.')
      return
    }
    setSongs((atual) => [...atual, nome])
    setSongInput('')
    markDirty()
  }

  const addVideoLink = () => {
    const link = videoLink.trim()
    if (!link) return
    if (!/^https?:\/\//i.test(link)) {
      toast.error('Informe um link começando com http(s)://')
      return
    }
    if (videos.length >= VIDEOS_MAX) {
      toast.warning(`O EPK aceita no máximo ${VIDEOS_MAX} vídeos.`)
      return
    }
    setVideos((atual) => [...atual, link])
    setVideoLink('')
    setDirty(true)
  }

  const saving = save.isPending || uploadFile.isPending

  return (
    <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
      {/* ─────────── Coluna esquerda: edição ─────────── */}
      <div className="space-y-6 min-w-0">
        <div>
          <h1 className="text-2xl font-bold">Meu EPK</h1>
          <p className="text-sm text-muted-foreground">
            Electronic Press Kit — o seu kit de imprensa digital
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-4 w-4" /> Resumo da sua carreira
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              
              <Textarea
                id="epk-bio"
                value={bio}
                onChange={(e) => {
                  setBio(e.target.value)
                  markDirty()
                }}
                placeholder="A mensagem que os contratantes veem na seção 'Sobre o artista' do seu EPK — conte sua história, experiência e o que diferencia o seu show. Deixe vazio para usar a descrição do seu perfil."
                rows={8}
                maxLength={BIO_MAX}
              />
              
                <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">
                        Essa descrição é exclusiva do EPK e não altera o seu perfil. Você pode separar em
                        parágrafos com quebras de linha.
                    </p>
                    {/*<Label htmlFor="epk-bio">Resumo do artista no EPK</Label>*/}
                    <span className="text-xs text-muted-foreground">
                  {bio.length}/{BIO_MAX}
                </span>
                </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ImagePlus className="h-4 w-4" /> Fotos ({photos.length}/{PHOTOS_MAX})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Aparecem na galeria do EPK. Sem fotos aqui, a galeria usa as do seu perfil.
            </p>
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
              {photos.map((url) => (
                <div key={url} className="group relative overflow-hidden rounded-lg border">
                  <img src={url} alt="Foto do EPK" className="aspect-square w-full object-cover" />
                  <button
                    type="button"
                    title="Remover foto"
                    onClick={() => {
                      setPhotos((atual) => atual.filter((u) => u !== url))
                      markDirty()
                    }}
                    className="absolute right-1 top-1 rounded-md bg-black/60 p-1 text-white opacity-0 transition-opacity hover:bg-red-600 group-hover:opacity-100"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
              {photos.length < PHOTOS_MAX && (
                <button
                  type="button"
                  onClick={() => photoInputRef.current?.click()}
                  disabled={uploadFile.isPending}
                  className="flex aspect-square w-full flex-col items-center justify-center gap-1 rounded-lg border border-dashed text-xs text-muted-foreground hover:border-primary hover:text-foreground"
                >
                  {uploadFile.isPending ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <>
                      <ImagePlus className="h-5 w-5" /> Enviar foto
                    </>
                  )}
                </button>
              )}
            </div>
            <input
              ref={photoInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => pickPhotos(e.target.files)}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Video className="h-4 w-4" /> Vídeos ({videos.length}/{VIDEOS_MAX})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Envie um arquivo MP4 (até 10 MB) ou cole o link do YouTube/Vimeo.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => videoInputRef.current?.click()}
                disabled={uploadFile.isPending}
              >
                <Video className="h-4 w-4" /> Enviar MP4
              </Button>
              <div className="flex min-w-56 flex-1 gap-2">
                <Input
                  value={videoLink}
                  onChange={(e) => setVideoLink(e.target.value)}
                  placeholder="https://youtube.com/watch?v=..."
                  onKeyDown={(e) => e.key === 'Enter' && addVideoLink()}
                />
                <Button type="button" variant="outline" onClick={addVideoLink}>
                  <Link2 className="h-4 w-4" /> Adicionar
                </Button>
              </div>
            </div>
            <input
              ref={videoInputRef}
              type="file"
              accept="video/mp4,video/*"
              className="hidden"
              onChange={(e) => pickVideo(e.target.files?.[0] ?? null)}
            />
            {videos.length > 0 && (
              <ul className="divide-y rounded-lg border">
                {videos.map((url) => (
                  <li key={url} className="flex items-center gap-2 px-3 py-2 text-sm">
                    <Video className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="min-w-0 flex-1 truncate">{url}</span>
                    <button
                      type="button"
                      title="Remover vídeo"
                      onClick={() => {
                        setVideos((atual) => atual.filter((u) => u !== url))
                        markDirty()
                      }}
                      className="rounded-md p-1 text-muted-foreground hover:bg-red-500/10 hover:text-red-500"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Music2 className="h-4 w-4" /> Músicas e Repertório
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label>
                Principais músicas ({songs.length}/{SONGS_MAX})
              </Label>
              <div className="flex gap-2">
                <Input
                  value={songInput}
                  onChange={(e) => setSongInput(e.target.value)}
                  placeholder="Nome da música"
                  onKeyDown={(e) => e.key === 'Enter' && addSong()}
                />
                <Button type="button" variant="outline" onClick={addSong}>
                  Adicionar
                </Button>
              </div>
              {songs.length > 0 && (
                <ul className="divide-y rounded-lg border">
                  {songs.map((song, i) => (
                    <li key={`${song}-${i}`} className="flex items-center gap-2 px-3 py-2 text-sm">
                      <Play className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      <span className="min-w-0 flex-1 truncate">{song}</span>
                      <button
                        type="button"
                        title="Remover música"
                        onClick={() => {
                          setSongs((atual) => atual.filter((_, idx) => idx !== i))
                          markDirty()
                        }}
                        className="rounded-md p-1 text-muted-foreground hover:bg-red-500/10 hover:text-red-500"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="space-y-2">
                <div className="rounded-lg border bg-card space-y-3 p-4 text-sm">
                  <Label>Ouça também nas plataformas</Label>
                  <p className="text-xs text-muted-foreground">
                    Links que aparecem como botões na seção de repertório do EPK.
                  </p>
                  <div className="grid gap-3 sm:grid-cols-3 mt-4">
                    <div className="space-y-1">
                      <span className="text-xs text-muted-foreground">Spotify</span>
                      <Input
                        value={spotifyUrl}
                        onChange={(e) => {
                          setSpotifyUrl(e.target.value)
                          markDirty()
                        }}
                        placeholder="https://open.spotify.com/artist/..."
                      />
                    </div>
                    <div className="space-y-1">
                      <span className="text-xs text-muted-foreground">YouTube</span>
                      <Input
                        value={youTubeUrl}
                        onChange={(e) => {
                          setYouTubeUrl(e.target.value)
                          markDirty()
                        }}
                        placeholder="https://youtube.com/@..."
                      />
                    </div>
                    <div className="space-y-1">
                      <span className="text-xs text-muted-foreground">SoundCloud</span>
                      <Input
                        value={soundCloudUrl}
                        onChange={(e) => {
                          setSoundCloudUrl(e.target.value)
                          markDirty()
                        }}
                        placeholder="https://soundcloud.com/..."
                      />
                    </div>
                  </div>
                </div>
            </div>

            <div className="space-y-1.5">
                <div className="rounded-lg border bg-card space-y-3 p-4 text-sm">
                  <Label>Playlist oficial do Spotify</Label>
                  <Input
                    value={spotifyPlaylistUrl}
                    onChange={(e) => {
                      setSpotifyPlaylistUrl(e.target.value)
                      markDirty()
                    }}
                    placeholder="https://open.spotify.com/playlist/..."
                  />
                  <p className="text-xs text-muted-foreground">
                    Aparece no banner "Playlist oficial" do seu EPK.
                  </p>
                </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ImageIcon className="h-4 w-4" /> Personalização do EPK
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="epk-cor">Cor de destaque do EPK</Label>
              <div className="flex items-center gap-2">
                <input
                  id="epk-cor"
                  type="color"
                  value={corDestaque}
                  onChange={(e) => {
                    setCorDestaque(e.target.value)
                    markDirty()
                  }}
                  className="h-10 w-14 cursor-pointer rounded-md border bg-transparent p-1"
                  title="Escolher cor"
                />
                <Input
                  value={corDestaque}
                  onChange={(e) => {
                    setCorDestaque(e.target.value)
                    markDirty()
                  }}
                  className="w-32 font-mono text-sm"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setCorDestaque(COR_PADRAO)
                    markDirty()
                  }}
                  title="Voltar para o tema padrão"
                >
                  <RotateCcw className="h-4 w-4" /> Padrão
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Aplicada nos botões, brilhos e detalhes da página (o fundo continua escuro). A cor
                padrão é o violeta da plataforma.
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={() => save.mutate()} disabled={saving || isLoading}>
            {save.isPending ? 'Salvando...' : 'Salvar EPK'}
          </Button>
          {dirty && !saving && (
            <span className="text-xs text-amber-500">Alterações ainda não salvas.</span>
          )}
        </div>

        {artist?.slug && (
          <Card>
            <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
              <div>
                <p className="text-sm font-medium">Seu EPK público</p>
                <p className="text-xs text-muted-foreground">
                  É essa página que você compartilha com contratantes e casas de show.
                </p>
              </div>
              <Button asChild variant="outline">
                <Link to={`/epk/${artist.slug}`} target="_blank">
                  <ExternalLink className="h-4 w-4" /> Abrir /epk/{artist.slug}
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* ─────────── Coluna direita: prévia ao vivo ─────────── */}
      <div className="sticky top-20 hidden xl:block">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Prévia ao vivo
          </span>
          <span className="text-xs text-muted-foreground">como os contratantes veem</span>
        </div>
        <div
          className="overflow-hidden rounded-2xl border shadow-lg"
          
        >
          {/* mini header */}
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-2.5">
            <span className="text-xs font-bold text-white/80">{artist?.artisticName ?? 'Artista'}</span>
            <span className="rounded-full border border-white/20 px-2.5 py-0.5 text-[10px] font-semibold text-white/80">
              Contratar
            </span>
          </div>
          {/* mini hero */}
          <div className="space-y-2 px-4 py-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[color:var(--epk-accent)]">
              {artist?.categoryName ?? 'Categoria'}
            </p>
            <p className="text-lg font-black leading-tight text-white">
              {artist?.artisticName ?? 'Nome artístico'}
            </p>
            {artist?.city && (
              <p className="flex items-center gap-1 text-[11px] text-white/60">
                <MapPin className="h-3 w-3" /> {artist.city}, {artist.state}
              </p>
            )}
            <p className="line-clamp-3 text-[11px] leading-relaxed text-white/60">
              {(bio || artist?.description || 'Sua descrição aparece aqui.').slice(0, 160)}
            </p>
            {artist?.profilePhotoUrl && (
              <img
                src={artist.profilePhotoUrl}
                alt=""
                className="h-24 w-full rounded-xl border border-white/10 object-cover"
              />
            )}
            <div className="flex gap-2">
              <span className="rounded-full bg-[var(--epk-accent)] px-3 py-1 text-[10px] font-semibold text-white">
                Entrar em contato
              </span>
              {artist?.startingPrice != null && (
                <span className="rounded-full border border-white/20 px-3 py-1 text-[10px] font-semibold text-white/80">
                  {formatMoney(artist.startingPrice)}
                </span>
              )}
            </div>
          </div>
          {/* mini galeria */}
          {photos.length > 0 && (
            <div className="border-t border-white/10 px-4 py-3">
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-[color:var(--epk-accent)]">
                Galeria
              </p>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5">
                {photos.slice(0, 4).map((url) => (
                  <img key={url} src={url} alt="" className="aspect-square w-full rounded-md object-cover" />
                ))}
              </div>
              {photos.length > 4 && (
                <p className="mt-1.5 text-[10px] text-white/40">+{photos.length - 4} fotos</p>
              )}
            </div>
          )}
          {/* mini repertório */}
          {songs.length > 0 && (
            <div className="border-t border-white/10 px-4 py-3">
              <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-[color:var(--epk-accent)]">
                Músicas
              </p>
              {songs.slice(0, 3).map((song, i) => (
                <p key={`${song}-${i}`} className="flex items-center gap-1.5 py-0.5 text-[11px] text-white/70">
                  <Play className="h-2.5 w-2.5" /> {song}
                </p>
              ))}
            </div>
          )}
          {/* contatos */}
          {(spotifyPlaylistUrl.trim() || spotifyUrl.trim() || youTubeUrl.trim() || soundCloudUrl.trim()) && (
            <div className="flex items-center gap-2 border-t border-white/10 px-4 py-2.5">
              <span className="text-[11px] text-white/60">
                {[spotifyUrl, youTubeUrl, soundCloudUrl].some((u) => u.trim())
                  ? 'Ouça também: Spotify · YouTube · SoundCloud'
                  : 'Playlist oficial do Spotify'}
              </span>
            </div>
          )}
        </div>
        <p className="mt-2 text-center text-[11px] text-muted-foreground">
          Prévia ilustrativa — a página pública tem todas as seções.
        </p>
      </div>
    </div>
  )
}
