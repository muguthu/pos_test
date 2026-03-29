import React from 'react'

export default class ErrorBoundary extends React.Component{
  constructor(props){ super(props); this.state = {error:null} }
  static getDerivedStateFromError(error){ return {error} }
  componentDidCatch(error, info){ console.error('ErrorBoundary caught', error, info) }
  render(){
    if(this.state.error){
      return (
        <div style={{padding:20, color:'#fff'}}>
          <h2>Something went wrong</h2>
          <pre style={{whiteSpace:'pre-wrap', color:'#f3c6ff'}}>{this.state.error && String(this.state.error)}</pre>
          <button className="btn" onClick={()=> location.reload()}>Reload</button>
        </div>
      )
    }
    return this.props.children
  }
}
