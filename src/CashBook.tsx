import { useMemo, useState } from 'react';

export default function CashBook() {
  const [payments] = useState<any[]>(() => JSON.parse(localStorage.getItem('smartledger-payments') || '[]'));
  const [expenses] = useState<any[]>(() => JSON.parse(localStorage.getItem('smartledger-expenses') || '[]'));
  const [purchases] = useState<any[]>(() => JSON.parse(localStorage.getItem('smartledger-purchases') || '[]'));
  const [opening, setOpening] = useState(() => localStorage.getItem('smartledger-opening-cash') || '0');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const money = (n: number) => n.toLocaleString('en-IN', { style: 'currency', currency: 'INR' });

  const transactions = useMemo(() => {
    const entries: any[] = [];

    payments.forEach(p => {
      if (String(p.method || '').toLowerCase() !== 'cash') return;
      entries.push({
        id: `payment-${p.id}`,
        date: String(p.date || '').slice(0, 10),
        description: `${p.type} - ${p.party}`,
        receipt: p.type === 'Customer Receipt' ? Number(p.amount) || 0 : 0,
        payment: p.type === 'Supplier Payment' ? Number(p.amount) || 0 : 0
      });
    });

    expenses.forEach(e => {
      if (String(e.payment || '').toLowerCase() !== 'cash') return;
      entries.push({
        id: `expense-${e.id}`,
        date: String(e.date || '').slice(0, 10),
        description: `Expense - ${e.category}: ${e.description}`,
        receipt: 0,
        payment: Number(e.amount) || 0
      });
    });

    purchases.forEach(p => {
      if (String(p.paymentMethod || '').toLowerCase() !== 'cash') return;
      const amount = Number(p.paid) || 0;
      if (amount <= 0) return;

      const duplicate = payments.some(x =>
        x.type === 'Supplier Payment' &&
        String(x.method || '').toLowerCase() === 'cash' &&
        String(x.party || '').trim().toLowerCase() === String(p.supplier || '').trim().toLowerCase() &&
        String(x.date || '').slice(0, 10) === String(p.date || '').slice(0, 10) &&
        Math.abs((Number(x.amount) || 0) - amount) < 0.01
      );

      if (!duplicate) {
        entries.push({
          id: `purchase-${p.id}`,
          date: String(p.date || '').slice(0, 10),
          description: `Purchase payment - ${p.supplier} - ${p.product}`,
          receipt: 0,
          payment: amount
        });
      }
    });

    return entries
      .filter(t => (!from || t.date >= from) && (!to || t.date <= to))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [payments, expenses, purchases, from, to]);

  const totalReceipts = transactions.reduce((s, t) => s + t.receipt, 0);
  const totalPayments = transactions.reduce((s, t) => s + t.payment, 0);
  const openingAmount = Number(opening) || 0;

  let running = openingAmount;
  const rows = transactions.map(t => {
    running += t.receipt - t.payment;
    return { ...t, balance: running };
  });

  return (
    <div className="cashbook-card">
      <h1>Cash Book</h1>
      <p>Physical cash receipts, payments and running balance.</p>

      <label>Opening Cash Balance (₹)
        <input type="number" min="0" step="0.01" value={opening}
          onChange={e => setOpening(e.target.value)}
          onBlur={() => localStorage.setItem('smartledger-opening-cash', opening)} />
      </label>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 12, margin: '18px 0' }}>
        <article><small>Cash Receipts</small><h2>{money(totalReceipts)}</h2></article>
        <article><small>Cash Payments</small><h2>{money(totalPayments)}</h2></article>
        <article><small>Closing Cash</small><h2>{money(openingAmount + totalReceipts - totalPayments)}</h2></article>
      </div>

      <h2>Transaction History</h2>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, margin: '12px 0' }}>
        <label>From <input type="date" value={from} onChange={e => setFrom(e.target.value)} /></label>
        <label>To <input type="date" value={to} onChange={e => setTo(e.target.value)} /></label>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr><th>Date</th><th>Description</th><th>Receipt</th><th>Payment</th><th>Balance</th></tr></thead>
          <tbody>
            {rows.map(t => <tr key={t.id}>
              <td>{t.date}</td><td>{t.description}</td>
              <td>{t.receipt ? money(t.receipt) : '-'}</td>
              <td>{t.payment ? money(t.payment) : '-'}</td>
              <td>{money(t.balance)}</td>
            </tr>)}
            {!rows.length && <tr><td colSpan={5}>No cash transactions found.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
