import type { TicketOrderSummary } from '@/services'
import logoUrl from '@/assets/images/reprissa-logo.png'
import { formatDate, formatMoney, formatTime } from '@/lib/utils'

const VIOLET: [number, number, number] = [124, 58, 237]
const VIOLET_LIGHT: [number, number, number] = [167, 139, 250]
const DARK: [number, number, number] = [13, 13, 18]
const TEXT: [number, number, number] = [30, 30, 40]
const MUTED: [number, number, number] = [110, 110, 125]

const fmtCpf = (v: string) => v.replace(/\D/g, '').replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
const fmtPhone = (v: string) => {
  const d = v.replace(/\D/g, '')
  return d.length === 11 ? d.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3') : d.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3')
}

/** Código do ingresso em grupos de 4 (ex.: K7M2-QX9P-3FHD-8WNA). */
export function formatTicketCode(code: string): string {
  return code.replace(/(.{4})(?=.)/g, '$1-')
}

/** Carrega a logo (PNG branco, fundo transparente) como data URL para o jsPDF. */
async function loadLogo(): Promise<string | null> {
  try {
    const blob = await (await fetch(logoUrl)).blob()
    return await new Promise<string>((resolve, reject) => {
      const r = new FileReader()
      r.onload = () => resolve(String(r.result))
      r.onerror = () => reject(r.error)
      r.readAsDataURL(blob)
    })
  } catch {
    return null
  }
}

/**
 * Gera o PDF do ingresso (uma página por ingresso do pedido) e dispara o download.
 * Cada ingresso tem um código secreto próprio; o QR code contém só esse código e é lido na portaria.
 */
export async function downloadTicketPdf(order: TicketOrderSummary): Promise<void> {
  if (order.tickets.length < order.quantity) throw new Error('Os ingressos deste pedido ainda não foram emitidos.')
  const [{ jsPDF }, QRCode] = await Promise.all([import('jspdf'), import('qrcode')])
  const logo = await loadLogo()
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const W = 210
  const M = 16

  const unitPrice = order.quantity > 0 ? order.totalAmount / order.quantity : order.totalAmount
  const sameDay = order.eventStartDate === order.eventEndDate
  const when = sameDay
    ? `${formatDate(order.eventStartDate)} - ${formatTime(order.eventStartTime)} as ${formatTime(order.eventEndTime)}`
    : `${formatDate(order.eventStartDate)} ${formatTime(order.eventStartTime)} ate ${formatDate(order.eventEndDate)} ${formatTime(order.eventEndTime)}`
  const address = `${order.street}, ${order.number}${order.complement ? ` - ${order.complement}` : ''}`
  const address2 = `${order.neighborhood} - ${order.city}/${order.state} - CEP ${order.cep}`

  // Logo da reprissa desenhada em vetor (mesmas formas do símbolo do site).
  const drawLogo = (ox: number, oy: number, size: number) => {
    const s = size / 100
    const poly = (pts: [number, number][], color: [number, number, number]) => {
      doc.setFillColor(...color)
      const segs = pts.slice(1).map((p, i) => [(p[0] - pts[i][0]) * s, (p[1] - pts[i][1]) * s])
      doc.lines(segs, ox + pts[0][0] * s, oy + pts[0][1] * s, [1, 1], 'F', true)
    }
    poly([[2, 10], [56, 3], [70, 20], [42, 44], [2, 32]], VIOLET_LIGHT)
    poly([[2, 38], [40, 60], [2, 82]], VIOLET)
    poly([[36, 40], [66, 26], [94, 94], [62, 86]], VIOLET)
  }

  const label = (text: string, x: number, y: number) => {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.setTextColor(...VIOLET)
    doc.text(text.toUpperCase(), x, y)
  }
  const value = (text: string, x: number, y: number, maxW = 120, size = 11, bold = false) => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal')
    doc.setFontSize(size)
    doc.setTextColor(...TEXT)
    const lines: string[] = doc.splitTextToSize(text || '-', maxW)
    doc.text(lines, x, y)
    return y + lines.length * (size * 0.42)
  }

  for (let n = 1; n <= order.quantity; n++) {
    if (n > 1) doc.addPage()
    const issued = order.tickets.find((t) => t.sequence === n) ?? order.tickets[n - 1]
    const code = formatTicketCode(issued.code)

    // Cabeçalho
    doc.setFillColor(...DARK)
    doc.rect(0, 0, W, 38, 'F')
    if (logo) {
      doc.addImage(logo, 'PNG', M - 2, 11.5, 60, 15) // proporção original 683x171
    } else {
      drawLogo(M, 8, 22)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(22)
      doc.setTextColor(255, 255, 255)
      doc.text('reprissa', M + 27, 22)
    }
    doc.setFontSize(10)
    doc.setTextColor(...VIOLET_LIGHT)
    doc.text('INGRESSO', W - M, 18, { align: 'right' })
    doc.setFontSize(9)
    doc.setTextColor(200, 200, 215)
    doc.text(`${n} de ${order.quantity}`, W - M, 24, { align: 'right' })
    doc.setFillColor(...VIOLET)
    doc.rect(0, 38, W, 2, 'F')

    // Evento
    let y = 56
    label('Evento', M, y)
    y = value(order.eventName, M, y + 8, W - 2 * M, 20, true)

    y += 6
    label('Data e horario', M, y)
    y = value(when, M, y + 6, W - 2 * M, 12)

    y += 5
    label('Local', M, y)
    y = value(order.venue, M, y + 6, W - 2 * M, 12, true)
    y = value(address, M, y + 1, W - 2 * M, 10)
    y = value(address2, M, y + 0.5, W - 2 * M, 10)

    // Linha pontilhada de "destaque"
    y += 8
    doc.setDrawColor(190, 190, 205)
    doc.setLineDashPattern([1.5, 1.5], 0)
    doc.line(M, y, W - M, y)
    doc.setLineDashPattern([], 0)
    y += 10

    // Ingresso + QR code
    const qrSize = 52
    const qr = await QRCode.toDataURL(issued.code, { margin: 1, width: 400, errorCorrectionLevel: 'M' })
    doc.addImage(qr, 'PNG', W - M - qrSize, y - 4, qrSize, qrSize)
    doc.setFont('courier', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(...TEXT)
    doc.text(code, W - M - qrSize / 2, y + qrSize + 3, { align: 'center' })

    const colW = W - 2 * M - qrSize - 8
    label('Tipo de ingresso', M, y)
    let yy = value(order.ticketTitle, M, y + 6, colW, 13, true)
    yy += 4
    label('Valor', M, yy)
    yy = value(unitPrice === 0 ? 'Gratuito' : formatMoney(unitPrice), M, yy + 6, colW, 12)

    yy += 4
    label('Titular', M, yy)
    yy = value(order.buyerName, M, yy + 6, colW, 12, true)
    yy += 3
    label('CPF', M, yy)
    yy = value(fmtCpf(order.buyerCpf), M, yy + 6, colW, 11)
    yy += 3
    label('E-mail', M, yy)
    yy = value(order.buyerEmail, M, yy + 6, colW, 11)
    yy += 3
    label('Telefone', M, yy)
    yy = value(fmtPhone(order.buyerPhone), M, yy + 6, colW, 11)

    yy = Math.max(yy, y + qrSize + 10) + 6
    label('Produtor', M, yy)
    yy = value(order.producerName, M, yy + 6, W - 2 * M, 11)

    // Rodapé
    doc.setDrawColor(230, 230, 240)
    doc.line(M, 268, W - M, 268)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    doc.setTextColor(...MUTED)
    const foot: string[] = doc.splitTextToSize(
      `Pedido ${order.id.toUpperCase()} - Apresente este ingresso (QR code) na entrada, junto de um documento com foto. ` +
        'Cada QR code e individual, vale para uma pessoa e so pode ser usado uma vez.',
      W - 2 * M
    )
    doc.text(foot, M, 274)
    doc.text('reprissa.com.br', W - M, 289, { align: 'right' })
  }

  doc.save(getTicketPdfFileName(order))
}

/** Gera o nome padronizado do arquivo PDF. */
export function getTicketPdfFileName(order: TicketOrderSummary): string {
  return `ingresso-${order.eventName.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').toLowerCase()}-${order.id.slice(0, 8)}.pdf`
}

/**
 * Gera o PDF do ingresso e retorna como string base64 (sem o prefixo data:).
 * Usado para enviar o PDF por email via backend.
 */
export async function generateTicketPdfBase64(order: TicketOrderSummary): Promise<string> {
  if (order.tickets.length < order.quantity) throw new Error('Os ingressos deste pedido ainda não foram emitidos.')
  const [{ jsPDF }, QRCode] = await Promise.all([import('jspdf'), import('qrcode')])
  const logo = await loadLogo()
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const W = 210
  const M = 16

  const unitPrice = order.quantity > 0 ? order.totalAmount / order.quantity : order.totalAmount
  const sameDay = order.eventStartDate === order.eventEndDate
  const when = sameDay
    ? `${formatDate(order.eventStartDate)} - ${formatTime(order.eventStartTime)} as ${formatTime(order.eventEndTime)}`
    : `${formatDate(order.eventStartDate)} ${formatTime(order.eventStartTime)} ate ${formatDate(order.eventEndDate)} ${formatTime(order.eventEndTime)}`
  const address = `${order.street}, ${order.number}${order.complement ? ` - ${order.complement}` : ''}`
  const address2 = `${order.neighborhood} - ${order.city}/${order.state} - CEP ${order.cep}`

  const drawLogo = (ox: number, oy: number, size: number) => {
    const s = size / 100
    const poly = (pts: [number, number][], color: [number, number, number]) => {
      doc.setFillColor(...color)
      const segs = pts.slice(1).map((p, i) => [(p[0] - pts[i][0]) * s, (p[1] - pts[i][1]) * s])
      doc.lines(segs, ox + pts[0][0] * s, oy + pts[0][1] * s, [1, 1], 'F', true)
    }
    poly([[2, 10], [56, 3], [70, 20], [42, 44], [2, 32]], VIOLET_LIGHT)
    poly([[2, 38], [40, 60], [2, 82]], VIOLET)
    poly([[36, 40], [66, 26], [94, 94], [62, 86]], VIOLET)
  }

  const label = (text: string, x: number, y: number) => {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.setTextColor(...VIOLET)
    doc.text(text.toUpperCase(), x, y)
  }
  const value = (text: string, x: number, y: number, maxW = 120, size = 11, bold = false) => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal')
    doc.setFontSize(size)
    doc.setTextColor(...TEXT)
    const lines: string[] = doc.splitTextToSize(text || '-', maxW)
    doc.text(lines, x, y)
    return y + lines.length * (size * 0.42)
  }

  for (let n = 1; n <= order.quantity; n++) {
    if (n > 1) doc.addPage()
    const issued = order.tickets.find((t) => t.sequence === n) ?? order.tickets[n - 1]
    const code = formatTicketCode(issued.code)

    doc.setFillColor(...DARK)
    doc.rect(0, 0, W, 38, 'F')
    if (logo) {
      doc.addImage(logo, 'PNG', M - 2, 11.5, 60, 15)
    } else {
      drawLogo(M, 8, 22)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(22)
      doc.setTextColor(255, 255, 255)
      doc.text('reprissa', M + 27, 22)
    }
    doc.setFontSize(10)
    doc.setTextColor(...VIOLET_LIGHT)
    doc.text('INGRESSO', W - M, 18, { align: 'right' })
    doc.setFontSize(9)
    doc.setTextColor(200, 200, 215)
    doc.text(`${n} de ${order.quantity}`, W - M, 24, { align: 'right' })
    doc.setFillColor(...VIOLET)
    doc.rect(0, 38, W, 2, 'F')

    let y = 56
    label('Evento', M, y)
    y = value(order.eventName, M, y + 8, W - 2 * M, 20, true)
    y += 6
    label('Data e horario', M, y)
    y = value(when, M, y + 6, W - 2 * M, 12)
    y += 5
    label('Local', M, y)
    y = value(order.venue, M, y + 6, W - 2 * M, 12, true)
    y = value(address, M, y + 1, W - 2 * M, 10)
    y = value(address2, M, y + 0.5, W - 2 * M, 10)

    y += 8
    doc.setDrawColor(190, 190, 205)
    doc.setLineDashPattern([1.5, 1.5], 0)
    doc.line(M, y, W - M, y)
    doc.setLineDashPattern([], 0)
    y += 10

    const qrSize = 52
    const qr = await QRCode.toDataURL(issued.code, { margin: 1, width: 400, errorCorrectionLevel: 'M' })
    doc.addImage(qr, 'PNG', W - M - qrSize, y - 4, qrSize, qrSize)
    doc.setFont('courier', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(...TEXT)
    doc.text(code, W - M - qrSize / 2, y + qrSize + 3, { align: 'center' })

    const colW = W - 2 * M - qrSize - 8
    label('Tipo de ingresso', M, y)
    let yy = value(order.ticketTitle, M, y + 6, colW, 13, true)
    yy += 4
    label('Valor', M, yy)
    yy = value(unitPrice === 0 ? 'Gratuito' : formatMoney(unitPrice), M, yy + 6, colW, 12)
    yy += 4
    label('Titular', M, yy)
    yy = value(order.buyerName, M, yy + 6, colW, 12, true)
    yy += 3
    label('CPF', M, yy)
    yy = value(fmtCpf(order.buyerCpf), M, yy + 6, colW, 11)
    yy += 3
    label('E-mail', M, yy)
    yy = value(order.buyerEmail, M, yy + 6, colW, 11)
    yy += 3
    label('Telefone', M, yy)
    yy = value(fmtPhone(order.buyerPhone), M, yy + 6, colW, 11)

    yy = Math.max(yy, y + qrSize + 10) + 6
    label('Produtor', M, yy)
    yy = value(order.producerName, M, yy + 6, W - 2 * M, 11)

    doc.setDrawColor(230, 230, 240)
    doc.line(M, 268, W - M, 268)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    doc.setTextColor(...MUTED)
    const foot: string[] = doc.splitTextToSize(
      `Pedido ${order.id.toUpperCase()} - Apresente este ingresso (QR code) na entrada, junto de um documento com foto. ` +
        'Cada QR code e individual, vale para uma pessoa e so pode ser usado uma vez.',
      W - 2 * M
    )
    doc.text(foot, M, 274)
    doc.text('reprissa.com.br', W - M, 289, { align: 'right' })
  }

  // Retorna base64 sem o prefixo "data:application/pdf;base64,"
  const dataUri = doc.output('datauristring')
  return dataUri.split(',')[1]
}
