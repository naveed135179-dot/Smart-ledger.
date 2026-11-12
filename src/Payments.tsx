import { postJournal } from './accounting';
import { useState } from 'react'

type Payment = {
  id: number
  date: string
  type: string
  party: string
  amount: number
  method: string
  receiptNo: string
  billNo: string
  reference: string
}

export default function Payments() {
  const [payments, setPayments] = useState<Payment[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('smartledger-payments') || '[]')
    } catch {
      return []
    }
  })

  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [type, setType] = useState('Customer Receipt')
  const [party, setParty] = useState('')
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState('Cash')
  const [receiptNo, setReceiptNo] = useState('')
  const [billNo, setBillNo] = useState('')
  const [reference, setReference] = useState('')

  const customers = JSON.parse(localStorage.getItem('smartledger-customers') || '[]')
  const suppliers = JSON.parse(localStorage.getItem('smartledger-suppliers') || '[]')
  const parties = type === 'Customer Receipt' ? customers : suppliers

  const money = (n: number) =>
    n.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })

  function savePayment(e: React.FormEvent) {
    e.preventDefault()

    if (!party || Number(amount) <= 0) {
      alert('Select a party and enter a valid amount.')
      return
    }

    const entry: Payment = {
      id: Date.now(), date, type, party,
      amount: Number(amount), method,
      receiptNo, billNo, reference
    }

    const updated = [...payments, entry]
    
const paymentAccount = method === "Cash" ? "Cash in Hand" : "Bank Account";
const paymentAccountLines = type === "Customer Receipt"
  ? [
      { account: paymentAccount, debit: Number(amount), credit: 0 },
      { account: "Customer Receivables", debit: 0, credit: Number(amount) }
    ]
  : [
      { account: "Supplier Payables", debit: Number(amount), credit: 0 },
      { account: paymentAccount, debit: 0, credit: Number(amount) }
    ];

const journalPosted = postJournal(
  type,
  String(entry.id),
  date,
  (type === "Customer Receipt" ? "Receipt from " : "Payment to ") + party,
  paymentAccountLines
);
if (!journalPosted) {
  alert('Payment not saved: accounting entry failed.');
  return;
}

localStorage.setItem('smartledger-payments', JSON.stringify(updated))
    setPayments(updated)

    setParty('')
    setAmount('')
    setReceiptNo('')
    setBillNo('')
    setReference('')
    alert('Payment saved successfully.')
  }

  return (
    <div className="payments-card">
      <h1>Payments</h1>
      <p>Customer receipts and supplier payments.</p>

      <form onSubmit={savePayment} style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))',
        gap: 12, background: 'white', padding: 20,
        borderRadius: 12
      }}>
        <label>Transaction type
          <select value={type} onChange={e => {
            setType(e.target.value)
            setParty('')
          }}>
            <option>Customer Receipt</option>
            <option>Supplier Payment</option>
          </select>
        </label>

        <label>Party
          <select required value={party} onChange={e => setParty(e.target.value)}>
            <option value="">Select party</option>
            {parties.map((p: {id:number; name:string}) =>
              <option key={p.id} value={p.name}>{p.name}</option>
            )}
          </select>
        </label>

        <label>Date
          <input type="date" required value={date}
            onChange={e => setDate(e.target.value)} />
        </label>

        <label>Amount (₹)
          <input type="number" min="0.01" step="0.01" required
            value={amount} onChange={e => setAmount(e.target.value)} />
        </label>

        <label>Receipt No.
          <input value={receiptNo}
            onChange={e => setReceiptNo(e.target.value)} />
        </label>

        <label>Bill No.
          <input value={billNo}
            onChange={e => setBillNo(e.target.value)} />
        </label>

        <label>Payment method
          <select value={method} onChange={e => setMethod(e.target.value)}>
            <option>Cash</option>
            <option>UPI</option>
            <option>Bank</option>
            <option>Cheque</option>
          </select>
        </label>

        <label>Reference number
          <input value={reference}
            onChange={e => setReference(e.target.value)} />
        </label>

        <button type="submit" style={{
          padding: 12, background: '#176b58', color: 'white',
          border: 0, borderRadius: 8
        }}>Save Payment</button>
      </form>

      <h2>Payment History</h2>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', background: 'white', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th>Date</th><th>Type</th><th>Party</th>
              <th>Receipt No.</th><th>Bill No.</th>
              <th>Method</th><th>Reference</th><th>Amount</th>
            </tr>
          </thead>
          <tbody>
            {payments.map(p => (
              <tr key={p.id}>
                <td>{p.date}</td><td>{p.type}</td><td>{p.party}</td>
                <td>{p.receiptNo || '—'}</td><td>{p.billNo || '—'}</td>
                <td>{p.method}</td><td>{p.reference || '—'}</td>
                <td>{money(p.amount)}</td>
              </tr>
            ))}
            {!payments.length && (
              <tr><td colSpan={8}>No payments recorded yet.</td></tr>
            )}
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
