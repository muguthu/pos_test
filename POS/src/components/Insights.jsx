import React, {useMemo} from 'react'

export default function Insights({open, onClose, receipts, products, inventory}){
  if(!open) return null

  const top = useMemo(()=>{
    const map = {}
    receipts.forEach(r => (r.items||[]).forEach(it => map[it.product.id] = (map[it.product.id]||0) + it.qty ))
    return Object.entries(map).sort((a,b)=> b[1]-a[1]).map(([id,qty])=> ({id, qty, product: products.find(p=>p.id===id)})).slice(0,12)
  }, [receipts, products])

  // estimate daily consumption per ingredient over last 30 days
  const ingredientStats = useMemo(()=>{
    const last30 = Date.now() - 30 * 24*60*60*1000
    const ingMap = {}
    receipts.forEach(r=>{
      if(new Date(r.date).getTime() < last30) return
      (r.items||[]).forEach(it=>{
        const ing = it.product.ingredients || []
        ing.forEach(x=>{
          ingMap[x.name] = ingMap[x.name] || {used:0, unit: x.unit || ''}
          ingMap[x.name].used += (parseFloat(x.qty)||0) * it.qty
        })
      })
    })

    // compute days left at current stock
    return Object.entries(ingMap).map(([name, val])=>{
      const stock = (inventory[name] && parseFloat(inventory[name].qty)) || 0
      const used = val.used
      const daily = used / 30
      const daysLeft = daily > 0 ? Math.round(stock / daily) : Infinity
      return { name, used, daily: +(daily||0).toFixed(2), daysLeft, unit: val.unit, stock }
    }).sort((a,b)=> a.daysLeft - b.daysLeft)
  }, [receipts, inventory])

  const needReorder = ingredientStats.filter(i=> i.daysLeft !== Infinity && i.daysLeft < 7)

  return (
    <div className="modal-overlay" onClick={onClose}><div className="modal" onClick={e=>e.stopPropagation()}>
      <h3>Insights</h3>

      <div style={{display:'flex',gap:12}}>
        <section style={{flex:1}}>
          <h4>Top sold items (all time)</h4>
          <div style={{display:'grid', gap:8}}>
            {top.map(t=> (
              <div key={t.id} style={{display:'flex',justifyContent:'space-between'}}>
                <div>{t.product?.name || t.id}</div>
                <div style={{fontWeight:700}}>{t.qty}</div>
              </div>
            ))}
            {top.length === 0 && <div className="empty">No sales yet</div>}
          </div>
        </section>

        <aside style={{width:360}}>
          <h4>Reorder suggestions</h4>
          {needReorder.length === 0 && <div className="empty">Inventory healthy</div>}
          {needReorder.map(i=> (
            <div key={i.name} style={{display:'flex',justifyContent:'space-between', gap:8}}>
              <div style={{fontSize:13}}>{i.name} <div style={{fontSize:11,color:'#a89eea'}}>Stock: {i.stock}{i.unit ? ' '+i.unit: ''}</div></div>
              <div style={{textAlign:'right'}}>
                <div style={{fontWeight:800,color:'#ffddb1'}}>{i.daysLeft}d</div>
                <div style={{fontSize:12,color:'#cfc7e6'}}>Daily: {i.daily}{i.unit ? ' '+i.unit: ''}</div>
              </div>
            </div>
          ))}
        </aside>
      </div>

      <div style={{display:'flex',gap:8, marginTop:12}}>
        <button className="btn checkout" onClick={onClose}>Close</button>
      </div>
    </div></div>
  )
}
