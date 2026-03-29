import React, {useState, useRef, useEffect} from 'react'
import { svgAvatar } from '../utils/avatar'

function InventoryAdder({onAdd}){
  const [name, setName] = React.useState('')
  const [qty, setQty] = React.useState('')
  const [unit, setUnit] = React.useState('')
  const [rt, setRt] = React.useState('')
  const add = ()=>{ if(!name) return alert('Name required'); const item = { name, qty: parseFloat(qty)||0, unit: unit||'', reorder_threshold: parseFloat(rt)||0 }; onAdd(item); setName(''); setQty(''); setUnit(''); setRt('') }
  return (
    <div style={{display:'grid',gap:8}}>
      <input placeholder="Name" value={name} onChange={(e)=>setName(e.target.value)} />
      <input placeholder="Qty" value={qty} onChange={(e)=>setQty(e.target.value)} />
      <input placeholder="Unit" value={unit} onChange={(e)=>setUnit(e.target.value)} />
      <input placeholder="Reorder threshold" value={rt} onChange={(e)=>setRt(e.target.value)} />
      <div style={{display:'flex',gap:8}}>
        <button className="btn primary" onClick={add}>Add</button>
      </div>
    </div>
  )
}

export default function AdminPanel({open, onClose, products, addProduct, updateProduct, removeProduct, exportCSV, importCSV, resetDefaults, users, addUser, updateUser, removeUser, receipts, inventory, setInventory, removeReceipt, clearReceipts}){
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({sku:'', name:'', price:0, category:'Misc', color:'#8e44ff'})
  const fileRef = useRef()
  const adminListRef = useRef()
  const [showTop, setShowTop] = useState(false)

  useEffect(()=> {
    if(open){
      // scroll admin list to top when opening
      adminListRef.current?.scrollTo({top:0, behavior:'smooth'})
      setShowTop(false)
    }
  }, [open])

  if(!open) return null

  const [tab, setTab] = useState('products')
  const [invState, setInvState] = useState(inventory || {})
  const [recvState, setRecvState] = useState(receipts || [])
  const [receiptFilters, setReceiptFilters] = useState({from:'', to:'', table:'', paymentMethod:'', query:''})
  const [daysWindow, setDaysWindow] = useState(30)
  const [newUser, setNewUser] = useState({name:'', username:'', role:'staff', password:''})
  const [editingUserId, setEditingUserId] = useState(null)
  const [auditEntries, setAuditEntries] = useState(()=>{ try{ return JSON.parse(localStorage.getItem('pos_user_audit') || '[]') }catch(e){ return [] } })
  const [userFilter, setUserFilter] = useState('')
  const [showUserPassword, setShowUserPassword] = useState(false)
  const lowStockDaysThreshold = 7

  useEffect(()=>{
    if(open){
      setInvState(inventory || {})
      setRecvState(receipts || [])
    }
  }, [open, inventory, receipts])

  const filteredReceipts = React.useMemo(()=>{
    const {from, to, table, paymentMethod, query} = receiptFilters
    return (recvState||[]).filter(r=>{
      if(from){ const f = new Date(from); if(new Date(r.date) < f) return false }
      if(to){ const t = new Date(to); if(new Date(r.date) > t) return false }
      if(table && table.trim() !== '' && !(r.table || '').toLowerCase().includes(table.trim().toLowerCase())) return false
      if(paymentMethod && paymentMethod !== 'All' && r.paymentMethod !== paymentMethod) return false
      if(query && query.trim() !== ''){
        const q = query.trim().toLowerCase()
        if(!(r.id && r.id.toLowerCase().includes(q)) && !(r.items||[]).some(it=> it.product.name.toLowerCase().includes(q))) return false
      }
      return true
    })
  }, [recvState, receiptFilters])

  const ingredientUsage = React.useMemo(()=>{
    const cutoff = Date.now() - (daysWindow * 24*60*60*1000)
    const map = {}
    (recvState||[]).forEach(r=>{
      if(new Date(r.date).getTime() < cutoff) return
      (r.items||[]).forEach(it=>{
        (it.product.ingredients||[]).forEach(ing=>{
          map[ing.name] = (map[ing.name]||0) + ((parseFloat(ing.qty)||0) * it.qty)
        })
      })
    })
    return map
  }, [recvState, daysWindow])

  const needReorder = React.useMemo(()=>{
    return Object.values(invState||{}).map(it=>{
      const qty = parseFloat(it.qty) || 0
      const avg = (ingredientUsage[it.name] || 0) / Math.max(1, daysWindow)
      const daysLeft = avg > 0 ? (qty / avg) : Infinity
      const should = qty <= (it.reorder_threshold||0) || daysLeft < lowStockDaysThreshold
      const suggested = Math.max(Math.ceil((avg * 14) - qty), ( (it.reorder_threshold||0) - qty ), 0)
      return {...it, qty, avgDaily: avg, daysLeft, should, suggested}
    }).filter(x=>x.should)
  }, [invState, ingredientUsage, daysWindow])

  const filteredUsers = React.useMemo(()=>{
    const q = (userFilter||'').trim().toLowerCase()
    if(!q) return users || []
    return (users||[]).filter(u=> (u.name||'').toLowerCase().includes(q) || (u.username||'').toLowerCase().includes(q) || (u.role||'').toLowerCase().includes(q))
  }, [users, userFilter])

  const startAdd = ()=>{ setEditing(null); setForm({sku:'', name:'', price:0, category:'Misc', color:'#8e44ff'}); adminListRef.current?.scrollTo({top:0, behavior:'smooth'}) }
  const startEdit = (p)=>{ setEditing(p.id); setForm({...p}); adminListRef.current?.scrollTo({top:0, behavior:'smooth'}) }
  const save = ()=>{
    const payload = { ...form, price: parseFloat(form.price) || 0 }
    if(editing) updateProduct(editing, payload)
    else addProduct(payload)
    setEditing(null)
  }

  const doImport = (e)=>{
    const file = e.target.files[0]; if(!file) return
    const reader = new FileReader();
    reader.onload = ()=> importCSV(reader.result, 'merge')
    reader.readAsText(file)
  }

  const doExport = ()=>{
    const csv = exportCSV()
    const blob = new Blob([csv], {type:'text/csv'})
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'products.csv'; a.click(); URL.revokeObjectURL(url)
  }

  const exportInventory = ()=>{
    const header = ['name','qty','unit','reorder_threshold']
    const rows = Object.values(invState).map(i=> header.map(h=> (i[h]??'')).join(','))
    const csv = [header.join(','), ...rows].join('\n')
    const blob = new Blob([csv], {type:'text/csv'})
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'inventory.csv'; a.click(); URL.revokeObjectURL(url)
  }

  const importInventory = (e)=>{
    const f = e.target.files[0]; if(!f) return
    const r = new FileReader(); r.onload = ()=>{
      const lines = r.result.split('\n').map(l=>l.trim()).filter(Boolean)
      const hdr = lines.shift().split(',').map(h=>h.trim())
      const obj = {}
      lines.forEach(l=>{
        const parts = l.split(',')
        const row = {}
        hdr.forEach((h,i)=> row[h]=parts[i])
        if(row.name) obj[row.name] = { name: row.name, qty: parseFloat(row.qty)||0, unit: row.unit||'', reorder_threshold: row.reorder_threshold || 0 }
      })
      try{ if(setInventory) setInventory(obj); else localStorage.setItem('pos_inventory', JSON.stringify(obj)) }catch(e){}
      setInvState(obj)
    }
    r.readAsText(f)
  }

  const exportReceipts = ()=>{
    const header = ['id','date','table','total','paymentMethod']
    const rows = (recvState||[]).map(r=> header.map(h=> (r[h]??'')).join(','))
    const csv = [header.join(','), ...rows].join('\n')
    const blob = new Blob([csv], {type:'text/csv'})
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'receipts.csv'; a.click(); URL.revokeObjectURL(url)
  }

  const handleClearReceipts = ()=>{
    if(!window.confirm('Clear all receipts?')) return
    try{ if(clearReceipts) clearReceipts(); else localStorage.removeItem('pos_receipts') }catch(e){}
    setRecvState([])
  }

  const deleteReceipt = (id)=>{
    const next = (recvState||[]).filter(r=>r.id !== id)
    try{ if(removeReceipt) removeReceipt(id); else localStorage.setItem('pos_receipts', JSON.stringify(next)) }catch(e){}
    setRecvState(next)
  }

  // users: audit & handlers
  const addAudit = (action, details) => {
    const entry = { id: `a_${Date.now()}`, time: new Date().toLocaleString(), action, details }
    const next = [entry, ...auditEntries]
    setAuditEntries(next)
    try{ localStorage.setItem('pos_user_audit', JSON.stringify(next)) }catch(e){}
  }

  const onEditUser = (u) => {
    setEditingUserId(u.id)
    setNewUser({ name: u.name, username: u.username, role: u.role || 'staff', password: '' })
    adminListRef.current?.scrollTo({top:0, behavior:'smooth'})
  }

  const saveUser = () => {
    if(!newUser.name || !newUser.username) return alert('Name and username are required')
    const exists = (users||[]).find(x=> x.username === newUser.username && x.id !== editingUserId)
    if(exists) return alert('Username already exists')
    if(editingUserId){
      const changes = { name: newUser.name, username: newUser.username, role: newUser.role }
      if(newUser.password) changes.password = newUser.password
      updateUser(editingUserId, changes)
      addAudit('update', `${newUser.username} (${editingUserId}) updated`)
      setEditingUserId(null)
      setNewUser({name:'', username:'', role:'staff', password:''})
      alert('User updated')
    }else{
      const userObj = { id: `u_${Date.now()}`, name: newUser.name, username: newUser.username, role: newUser.role || 'staff', password: newUser.password || 'pass' }
      addUser(userObj)
      addAudit('create', `${userObj.username} (${userObj.id}) created`)
      setNewUser({name:'', username:'', role:'staff', password:''})
      alert('User created')
    }
  }

  const onDeleteUser = (u) => {
    if(!window.confirm('Delete user?')) return
    removeUser(u.id)
    addAudit('delete', `${u.username} (${u.id}) deleted`)
  }

  const onResetPwd = (u) => {
    if(!window.confirm('Reset password to "pass"?')) return
    updateUser(u.id, { password: 'pass' })
    addAudit('reset', `${u.username} (${u.id}) password reset`)
    alert('Password reset to "pass"')
  }

  const [previewOpen, setPreviewOpen] = React.useState(false)
  const [previewReceipt, setPreviewReceipt] = React.useState(null)

  const printReceipt = (receipt)=>{
    const rows = (receipt.items||[]).map(it=> `<tr><td style="padding:6px 0">${it.qty} x ${it.product.name}</td><td style="padding:6px 0;text-align:right">$${(it.qty*it.product.price).toFixed(2)}</td></tr>`).join('')
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
        <div>Paid: $${receipt.tendered?.toFixed?.(2) || ''} (${receipt.paymentMethod || ''})</div>
      </div>
      <hr/>
      <div class="muted">Receipt ID: ${receipt.id}</div>
    </body></html>`
    const w = window.open('', '_blank', 'noopener,noreferrer')
    if(!w){
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
    <div className="admin-overlay" onClick={onClose}>
      <div className="admin-panel" onClick={(e)=>e.stopPropagation()}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <h3>Admin</h3>
          <div style={{display:'flex', gap:8}}>
            <button className="btn clear" onClick={()=>{ if(window.confirm('Are you sure you want to reset defaults?')) resetDefaults() }}>Reset</button>
            <button className="btn" onClick={exportInventory}>Export Inventory</button>
            <label className="btn clear" style={{cursor:'pointer'}}>
              Import Inventory<input onChange={importInventory} type="file" accept=".csv" style={{display:'none'}} />
            </label>
            <button className="btn" onClick={exportReceipts}>Export Receipts</button>
            <button className="btn" onClick={handleClearReceipts}>Clear Receipts</button>
            <button className="btn" onClick={doExport}>Export Products</button>
            <label className="btn clear" style={{cursor:'pointer'}}>
              Import Products<input ref={fileRef} onChange={doImport} type="file" accept=".csv" style={{display:'none'}} />
            </label>
            <button className="btn" onClick={onClose}>Close</button>
          </div>
        </div>

        <div style={{marginTop:12, display:'flex', gap:12, alignItems:'center'}}>
          <div style={{display:'flex', gap:8, alignItems:'center'}}>
            <button className={`btn ${tab==='products' ? 'primary' : ''}`} onClick={()=>setTab('products')}>Products</button>
            <button className={`btn ${tab==='inventory' ? 'primary' : ''}`} onClick={()=>setTab('inventory')}>Inventory</button>
            <button className={`btn ${tab==='receipts' ? 'primary' : ''}`} onClick={()=>setTab('receipts')}>Receipts</button>
            <button className={`btn ${tab==='users' ? 'primary' : ''}`} onClick={()=>setTab('users')}>Users</button>
          </div>
        </div>

        <div className="admin-body">
          <div className="admin-list" ref={adminListRef} onScroll={(e)=> setShowTop(e.target.scrollTop > 120)} >

            {tab === 'products' && (
              <div>
                <div style={{display:'grid', gridTemplateColumns:'repeat(2, 1fr)', gap:8}}>
                  {products.slice(0,30).map(p=> (
                    <div key={p.id} className="admin-card">
                      <img src={p.image || svgAvatar(p.name,p.color,128)} style={{width:64,height:64,borderRadius:8}} alt="" />
                      <div style={{flex:1}}>
                        <div style={{fontWeight:700,color:'#fff'}}>{p.name}</div>
                        <div style={{fontSize:12,color:'#bfb3e6'}}>{p.sku} • {p.category}</div>
                        <div style={{marginTop:6,display:'flex',gap:8}}>
                          <button className="btn" onClick={()=>startEdit(p)}>Edit</button>
                          <button className="btn clear" onClick={()=>{ if(window.confirm('Delete product?')) removeProduct(p.id) }}>Delete</button>
                        </div>
                        <div style={{marginTop:8}}>
                          <small style={{color:'#9a86c9'}}>Ingredients: {(p.ingredients||[]).map(i=>`${i.name}(${i.qty}${i.unit?i.unit:''})`).slice(0,3).join(', ')}{(p.ingredients||[]).length>3?' ...':''}</small>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                {products.length > 30 && <div style={{marginTop:10,color:'#999'}}>Only showing first 30 for performance — use export/import for bulk edits.</div>}
              </div>
            )}

            {tab === 'inventory' && (
              <div>
                {needReorder.length > 0 && (
                  <div style={{marginBottom:12, padding:12, borderRadius:8, background:'linear-gradient(90deg, rgba(255,88,125,0.06), rgba(255,255,255,0.01))', border:'1px solid rgba(255,88,125,0.08)'}}>
                    <div style={{fontWeight:800, color:'#ff6b6b'}}>Low stock — suggested reorders</div>
                    <div style={{marginTop:8, display:'flex', gap:8, flexWrap:'wrap'}}>
                      {needReorder.map(i=> (
                        <div key={i.name} style={{padding:8, borderRadius:8, background:'rgba(255,255,255,0.02)'}}>
                          <div style={{fontWeight:700}}>{i.name} {i.unit ? `• ${i.unit}` : ''}</div>
                          <div style={{fontSize:12, color:'#bfb3e6'}}>Qty: {i.qty} • Est. days left: {isFinite(i.daysLeft) ? Math.round(i.daysLeft) : '—'}</div>
                          <div style={{marginTop:6, fontSize:12}}>Suggested: <strong>{i.suggested}</strong></div>
                        </div>
                      ))}
                      <div style={{marginLeft:'auto'}}>
                        <button className="btn" onClick={()=>{
                          const header = ['name','qty','unit','suggested']
                          const rows = needReorder.map(x=> header.map(h=> x[h] ?? '').join(','))
                          const csv = [header.join(','), ...rows].join('\n')
                          const blob = new Blob([csv], {type:'text/csv'})
                          const url = URL.createObjectURL(blob)
                          const a = document.createElement('a'); a.href = url; a.download = 'reorder.csv'; a.click(); URL.revokeObjectURL(url)
                        }}>Export Reorder</button>
                      </div>
                    </div>
                  </div>
                )}

                {Object.keys(invState).length === 0 && <div className="empty">No inventory items. Import or add below.</div>}
                <div style={{display:'grid', gap:8}}>
                  {Object.values(invState).map(it=> {
                    const flagged = needReorder.find(n=> n.name === it.name)
                    return (
                    <div key={it.name} style={{display:'flex', alignItems:'center', justifyContent:'space-between', padding:8, background: flagged ? 'linear-gradient(90deg, rgba(255,88,125,0.03), rgba(255,255,255,0.01))' : 'rgba(255,255,255,0.02)', borderRadius:8, border: flagged ? '1px solid rgba(255,88,125,0.08)' : 'none'}}>
                      <div>
                        <div style={{fontWeight:700}}>{it.name}</div>
                        <div style={{fontSize:12,color:'#bfb3e6'}}>Qty: <input style={{width:80}} value={it.qty} onChange={(e)=>{ const copy = {...invState}; copy[it.name].qty = parseFloat(e.target.value)||0; setInvState(copy); try{ if(setInventory) setInventory(copy); else localStorage.setItem('pos_inventory', JSON.stringify(copy)) }catch(e){} }} /> {it.unit}</div>
                        <div style={{fontSize:12,color:'#9a86c9'}}>Reorder threshold: <input style={{width:80}} value={it.reorder_threshold||''} onChange={(e)=>{ const copy = {...invState}; copy[it.name].reorder_threshold = parseFloat(e.target.value)||0; setInvState(copy); try{ if(setInventory) setInventory(copy); else localStorage.setItem('pos_inventory', JSON.stringify(copy)) }catch(e){} }} /></div>
                      </div>
                      <div style={{display:'flex', gap:8}}>
                        <button className="btn" onClick={()=>{ const copy = {...invState}; copy[it.name].qty = (parseFloat(copy[it.name].qty)||0) - 1; setInvState(copy); try{ if(setInventory) setInventory(copy); else localStorage.setItem('pos_inventory', JSON.stringify(copy)) }catch(e){} }}>-</button>
                        <button className="btn" onClick={()=>{ const copy = {...invState}; copy[it.name].qty = (parseFloat(copy[it.name].qty)||0) + 1; setInvState(copy); try{ if(setInventory) setInventory(copy); else localStorage.setItem('pos_inventory', JSON.stringify(copy)) }catch(e){} }}>+</button>
                        <button className="btn clear" onClick={()=>{ if(window.confirm('Remove inventory item?')){ const copy = {...invState}; delete copy[it.name]; setInvState(copy); try{ if(setInventory) setInventory(copy); else localStorage.setItem('pos_inventory', JSON.stringify(copy)) }catch(e){} } }}>Remove</button>
                      </div>
                    </div>)
                  })}
                </div>

                <div style={{marginTop:12}}>
                  <small style={{color:'#bbb'}}>Add new inventory item</small>
                  <InventoryAdder onAdd={(item)=>{ const copy = {...invState}; copy[item.name] = item; setInvState(copy); try{ if(setInventory) setInventory(copy); else localStorage.setItem('pos_inventory', JSON.stringify(copy)) }catch(e){} }} />
                </div>
              </div>
            )} 

            {tab === 'receipts' && (
              <div>
                <div style={{display:'flex', gap:8, marginBottom:8}}>
                  <input type="date" value={receiptFilters.from} onChange={(e)=>setReceiptFilters({...receiptFilters, from: e.target.value})} />
                  <input type="date" value={receiptFilters.to} onChange={(e)=>setReceiptFilters({...receiptFilters, to: e.target.value})} />
                  <input placeholder="Table" value={receiptFilters.table} onChange={(e)=>setReceiptFilters({...receiptFilters, table: e.target.value})} />
                  <select value={receiptFilters.paymentMethod} onChange={(e)=>setReceiptFilters({...receiptFilters, paymentMethod: e.target.value})}>
                    <option>All</option>
                    <option>Cash</option>
                    <option>Card</option>
                    <option>Other</option>
                  </select>
                  <input placeholder="Search id / product" value={receiptFilters.query} onChange={(e)=>setReceiptFilters({...receiptFilters, query: e.target.value})} />
                  <button className="btn" onClick={()=>{
                    const header = ['id','date','table','total','paymentMethod']
                    const rows = filteredReceipts.map(r=> header.map(h=> (r[h]??'')).join(','))
                    const csv = [header.join(','), ...rows].join('\n')
                    const blob = new Blob([csv], {type:'text/csv'})
                    const url = URL.createObjectURL(blob)
                    const a = document.createElement('a'); a.href = url; a.download = 'receipts_filtered.csv'; a.click(); URL.revokeObjectURL(url)
                  }}>Export Filtered</button>
                  <button className="btn clear" onClick={()=>{ setReceiptFilters({from:'', to:'', table:'', paymentMethod:'', query:''}) }}>Clear</button>
                </div>

                {(filteredReceipts||[]).length === 0 && <div className="empty">No receipts match the filters</div>}
                <div style={{display:'grid', gap:8}}>
                  {(filteredReceipts||[]).map(r=> (
                    <div key={r.id} style={{display:'flex', justifyContent:'space-between', padding:8, background:'rgba(255,255,255,0.02)', borderRadius:8}}>
                      <div>
                        <div style={{fontWeight:700}}>{r.date} {r.table ? `• ${r.table}` : ''}</div>
                        <div style={{fontSize:12,color:'#bfb3e6'}}>Total: ${r.total.toFixed(2)} • {r.paymentMethod}</div>
                      </div>
                      <div style={{display:'flex', gap:8}}>
                        <button className="btn" onClick={()=>printReceipt(r)}>Reprint</button>
                        <button className="btn clear" onClick={()=>{ if(window.confirm('Delete receipt?')) deleteReceipt(r.id) }}>Delete</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {tab === 'users' && (
              <div>
                <div style={{display:'flex', gap:8, marginTop:8, alignItems:'center'}}>
                  <input placeholder="Search users (name, username, role)" value={userFilter} onChange={(e)=>setUserFilter(e.target.value)} style={{flex:1,padding:6}} />
                  <button className="btn clear" onClick={()=>setUserFilter('')}>Clear</button>
                </div>

                <div style={{display:'flex', gap:8, marginTop:8}}>
                  {filteredUsers.map(u=> (
                    <div key={u.id} style={{padding:8, borderRadius:8, background:'rgba(255,255,255,0.01)'}}>
                      <div style={{fontWeight:700}}>{u.name}</div>
                      <div style={{fontSize:12, color:'#bfb3e6'}}>{u.username} • {u.role}</div>
                      <div style={{marginTop:6, display:'flex', gap:8}}>
                        <button className="btn" onClick={()=>onEditUser(u)}>Edit</button>
                        <button className="btn" onClick={()=>onResetPwd(u)}>Reset pwd</button>
                        <button className="btn clear" onClick={()=>onDeleteUser(u)}>Delete</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )} 

            {showTop && <button className="admin-top-btn" onClick={()=>adminListRef.current?.scrollTo({top:0, behavior:'smooth'})}>↑ Top</button>}
          </div>

          <aside className="admin-side">
            {tab === 'products' && (
              <div>
                <div style={{display:'flex', gap:8, marginBottom:8}}>
                  <button className="btn primary" onClick={startAdd}>Add New</button>
                  <button className="btn clear" onClick={()=>{ setEditing(null); setForm({sku:'', name:'', price:0, category:'Misc', color:'#8e44ff'}) }}>Clear</button>
                </div>

                <div className="admin-form">
                  <label>SKU<input value={form.sku} onChange={(e)=>setForm({...form,sku:e.target.value})} /></label>
                  <label>Name<input value={form.name} onChange={(e)=>setForm({...form,name:e.target.value})} /></label>
                  <label>Price<input value={form.price} onChange={(e)=>setForm({...form,price:e.target.value})} /></label>
                  <label>Category<input value={form.category} onChange={(e)=>setForm({...form,category:e.target.value})} /></label>
                  <label>Color<input type="color" value={form.color} onChange={(e)=>setForm({...form,color:e.target.value})} /></label>
                  <label style={{display:'block'}}>Ingredients (name,qty,unit) — one per line<textarea rows={5} placeholder="e.g. Milk,0.2,l" value={(form.ingredients || []).map(i=>`${i.name},${i.qty},${i.unit||''}`).join('\n')} onChange={(e)=>{
                    const lines = e.target.value.split('\n').map(l=>l.trim()).filter(Boolean)
                    const parsed = lines.map(l=>{const [name,qty,unit] = l.split(',').map(x=>x?.trim()); return {name, qty: parseFloat(qty)||0, unit: unit||''} })
                    setForm({...form, ingredients: parsed})
                  }} /></label>
                  <div style={{display:'flex',gap:8,alignItems:'center',marginTop:8}}>
                    <img src={form.image || svgAvatar(form.name||'NEW', form.color||'#8e44ff',128)} style={{width:48,height:48,borderRadius:8}} alt="preview" />
                    <div style={{flex:1}}>
                      <button className="btn primary" onClick={save}>{editing ? 'Save' : 'Create'}</button>
                      {editing && <button className="btn clear" onClick={()=>{ setEditing(null); setForm({sku:'', name:'', price:0, category:'Misc', color:'#8e44ff'}) }}>Cancel</button>}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {tab === 'inventory' && (
              <div style={{padding:8}}>
                <InventoryAdder onAdd={(item)=>{ const copy = {...invState}; copy[item.name] = item; setInvState(copy); try{ if(setInventory) setInventory(copy); else localStorage.setItem('pos_inventory', JSON.stringify(copy)) }catch(e){} }} />
              </div>
            )}

            {tab === 'receipts' && (
              <div style={{padding:8}}>
                <div style={{display:'flex', gap:8}}>
                  <button className="btn" onClick={exportReceipts}>Export</button>
                  <button className="btn clear" onClick={handleClearReceipts}>Clear</button>
                </div>
              </div>
            )}

            {tab === 'users' && (
              <div style={{padding:8}}>
                <div style={{display:'grid', gap:8}}>
                  <label style={{display:'block'}}>Name<input value={newUser.name} onChange={(e)=>setNewUser({...newUser, name: e.target.value})} /></label>
                  <label style={{display:'block'}}>Username<input value={newUser.username} onChange={(e)=>setNewUser({...newUser, username: e.target.value})} /></label>
                  <label style={{display:'block'}}>Password (optional)
                    <div style={{display:'flex', gap:8, alignItems:'center'}}>
                      <input type={showUserPassword ? 'text' : 'password'} value={newUser.password} onChange={(e)=>setNewUser({...newUser, password: e.target.value})} />
                      <button className="btn clear" onClick={()=>setShowUserPassword(prev=>!prev)}>{showUserPassword ? 'Hide' : 'Show'}</button>
                    </div>
                  </label>
                  <label style={{display:'block'}}>Role<select value={newUser.role} onChange={(e)=>setNewUser({...newUser, role: e.target.value})}><option value="staff">staff</option><option value="manager">manager</option></select></label>
                  <div style={{display:'flex', gap:8}}>
                    <button className="btn primary" onClick={saveUser}>{editingUserId ? 'Save User' : 'Create User'}</button>
                    <button className="btn clear" onClick={()=>{ setEditingUserId(null); setNewUser({name:'', username:'', role:'staff', password:''}) }}>Clear</button>
                  </div>

                  <div style={{marginTop:12}}>
                    <h4 style={{margin:0}}>User Audit</h4>
                    <div style={{maxHeight:160, overflow:'auto', marginTop:8}}>
                      {auditEntries.length === 0 && <div className="empty">No audit entries</div>}
                      {auditEntries.map(a=> (
                        <div key={a.id} style={{padding:6, borderBottom:'1px solid rgba(255,255,255,0.02)'}}>
                          <div style={{fontWeight:700}}>{a.action}</div>
                          <div style={{fontSize:12,color:'#9a86c9'}}>{a.details}</div>
                          <div style={{fontSize:11,color:'#999'}}>{a.time}</div>
                        </div>
                      ))}
                      {auditEntries.length>0 && <div style={{marginTop:8}}><button className="btn clear" onClick={()=>{ if(window.confirm('Clear audit log?')){ setAuditEntries([]); try{localStorage.removeItem('pos_user_audit')}catch(e){} }}}>Clear Audit</button></div>}
                    </div>
                  </div>
                </div>
              </div>
            )}

            <ReceiptPreview open={previewOpen} receipt={previewReceipt} onClose={()=>{ setPreviewOpen(false); setPreviewReceipt(null) }} />
          </aside>
        </div>

      </div>
    </div>
  )
}
