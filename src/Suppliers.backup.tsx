import { useState } from 'react'

type Supplier = {
  id: number
  name: string
  phone: string
  address: string
  openingBalance: number
}

export default function Suppliers() {
  const [suppliers, setSuppliers] = useState<Supplier[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('smartledger-suppliers') || '[]')
    } catch {
      return []
    }
  })

  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [balance, setBalance] = useState('0')
  const [search, setSearch] = useState('')

  function addSupplier(e: React.FormEvent) {
    e.preventDefault()

    if (!name.trim() || balance === '' || !Number.isFinite(Number(balance)) || Number(balance) < 0) {
      alert('Enter a valid supplier name and balance.')
      return
    }

    const updated = [...suppliers, {
      id: Date.now(),
      name: name.trim(),
      phone: phone.trim(),
      address: address.trim(),
      openingBalance: Number(balance)
    }]

    setSuppliers(updated)
    localStorage.setItem('smartledger-suppliers', JSON.stringify(updated))
    setName('')
    setPhone('')
    setAddress('')
    setBalance('0')
  }

  const filtered = suppliers.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.phone.includes(search)
  )

  const money = (n: number) =>
    n.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })

  return (
    <div style={{ padding: 20, maxWidth: 900, margin: 'auto' }}>
      <h1>Suppliers</h1>
      <p>Manage companies, distributors and outstanding payments.</p>

      <form onSubmit={addSupplier} style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))',
        gap: 12, background: 'white', padding: 20,
        borderRadius: 12, border: '1px solid #e2e8f0'
      }}>
        <label>Supplier / Company name
          <input required value={name} onChange={e => setName(e.target.value)}
            placeholder="Company name" />
        </label>
        <label>Phone
          <input value={phone} onChange={e => setPhone(e.target.value)}
            placeholder="Phone number" />
        </label>
        <label>Address
          <input value={address} onChange={e => setAddress(e.target.value)}
            placeholder="Address" />
        </label>
        <label>Opening payable (₹)
          <input required type="number" min="0" step="0.01"
            value={balance} onChange={e => setBalance(e.target.value)} />
        </label>
        <button type="submit" style={{
          padding: 12, background: '#176b58', color: 'white',
          border: 0, borderRadius: 8, fontWeight: 700
        }}>Add Supplier</button>
      </form>

      <h2>Supplier Summary</h2>
      <p>Total suppliers: {suppliers.length} | Opening payables: {
        money(suppliers.reduce((sum, s) => sum + s.openingBalance, 0))
      }</p>

      <input value={search} onChange={e => setSearch(e.target.value)}
        placeholder="Search suppliers..."
        style={{ width: '100%', marginBottom: 15 }} />

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', background: 'white', borderCollapse: 'collapse' }}>
          <thead><tr>
            <th>Supplier</th><th>Phone</th><th>Address</th><th>Opening Payable</th>
          </tr></thead>
          <tbody>
            {filtered.map(s => <tr key={s.id}>
              <td>{s.name}</td><td>{s.phone || '—'}</td>
              <td>{s.address || '—'}</td><td>{money(s.openingBalance)}</td>
            </tr>)}
            {filtered.length === 0 && <tr>
              <td colSpan={4} style={{ textAlign: 'center', padding: 20 }}>
                No suppliers added yet.
              </td>
            </tr>}
          </tbody>
        </table>
      </div>

      <style>{`
        label { display:flex; flex-direction:column; gap:6px; font-size:13px; }
        input { padding:11px; border:1px solid #d5dce5; border-radius:7px; min-width:0; }
        th, td { padding:12px 8px; border-bottom:1px solid #e5eaf0; text-align:left; font-size:13px; }
      `}</style>
    </div>
  )
}
