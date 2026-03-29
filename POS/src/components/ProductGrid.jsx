import React from 'react';
import ProductCard from './ProductCard';

export default function ProductGrid({products, onAdd}){
  if(!products.length) return <div className="empty">No products found.</div>
  return (
    <div className="product-grid">
      {products.map(p => (
        <ProductCard key={p.id} product={p} onAdd={onAdd} />
      ))}
    </div>
  )
}
