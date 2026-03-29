import React, {useState} from 'react'

export default function ReceiptPreview({open, receipt, onClose}){
  if(!open || !receipt) return null
  const [pdfGenerating, setPdfGenerating] = useState(false)

  const rows = (receipt.items||[]).map(it=> `<tr><td style="padding:6px 0">${it.qty} x ${it.product.name}</td><td style="padding:6px 0;text-align:right">$${(it.qty*it.product.price).toFixed(2)}</td></tr>`).join('')

  const html = `<!doctype html><html><head><meta charset="utf-8"><title>Receipt ${receipt.id}</title>
      <style>
        body{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial; color:#07263f; padding:20px }
        .header{ font-size:20px; font-weight:800; color:#00467f }
        .muted{ color:#6b8599; font-size:12px }
        table{ width:100%; border-collapse:collapse; margin-top:12px }
        td{ border-bottom: 1px solid #eee }
        .totals{ margin-top:12px }
      </style>
    </head><body>
      <div class="header">${receipt.storeName}</div>
      <div class="muted">${receipt.date}${receipt.table ? ' • '+receipt.table : ''}</div>
      <hr/>
      <table>
        ${rows}
      </table>
      <div class="totals">
        <div>Subtotal: $${receipt.subtotal.toFixed(2)}</div>
        <div>Tax: $${receipt.tax.toFixed(2)}</div>
        <div><strong>Total: $${receipt.total.toFixed(2)}</strong></div>
        <div>Paid: $${receipt.tendered?.toFixed?.(2) || ''} (${receipt.paymentMethod || ''})</div>
        <div>Change: $${receipt.change?.toFixed?.(2) || ''}</div>
      </div>
      <hr/>
      <div class="muted">Receipt ID: ${receipt.id}</div>
    </body></html>`

  const openInNewTab = () => {
    try{
      const blob = new Blob([html], {type:'text/html'})
      const url = URL.createObjectURL(blob)
      window.open(url, '_blank')
    }catch(e){ alert('Unable to open new tab: '+e.message) }
  }

  const downloadHTML = () => {
    const blob = new Blob([html], {type:'text/html'})
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `receipt-${receipt.id}.html`
    a.click()
    URL.revokeObjectURL(url)
  }

  const downloadPDF = async () => {
    setPdfGenerating(true)
    try{
      let html2canvasLib = null
      let jsPDFLib = null

      // try local packages first
      try{
        const html2canvasMod = await import('html2canvas')
        html2canvasLib = html2canvasMod?.default || html2canvasMod
        const jspdfMod = await import('jspdf')
        jsPDFLib = jspdfMod?.jsPDF || jspdfMod?.default?.jsPDF || jspdfMod?.default || jspdfMod
      }catch(localErr){
        // fallback to CDN/UMD if local imports not available
        try{
          const html2canvasCdn = await import('https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js')
          html2canvasLib = html2canvasCdn?.default || window.html2canvas || html2canvasCdn
        }catch(e){}
        try{
          const jspdfCdn = await import('https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js')
          jsPDFLib = jspdfCdn?.jspdf ? jspdfCdn.jspdf.jsPDF : (jspdfCdn?.jsPDF || window.jspdf?.jsPDF || window.jsPDF)
        }catch(e){}
      }

      if(!html2canvasLib || !jsPDFLib) throw new Error('PDF libraries not available')

      const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i)
      const bodyHtml = bodyMatch ? bodyMatch[1] : html
      const container = document.createElement('div')
      container.style.position = 'fixed'
      container.style.left = '-9999px'
      container.style.width = '800px'
      container.style.background = '#fff'
      container.innerHTML = bodyHtml
      document.body.appendChild(container)
      const canvas = await html2canvasLib(container, {scale:2, useCORS:true})
      const imgData = canvas.toDataURL('image/png')

      // multi-page PDF using A4
      const pdf = new jsPDFLib('p', 'pt', 'a4')
      const pageWidth = pdf.internal.pageSize.getWidth()
      const pageHeight = pdf.internal.pageSize.getHeight()

      const imgW = canvas.width
      const imgH = canvas.height
      const ratio = pageWidth / imgW
      const imgHOnPage = imgH * ratio

      let position = 0
      pdf.addImage(imgData, 'PNG', 0, position, pageWidth, imgHOnPage)
      let remaining = imgHOnPage
      while(remaining > pageHeight){
        position -= pageHeight
        pdf.addPage()
        pdf.addImage(imgData, 'PNG', 0, position, pageWidth, imgHOnPage)
        remaining -= pageHeight
      }

      pdf.save(`receipt-${receipt.id}.pdf`)
      document.body.removeChild(container)
    }catch(e){
      console.error(e)
      alert('Unable to generate PDF automatically. Install html2canvas and jspdf with npm, or open the printable page and choose "Save as PDF".')
    }finally{
      setPdfGenerating(false)
    }
  }

  const printInPlace = () => {
    window.print()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e=>e.stopPropagation()} style={{maxWidth:700}}>
        <h3>Receipt preview</h3>
        <div style={{marginBottom:12}}>
          <div style={{fontWeight:700, color:'var(--text)'}}>{receipt.storeName}</div>
          <div style={{fontSize:12, color:'var(--muted)'}}>{receipt.date} {receipt.table ? `• ${receipt.table}` : ''}</div>
        </div>

        <div style={{maxHeight:320, overflow:'auto', borderTop:'1px solid rgba(0,0,0,0.06)', paddingTop:8}}>
          <table style={{width:'100%'}}>
            <tbody dangerouslySetInnerHTML={{__html: rows}} />
          </table>

          <div style={{marginTop:12}}>
            <div style={{display:'flex', justifyContent:'space-between'}}><span>Subtotal</span><span>${receipt.subtotal.toFixed(2)}</span></div>
            <div style={{display:'flex', justifyContent:'space-between'}}><span>Tax</span><span>${receipt.tax.toFixed(2)}</span></div>
            <div style={{display:'flex', justifyContent:'space-between', marginTop:6, fontWeight:800}}><span>Total</span><span>${receipt.total.toFixed(2)}</span></div>
            <div style={{marginTop:6}}>Paid: <strong>{receipt.tendered?.toFixed?.(2) || ''}</strong> ({receipt.paymentMethod || ''})</div>
          </div>
        </div>

        <div style={{display:'flex', gap:8, marginTop:12}}>
          <style>{'@keyframes spin{to{transform:rotate(360deg)}}'}</style>
          <button className="btn primary" onClick={openInNewTab}>Open printable page</button>
          <button className="btn" onClick={printInPlace}>Print (current page)</button>
          <button className="btn" onClick={downloadHTML}>Download HTML</button>
          <button className="btn" onClick={downloadPDF} disabled={pdfGenerating}>
            {pdfGenerating ? (
              <span style={{display:'inline-flex',alignItems:'center',gap:8}}>
                <span style={{width:14,height:14,border:'2px solid rgba(0,0,0,0.12)', borderTop:'2px solid #000', borderRadius:14, animation:'spin 1s linear infinite'}}></span>
                Generating...
              </span>
            ) : 'Download PDF'}
          </button>
          <div style={{flex:1}} />
          <button className="btn clear" onClick={onClose} disabled={pdfGenerating}>Close</button>
        </div>

        <div style={{marginTop:8, fontSize:12, color: 'var(--muted)'}}>
          Tip: If the print dialog does not appear, open the printable page and use the browser Print (Ctrl/Cmd+P) from that tab.
        </div>
      </div>
    </div>
  )
}
