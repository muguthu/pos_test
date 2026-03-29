import React, {useState} from 'react'

export default function Login({open, onClose, auth, required = false}){
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState(null)
  // show when explicitly open OR when required (e.g., splash screen)
  if(!open && !required) return null
  // if required but there's already a user, don't show
  if(required && auth && auth.user) return null
  const submit = ()=>{
    if(auth.login(username, password)){
      setErr(null)
      if(onClose) onClose()
    }else setErr('Invalid credentials')
  }
  const handleOverlayClick = () => { if(!required && onClose) onClose() }
  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className="modal" onClick={e=>e.stopPropagation()}>
        <h3>{required ? 'Please sign in' : 'Staff login'}</h3>
        <div style={{display:'flex',flexDirection:'column',gap:8}}>
          <input placeholder="username" value={username} onChange={(e)=>setUsername(e.target.value)} autoFocus />
          <input placeholder="password" type="password" value={password} onChange={(e)=>setPassword(e.target.value)} onKeyDown={(e)=>{ if(e.key === 'Enter') submit() }} />
          {err && <div style={{color:'#ffb3c9'}}>{err}</div>}
          <div style={{display:'flex',gap:8}}>
            <button className="btn primary" onClick={submit}>Sign in</button>
            {!required && <button className="btn clear" onClick={onClose}>Cancel</button>}
          </div>
        </div>
      </div>
    </div>
  )
}
