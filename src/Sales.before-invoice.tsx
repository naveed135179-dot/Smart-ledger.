import { useState, useRef } from 'react'
import { BrowserMultiFormatReader } from '@zxing/browser'

export default function Sales() {
  const [customer, setCustomer] = useState('')
  const [product, setProduct] = useState('')
const [productSuggestions, setProductSuggestions] = useState<any[]>([])
  const [price, setPrice] = useState('')
  const [qty, setQty] = useState('1')
  const [paid, setPaid] = useState('0')
  const [message, setMessage] = useState('')
const [scanning, setScanning] = useState(false)
const videoRef = useRef<HTMLVideoElement>(null)
const readerRef = useRef<BrowserMultiFormatReader | null>(null)
const controlsRef = useRef<{ stop: () => void } | null>(null)


  async function startScanner() {
  try {
    if (!videoRef.current) {
      setMessage("Scanner video is unavailable. Reload the page.")
      return
    }

    const reader = new BrowserMultiFormatReader()
    readerRef.current = reader

    setScanning(true)
    setMessage("Starting camera...")

    const controls = await reader.decodeFromVideoDevice(
      undefined,
      videoRef.current,
      (result, _error, controls) => {
        if (!result) return

        const barcode = result.getText()
        const products = JSON.parse(
          localStorage.getItem("smartledger-products") || "[]"
        )
        const matched = products.find((item: any) =>
          String(item.code || "").toLowerCase() === barcode.toLowerCase()
        )

        if (matched) {
          setProduct(matched.name)
          setPrice(String(matched.selling))
          setProductSuggestions([])
          setMessage("Barcode scanned: " + matched.name)
        } else {
          setProduct(barcode)
          setMessage("Barcode not found. Add this code to Products & Stock.")
        }

        controls.stop()
        controlsRef.current = null
        setScanning(false)
      }
    )

    controlsRef.current = controls
  } catch (error) {
    setScanning(false)
    setMessage("Camera error: " + String(error))
  }
}

function stopScanner() {
  controlsRef.current?.stop()
  controlsRef.current = null
  setScanning(false)
}

const total = Math.max(0, Number(price) || 0) *
    Math.max(0, Number(qty) || 0)

  function saveBill() {
    if (!product.trim() || Number(price) <= 0 || Number(qty) <= 0) {
      setMessage('Enter a product, valid price and quantity.')
      return
    }

    if (Number(paid) < 0 || Number(paid) > total) {
      setMessage('Payment must be between zero and the bill total.')
      return
    }

    try {
      const products = JSON.parse(
        localStorage.getItem('smartledger-products') || '[]'
      )
      const matched = products.find(
        (p: { name: string; code?: string }) =>
          (p.name.toLowerCase() === product.trim().toLowerCase() || String(p.code || '').toLowerCase() === product.trim().toLowerCase())
      )

      if (!matched) {
        setMessage('Product not found in inventory. Add it to Products & Stock first.')
        return
      }

      if (matched.stock < Number(qty)) {
        setMessage('Not enough stock available.')
        return
      }

      const updatedProducts = products.map(
        (p: { id: number; stock: number }) =>
          p.id === matched.id
            ? { ...p, stock: p.stock - Number(qty) }
            : p
      )

      const bills = JSON.parse(
        localStorage.getItem('smartledger-bills') || '[]'
      )

      bills.push({
        id: Date.now(),
        customer: customer.trim() || 'Walk-in Customer',
        product: product.trim(),
        price: Number(price),
    purchasePrice: Number(matched.purchase) || 0,
        quantity: Number(qty),
        total,
        paid: Number(paid),
        balance: total - Number(paid),
        date: new Date().toISOString()
      })

      localStorage.setItem('smartledger-bills', JSON.stringify(bills))
      localStorage.setItem('smartledger-products', JSON.stringify(updatedProducts))
      setMessage('Bill saved and inventory stock updated.')
      setCustomer('')
      setProduct('')
      setPrice('')
      setQty('1')
      setPaid('0')
    } catch {
      setMessage('Could not save the bill. Please try again.')
    }
  }

  const money = (n: number) =>
    n.toLocaleString('en-IN', {
      style: 'currency',
      currency: 'INR'
    })

  return (
    <div className="sales-card">
      <h1>Sales & Billing</h1>
      <p>Create a basic customer bill.</p>

      <label>Customer name</label>
      <input
        value={customer}
        onChange={e => setCustomer(e.target.value)}
        placeholder="Customer name"
        style={{ display: 'block', width: '100%', padding: 12, margin: '8px 0 16px' }}
      />

<label>Product name / Barcode</label>
<input
value={product}
onChange={e => {
  const value = e.target.value
  setProduct(value)
try {
  const allProducts = JSON.parse(localStorage.getItem('smartledger-products') || '[]')
  const search = value.trim().toLowerCase()
  setProductSuggestions(search ? allProducts.filter((item: any) =>
    item.name.toLowerCase().includes(search) ||
    String(item.code || '').toLowerCase().includes(search)
  ).slice(0, 6) : [])
} catch {
  setProductSuggestions([])
}
  try {
    const products = JSON.parse(localStorage.getItem('smartledger-products') || '[]')
    const matched = products.find((p: { name: string; code?: string }) =>
      p.name.toLowerCase() === value.trim().toLowerCase() ||
      String(p.code || '').toLowerCase() === value.trim().toLowerCase()
    )
    if (matched) setPrice(String(matched.selling))
  } catch {
    setMessage('Could not find product price.')
  }
}}
placeholder="Enter name or scan barcode"
style={{ display: 'block', width: '100%', padding: 12, margin: '8px 0 16px' }}
/>
{productSuggestions.length > 0 && (
  <div style={{ border: '1px solid #ccc', borderRadius: 8, marginTop: -12, marginBottom: 16 }}>
    {productSuggestions.map((item: any) => (
      <button
        key={item.id}
        type="button"
        onClick={() => {
          setProduct(item.name)
          setPrice(String(item.selling))
          setProductSuggestions([])
        }}
        style={{ display: 'block', width: '100%', padding: 12, textAlign: 'left', background: 'white', border: 'none', borderBottom: '1px solid #eee' }}
      >
        {item.name} — ₹{item.selling} | Stock: {item.stock}
      </button>
    ))}
  </div>
)}

      <div style={{ marginBottom: 16 }}>
  {!scanning ? (
    <button type="button" onClick={startScanner}
      style={{ padding: 12, background: '#176b58', color: 'white', border: 0, borderRadius: 6 }}>
      📷 Scan Barcode
    </button>
  ) : (
    <button type="button" onClick={stopScanner}
      style={{ padding: 12, background: '#b42318', color: 'white', border: 0, borderRadius: 6 }}>
      Stop Scanner
    </button>
  )}
  <video ref={videoRef} playsInline
      muted
      style={{
        display: scanning ? 'block' : 'none',
        width: '100%',
        maxWidth: 400,
        marginTop: 12
      }} />
</div>

<label>Price per unit (₹)</label>
      <input
        type="number"
        min="0.01"
        step="0.01"
        value={price}
        onChange={e => setPrice(e.target.value)}
        style={{ display: 'block', width: '100%', padding: 12, margin: '8px 0 16px' }}
      />

      <label>Quantity</label>
      <input
        type="number"
        min="0.01"
        step="any"
        value={qty}
        onChange={e => setQty(e.target.value)}
        style={{ display: 'block', width: '100%', padding: 12, margin: '8px 0 16px' }}
      />

      <h2>Bill total: {money(total)}</h2>

      <label>Amount received (₹)</label>
      <input
        type="number"
        min="0"
        step="0.01"
        value={paid}
        onChange={e => setPaid(e.target.value)}
        style={{ display: 'block', width: '100%', padding: 12, margin: '8px 0 16px' }}
      />

      <p>Outstanding balance: {money(total - (Number(paid) || 0))}</p>

      <button
        onClick={saveBill}
        style={{ padding: 14, background: '#176b58', color: 'white', border: 0, borderRadius: 8 }}
      >
        Save Bill
      </button>

      {message && <p>{message}</p>}
    </div>
  )
}
