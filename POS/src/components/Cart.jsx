import React, {useMemo} from 'react';

export default function Cart({cart, onInc, onDec, onRemove, onBeginCheckout, onClear, currentTable}){
  const subtotal = useMemo(()=> Object.values(cart).reduce((s,it)=> s + it.product.price * it.qty, 0), [cart]);
  const tax = +(subtotal * 0.07).toFixed(2);
  const total = +(subtotal + tax).toFixed(2);

  return (
    <aside className="cart">
      <h2>Cart <span style={{fontSize:12, opacity:.8}}>({currentTable})</span></h2>
      <div className="cart-list">
        {Object.values(cart).length === 0 && <div className="empty">Cart is empty</div>}
        {Object.values(cart).map(it => (
          <div key={it.product.id} className="cart-item">
            <div className="ci-meta">
              <div className="name">{it.product.name}</div>
              <div className="price">${(it.product.price * it.qty).toFixed(2)}</div>
            </div>
            <div className="ci-qty">
              <button onClick={()=>onDec(it.product.id)}>-</button>
              <span>{it.qty}</span>
              <button onClick={()=>onInc(it.product.id)}>+</button>
            </div>
            <button className="remove" onClick={()=>onRemove(it.product.id)}>✕</button>
          </div>
        ))}
      </div>

      <div className="totals">
        <div><span>Subtotal</span><span>${subtotal.toFixed(2)}</span></div>
        <div><span>Tax</span><span>${tax.toFixed(2)}</span></div>
        <div className="total"><span>Total</span><span>${total.toFixed(2)}</span></div>
      </div>

      <div className="cart-actions">
        <button className="btn checkout" onClick={()=>onBeginCheckout({items: Object.values(cart), subtotal, tax, total})}>Checkout</button>
        <button className="btn clear" onClick={()=>{if(window.confirm('Clear cart?')) { onClear(currentTable) }}}>Clear</button>
      </div>
    </aside>
  )
}
