import { useState, useEffect } from 'react'
import defaultProducts from '../data/products'

function genId(){ return `p${Date.now().toString(36)}${Math.floor(Math.random()*1000)}` }

export default function useProducts(){
  const [products, setProducts] = useState(()=> {
    try{
      const raw = localStorage.getItem('pos_products')
      return raw ? JSON.parse(raw) : defaultProducts
    }catch(e){
      return defaultProducts
    }
  })

  useEffect(()=>{
    localStorage.setItem('pos_products', JSON.stringify(products))
  }, [products])

  const addProduct = (p) => {
    const product = { ...p, id: p.id || genId() }
    setProducts(prev => [product, ...prev])
    return product
  }

  const updateProduct = (id, changes) => {
    setProducts(prev => prev.map(p => p.id === id ? {...p, ...changes} : p))
  }

  const removeProduct = (id) => setProducts(prev => prev.filter(p=>p.id !== id))

  const resetDefaults = () => {
    if(window.confirm('Reset product list to defaults? This will overwrite local changes.')){
      setProducts(defaultProducts)
    }
  }

  const exportCSV = () => {
    const header = ['id','sku','name','price','category','color']
    const rows = products.map(p => header.map(h => (p[h] ?? '')).join(','))
    return [header.join(','), ...rows].join('\n')
  }

  const importCSV = (text, mode='merge') => {
    // very simple CSV parser, expects header row
    const lines = text.split(/\r?\n/).map(l=>l.trim()).filter(Boolean)
    if(lines.length === 0) return
    const header = lines[0].split(',').map(h=>h.trim())
    const rows = lines.slice(1).map(line => {
      const cols = line.split(',')
      const obj = {}
      header.forEach((h,i)=> obj[h] = cols[i] ?? '')
      obj.price = parseFloat(obj.price) || 0
      if(!obj.id) obj.id = genId()
      return obj
    })

    if(mode === 'replace') setProducts(rows)
    else {
      // merge by id or SKU
      const map = {}
      products.forEach(p=> map[p.id] = p)
      rows.forEach(r => {
        if(r.id && map[r.id]) map[r.id] = {...map[r.id], ...r}
        else map[r.id] = r
      })
      setProducts(Object.values(map))
    }
  }

  return { products, setProducts, addProduct, updateProduct, removeProduct, resetDefaults, exportCSV, importCSV }
}
