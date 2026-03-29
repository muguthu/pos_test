import React, {useState} from 'react';
import ReceiptPreview from './ReceiptPreview'

export default function CheckoutModal({open, payload, onClose, onConfirm, onPrint}){
  if(!open || !payload) return null

  const { items, subtotal, tax, total } = payload
  const [tendered, setTendered] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('Cash')
  const [autoPrint, setAutoPrint] = useState(true)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewReceipt, setPreviewReceipt] = useState(null)

  const tenderedNum = parseFloat(tendered) || 0
  const change = +(tenderedNum - total).toFixed(2)

  const printReceipt = () => {
    const receipt = {
      id: `R-${Date.now()}`,
      storeName: 'Sugarplum Restaurant',
      date: new Date().toISOString(),      table: payload?.table || null,      items,
      subtotal,
      tax,
      total,
      tendered: tenderedNum,
      change,
      paymentMethod,
    }

    // persist via parent-provided handler if available (keeps hooks in sync)
    if(onPrint){
      try{ onPrint(receipt) }catch(e){ console.warn('onPrint failed', e) }
    }else{
      try{ const raw = localStorage.getItem('pos_receipts'); const arr = raw ? JSON.parse(raw) : []; arr.unshift(receipt); localStorage.setItem('pos_receipts', JSON.stringify(arr)) }catch(e){}
      try{
        const invRaw = localStorage.getItem('pos_inventory'); const inv = invRaw ? JSON.parse(invRaw) : {}
        receipt.items.forEach(it => {
          const ingredients = it.product.ingredients || []
          ingredients.forEach(ing => {
            const need = (parseFloat(ing.qty)||0) * it.qty
            if(!inv[ing.name]) inv[ing.name] = { qty: 0, unit: ing.unit || '' }
            inv[ing.name].qty = (parseFloat(inv[ing.name].qty)||0) - need
          })
        })
        localStorage.setItem('pos_inventory', JSON.stringify(inv))
      }catch(e){}
    }

    const rows = receipt.items.map(it=> `<tr><td style="padding:6px 0">${it.qty} x ${it.product.name}</td><td style="padding:6px 0;text-align:right">$${(it.qty*it.product.price).toFixed(2)}</td></tr>`).join('')
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Receipt ${receipt.id}</title>
      <style>
        body{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial; color:#111; padding:20px }
        .header{ font-size:20px; font-weight:800; color:#5b1db8 }
        .muted{ color:#666; font-size:12px }
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
        <div>Paid: $${receipt.tendered.toFixed(2)} (${receipt.paymentMethod})</div>
        <div>Change: $${receipt.change.toFixed(2)}</div>
      </div>
      <hr/>
      <div class="muted">Receipt ID: ${receipt.id}</div>
    </body></html>`

    const w = window.open('', '_blank', 'noopener,noreferrer')
    if(!w){
      // fallback: open preview within the app so user can print manually
      setPreviewReceipt(receipt)
      setPreviewOpen(true)
      return
    }
    try{
      w.document.open()
      w.document.write(html)
      w.document.close()
      w.focus()
      w.onload = () => { try{ w.print() }catch(e){ setPreviewReceipt(receipt); setPreviewOpen(true) } }
      setTimeout(()=>{ try{ w.print() }catch(e){ setPreviewReceipt(receipt); setPreviewOpen(true) } }, 300)
    }catch(e){ console.warn('print failed', e); setPreviewReceipt(receipt); setPreviewOpen(true) }
  }

  return (
    <>
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e)=>e.stopPropagation()}>
        <h3>Checkout</h3>

        <div className="modal-body">
          <div className="items">
            {items.map(it=> (
              <div key={it.product.id} style={{display:'flex', justifyContent:'space-between', padding:'6px 0'}}>
                <div>{it.qty} x {it.product.name}</div>
                <div style={{fontWeight:800}}>${(it.qty*it.product.price).toFixed(2)}</div>
              </div>
            ))}
          </div>

          <div style={{marginTop:12}}>
            <div style={{display:'flex', justifyContent:'space-between'}}><span>Subtotal</span><span>${subtotal.toFixed(2)}</span></div>
            <div style={{display:'flex', justifyContent:'space-between'}}><span>Tax</span><span>${tax.toFixed(2)}</span></div>
            <div style={{display:'flex', justifyContent:'space-between', marginTop:6, fontWeight:800}}><span>Total</span><span>${total.toFixed(2)}</span></div>
          </div>

          <div style={{marginTop:12, display:'flex', gap:8, alignItems:'center'}}>
            <input style={{flex:1, padding:8, borderRadius:8, border:'1px solid rgba(255,255,255,0.04)', background:'transparent', color:'inherit'}} placeholder="Amount tendered" value={tendered} onChange={(e)=>setTendered(e.target.value)} />
            <select value={paymentMethod} onChange={(e)=>setPaymentMethod(e.target.value)} style={{padding:8, borderRadius:8}}>
              <option>Cash</option>
              <option>Card</option>
              <option>Other</option>
            </select>
          </div>

          <div style={{marginTop:8}}>Change: <strong style={{color:'#e9d9ff'}}>${isNaN(change) ? '0.00' : change.toFixed(2)}</strong></div>

          <div style={{marginTop:12, display:'flex', gap:8}}>
            <button className="btn checkout" onClick={()=>{ printReceipt(); }}>Print Receipt</button>
            <label style={{display:'flex', alignItems:'center', gap:8, marginLeft:6}}>
              <input type="checkbox" checked={autoPrint} onChange={(e)=>setAutoPrint(e.target.checked)} /> Auto-print on confirm
            </label>
            <button className="btn" onClick={()=>{ setPreviewReceipt({
              id: `R-${Date.now()}`,
              storeName: 'Sugarplum Restaurant',
              date: new Date().toLocaleString(),
              table: payload?.table || null,
              items,
              subtotal,
              tax,
              total,
              tendered: parseFloat(tendered) || 0,
              change: change,
              paymentMethod,
            }); setPreviewOpen(true); }} style={{marginLeft:6}}>Preview</button>
          </div>

        </div>

        <div style={{display:'flex', gap:8, marginTop:12}}>
          <button className="btn checkout" onClick={()=> onConfirm({tendered: tendered ? parseFloat(tendered):0, paymentMethod, change: isNaN(change)?0:change, printOnConfirm:autoPrint})}>Confirm Payment</button>
          <button className="btn clear" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>

<ReceiptPreview open={previewOpen} receipt={previewReceipt} onClose={()=>{ setPreviewOpen(false); setPreviewReceipt(null) }} />
</>
    )
}
