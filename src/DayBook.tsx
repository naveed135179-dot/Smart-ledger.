import { useMemo, useState } from 'react';

export default function DayBook() {
  const [bills] = useState<any[]>(() => JSON.parse(localStorage.getItem('smartledger-bills') || '[]'));
  const [purchases] = useState<any[]>(() => JSON.parse(localStorage.getItem('smartledger-purchases') || '[]'));
  const [payments] = useState<any[]>(() => JSON.parse(localStorage.getItem('smartledger-payments') || '[]'));
  const [expenses] = useState<any[]>(() => JSON.parse(localStorage.getItem('smartledger-expenses') || '[]'));
  const [from, setFrom] = useState(new Date().toISOString().slice(0, 8) + '01');
  const [to, setTo] = useState(new Date().toISOString().slice(0, 10));

  const money = (n: number) =>
    n.toLocaleString('en-IN', { style: 'currency', currency: 'INR' });

  const rows = useMemo(() => {
    const entries: any[] = [];

    bills.forEach(b => entries.push({
      id: `sale-${b.id}`,
      date: String(b.date || '').slice(0, 10),
      type: 'Sales Invoice',
      reference: b.billNo || '-',
      party: b.customer || 'Walk-in Customer',
      details: b.product || 'Sale',
      debit: Number(b.total) || 0,
      credit: 0
    }));

    purchases.forEach(p => entries.push({
      id: `purchase-${p.id}`,
      date: String(p.date || '').slice(0, 10),
      type: 'Purchase Invoice',
      reference: p.invoice || '-',
      party: p.supplier || '-',
      details: p.product || 'Purchase',
      debit: 0,
      credit: Number(p.total) || 0
    }));

    payments.forEach(p => entries.push({
      id: `payment-${p.id}`,
      date: String(p.date || '').slice(0, 10),
      type: p.type || 'Payment',
      reference: p.receiptNo || p.billNo || '-',
      party: p.party || '-',
      details: `${p.method || ''} ${p.reference || ''}`.trim(),
      debit: p.type === 'Supplier Payment' ? Number(p.amount) || 0 : 0,
      credit: p.type === 'Customer Receipt' ? Number(p.amount) || 0 : 0
    }));

    expenses.forEach(e => entries.push({
      id: `expense-${e.id}`,
      date: String(e.date || '').slice(0, 10),
      type: 'Expense',
      reference: '-',
      party: e.category || 'Business Expense',
      details: e.description || '-',
      debit: Number(e.amount) || 0,
      credit: 0
    }));

    return entries
      .filter(r => r.date && r.date >= from && r.date <= to)
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [bills, purchases, payments, expenses, from, to]);

  const salesTotal = rows.filter(r => r.type === 'Sales Invoice').reduce((s, r) => s + r.debit, 0);
  const purchaseTotal = rows.filter(r => r.type === 'Purchase Invoice').reduce((s, r) => s + r.credit, 0);
  const receipts = rows.filter(r => r.type === 'Customer Receipt').reduce((s, r) => s + r.credit, 0);
  const supplierPayments = rows.filter(r => r.type === 'Supplier Payment').reduce((s, r) => s + r.debit, 0);
  const expenseTotal = rows.filter(r => r.type === 'Expense').reduce((s, r) => s + r.debit, 0);

  return (
    <div className="daybook-card">
      <h1>Day Book</h1>
      <p>Chronological register of invoices, receipts, payments and expenses.</p>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, margin: '18px 0' }}>
        <label>From Date
          <input type="date" value={from} onChange={e => setFrom(e.target.value)} />
        </label>
        <label>To Date
          <input type="date" value={to} onChange={e => setTo(e.target.value)} />
        </label>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 12 }}>
        <article><small>Sales Invoices</small><h2>{money(salesTotal)}</h2></article>
        <article><small>Purchase Invoices</small><h2>{money(purchaseTotal)}</h2></article>
        <article><small>Customer Receipts</small><h2>{money(receipts)}</h2></article>
        <article><small>Supplier Payments</small><h2>{money(supplierPayments)}</h2></article>
        <article><small>Expenses</small><h2>{money(expenseTotal)}</h2></article>
      </div>

      <h2>Daily Transactions ({rows.length})</h2>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th>Date</th><th>Type</th><th>Reference</th><th>Party</th>
              <th>Details</th><th>Debit</th><th>Credit</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.id}>
                <td>{r.date}</td><td>{r.type}</td><td>{r.reference}</td>
                <td>{r.party}</td><td>{r.details}</td>
                <td>{r.debit ? money(r.debit) : '-'}</td>
                <td>{r.credit ? money(r.credit) : '-'}</td>
              </tr>
            ))}
            {!rows.length && <tr><td colSpan={7}>No transactions found for this period.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
