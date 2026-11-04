# -*- coding: utf-8 -*-
import io

path = 'src/pages/public/ArtistPublicPage.tsx'
with io.open(path, encoding='utf-8') as f:
    c = f.read()

# 1. Estado do passo + títulos + reset
old = """  const [message, setMessage] = useState('')
  const [selectedAddons, setSelectedAddons] = useState<BookingAddonItem[]>([])

  const { data: addons } = useQuery({
    queryKey: ['artist-addons', artistId],
    queryFn: async () => (await addonsApi.list(artistId)).data,
    enabled: open && !!artistId,
  })"""
new = """  const [message, setMessage] = useState('')
  const [selectedAddons, setSelectedAddons] = useState<BookingAddonItem[]>([])
  const [step, setStep] = useState(0)

  const STEP_TITLES = ['Detalhes do evento', 'Orçamento & adicionais', 'Confirmação']

  const { data: addons } = useQuery({
    queryKey: ['artist-addons', artistId],
    queryFn: async () => (await addonsApi.list(artistId)).data,
    enabled: open && !!artistId,
  })"""
assert c.count(old) == 1, 'estado'
c = c.replace(old, new)

# 2. Reset do passo ao fechar
old = """    <Dialog open={open} onOpenChange={(o) => {
      if (!o) setSelectedAddons([])
      onClose()
    }}>"""
new = """    <Dialog open={open} onOpenChange={(o) => {
      if (!o) {
        setSelectedAddons([])
        setStep(0)
      }
      onClose()
    }}>"""
assert c.count(old) == 1, 'reset'
c = c.replace(old, new)

# 3. handleContinue com validação por passo + cabeçalho de passos
old = """  return (
    <Dialog open={open} onOpenChange={(o) => {
      if (!o) {
        setSelectedAddons([])
        setStep(0)
      }
      onClose()
    }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Solicitar contratação — {artistName}</DialogTitle>
        </DialogHeader>
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault()
            if (fullyBlockedDates.includes(eventDate)) {
              toast.warning('O artista está indisponível nessa data. Escolha outro dia na agenda.')
              return
            }
            if (!startTime || !endTime) {
              toast.warning('Selecione o horário de início e fim do evento')
              return
            }
            create.mutate()
          }}
        >
          <div className="space-y-1.5">
            <Label>Data *</Label>"""
new = """  const handleContinue = () => {
    if (step === 0) {
      if (!eventDate) {
        toast.warning('Escolha o dia na agenda')
        return
      }
      if (!startTime || !endTime) {
        toast.warning('Selecione o horário de início e fim do evento')
        return
      }
      if (!location.trim()) {
        toast.warning('Informe o local do evento')
        return
      }
    }
    setError('')
    setStep((s) => s + 1)
  }

  return (
    <Dialog open={open} onOpenChange={(o) => {
      if (!o) {
        setSelectedAddons([])
        setStep(0)
      }
      onClose()
    }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Solicitar contratação — {artistName}</DialogTitle>
        </DialogHeader>

        {/* Indicador de passos */}
        <ol className="flex items-center gap-2">
          {STEP_TITLES.map((title, index) => {
            const done = index < step
            const active = index === step
            return (
              <li key={title} className="flex items-center gap-2">
                <span
                  className={cn(
                    'flex h-6 w-6 items-center justify-center rounded-full border text-xs font-semibold',
                    active && 'border-primary bg-primary text-primary-foreground',
                    done && 'border-primary/40 bg-primary/10 text-primary',
                    !active && !done && 'bg-muted text-muted-foreground'
                  )}
                >
                  {done ? <Check className="h-3 w-3" /> : index + 1}
                </span>
                <span className={cn('hidden text-xs sm:block', active ? 'font-semibold text-foreground' : 'text-muted-foreground')}>
                  {title}
                </span>
                {index < STEP_TITLES.length - 1 && <span className="h-px w-4 bg-border" />}
              </li>
            )
          })}
        </ol>
        <p className="-mt-2 text-center text-xs text-muted-foreground">
          Passo {step + 1} de {STEP_TITLES.length} — {STEP_TITLES[step]}
        </p>

        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault()
            if (fullyBlockedDates.includes(eventDate)) {
              toast.warning('O artista está indisponível nessa data. Escolha outro dia na agenda.')
              return
            }
            if (!startTime || !endTime) {
              toast.warning('Selecione o horário de início e fim do evento')
              return
            }
            create.mutate()
          }}
        >
          <div className="space-y-1.5">
            <Label>Data *</Label>"""
assert c.count(old) == 1, 'cabecalho'
c = c.replace(old, new)

with io.open(path, 'w', encoding='utf-8', newline='') as f:
    f.write(c)
print('parte 1 ok')
