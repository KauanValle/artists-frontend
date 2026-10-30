import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ExternalLink, FileText, ImagePlus, Link2, Loader2, Music2, Play, Trash2, Video } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { artistsApi, epkApi, uploadsApi } from '@/services'
import { extractApiError } from '@/services/api'

const BIO_MAX = 4000
const PHOTOS_MAX = 12
const VIDEOS_MAX = 4
const SONGS_MAX = 15

/**
 * Meu EPK — kit de imprensa digital do artista, exibido na landing pública
 * /epk/{slug}. Edita a bio exclusiva e a mídia (fotos e vídeos) com fallback
 * para o perfil quando vazias. Um único "Salvar" persiste tudo em /api/epk.
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
      toast.success(kind === 'photo' ? 'Foto carregada — clique em Salvar para publicar.' : 'Vídeo carregado — clique em Salvar para publicar.')
    },
    onError: (e) => toast.error(extractApiError(e)),
  })

  const save = useMutation({
    mutationFn: async () =>
      (await epkApi.save({
        bio,
        photoUrls: photos,
        videoUrls: videos,
        songs,
        spotifyUrl: spotifyUrl.trim() || null,
        youTubeUrl: youTubeUrl.trim() || null,
        soundCloudUrl: soundCloudUrl.trim() || null,
        spotifyPlaylistUrl: spotifyPlaylistUrl.trim() || null,
      })).data,
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
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Meu EPK</h1>
        <p className="text-sm text-muted-foreground">
          Electronic Press Kit — o seu kit de imprensa digital
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-4 w-4" /> Sobre o artista
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="epk-bio">Descrição do EPK</Label>
              <span className="text-xs text-muted-foreground">
                {bio.length}/{BIO_MAX}
              </span>
            </div>
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
            <p className="text-xs text-muted-foreground">
              Essa descrição é exclusiva do EPK e não altera o seu perfil. Você pode separar em
              parágrafos com quebras de linha.
            </p>
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
            <Label>Ouça também nas plataformas</Label>
            <p className="text-xs text-muted-foreground">
              Links que aparecem como botões na seção de repertório do EPK.
            </p>
            <div className="grid gap-3 sm:grid-cols-3">
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

          <div className="space-y-1.5">
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
  )
}
