import React, {useState, useMemo, useEffect} from 'react'
import './App.css'
import Header from './components/Header'
import ProductGrid from './components/ProductGrid'
import Cart from './components/Cart'
import CheckoutModal from './components/CheckoutModal'
import AdminPanel from './components/AdminPanel'
import Insights from './components/Insights'
import ErrorBoundary from './components/ErrorBoundary'
import ReceiptPreview from './components/ReceiptPreview'
import Tables from './components/Tables'
import Login from './components/Login'
import useProducts from './hooks/useProducts'
import useAuth from './hooks/useAuth'
import useSales from './hooks/useSales'
import useInventory from './hooks/useInventory'

function App(){
  console.log('App rendering', {env: typeof window !== 'undefined' ? 'browser':'no-window'})
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')


  // products hook providing management & CSV import/export
  const { products, addProduct, updateProduct, removeProduct, resetDefaults, exportCSV, importCSV } = useProducts()
  const auth = useAuth()

  // initialize theme from saved preference
  React.useEffect(()=>{
    try{
      const t = localStorage.getItem('pos_theme') || 'light'
      if(t === 'dark') document.documentElement.classList.add('theme-dark')
      else document.documentElement.classList.remove('theme-dark')
    }catch(e){}
  },[])

  // tables
  const defaultTables = Array.from({length:12}).map((_,i)=> ({id:`t${i+1}`, name:`Table ${i+1}`}))
  const [tables] = useState(defaultTables)

  // carts stored per table id (also supports 'counter')
  const [carts, setCarts] = useState(()=>{
    try{ return JSON.parse(localStorage.getItem('pos_carts') || '{}') }catch(e){ return {} }
  })
  const [currentTable, setCurrentTable] = useState('t1')

  useEffect(()=>{ try{ localStorage.setItem('pos_carts', JSON.stringify(carts)) }catch(e){} }, [carts])

  const getCart = (tableId = currentTable) => carts[tableId] || {}
  const updateCart = (tableId, cb) => {
    setCarts(prev => { const copy = {...prev}; copy[tableId] = cb(copy[tableId] || {}); return copy })
  }

  // merge multiple source tables into a target table and remove source carts
  const combineTables = (targetTableId, sourceTableIds=[]) => {
    if(!targetTableId || !Array.isArray(sourceTableIds) || sourceTableIds.length === 0) return
    setCarts(prev => {
      const copy = {...prev}
      if(!copy[targetTableId]) copy[targetTableId] = {}
      sourceTableIds.forEach(id => {
        if(id === targetTableId) return
        const src = copy[id] || {}
        Object.keys(src).forEach(key => {
          const it = src[key]
          if(copy[targetTableId][key]) copy[targetTableId][key].qty += it.qty
          else copy[targetTableId][key] = {...it}
        })
        // remove the source cart
        delete copy[id]
      })
      return copy
    })
  }

  const categories = useMemo(()=> Array.from(new Set(products.map(p=>p.category))), [products])

  const filtered = useMemo(()=> products.filter(p=>{
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) || (p.sku||'').includes(search)
    const matchCat = selectedCategory ? p.category === selectedCategory : true
    return matchSearch && matchCat
  }), [search, selectedCategory, products])

  const onAdd = (product) => {
    updateCart(currentTable, (c)=>{
      const copy = {...c}
      if(copy[product.id]) copy[product.id].qty += 1
      else copy[product.id] = {product, qty: 1}
      return copy
    })
  }

  const onInc = (id) => updateCart(currentTable, (c) => ({...c, [id]: {...(c[id]||{}), qty: (c[id]?.qty || 0) + 1}}))
  const onDec = (id) => updateCart(currentTable, (c) => {
    const copy = {...c}
    if(!copy[id]) return c
    copy[id].qty -= 1
    if(copy[id].qty <= 0) delete copy[id]
    return copy
  })
  const onRemove = (id) => updateCart(currentTable, (c) => { const copy = {...c}; delete copy[id]; return copy })
  const clearCart = (tableId = currentTable) => updateCart(tableId, ()=> ({}))

  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [checkoutPayload, setCheckoutPayload] = useState(null)
  const [lastReceipt, setLastReceipt] = useState(null)
  const [adminOpen, setAdminOpen] = useState(false)
  const [insightsOpen, setInsightsOpen] = useState(false)
  const [loginOpen, setLoginOpen] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewReceipt, setPreviewReceipt] = useState(null)

  // toast message API
  const [toast, setToast] = useState(null)
  const showToast = (msg, timeout = 3000) => {
    setToast(msg)
    try{ setTimeout(()=> setToast(null), timeout) }catch(e){}
  }

  // show login modal when explicitly opened or when there is no authenticated user
  const showLogin = loginOpen || !auth.user

  // expose simple globals used by Header (keeps Header simple)
  if(typeof window !== 'undefined'){
    window.__ADMIN_OPEN__ = adminOpen
    window.__showAdmin__ = () => { setAdminOpen(true); window.__ADMIN_OPEN__ = true }
    window.__showInsights__ = () => setInsightsOpen(true)
  }

  const safeParse = (key, fallback) => {
    try{ return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)) }catch(e){ console.warn('safeParse failed for', key, e); return fallback }
  }

  // use hooks for receipts and inventory (keeps in sync with localStorage)
  const sales = useSales()
  const invHook = useInventory()
  const persistedReceipts = sales.receipts
  const persistedInventory = invHook.items


  const beginCheckout = (payload) => {
    // attach current table to payload
    payload = {...payload, table: currentTable}
    if(!payload || !payload.items || payload.items.length === 0){
      alert('Cart is empty')
      return
    }
    setCheckoutPayload(payload)
    setCheckoutOpen(true)
  }

  const generateReceiptHTML = (receipt) => {
    const rows = receipt.items.map(it=> `<tr>
      <td style="padding:6px 0">${it.qty} x ${it.product.name}</td>
      <td style="padding:6px 0;text-align:right">$${(it.qty*it.product.price).toFixed(2)}</td>
    </tr>`).join('')

    return `<!doctype html><html><head><meta charset="utf-8"><title>Receipt ${receipt.id}</title>
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
  }

  const handleConfirmPayment = ({tendered, paymentMethod, change, printOnConfirm=true}) => {
    const items = checkoutPayload.items
    const subtotal = checkoutPayload.subtotal
    const tax = checkoutPayload.tax
    const total = checkoutPayload.total
    const receipt = {
      id: `R-${Date.now()}`,
      storeName: 'Sugarplum Restaurant',
      date: new Date().toLocaleString(),
      table: checkoutPayload?.table || null,
      items,
      subtotal,
      tax,
      total,
      tendered,
      change,
      paymentMethod,
    }
    setLastReceipt(receipt)
    setCheckoutOpen(false)
    setCheckoutPayload(null)
    // clear cart for the table involved
    try{ updateCart(receipt.table, ()=> ({})) }catch(e){}

    // record sale via hook so UI stays in sync
    try{ sales.pushReceipt(receipt) }catch(e){ console.warn('pushReceipt failed', e) }

    // decrement inventory using inventory hook
    try{
      receipt.items.forEach(it => {
        const ingredients = it.product.ingredients || []
        ingredients.forEach(ing => {
          const need = (parseFloat(ing.qty)||0) * it.qty
          try{ invHook.adjust(ing.name, -need) }catch(e){ console.warn('inventory adjust failed', e) }
        })
      })
    }catch(e){}
    let printWindow = null
    if(printOnConfirm){
      // open window early to tie it to the user gesture
      printWindow = window.open('', '_blank', 'noopener,noreferrer')
    }

    alert(`Payment received — $${total.toFixed(2)} (${paymentMethod}).`)

    if(printOnConfirm){
      if(!printWindow){
        // fallback: open preview in-app where user can print manually
        setPreviewReceipt(receipt)
        setPreviewOpen(true)
      }else{
        try{
          const html = generateReceiptHTML(receipt)
          printWindow.document.open()
          printWindow.document.write(html)
          printWindow.document.close()
          printWindow.focus()
          printWindow.onload = () => { try{ printWindow.print() }catch(e){ setPreviewReceipt(receipt); setPreviewOpen(true) } }
          setTimeout(()=>{ try{ printWindow.print() }catch(e){ setPreviewReceipt(receipt); setPreviewOpen(true) } }, 300)
        }catch(e){ console.warn('print failed', e); setPreviewReceipt(receipt); setPreviewOpen(true) }
      }
    }
  }

  return (
    <ErrorBoundary>
      <div id="root" className="pos-root">
        <Header
          storeName="Sugarplum Restaurant"
          search={search}
          setSearch={setSearch}
          categories={categories}
          selectedCategory={selectedCategory}
          setSelectedCategory={setSelectedCategory}
          user={auth.user}
          onShowLogin={()=>setLoginOpen(true)}
          onLogout={auth.logout}
        />

        <main className="pos-main">
          <section className="left-left">
          <Tables tables={tables} currentTable={currentTable} setCurrentTable={setCurrentTable} carts={carts} combineTables={combineTables} showToast={showToast} />
          <div style={{marginTop:12}}>
              <ProductGrid products={filtered} onAdd={onAdd} />
            </div>

          {toast && (
            <div style={{position:'fixed',right:16,bottom:16,background:'#222',color:'#fff',padding:'8px 12px',borderRadius:6,boxShadow:'0 6px 18px rgba(0,0,0,0.2)'}}>
              {toast}
            </div>
          )}
          </section>

          <section className="right">
            <Cart cart={getCart(currentTable)} onInc={onInc} onDec={onDec} onRemove={onRemove} onBeginCheckout={beginCheckout} onClear={clearCart} currentTable={currentTable} />
          </section>
        </main>

        {checkoutOpen && (
          <CheckoutModal
            open={checkoutOpen}
            payload={checkoutPayload}
            onClose={() => setCheckoutOpen(false)}
            onConfirm={handleConfirmPayment}
            onPrint={(receipt)=>{
              try{ sales.pushReceipt(receipt) }catch(e){}
              try{ receipt.items.forEach(it=>{ (it.product.ingredients||[]).forEach(ing=>{ invHook.adjust(ing.name, -((parseFloat(ing.qty)||0) * it.qty)) }) }) }catch(e){}
            }}
          />
        )}

        <AdminPanel
          open={auth.isManager() && !!window.__ADMIN_OPEN__}
          onClose={()=>{ window.__ADMIN_OPEN__ = false; setAdminOpen(false) }}
          products={products}
          addProduct={addProduct}
          updateProduct={updateProduct}
          removeProduct={removeProduct}
          exportCSV={exportCSV}
          importCSV={importCSV}
          resetDefaults={resetDefaults}
          users={auth.users}
          addUser={auth.addUser}
          updateUser={auth.updateUser}
          removeUser={auth.removeUser}
          receipts={persistedReceipts}
          inventory={persistedInventory}
          setInventory={invHook.setItems}
          removeReceipt={sales.removeReceipt}
          clearReceipts={sales.clearReceipts}
        />

        <Insights
          open={auth.isManager() && insightsOpen}
          onClose={()=>setInsightsOpen(false)}
          receipts={persistedReceipts}
          products={products}
          inventory={persistedInventory}
        />

        <Login open={showLogin} onClose={()=>setLoginOpen(false)} auth={auth} required={!auth.user} />

        <ReceiptPreview open={previewOpen} receipt={previewReceipt} onClose={()=>{ setPreviewOpen(false); setPreviewReceipt(null) }} />
      </div>
    </ErrorBoundary>
  )
}

export default App
