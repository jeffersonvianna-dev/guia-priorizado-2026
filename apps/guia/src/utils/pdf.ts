/** Abre uma nova janela e dispara o diálogo de impressão/PDF */
export function openPrintWindow(html: string, filename: string): void {
  const w = window.open('about:blank', '_blank')
  if (!w) { alert('Permita pop-ups para gerar o PDF.'); return }
  w.document.title = 'SEDUC SP'
  w.document.open()
  w.document.write(html)
  w.document.close()
  setTimeout(() => { w.document.title = filename; w.print() }, 400)
}

/** CSS base compartilhado por todos os PDFs do Guia */
export const PDF_CSS = `
  body{font-family:'Segoe UI',sans-serif;color:#1a1f36;margin:36px;font-size:13px;line-height:1.5}
  h1{font-size:17px;margin:0 0 4px;color:#005BAC;font-weight:800}
  h2{font-size:11px;margin:20px 0 10px;color:#005BAC;font-weight:800;text-transform:uppercase;letter-spacing:.06em;border-bottom:2px solid #005BAC;padding-bottom:4px}
  .sub{font-size:12px;color:#6b7280;margin-bottom:24px}
  .ae-badge{display:inline-block;background:#fff3e8;color:#F47920;border:1px solid #f5c99a;border-radius:6px;padding:2px 10px;font-size:11px;font-weight:800;margin-right:8px;white-space:nowrap}
  .ae-block{margin-bottom:20px;padding:14px 16px;border:1px solid #e5e7eb;border-radius:8px;break-inside:avoid}
  .ae-header{display:flex;align-items:flex-start;gap:8px;margin-bottom:10px}
  .ae-titulo{font-weight:700;font-size:.9rem;flex:1}
  .campo{margin-bottom:8px}
  .campo-label{font-size:10px;font-weight:800;color:#9ca3af;text-transform:uppercase;letter-spacing:.05em;margin-bottom:3px}
  .chips{display:flex;flex-wrap:wrap;gap:4px}
  .chip{display:inline-block;border-radius:12px;padding:2px 8px;font-size:11px;font-weight:600;border:1px solid}
  .chip-blue{background:#e8f0fe;border-color:#c5d5f0;color:#1a1f36}
  .chip-blue-dark{background:#005BAC;color:#fff;border-color:#005BAC;font-weight:700}
  .chip-gray{background:#f3f4f6;border-color:#e5e7eb;color:#6b7280}
  .chip-aula{background:#f3f4f6;border-color:#e5e7eb;color:#374151}
  .bim-pill{display:inline-block;background:#fff4ed;border:1px solid #fed7aa;color:#f97316;border-radius:20px;padding:2px 10px;font-size:11px;font-weight:700;margin-bottom:8px}
  .grupo-header{display:inline-block;border-radius:4px;padding:2px 10px;font-size:10px;font-weight:800;color:#fff;margin-bottom:6px}
  .g1{background:#005BAC}.g2{background:#f97316}.g3{background:#16a34a}
  table{width:100%;border-collapse:collapse;margin:6px 0 14px}
  th{background:#005BAC;color:#fff;padding:7px 10px;text-align:left;font-size:11px;font-weight:700}
  td{padding:6px 10px;border-bottom:1px solid #e5e7eb;font-size:12px;vertical-align:top}
  tr:nth-child(even) td{background:#f8faff}
  .page-break{page-break-before:always;padding-top:8px}
  @media print{@page{margin:18mm}body{margin:0}.page-break{page-break-before:always}}
`

/** Botão "⬇ Baixar PDF" padrão — inline styles (sem classes CSS no guia) */
export const pdfButtonStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 6,
  background: '#005BAC', border: 'none',
  borderRadius: 20, padding: '5px 14px', cursor: 'pointer',
  fontSize: '.8rem', color: '#fff', fontWeight: 700,
  boxShadow: '0 1px 4px rgba(0,91,172,.25)',
}
