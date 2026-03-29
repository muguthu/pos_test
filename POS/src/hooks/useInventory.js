import { useState, useEffect } from 'react'

export default function useInventory(){
  const [items, setItems] = useState(()=>{
    try{ const raw = localStorage.getItem('pos_inventory'); return raw ? JSON.parse(raw) : {} }catch(e){ return {} }
  })

  useEffect(()=>{ localStorage.setItem('pos_inventory', JSON.stringify(items)) }, [items])

  const setStock = (name, payload) => {
    setItems(prev => ({...prev, [name]: {...(prev[name]||{}), ...payload}}))
  }

  const removeStock = (name) => {
    setItems(prev => { const copy = {...prev}; delete copy[name]; return copy })
  }

  const adjust = (name, delta) => {
    setItems(prev => {
      const cur = prev[name] || {qty:0, unit: ''}
      return {...prev, [name]: {...cur, qty: (parseFloat(cur.qty)||0) + Number(delta)}}
    })
  }

  const exportCSV = () => {
    const header = ['name','qty','unit','reorder_threshold']
    const rows = Object.values(items).map(i=> header.map(h=> (i[h]??'')).join(','))
    return [header.join(','), ...rows].join('\n')
  }

  return { items, setItems, setStock, removeStock, adjust, exportCSV }
}
