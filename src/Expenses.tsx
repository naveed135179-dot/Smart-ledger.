import { postJournal } from './accounting';
import { useState } from 'react'

type Expense = {
  id: number
  date: string
  category: string
  description: string
  amount: number
  payment: string
}

export default function Expenses() {
  const [expenses, setExpenses] = useState<Expense[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('smartledger-expenses') || '[]')
    } catch {
      return []
    }
  })

  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [category, setCategory] = useState('Transport')
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [payment, setPayment] = useState('Cash')

  const money = (n: number) =>
    n.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })

  function saveExpense(e: React.FormEvent) {
    e.preventDefault()

    if (!description.trim() || Number(amount) <= 0) {
      alert('Enter a description and a valid amount.')
      return
    }

    const entry: Expense = {
      id: Date.now(),
      date,
      category,
      description: description.trim(),
      amount: Number(amount),
      payment
    }

    const updated = [...expenses, entry]
    
const expenseCreditAccount = payment === "Cash"
  ? "Cash in Hand"
  : payment === "Credit"
    ? "Supplier Payables"
    : "Bank Account";

postJournal("Expense", String(entry.id), entry.date, entry.description, [
  { account: "Shop Expenses", debit: Number(entry.amount), credit: 0 },
  { account: expenseCreditAccount, debit: 0, credit: Number(entry.amount) }
]);

localStorage.setItem('smartledger-expenses', JSON.stringify(updated))
    setExpenses(updated)
    setDescription('')
    setAmount('')
    alert('Expense saved successfully.')
  }

  const total = expenses.reduce((sum, item) => sum + item.amount, 0)

  return (
    <div className="expenses-card">
      <h1>Expenses</h1>
      <p>Record and monitor your business expenses.</p>

      <div style={{
        padding: 18, background: 'white', borderRadius: 12,
        border: '1px solid #e2e8f0', marginBottom: 20
      }}>
        <small>Total recorded expenses</small>
        <h2>{money(total)}</h2>
        <small>{expenses.length} expense entries</small>
      </div>

      <form onSubmit={saveExpense} style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))',
        gap: 12, background: 'white', padding: 20,
        borderRadius: 12, border: '1px solid #e2e8f0'
      }}>
        <label>Date
          <input type="date" value={date} required
            onChange={e => setDate(e.target.value)} />
        </label>

        <label>Category
          <select value={category} onChange={e => setCategory(e.target.value)}>
            <option>Transport</option>
            <option>Fuel</option>
            <option>Electricity</option>
            <option>Salary</option>
            <option>Rent</option>
            <option>Packaging</option>
            <option>Maintenance</option>
            <option>Other</option>
          </select>
        </label>

        <label>Description
          <input value={description} required
            onChange={e => setDescription(e.target.value)}
            placeholder="e.g. Monthly fuel" />
        </label>

        <label>Amount (₹)
          <input type="number" min="0.01" step="0.01" required
            value={amount} onChange={e => setAmount(e.target.value)} />
        </label>

        <label>Payment method
          <select value={payment} onChange={e => setPayment(e.target.value)}>
            <option>Cash</option>
            <option>Bank</option>
            <option>UPI</option>
            <option>Credit</option>
          </select>
        </label>

        <button type="submit" style={{
          padding: 12, background: '#176b58', color: 'white',
          border: 0, borderRadius: 8, fontWeight: 700
        }}>Save Expense</button>
      </form>

      <h2>Expense History</h2>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', background: 'white', borderCollapse: 'collapse' }}>
          <thead><tr>
            <th>Date</th><th>Category</th><th>Description</th>
            <th>Payment</th><th>Amount</th>
          </tr></thead>
          <tbody>
            {expenses.map(item => <tr key={item.id}>
              <td>{item.date}</td>
              <td>{item.category}</td>
              <td>{item.description}</td>
              <td>{item.payment}</td>
              <td>{money(item.amount)}</td>
            </tr>)}
            {!expenses.length && <tr>
              <td colSpan={5} style={{ textAlign: 'center', padding: 20 }}>
                No expenses recorded yet.
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
