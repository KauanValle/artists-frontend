import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { CheckCircle2, Download, PenLine, ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'
import { publicContractsApi } from '@/services'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SignaturePad } from '@/components/ui/signature-pad'
import { formatDate, formatDateTime } from '@/lib/utils'
import { extractApiError } from '@/services/api'
import { downloadContractPdf } from '@/lib/contract-pdf'

/**
 * Página pública (sem cadastro) onde o CONTRATANTE visualiza o contrato gerado pelo artista
 * e assina eletronicamente. O token do link é a credencial de acesso.
 */
export function ContractorSigningPage() {
  const { token } = useParams<{ token: string }>()
  const queryClient = useQueryClient()

  const { data: contract, isLoading, error } = useQuery({
    queryKey: ['public-contract', token],
    queryFn: async () => (await publicContractsApi.getByToken(token!)).data,
    enabled: !!token,
    retry: false,
  })

  const [signedName, setSignedName] = useState('')
  const [signedDocument, setSignedDocument] = useState('')
  const [signedAddress, setSignedAddress] = useState('')
  const [signedContact, setSignedContact] = useState('')
  const [representative, setRepresentative] = useState('')
  const [signatureData, setSignatureData] = useState<string | null>(null)

  const sign = useMutation({
    mutationFn: async () =>
      (
        await publicContractsApi.sign(token!, {
          signedName,
          signedDocument,
          signedAddress,
          signedContact,
          representative: representative || null,
          signatureData: signatureData ?? '',
        })
      ).data,
    onSuccess: (dto) => {
      // Atualiza a página com o contrato assinado pelas duas partes, sem recarregar.
      queryClient.setQueryData(['public-contract', token], dto)
      toast.success('Contrato assinado com sucesso!')
    },
    onError: (e) => toast.error(extractApiError(e)),
  })

  const handleSign = () => {
    if (!signedName.trim()) return toast.warning('Informe seu nome completo')
    if (!signedDocument.trim()) return toast.warning('Informe seu CPF/CNPJ')
    if (!signedAddress.trim()) return toast.warning('Informe seu endereço')
    if (!signedContact.trim()) return toast.warning('Informe seu telefone/e-mail')
    if (!signatureData) return toast.warning('Desenhe sua assinatura no quadro')
    sign.mutate()
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  if (error || !contract) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <h1 className="text-2xl font-bold">Contrato não encontrado</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Este link é inválido ou expirou. Solicite um novo link ao artista.
        </p>
        <Button className="mt-6" asChild>
          <Link to="/">Voltar ao início</Link>
        </Button>
      </div>
    )
  }

  const artistSigned = contract.signed
  const contractorSigned = contract.contractorSigned

  return (
    <div className="mx-auto max-w-3xl px-4 pb-16 pt-8">
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold">Contrato de Prestação de Serviços Artísticos</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {contract.artisticName} · Evento em {formatDate(contract.eventDate)} às {contract.startTime} ·{' '}
          {contract.location}
        </p>
        <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
          <Badge variant={artistSigned ? 'success' : 'secondary'} className="gap-1">
            <ShieldCheck className="h-3.5 w-3.5" />
            {artistSigned ? 'Assinado pelo artista' : 'Aguardando artista'}
          </Badge>
          <Badge variant={contractorSigned ? 'success' : 'secondary'} className="gap-1">
            <PenLine className="h-3.5 w-3.5" />
            {contractorSigned ? 'Assinado pelo contratante' : 'Aguardando contratante'}
          </Badge>
        </div>
      </div>

      {contractorSigned ? (
        <Card>
          <CardContent className="space-y-4 p-6">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-8 w-8 text-emerald-500" />
              <p className="text-lg font-semibold">Contrato assinado por ambas as partes!</p>
            </div>
            {contract.signatureData && (
              <img src={contract.signatureData} alt="Assinatura do artista" className="h-20 rounded-lg border bg-white" />
            )}
            {contract.contractorSignatureData && (
              <img
                src={contract.contractorSignatureData}
                alt="Assinatura do contratante"
                className="h-20 rounded-lg border bg-white"
              />
            )}
            <EvidenceBlock
              title="Assinatura do artista"
              name={contract.signedName}
              document={null}
              at={contract.signedAtUtc}
              ip={contract.signedIp}
              hash={contract.contentHash}
            />
            <EvidenceBlock
              title="Assinatura do contratante"
              name={contract.contractorSignedName}
              document={contract.contractorSignedDocument}
              at={contract.contractorSignedAtUtc}
              ip={contract.contractorSignedIp}
              hash={contract.contractorContentHash ?? contract.contentHash}
            />
            <Button variant="outline" onClick={() => void downloadContractPdf(contract, 'contrato-assinado')}>
              <Download /> Baixar contrato em PDF
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {!artistSigned && (
            <div className="mb-4 rounded-md border border-amber-500/60 bg-amber-50 px-4 py-3 text-sm dark:bg-amber-950/40">
              O artista ainda não assinou este contrato. Você já pode visualizar o documento abaixo — a sua assinatura
              será registrada com data/hora, IP e hash do documento.
            </div>
          )}

          <Card className="mb-6">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <PenLine className="h-4 w-4" /> Assinatura do contratante
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Nome completo *</Label>
                  <Input value={signedName} onChange={(e) => setSignedName(e.target.value)} placeholder="Seu nome completo" />
                </div>
                <div className="space-y-1.5">
                  <Label>CPF/CNPJ *</Label>
                  <Input value={signedDocument} onChange={(e) => setSignedDocument(e.target.value)} placeholder="000.000.000-00" />
                </div>
                <div className="space-y-1.5">
                  <Label>Endereço *</Label>
                  <Input value={signedAddress} onChange={(e) => setSignedAddress(e.target.value)} placeholder="Rua, número — cidade/UF" />
                </div>
                  <div className="space-y-1.5">
                      <Label>Telefone *</Label>
                      <Input
                          value={signedContact}
                          onChange={(e) => {
                              const rawValue = e.target.value.replace(/\D/g, ''); // Remove tudo que não for número
                              if (rawValue.length <= 11) {
                                  const maskedValue = rawValue.replace(
                                      /^(\d{2})(\d{5})(\d{0,4})$/,
                                      '($1) $2-$3'
                                  ); // Aplica a máscara
                                  setSignedContact(rawValue); // Armazena o valor sem máscara
                                  e.target.value = maskedValue; // Mostra o valor com máscara
                              }
                          }}
                          placeholder="(41) 99999-0000"
                          maxLength={15} // Limita o número de caracteres exibidos
                      />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                  <Label>Representante legal, se aplicável</Label>
                  <Input value={representative} onChange={(e) => setRepresentative(e.target.value)} placeholder="Nome do representante" />
                </div>
              </div>
              <SignaturePad onChange={setSignatureData} />
              <Button className="w-full" onClick={handleSign} disabled={sign.isPending}>
                <PenLine /> {sign.isPending ? 'Assinando...' : 'Assinar contrato'}
              </Button>
            </CardContent>
          </Card>
        </>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Texto integral do contrato</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="max-h-[32rem] overflow-y-auto whitespace-pre-wrap rounded-lg border bg-muted/40 p-4 font-serif text-xs leading-relaxed">
            {contract.contractText}
          </pre>
        </CardContent>
      </Card>
    </div>
  )
}

function EvidenceBlock({
  title,
  name,
  document,
  at,
  ip,
  hash,
}: {
  title: string
  name: string | null
  document: string | null
  at: string | null
  ip: string | null
  hash: string | null
}) {
  return (
    <div className="rounded-lg border bg-muted/40 p-3 text-xs text-muted-foreground">
      <p className="mb-1 font-semibold text-foreground">{title}</p>
      <p>
        Nome: <span className="font-medium text-foreground">{name ?? '—'}</span>
      </p>
      {document && (
        <p>
          CPF/CNPJ: <span className="font-medium text-foreground">{document}</span>
        </p>
      )}
      <p>
        Data/hora: <span className="font-medium text-foreground">{at ? formatDateTime(at) : '—'} (UTC)</span>
      </p>
      <p>
        IP: <span className="font-mono">{ip ?? '—'}</span>
      </p>
      <p className="break-all">
        Hash SHA-256: <span className="font-mono">{hash ?? '—'}</span>
      </p>
    </div>
  )
}
