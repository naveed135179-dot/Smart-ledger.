import { useState } from 'react'

type Purchase = {
  productId?: number;
  batchNumber?: string;
  expiryDate?: string;
  godown?: string;
  id: number
  supplier: string
  invoice: string
  date: string
  product: string
  quantity: number
  rate: number
  total: number
  paid: number
}

export default function Purchases() {
  const [purchases, setPurchases] = useState<Purchase[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('smartledger-purchases') || '[]')
    } catch {
      return []
    }
  })

  const [supplier, setSupplier] = useState('')
  const [invoice, setInvoice] = useState('')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [product, setProduct] = useState('')
  const [quantity, setQuantity] = useState('')
  const [rate, setRate] = useState('')
  const [paid, setPaid] = useState('0')

const [batchNumber, setBatchNumber] = useState('')
const [expiryDate, setExpiryDate] = useState('')
const [godown, setGodown] = useState('Main Godown')


  const total = Number(quantity || 0) * Number(rate || 0)

  function savePurchase(e: React.FormEvent) {
    e.preventDefault()

    if (!supplier.trim() || !product.trim() ||
        quantity === '' || rate === '' ||
        Number(quantity) <= 0 || Number(rate) < 0 ||
        Number(paid) < 0 || Number(paid) > total) {
      alert('Check supplier, product, quantity, rate and payment.')
      return
    }

    const entry: Purchase = {
      id: Date.now(),
      supplier: supplier.trim(),
      invoice: invoice.trim(),
      date,
      product: product.trim(),
productId: 0,
batchNumber: batchNumber.trim(),
expiryDate,
godown: godown.trim(),

      quantity: Number(quantity),
      rate: Number(rate),
      total,
      paid: Number(paid)
    }

    const products = JSON.parse(
      localStorage.getItem('smartledger-products') || '[]'
    )

    const matched = products.find(
      (p: { name: string }) =>
        p.name.trim().toLowerCase() === product.trim().toLowerCase()
    )

    if (!matched) {
      alert('This product is not in Products & Stock. Add it there first.')
      return
    }

    
entry.productId = matched.id;

const batches = JSON.parse(localStorage.getItem('smartledger-batches') || '[]');
batches.push({
  id: `${entry.id}-${matched.id}`,
  purchaseId: entry.id,
  productId: matched.id,
  product: matched.name,
  batchNumber: entry.batchNumber || '',
  expiryDate: entry.expiryDate || '',
  godown: entry.godown || 'Main Godown',
  quantity: entry.quantity,
  remainingQuantity: entry.quantity,
  purchaseRate: entry.rate,
  date: entry.date
});
localStorage.setItem('smartledger-batches', JSON.stringify(batches));


const updatedProducts = products.map(
      (p: { id: number; stock: number; purchase: number }) =>
        p.id === matched.id
          ? { ...p, stock: Number(p.stock) + Number(quantity), purchase: Number(rate) }
          : p
    )

    const updated = [...purchases, entry]
    localStorage.setItem('smartledger-purchases', JSON.stringify(updated))
    localStorage.setItem('smartledger-products', JSON.stringify(updatedProducts))
    setPurchases(updated)

    setInvoice('')
    setProduct('')
    setQuantity('')
    setRate('')
    setPaid('0')
    alert('Purchase saved. Inventory updated successfully.')
  }

  const money = (n: number) =>
    n.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })

  return (
    <div className="purchases-card">
      <h1>Purchases</h1>
      <p>Record goods purchased from companies and distributors.</p>

      <form onSubmit={savePurchase} style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))',
        gap: 12, background: 'white', padding: 20,
        borderRadius: 12, border: '1px solid #e2e8f0'
      }}>
        <label>Supplier
          <select required value={supplier} onChange={e => setSupplier(e.target.value)}>
            <option value="">Select supplier</option>
            {JSON.parse(localStorage.getItem('smartledger-suppliers') || '[]').map((s: {id:number; name:string}) =>
              <option key={s.id} value={s.name}>{s.name}</option>
            )}
          </select>
        </label>
        <label>Invoice number
          <input value={invoice} onChange={e => setInvoice(e.target.value)} />
        </label>
        <label>Purchase date
          <input type="date" required value={date} onChange={e => setDate(e.target.value)} />
        </label>
        <label>Product
          <input required value={product} onChange={e => setProduct(e.target.value)} />
        </label>
        <label>Batch Number
<input value={batchNumber} onChange={e => setBatchNumber(e.target.value)} />
</label>
<label>Expiry Date
<input type="date" value={expiryDate} onChange={e => setExpiryDate(e.target.value)} />
</label>
<label>Godown
<input value={godown} onChange={e => setGodown(e.target.value)} />
</label>
<label>Quantity
          <input required type="number" min="0.01" step="any"
            value={quantity} onChange={e => setQuantity(e.target.value)} />
        </label>
        <label>Rate per unit (₹)
          <input required type="number" min="0" step="0.01"
            value={rate} onChange={e => setRate(e.target.value)} />
        </label>
        <label>Amount paid (₹)
          <input type="number" min="0" step="0.01"
            value={paid} onChange={e => setPaid(e.target.value)} />
        </label>
        <div><strong>Purchase total</strong><h2>{money(total)}</h2></div>
        <button type="submit" style={{
          padding: 12, background: '#176b58', color: 'white',
          border: 0, borderRadius: 8, fontWeight: 700
        }}>Save Purchase</button>
      </form>

      <h2>Purchase History</h2>
      <p>Total purchases: {money(purchases.reduce((s, p) => s + p.total, 0))}</p>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', background: 'white', borderCollapse: 'collapse' }}>
          <thead><tr>
            <th>Date</th><th>Supplier</th><th>Invoice</th>
            <th>Product</th><th>Batch</th><th>Expiry</th><th>Godown</th><th>Qty</th><th>Total</th><th>Due</th>
          </tr></thead>
          <tbody>
            {purchases.map(p => <tr key={p.id}>
              <td>{p.date}</td><td>{p.supplier}</td><td>{p.invoice || '—'}</td>
              <td>{p.product}</td><td>{p.batchNumber || '-'}</td><td>{p.expiryDate || '-'}</td><td>{p.godown || '-'}</td><td>{p.quantity}</td>
              <td>{money(p.total)}</td><td>{money(p.total - p.paid)}</td>
            </tr>)}
            {!purchases.length && <tr>
              <td colSpan={10} style={{ textAlign: 'center', padding: 20 }}>
                No purchases recorded yet.
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
