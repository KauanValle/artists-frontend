import type { ArtistContract } from '@/types'
import { formatDateTime } from '@/lib/utils'

/**
 * Gera o PDF do contrato assinado (texto integral + assinaturas + evidências)
 * e dispara o download no navegador.
 */
export async function downloadContractPdf(contract: ArtistContract, fileName = 'contrato'): Promise<void> {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const marginX = 18
  const maxW = 174
  const maxY = 282
  let y = 20

  doc.setFont('times', 'normal')
  doc.setFontSize(10.5)

  // Controle de quem está assinando conforme a seção do documento
  let signer: 'artist' | 'contractor' | null = null

  for (const raw of contract.contractText.split('\n')) {
    if (raw.startsWith('CONTRATADO(A) / ARTISTA')) signer = 'artist'
    else if (raw.startsWith('CONTRATANTE / ESTABELECIMENTO')) signer = 'contractor'

    // "Assinatura: ___" vira a assinatura desenhada da parte correspondente
    if (raw.startsWith('Assinatura:')) {
      const img = signer === 'artist' ? contract.signatureData : signer === 'contractor' ? contract.contractorSignatureData : null
      if (img) {
        if (y > maxY - 18) {
          doc.addPage()
          y = 20
        }
        try {
          doc.addImage(img, 'PNG', marginX, y - 4, 55, 14)
          y += 16
          continue
        } catch {
          /* imagem inválida — imprime a linha normalmente */
        }
      }
    }

    const lines: string[] = doc.splitTextToSize(raw === '' ? ' ' : raw, maxW)
    for (const line of lines) {
      if (y > maxY) {
        doc.addPage()
        y = 20
      }
      doc.text(line, marginX, y)
      y += 4.6
    }
    y += 1.5
  }

  const evidence = [
    contract.signedName ? `Assinado por (artista): ${contract.signedName}` : null,
    contract.signedAtUtc ? `Data/hora (artista): ${formatDateTime(contract.signedAtUtc)} (UTC)` : null,
    contract.signedIp ? `IP (artista): ${contract.signedIp}` : null,
    contract.contractorSignedName ? `Assinado por (contratante): ${contract.contractorSignedName}` : null,
    contract.contractorSignedAtUtc ? `Data/hora (contratante): ${formatDateTime(contract.contractorSignedAtUtc)} (UTC)` : null,
    contract.contractorSignedIp ? `IP (contratante): ${contract.contractorSignedIp}` : null,
    `Hash SHA-256 do documento: ${contract.contentHash}`,
  ].filter((line): line is string => line !== null)

  if (y > maxY - evidence.length * 4.6 - 10) {
    doc.addPage()
    y = 20
  }
  doc.setFont('times', 'bold')
  doc.text('— Assinatura eletrônica —', marginX, y)
  y += 4.6
  for (const line of evidence) {
    if (y > maxY) {
      doc.addPage()
      y = 20
    }
    doc.text(line, marginX, y)
    y += 4.6
  }

  if (contract.signatureData) {
    if (y > maxY - 24) {
      doc.addPage()
      y = 20
    }
    try {
      doc.addImage(contract.signatureData, 'PNG', marginX, y, 60, 22)
      y += 26
    } catch {
      /* imagem inválida — segue sem ela */
    }
  }
  if (contract.contractorSignatureData) {
    try {
      doc.addImage(contract.contractorSignatureData, 'PNG', marginX, y, 60, 22)
    } catch {
      /* imagem inválida — segue sem ela */
    }
  }

  doc.save(`${fileName}.pdf`)
}
