import { useState } from 'react'

type Product = {
  id: number
  name: string
  code: string
  purchase: number
  selling: number
  stock: number
  unit: string
  hsn?: string
  gstRate?: number
}

export default function Products() {
  const [products, setProducts] = useState<Product[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('smartledger-products') || '[]')
    } catch {
      return []
    }
  })

  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [purchase, setPurchase] = useState('')
  const [selling, setSelling] = useState('')
  const [stock, setStock] = useState('')
  const [unit, setUnit] = useState('Piece')
const [hsn, setHsn] = useState('')
const [gstRate, setGstRate] = useState('0')
  const [search, setSearch] = useState('')

  function saveProducts(updated: Product[]) {
    setProducts(updated)
    localStorage.setItem('smartledger-products', JSON.stringify(updated))
  }

  function deleteProduct(id: number) {
    if (confirm('Delete this product?')) {
      saveProducts(products.filter(p => p.id !== id))
    }
  }

  function adjustStock(id: number) {
    const amount = prompt('Enter stock change (e.g. 5 to add, -2 to subtract):')
    if (amount === null || amount.trim() === '' || !Number.isFinite(Number(amount))) return
    const updated = products.map(p =>
      p.id === id ? { ...p, stock: p.stock + Number(amount) } : p
    )
    if (updated.some(p => p.stock < 0)) {
      alert('Stock cannot be negative.')
      return
    }
    saveProducts(updated)
  }

  function editProduct(id: number) {
    const product = products.find(p => p.id === id)
    if (!product) return
    const name = prompt('Product name:', product.name)
    if (name === null || !name.trim()) return
    const purchase = prompt('Purchase price:', String(product.purchase))
    if (purchase === null || !Number.isFinite(Number(purchase)) || Number(purchase) < 0) return
    const selling = prompt('Selling price:', String(product.selling))
    if (selling === null || !Number.isFinite(Number(selling)) || Number(selling) < 0) return
    saveProducts(products.map(p => p.id === id
      ? { ...p, name: name.trim(), purchase: Number(purchase), selling: Number(selling) }
      : p
    ))
  }

  function addProduct(e: React.FormEvent) {
    e.preventDefault()

    if (!name.trim() || Number(purchase) < 0 ||
        Number(selling) < 0 || Number(stock) < 0 ||
        purchase === '' || selling === '' || stock === '') {
      alert('Enter a product name and valid prices and quantity.')
      return
    }

    const updated = [...products, {
      id: Date.now(),
      name: name.trim(),
      code: code.trim(),
      purchase: Number(purchase),
      selling: Number(selling),
      stock: Number(stock),
      unit,
hsn: hsn.trim(),
gstRate: Number(gstRate) || 0
    }]

    setProducts(updated)
    localStorage.setItem('smartledger-products', JSON.stringify(updated))
    setName('')
    setCode('')
    setPurchase('')
    setSelling('')
    setStock('')
setHsn('')
setGstRate('0')
  }

  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.code.toLowerCase().includes(search.toLowerCase())
  )

  const money = (n: number) =>
    n.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })

  return (
    <div className="products-card">
      <h1>Products & Stock</h1>
      <p>Add and manage your shop inventory.</p>

      <form onSubmit={addProduct} style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))',
        gap: 12, background: 'white', padding: 20,
        borderRadius: 12, border: '1px solid #e2e8f0'
      }}>
        <label>Product name
          <input required value={name} onChange={e => setName(e.target.value)}
            placeholder="e.g. Mustard oil" />
        </label>
        <label>Product code / Barcode
          <input value={code} onChange={e => setCode(e.target.value)}
            placeholder="Optional SKU" />
        </label>
        <label>Purchase price (₹)
          <input required type="number" min="0" step="0.01"
            value={purchase} onChange={e => setPurchase(e.target.value)} />
        </label>
        <label>Selling price (₹)
          <input required type="number" min="0" step="0.01"
            value={selling} onChange={e => setSelling(e.target.value)} />
        </label>
        <label>Opening stock
          <input required type="number" min="0" step="any"
            value={stock} onChange={e => setStock(e.target.value)} />
        </label>
        <label>Unit
          <select value={unit} onChange={e => setUnit(e.target.value)}>
            <option>Piece</option><option>Packet</option>
            <option>Kg</option><option>Gram</option>
            <option>Litre</option><option>Box</option>
            <option>Carton</option><option>Bag</option>
          </select>
        </label>
        <label>HSN Code (optional)
<input value={hsn} onChange={e => setHsn(e.target.value)} placeholder="Enter HSN code" />
</label>
<label>GST Rate (%)
<input type="number" min="0" max="100" step="0.01" value={gstRate} onChange={e => setGstRate(e.target.value)} />
</label>
<button type="submit"  style={{
          padding: 12, background: '#176b58', color: 'white',
          border: 0, borderRadius: 8, fontWeight: 700
        }}>Add Product</button>
      </form>

      <h2>Expiry & Batch Management</h2>
{(() => {
  const batches = JSON.parse(localStorage.getItem('smartledger-batches') || '[]');
  const today = new Date().toISOString().slice(0, 10);
  const limit = new Date();
  limit.setDate(limit.getDate() + 30);
  const limitDate = limit.toISOString().slice(0, 10);
  const active = batches.filter((b: any) => Number(b.remainingQuantity ?? b.quantity) > 0);
  const expired = active.filter((b: any) => b.expiryDate && b.expiryDate < today);
  const expiring = active.filter((b: any) => b.expiryDate && b.expiryDate >= today && b.expiryDate <= limitDate);
  const remaining = active.reduce((sum: number, b: any) => sum + Number(b.remainingQuantity ?? b.quantity), 0);
  return (
    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))',gap:12,margin:'12px 0 22px'}}>
      <div><strong>Expired batches</strong><h2>{expired.length}</h2></div>
      <div><strong>Expiring within 30 days</strong><h2>{expiring.length}</h2></div>
      <div><strong>Remaining batch stock</strong><h2>{remaining}</h2></div>
      <div style={{gridColumn:'1 / -1',overflowX:'auto'}}>
        <table style={{width:'100%',borderCollapse:'collapse'}}>
          <thead><tr><th>Product</th><th>Batch</th><th>Expiry</th><th>Godown</th><th>Remaining</th></tr></thead>
          <tbody>
            {active.map((b: any) => (
              <tr key={b.id}>
                <td>{b.product}</td><td>{b.batchNumber || '-'}</td>
                <td>{b.expiryDate || 'Not set'}</td><td>{b.godown || 'Main Godown'}</td>
                <td>{Number(b.remainingQuantity ?? b.quantity)}</td>
              </tr>
            ))}
            {!active.length && <tr><td colSpan={5}>No batch records yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
})()}
<h2>Godown-wise Stock Summary</h2>
{(() => {
  const batches = JSON.parse(localStorage.getItem('smartledger-batches') || '[]');
  const totals = batches.reduce((acc: Record<string, number>, b: any) => {
    const quantity = Number(b.remainingQuantity ?? b.quantity ?? 0);
    if (quantity > 0) {
      const name = (b.godown || 'Main Godown').trim();
      acc[name] = (acc[name] || 0) + quantity;
    }
    return acc;
  }, {});
  const godowns = Object.entries(totals);
  return (
    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(170px,1fr))',gap:12,margin:'12px 0 22px'}}>
      {godowns.map(([name, quantity]) => (
        <div key={name} style={{padding:16,border:'1px solid #dddccf',borderRadius:12,background:'#fbf9f3'}}>
          <strong>{name}</strong>
          <h2>{Number(quantity)}</h2>
          <span>Units in stock</span>
        </div>
      ))}
      {!godowns.length && <p>No godown stock records yet.</p>}
    </div>
  );
})()}
<h2>Inventory Summary</h2>
      <p>Products: {products.length} &nbsp; | &nbsp;
        Stock value at purchase price: {money(
          products.reduce((sum, p) => sum + p.purchase * p.stock, 0)
        )}</p>

      <input value={search} onChange={e => setSearch(e.target.value)}
        placeholder="Search products..." style={{ width: '100%', marginBottom: 15 }} />

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', background: 'white', borderCollapse: 'collapse' }}>
          <thead><tr>
            <th>Product</th><th>Code</th><th>Purchase</th>
            <th>Selling</th><th>Stock</th><th>Stock Status</th><th>Unit</th><th>Actions</th>
          </tr></thead>
          <tbody>
            {filtered.map(p => <tr key={p.id}>
              <td>{p.name}</td><td>{p.code || '—'}</td>
              <td>{money(p.purchase)}</td><td>{money(p.selling)}</td>
              <td>{p.stock}</td>
<td>
<span style={{
  display: 'inline-block',
  padding: '5px 10px',
  borderRadius: 20,
  fontSize: 12,
  fontWeight: 700,
  background: Number(p.stock) <= 0 ? '#fce8e6' : Number(p.stock) <= 5 ? '#fff1d6' : '#e3eadf',
  color: Number(p.stock) <= 0 ? '#b42318' : Number(p.stock) <= 5 ? '#946200' : '#315b46'
}}>
{Number(p.stock) <= 0 ? 'Out of Stock' : Number(p.stock) <= 5 ? 'Low Stock' : 'In Stock'}
</span>
</td>
<td>{p.unit}</td>
              <td>
                <button type="button" onClick={() => editProduct(p.id)}>Edit</button>{' '}
                <button type="button" onClick={() => adjustStock(p.id)}>Adjust stock</button>{' '}
                <button type="button" onClick={() => deleteProduct(p.id)}>Delete</button>
              </td>
            </tr>)}
            {filtered.length === 0 && <tr>
              <td colSpan={7} style={{ textAlign: 'center', padding: 20 }}>
                No products yet. Add your first product above.
              </td>
            </tr>}
          </tbody>
        </table>
      </div>

      <style>{`
        label { display:flex; flex-direction:column; gap:6px; font-size:13px; }
        input, select { padding:11px; border:1px solid #d5dce5; border-radius:7px; min-width:0; }
        th, td { padding:12px 8px; border-bottom:1px solid #e5eaf0; text-align:left; font-size:13px; }
      `}</style>
    </div>
  )
}
