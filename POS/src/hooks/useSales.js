import { useState, useEffect } from 'react'

export default function useSales(){
  const [receipts, setReceipts] = useState(()=>{
    try{ const raw = localStorage.getItem('pos_receipts'); return raw ? JSON.parse(raw) : [] }catch(e){ return [] }
  })

  useEffect(()=>{ localStorage.setItem('pos_receipts', JSON.stringify(receipts)) }, [receipts])

  const pushReceipt = (r) => setReceipts(prev => [r, ...prev])
  const removeReceipt = (id) => setReceipts(prev => prev.filter(r=>r.id !== id))
  const clearReceipts = ()=> setReceipts([])

  const topProducts = (days=30, limit=10)=>{
    const cutoff = Date.now() - (days*24*60*60*1000)
    const qtyMap = {}
    receipts.forEach(r=>{
      if(new Date(r.date).getTime() < cutoff) return
      (r.items||[]).forEach(it => {
        qtyMap[it.product.id] = (qtyMap[it.product.id] || 0) + it.qty
      })
    })
    return Object.entries(qtyMap).sort((a,b)=> b[1]-a[1]).slice(0,limit).map(([id,q])=>({id, qty:q}))
  }

  return { receipts, pushReceipt, removeReceipt, clearReceipts, topProducts }
}