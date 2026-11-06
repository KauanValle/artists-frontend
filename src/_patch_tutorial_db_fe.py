import io

# ── types/index.ts: User ganha estado do tutorial ──
path = 'types/index.ts'
with io.open(path, encoding='utf-8') as f: c = f.read()
old = """  subscriptionTier: SubscriptionTier
  perfilCompleto: boolean
}"""
new = """  subscriptionTier: SubscriptionTier
  perfilCompleto: boolean
  tutorialFeito: boolean
  tutorialPassos: string[]
}"""
assert c.count(old) == 1
c = c.replace(old, new)
with io.open(path, 'w', encoding='utf-8', newline='') as f: f.write(c)
print('types ok')

# ── services/index.ts: authApi.salvarTutorial ──
path = 'services/index.ts'
with io.open(path, encoding='utf-8') as f: c = f.read()
old = "  me: () => api.get('/auth/me'),"
new = """  me: () => api.get('/auth/me'),
  salvarTutorial: (payload: { feito: boolean; passos: string[] }) =>
    api.put<User>('/auth/tutorial', payload),"""
assert c.count(old) == 1
c = c.replace(old, new)
with io.open(path, 'w', encoding='utf-8', newline='') as f: f.write(c)
print('services ok')

# ── DashboardLayout: hook + sidebar progressiva + TutorialBox controlado ──
path = 'layouts/DashboardLayout.tsx'
with io.open(path, encoding='utf-8') as f: c = f.read()

old = "import { TutorialBox, type TutorialStep } from '@/components/onboarding/TutorialBox'"
new = "import { TutorialBox, useTutorialProgress, type TutorialStep } from '@/components/onboarding/TutorialBox'"
assert c.count(old) == 1
c = c.replace(old, new)

old = """export function DashboardLayout() {
  const { user } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)"""
new = """export function DashboardLayout() {
  const { user } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const tutorialArtista = useTutorialProgress('reprissa.tutorial.artista', artistTutorialSteps)"""
assert c.count(old) == 1
c = c.replace(old, new)

old = """  const isFreeArtist = user?.role === 'Artist' && user.subscriptionTier === 'Gratuito' && assinaturaObrigatoria
  const nav = !user
    ? artistNav
    : user.role === 'Admin'
      ? adminNav
      : user.role === 'Contractor'
        ? contractorNav
        : isFreeArtist
          ? freeArtistNav
          : artistNav
"""
new = """  const isFreeArtist = user?.role === 'Artist' && user.subscriptionTier === 'Gratuito' && assinaturaObrigatoria
  const navBase = !user
    ? artistNav
    : user.role === 'Admin'
      ? adminNav
      : user.role === 'Contractor'
        ? contractorNav
        : isFreeArtist
          ? freeArtistNav
          : artistNav

  // Tutorial do artista em andamento → o menu lateral revela os itens conforme
  // os passos liberam: só aparecem as telas dos passos concluídos e do passo atual.
  const nav = useMemo(() => {
    if (navBase !== artistNav || !tutorialArtista?.state || tutorialArtista.state.done) return navBase
    const atualIdx = artistTutorialSteps.findIndex(
      (s) => !tutorialArtista.state.checked.includes(s.id)
    )
    const liberados = new Set(
      artistTutorialSteps
        .filter((s, i) => i <= atualIdx && s.href)
        .map((s) => s.href as string)
    )
    return navBase.filter((item) => liberados.has(item.to))
  }, [navBase, tutorialArtista])
"""
assert c.count(old) == 1
c = c.replace(old, new)

old = """      {user?.role === 'Artist' && (
        <TutorialBox
          storageKey="reprissa.tutorial.artista"
          title="Bem-vindo ao Reprissa!"
          steps={artistTutorialSteps}
        />
      )}"""
new = """      {user?.role === 'Artist' && (
        <TutorialBox title="Bem-vindo ao Reprissa!" steps={artistTutorialSteps} progress={tutorialArtista} />
      )}"""
assert c.count(old) == 1
c = c.replace(old, new)

# useMemo precisa estar importado no layout
old = "import { useState } from 'react'"
new = "import { useMemo, useState } from 'react'"
assert c.count(old) == 1
c = c.replace(old, new)

with io.open(path, 'w', encoding='utf-8', newline='') as f: f.write(c)
print('layout ok')
