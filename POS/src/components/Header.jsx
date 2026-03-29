import React from 'react';

export default function Header({storeName, search, setSearch, categories, selectedCategory, setSelectedCategory, user, onShowLogin, onLogout}){
  return (
    <header className="pos-header">
      <div className="brand">
        <div className="logo-badge" aria-hidden>SP</div>
        <div className="brand-text">
          <h1>{storeName}</h1>
          <div className="tagline">Fine dining & sweet delights</div>
        </div>
      </div>

      <div className="controls">
        <input
          className="search"
          placeholder="Search menu or SKU..."
          value={search}
          onChange={(e)=>setSearch(e.target.value)}
        />

        <select
          value={selectedCategory}
          onChange={(e)=>setSelectedCategory(e.target.value)}
          className="category-select"
        >
          <option value="">All</option>
          {categories.map(c=> (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>

        {user ? (
          <div style={{display:'flex', gap:8, alignItems:'center'}}>
            <div style={{textAlign:'right'}}>
              <div style={{fontWeight:700, color:'white'}}>{user.name}</div>
              <div style={{fontSize:11, color:'#bfb3e6'}}>{user.role}</div>
            </div>
            {user.role === 'manager' && (
              <>
                <button className="btn admin" onClick={()=>{ if(typeof window !== 'undefined' && window.__showAdmin__) window.__showAdmin__(); }} title="Admin">Admin</button>
                <button className="btn admin" onClick={()=>{ if(typeof window !== 'undefined' && window.__showInsights__) window.__showInsights__(); }} title="Insights" style={{marginLeft:6}}>Insights</button>
              </>
            )}
            <button className="btn clear" onClick={onLogout}>Logout</button>
          </div>
        ) : (
          <button className="btn primary" onClick={onShowLogin}>Staff login</button>
        )}

        <button className="btn" title={typeof window !== 'undefined' && (localStorage.getItem('pos_theme') === 'dark') ? 'Switch to light theme' : 'Switch to dark theme'} onClick={()=>{
          try{
            const cur = localStorage.getItem('pos_theme') || 'light'
            const next = cur === 'dark' ? 'light' : 'dark'
            localStorage.setItem('pos_theme', next)
            document.documentElement.classList.toggle('theme-dark', next === 'dark')
          }catch(e){}
        }}>{typeof window !== 'undefined' && (localStorage.getItem('pos_theme') === 'dark') ? '🌙' : '☀️'}</button>

        <button className="btn clear" title="Reset app data" onClick={()=>{
          if(!confirm('Clear stored app data (cart, receipts, inventory, products)?')) return
          try{ ['pos_cart','pos_receipts','pos_inventory','pos_products','pos_users','pos_user'].forEach(k=>localStorage.removeItem(k)) }catch(e){}
          location.reload()
        }} style={{marginLeft:8}}>Reset data</button> 
      </div>
    </header>
  )
} 
