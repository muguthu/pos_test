import React from 'react';
import { svgAvatar } from '../utils/avatar'

export default function ProductCard({product, onAdd}){
  const src = product.image || svgAvatar(product.name, product.color)
  return (
    <div className="product-card">
      <div className="image">
        <img className="thumb" src={src} alt={product.name} />
      </div>
      <div className="meta">
        <div className="top">
          <div style={{display:'flex', gap:8, alignItems:'center'}}>
            <div className="title">{product.name}</div>
            <span className="badge">{product.category}</span>
          </div>
        </div>
        <div className="bottom">
          <div className="price">${product.price.toFixed(2)}</div>
          <button className="btn primary" onClick={()=>onAdd(product)}>Add</button>
        </div>
      </div>
    </div>
  )
} 
