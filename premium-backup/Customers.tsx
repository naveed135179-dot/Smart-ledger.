import { useState } from 'react'

type Customer = {
  id: number
  name: string
  phone: string
  address: string
  state?: string
  openingBalance: number
}

export default function Customers() {
  const [customers, setCustomers] = useState<Customer[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('smartledger-customers') || '[]')
    } catch {
      return []
    }
  })

  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
const [state, setState] = useState('Jammu & Kashmir')
  const [balance, setBalance] = useState('0')
  const [search, setSearch] = useState('')

  function addCustomer(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || Number(balance) < 0 || balance === '') {
      alert('Enter a valid customer name and balance.')
      return
    }

    const updated = [...customers, {
      id: Date.now(),
      name: name.trim(),
      phone: phone.trim(),
      address: address.trim(),
state: state.trim(),
      openingBalance: Number(balance)
    }]

    setCustomers(updated)
    localStorage.setItem('smartledger-customers', JSON.stringify(updated))
    setName('')
    setPhone('')
    setAddress('')
setState('Jammu & Kashmir')
    setBalance('0')
  }

  const bills = JSON.parse(localStorage.getItem("smartledger-bills") || "[]")
const payments = JSON.parse(localStorage.getItem("smartledger-payments") || "[]")

const outstanding = (customerName: string, opening: number) => {
  const billDue = bills
    .filter((b: any) => b.customer === customerName)
    .reduce((sum: number, b: any) => sum + Number(b.balance ?? (Number(b.total || 0) - Number(b.paid || 0))), 0)

  const received = payments
    .filter((p: any) => p.type === "Customer Receipt" && p.party === customerName)
    .reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0)

  return Number(opening || 0) + billDue - received
}

const filtered = customers.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.phone.includes(search)
  )

  const money = (n: number) =>
    n.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })

  return (
    <div className="customers-card">
      <h1>Customers</h1>
      <p>Manage customer details and opening balances.</p>

      <form onSubmit={addCustomer} style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))',
        gap: 12, background: 'white', padding: 20,
        borderRadius: 12, border: '1px solid #e2e8f0'
      }}>
        <label>Name
          <input required value={name} onChange={e => setName(e.target.value)}
            placeholder="Customer name" />
        </label>
        <label>Phone
          <input value={phone} onChange={e => setPhone(e.target.value)}
            placeholder="Phone number" />
        </label>
        <label>Address
          <input value={address} onChange={e => setAddress(e.target.value)}
            placeholder="Address" />
        </label>
        <label>State<input value={state} onChange={e => setState(e.target.value)} placeholder="Customer state" /></label>
<label>Opening balance (₹)
          <input required type="number" min="0" step="0.01"
            value={balance} onChange={e => setBalance(e.target.value)} />
        </label>
        <button type="submit" style={{
          padding: 12, background: '#176b58', color: 'white',
          border: 0, borderRadius: 8, fontWeight: 700
        }}>Add Customer</button>
      </form>

      <h2>Customer Summary</h2>
      <p>Total customers: {customers.length} | Opening balances: {
        money(customers.reduce((sum, c) => sum + c.openingBalance, 0))
      }</p>

      <input value={search} onChange={e => setSearch(e.target.value)}
        placeholder="Search by name or phone..."
        style={{ width: '100%', marginBottom: 15 }} />

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', background: 'white', borderCollapse: 'collapse' }}>
          <thead><tr>
            <th>Name</th><th>Phone</th><th>Address</th><th>Outstanding</th>
          </tr></thead>
          <tbody>
            {filtered.map(c => <tr key={c.id}>
              <td>{c.name}</td><td>{c.phone || '—'}</td>
              <td>{c.address || '—'}</td><td>{money(outstanding(c.name, c.openingBalance))}</td>
            </tr>)}
            {filtered.length === 0 && <tr>
              <td colSpan={4} style={{ textAlign: 'center', padding: 20 }}>
                No customers added yet.
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
