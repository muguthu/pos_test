import React, {useState} from 'react'

export default function Tables({tables, currentTable, setCurrentTable, carts, combineTables, showToast}){
  const [combineMode, setCombineMode] = useState(false)
  const [selected, setSelected] = useState([])
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmTarget, setConfirmTarget] = useState(null)

  const toggleSelect = (id) => {
    setSelected(prev => prev.includes(id) ? prev.filter(x=>x!==id) : [...prev, id])
  }

  const openConfirm = (targetId) => {
    if(!targetId || selected.length === 0) return
    setConfirmTarget(targetId)
    setConfirmOpen(true)
  }

  const doConfirm = () => {
    if(!confirmTarget || selected.length === 0) return
    combineTables(confirmTarget, selected)
    // friendly toast
    try{
      const targetName = (tables.find(t=>t.id === confirmTarget) || {}).name || confirmTarget
      showToast && showToast(`Merged ${selected.length} table(s) into ${targetName}`)
    }catch(e){}
    setConfirmOpen(false)
    setCombineMode(false)
    setSelected([])
    setConfirmTarget(null)
  }

  return (
    <aside className="tables">
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <h3>Tables</h3>
        <div>
          {!combineMode ? (
            <button className="btn" onClick={()=>{ setCombineMode(true); setSelected([]) }}>Combine</button>
          ) : (
            <button className="btn clear" onClick={()=>{ setCombineMode(false); setSelected([]) }}>Cancel</button>
          )}
        </div>
      </div>

      {combineMode && (
        <div style={{marginBottom:8}}>
          <div style={{fontSize:12,color:'#999'}}>Select tables to combine, then choose a target:</div>
          <div style={{display:'flex',gap:8,marginTop:8}}>
            <select defaultValue="" onChange={(e)=> openConfirm(e.target.value)}>
              <option value="">Choose target table to merge into</option>
              {tables.map(t=> <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
            <button className="btn" onClick={()=>{ if(selected.length>0) openConfirm(currentTable) }} disabled={selected.length===0}>Merge into current</button>
          </div>
          <div style={{marginTop:8,fontSize:12,color:'#666'}}>{selected.length} selected</div>
        </div>
      )}

      <div className="table-grid">
        {tables.map(t=>{
          const hasItems = carts[t.id] && Object.keys(carts[t.id]).length > 0
          const isSelected = selected.includes(t.id)
          return (
            <button
              key={t.id}
              className={`table ${currentTable===t.id ? 'active':''} ${hasItems ? 'occupied':''} ${isSelected ? 'selected':''}`}
              onClick={()=> combineMode ? toggleSelect(t.id) : setCurrentTable(t.id)}>
              <div className="tname">{t.name}</div>
              <div className="tmeta">{hasItems ? 'Busy' : 'Free'}{isSelected ? ' • Selected' : ''}</div>
            </button>
          )
        })}
      </div>

      {confirmOpen && (
        <div className="modal-overlay" onClick={()=>setConfirmOpen(false)}>
          <div className="modal" onClick={(e)=>e.stopPropagation()}>
            <h3>Confirm merge</h3>
            <div style={{marginBottom:8}}>
              <div style={{fontSize:13,color:'#333'}}>Merge <strong>{selected.length}</strong> table(s) into <strong>{(tables.find(t=>t.id===confirmTarget)||{}).name || confirmTarget}</strong>?</div>
              <div style={{marginTop:8,fontSize:12,color:'#666'}}>
                Tables: {selected.join(', ')}
              </div>
            </div>
            <div style={{display:'flex',gap:8}}>
              <button className="btn primary" onClick={doConfirm}>Confirm Merge</button>
              <button className="btn clear" onClick={()=>setConfirmOpen(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </aside>
  )
}