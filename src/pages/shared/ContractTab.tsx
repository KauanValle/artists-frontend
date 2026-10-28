import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Copy, Download, FileSignature, Link2, MessageCircle, PenLine, ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'
import { contractsApi } from '@/services'
import { useAuth } from '@/hooks/useAuth'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SignaturePad } from '@/components/ui/signature-pad'
import { Textarea } from '@/components/ui/textarea'
import { formatDate, formatDateTime } from '@/lib/utils'
import { downloadContractPdf } from '@/lib/contract-pdf'
import { extractApiError } from '@/services/api'
import type { Booking } from '@/types'

/**
 * Aba Jurídico da contratação: gera o contrato de prestação de serviços artísticos
 * auto-preenchido, coleta a assinatura desenhada do artista e registra as evidências
 * de formalidade (hash SHA-256 do texto, data/hora UTC, IP e user-agent).
 */
export function ContractTab({ booking }: { booking: Booking }) {
  const { user } = useAuth()
  const isArtist = user?.role === 'Artist'

  const { data: contract, isLoading } = useQuery({
    queryKey: ['contract', booking.id],
    queryFn: async () => (await contractsApi.get(booking.id)).data,
  })

  if (isLoading || !contract) {
    return <p className="py-6 text-center text-sm text-muted-foreground">Carregando contrato...</p>
  }

  return isArtist ? (
    <ArtistContractSection booking={booking} contract={contract} />
  ) : (
    <ContractReadOnly contract={contract} />
  )
}

function ArtistContractSection({
  booking,
  contract,
}: {
  booking: Booking
  contract: import('@/types').ArtistContract
}) {
  const queryClient = useQueryClient()
  const [artistDocument, setArtistDocument] = useState(contract.artistDocument)
  const [artistAddress, setArtistAddress] = useState(contract.artistAddress)
  const [artistContact, setArtistContact] = useState(contract.artistContact)
  const [paymentTerms, setPaymentTerms] = useState(contract.paymentTerms)
  const [signatureData, setSignatureData] = useState<string | null>(contract.signatureData)
  const [reSigning, setReSigning] = useState(false)

  // Link público de assinatura do contratante (origin atual + token de capacidade).
  const contractorLink = contract.contractorAccessToken
    ? `${window.location.origin}/contrato/${contract.contractorAccessToken}`
    : null

  const copyLink = async () => {
    if (!contractorLink) return
    try {
      await navigator.clipboard.writeText(contractorLink)
      toast.success('Link copiado! Envie ao contratante para assinar.')
    } catch {
      toast.error('Não foi possível copiar o link.')
    }
  }

  const shareWhatsapp = () => {
    if (!contractorLink) return
    const message = encodeURIComponent(
      `Olá! Segue o link do contrato da nossa apresentação em ${formatDate(contract.eventDate)} para você visualizar e assinar: ${contractorLink}`
    )
    const phone = booking.isGuest ? booking.guestPhone?.replace(/\D/g, '') : ''
    const url = phone ? `https://wa.me/55${phone}?text=${message}` : `https://wa.me/?text=${message}`
    window.open(url, '_blank')
  }

  const downloadPdf = async () => {
    await downloadContractPdf(contract, `contrato-${booking.id.slice(0, 8)}`)
  }

  const sign = useMutation({
    mutationFn: async () =>
      (
        await contractsApi.sign(booking.id, {
          artistDocument,
          artistAddress,
          artistContact,
          contractorDocument: null,
          contractorRepresentative: null,
          contractorAddress: null,
          contractorContact: null,
          paymentTerms,
          signatureData: signatureData ?? '',
        })
      ).data,
    onSuccess: (dto) => {
      // Atualiza a tela com o contrato assinado (texto regenerado + evidências).
      queryClient.setQueryData(['contract', booking.id], dto)
      setReSigning(false)
      toast.success('Contrato assinado e registrado com as evidências de assinatura!')
    },
    onError: (e) => toast.error(extractApiError(e)),
  })

  const handleSign = () => {
    if (!artistDocument.trim()) return toast.warning('Informe o CPF/CNPJ do artista')
    if (!artistAddress.trim()) return toast.warning('Informe o endereço do artista')
    if (!artistContact.trim()) return toast.warning('Informe o telefone/e-mail do artista')
    if (!paymentTerms.trim()) return toast.warning('Informe a forma e o prazo de pagamento')
    if (!signatureData) return toast.warning('Desenhe sua assinatura no quadro')
    sign.mutate()
  }

  const downloadHtml = () => {
    const html = buildContractHtml(contract)
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `contrato-${booking.id.slice(0, 8)}.html`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-4">
      {contract.signed ? (
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="success" className="gap-1">
            <ShieldCheck className="h-3.5 w-3.5" /> Contrato assinado
          </Badge>
          <Button variant="outline" size="sm" onClick={() => void downloadPdf()}>
            <Download /> Baixar PDF
          </Button>
          <Button variant="outline" size="sm" onClick={downloadHtml}>
            <Download /> Baixar .html
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setReSigning(true)}>
            <PenLine /> Reassinar contrato
          </Button>
        </div>
      ) : (
        <div className="rounded-md border border-amber-500/60 bg-amber-50 px-4 py-3 text-sm dark:border-amber-500/40 dark:bg-amber-950/40">
          <p className="flex items-center gap-2 font-semibold text-amber-800 dark:text-amber-300">
            <PenLine className="h-4 w-4" /> Contrato aguardando assinatura
          </p>
          <p className="mt-1 text-amber-800/90 dark:text-amber-200/90">
            Confira os dados, desenhe sua assinatura e salve. Os dados do contratante podem ser preenchidos com
            base na negociação (ex.: pelo WhatsApp).
          </p>
        </div>
      )}

      {/* Dados para o contrato */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <FileSignature className="h-4 w-4" /> Dados do contrato
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Contratado(a) / Artista
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>CPF/CNPJ *</Label>
                <Input
                  value={artistDocument}
                  onChange={(e) => setArtistDocument(e.target.value)}
                  placeholder="000.000.000-00"
                  disabled={contract.signed}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Endereço *</Label>
                <Input
                  value={artistAddress}
                  onChange={(e) => setArtistAddress(e.target.value)}
                  placeholder="Rua, número — cidade/UF"
                  disabled={contract.signed}
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Telefone/E-mail *</Label>
                <Input
                  value={artistContact}
                  onChange={(e) => setArtistContact(e.target.value)}
                  placeholder="(41) 99999-0000 · voce@email.com"
                  disabled={contract.signed}
                />
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Forma e prazo de pagamento *</Label>
            <Textarea
              rows={2}
              value={paymentTerms}
              onChange={(e) => setPaymentTerms(e.target.value)}
              placeholder="Ex.: 50% na confirmação via PIX, 50% no dia do evento em dinheiro"
              disabled={contract.signed}
            />
          </div>
        </CardContent>
      </Card>

      {/* Assinatura */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <PenLine className="h-4 w-4" /> Assinatura eletrônica — {contract.artistName}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {contract.signed && contract.signatureData && !reSigning ? (
            <>
              <img
                src={contract.signatureData}
                alt={`Assinatura de ${contract.signedName}`}
                className="h-24 rounded-lg border bg-white"
              />
              <EvidencePanel contract={contract} />
            </>
          ) : (
            <>
              {reSigning && (
                <p className="text-xs text-amber-600 dark:text-amber-500">
                  Você está refazendo a assinatura — salvar vai substituir a anterior e regenerar o texto do contrato.
                </p>
              )}
              <SignaturePad onChange={setSignatureData} />
              <div className="flex gap-2">
                {reSigning && (
                  <Button variant="outline" onClick={() => setReSigning(false)}>
                    Voltar
                  </Button>
                )}
                <Button onClick={handleSign} disabled={sign.isPending}>
                  <PenLine /> {sign.isPending ? 'Assinando...' : reSigning ? 'Salvar nova assinatura' : 'Assinar contrato'}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Assinatura do contratante via link público */}
      {contract.signed && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Link2 className="h-4 w-4" /> Assinatura do contratante
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {contract.contractorSigned ? (
              <>
                <Badge variant="success" className="gap-1">
                  <ShieldCheck className="h-3.5 w-3.5" /> Assinado pelo contratante
                </Badge>
                {contract.contractorSignatureData && (
                  <img
                    src={contract.contractorSignatureData}
                    alt="Assinatura do contratante"
                    className="h-20 rounded-lg border bg-white"
                  />
                )}
                <div className="rounded-lg border bg-muted/40 p-3 text-xs text-muted-foreground">
                  <p>
                    Nome: <span className="font-medium text-foreground">{contract.contractorSignedName}</span>
                  </p>
                  {contract.contractorSignedDocument && (
                    <p>
                      CPF/CNPJ: <span className="font-medium text-foreground">{contract.contractorSignedDocument}</span>
                    </p>
                  )}
                  <p>
                    Data/hora:{' '}
                    <span className="font-medium text-foreground">
                      {contract.contractorSignedAtUtc ? formatDateTime(contract.contractorSignedAtUtc) : '—'} (UTC)
                    </span>
                  </p>
                  <p>
                    IP: <span className="font-mono">{contract.contractorSignedIp}</span>
                  </p>
                </div>
              </>
            ) : (
              <>
                <div className="flex gap-2">
                  <Input readOnly value={contractorLink ?? ''} className="font-mono text-xs" />
                  <Button type="button" variant="outline" size="icon" onClick={copyLink} title="Copiar link">
                    <Copy />
                  </Button>
                  <Button type="button" variant="outline" size="icon" onClick={shareWhatsapp} title="Enviar pelo WhatsApp">
                    <MessageCircle />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Envie este link ao contratante: ele visualiza o contrato e assina eletronicamente (com registro de
                  data/hora, IP e hash), sem precisar de cadastro.
                </p>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Texto integral do contrato */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldCheck className="h-4 w-4" /> Texto integral
          </CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="max-h-[28rem] overflow-y-auto whitespace-pre-wrap rounded-lg border bg-muted/40 p-4 font-serif text-xs leading-relaxed">
            {contract.contractText}
          </pre>
          <p className="mt-2 text-xs text-muted-foreground">
            Hash SHA-256 do documento: <span className="font-mono">{contract.contentHash}</span>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

function ContractReadOnly({ contract }: { contract: import('@/types').ArtistContract }) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={contract.signed ? 'success' : 'secondary'}>
          {contract.signed ? 'Contrato assinado pelo artista' : 'Contrato ainda não assinado'}
        </Badge>
      </div>
      <pre className="max-h-[32rem] overflow-y-auto whitespace-pre-wrap rounded-lg border bg-muted/40 p-4 font-serif text-xs leading-relaxed">
        {contract.contractText}
      </pre>
      {contract.signed && contract.signatureData && (
        <Card>
          <CardContent className="space-y-3 p-4">
            <img src={contract.signatureData} alt="Assinatura do artista" className="h-20 rounded-lg border bg-white" />
            <EvidencePanel contract={contract} />
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function EvidencePanel({ contract }: { contract: import('@/types').ArtistContract }) {
  return (
    <div className="rounded-lg border bg-muted/40 p-3 text-xs text-muted-foreground">
      <p className="mb-1 flex items-center gap-1.5 font-semibold text-foreground">
        <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" /> Evidências de assinatura eletrônica
      </p>
      <p>Assinado por: <span className="font-medium text-foreground">{contract.signedName}</span></p>
      <p className="text-sm text-muted-foreground">
        Data/hora: <span className="font-medium text-foreground">{contract.signedAtUtc ? formatDateTime(contract.signedAtUtc) : '—'} (UTC)</span>
      </p>
      <p>IP: <span className="font-mono">{contract.signedIp}</span></p>
      <p className="break-all">
        User-agent: <span className="font-mono">{contract.signedUserAgent}</span>
      </p>
      <p className="break-all">
        Hash SHA-256 do documento: <span className="font-mono">{contract.contentHash}</span>
      </p>
    </div>
  )
}

/** HTML autônomo para download/impressão do contrato assinado. */
function buildContractHtml(contract: import('@/types').ArtistContract): string {
  const escape = (t: string) =>
    t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const signatureImg = contract.signatureData
    ? `<img src="${contract.signatureData}" alt="Assinatura" style="height:90px;border:1px solid #ccc;border-radius:6px;background:#fff" />`
    : ''
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<title>Contrato — ${escape(contract.artisticName)} · ${escape(contract.eventDate)}</title>
<style>
  body { font-family: Georgia, 'Times New Roman', serif; max-width: 800px; margin: 40px auto; padding: 0 24px; color: #111; }
  pre { white-space: pre-wrap; font-family: inherit; font-size: 13px; line-height: 1.6; }
  .evidence { border: 1px solid #ddd; border-radius: 8px; padding: 12px; font-family: system-ui, sans-serif; font-size: 12px; color: #444; margin-top: 24px; }
  .hash { font-family: monospace; word-break: break-all; }
</style>
</head>
<body>
<pre>${escape(contract.contractText)}</pre>
<div class="evidence">
  <strong>Assinatura eletrônica</strong><br />
  Assinado por: ${escape(contract.signedName ?? '')}<br />
  Data/hora: ${contract.signedAtUtc ?? ''} (UTC)<br />
  IP: ${escape(contract.signedIp ?? '')}<br />
  User-agent: ${escape(contract.signedUserAgent ?? '')}<br />
  Hash SHA-256: <span class="hash">${escape(contract.contentHash)}</span><br />
  ${signatureImg}
</div>
</body>
</html>`
}
