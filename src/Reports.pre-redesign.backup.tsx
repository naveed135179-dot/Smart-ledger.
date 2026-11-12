import React, { useMemo, useState } from 'react';

const read = (key: string): any[] => {
  try {
    const value = JSON.parse(localStorage.getItem(key) || '[]');
    return Array.isArray(value) ? value : [];
  } catch { return []; }
};

const money = (n: number) => '₹' + Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });
const dateOf = (x: any) => {
  const d = new Date(x?.date || x?.createdAt || '');
  return Number.isNaN(d.getTime()) ? null : d;
};

export default function Reports() {
  const [period, setPeriod] = useState('month');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const bills = read('smartledger-bills');
  const purchases = read('smartledger-purchases');
  const expenses = read('smartledger-expenses');
  const customers = read('smartledger-customers');
  const suppliers = read('smartledger-suppliers');

  const filtered = (items: any[]) => items.filter(x => {
    const d = dateOf(x);
    if (!d) return false;
    if (from || to) {
      return (!from || d >= new Date(from + 'T00:00:00')) &&
        (!to || d <= new Date(to + 'T23:59:59'));
    }
    const now = new Date();
    if (period === 'today') return d.toDateString() === now.toDateString();
    if (period === 'year') return d.getFullYear() === now.getFullYear();
    if (period === 'all') return true;
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });

  const sales = filtered(bills);
  const buys = filtered(purchases);
  const costs = filtered(expenses);

  const totalSales = sales.reduce((s, x) => s + Number(x.total || x.totalAmount || 0), 0);
  const totalPurchases = buys.reduce((s, x) => s + Number(x.total || x.totalAmount || x.amount || 0), 0);
  const totalExpenses = costs.reduce((s, x) => s + Number(x.amount || 0), 0);

  const costOfSales = sales.reduce((sum, bill) => {
    if (Array.isArray(bill.items) && bill.items.length) {
      return sum + bill.items.reduce((v: number, item: any) =>
        v + Number(item.purchasePrice || 0) * Number(item.quantity || 0), 0);
    }
    return sum + Number(bill.purchasePrice || 0) * Number(bill.quantity || 0);
  }, 0);

  const missingCost = sales.filter(b =>
    !(Array.isArray(b.items) && b.items.length) && b.purchasePrice === undefined
  ).length;

  const grossProfit = totalSales - costOfSales;
  const netProfit = grossProfit - totalExpenses;
  const receivables = customers.reduce((s, x) => s + Number(x.balance || x.outstanding || 0), 0);
  const payables = suppliers.reduce((s, x) => s + Number(x.balance || x.outstanding || x.openingPayable || 0), 0);

  const daily = useMemo(() => {
    const map: Record<string, number> = {};
    sales.forEach(x => {
      const d = dateOf(x);
      if (d) {
        const key = d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
        map[key] = (map[key] || 0) + Number(x.total || x.totalAmount || 0);
      }
    });
    return Object.entries(map).slice(-7);
  }, [sales]);

  const maxDaily = Math.max(1, ...daily.map(x => x[1]));

  const card = (label: string, value: number, color: string, note?: string) => (
    <div style={{ background: '#fff', border: '1px solid #e7edf3', borderRadius: 16, padding: 17, minWidth: 0, boxShadow: '0 3px 12px #10243b08' }}>
      <div style={{ color: '#718096', fontSize: 12, fontWeight: 700, marginBottom: 9 }}>{label}</div>
      <div style={{ color, fontSize: 23, fontWeight: 800, overflowWrap: 'anywhere' }}>{money(value)}</div>
      {note && <div style={{ color: '#8995a5', fontSize: 11, marginTop: 7 }}>{note}</div>}
    </div>
  );

  const section = { background: '#fff', border: '1px solid #e7edf3', borderRadius: 16, padding: 18, marginTop: 16 };
  const th: React.CSSProperties = { textAlign: 'left', padding: '11px 9px', color: '#64748b', fontSize: 12, borderBottom: '1px solid #e8edf2' };
  const td: React.CSSProperties = { padding: '12px 9px', fontSize: 13, borderBottom: '1px solid #f0f3f6' };

  return (
    <div style={{ background: '#f3f6fa', minHeight: '100vh', padding: '18px 14px 35px', color: '#172b45', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <div style={{ maxWidth: 1150, margin: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ fontSize: 25, fontWeight: 850, letterSpacing: '-.7px' }}>Business Reports</div>
            <div style={{ color: '#718096', fontSize: 13, marginTop: 5 }}>Your business performance at a glance</div>
          </div>
          <button onClick={() => window.print()} style={{ background: '#102a43', color: '#fff', border: 0, borderRadius: 10, padding: '11px 17px', fontWeight: 700 }}>Print Report</button>
        </div>

        <div style={{ ...section, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 9 }}>
          {['today', 'month', 'year', 'all'].map(p => (
            <button key={p} onClick={() => { setPeriod(p); setFrom(''); setTo(''); }} style={{ border: period === p && !from && !to ? '1px solid #087f8c' : '1px solid #dce4ec', background: period === p && !from && !to ? '#e5f5f5' : '#fff', color: '#17324d', borderRadius: 9, padding: '9px 13px', fontWeight: 700, textTransform: 'capitalize' }}>{p === 'all' ? 'All Time' : p === 'month' ? 'This Month' : p === 'year' ? 'This Year' : 'Today'}</button>
          ))}
          <span style={{ color: '#94a3b8', fontSize: 12 }}>Custom:</span>
          <input aria-label="From date" type="date" value={from} onChange={e => setFrom(e.target.value)} style={{ padding: 8, border: '1px solid #dce4ec', borderRadius: 8, maxWidth: 145 }} />
          <input aria-label="To date" type="date" value={to} onChange={e => setTo(e.target.value)} style={{ padding: 8, border: '1px solid #dce4ec', borderRadius: 8, maxWidth: 145 }} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(155px,1fr))', gap: 12, marginTop: 16 }}>
          {card('Total Sales', totalSales, '#087f8c', `${sales.length} bills`)}
          {card('Total Purchases', totalPurchases, '#4263a5', `${buys.length} purchase entries`)}
          {card('Gross Profit', grossProfit, grossProfit >= 0 ? '#13845b' : '#c24141', 'Sales minus recorded cost of sold goods')}
          {card('Total Expenses', totalExpenses, '#bd7926', `${costs.length} expense entries`)}
          {card('Net Profit', netProfit, netProfit >= 0 ? '#13845b' : '#c24141', 'Gross profit minus expenses')}
          {card('Customer Receivables', receivables, '#4263a5', 'Current customer balances')}
          {card('Supplier Payables', payables, '#bd7926', 'Current supplier balances')}
        </div>

        <div style={section}>
          <div style={{ fontSize: 17, fontWeight: 800 }}>Sales Trend</div>
          <div style={{ color: '#8290a1', fontSize: 12, margin: '5px 0 18px' }}>Recent sales by date in the selected period</div>
          {daily.length ? <div style={{ display: 'flex', alignItems: 'end', gap: 12, height: 175, overflowX: 'auto', padding: '8px 2px 0' }}>
            {daily.map(([label, value]) => <div key={label} style={{ flex: '1 0 35px', minWidth: 35, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'end', alignItems: 'center', gap: 7 }}>
              <div style={{ fontSize: 10, color: '#64748b' }}>{money(value)}</div>
              <div title={money(value)} style={{ width: '70%', maxWidth: 48, height: `${Math.max(4, value / maxDaily * 115)}px`, background: 'linear-gradient(180deg,#13a6a0,#087f8c)', borderRadius: '7px 7px 2px 2px' }} />
              <div style={{ fontSize: 10, color: '#718096' }}>{label}</div>
            </div>)}
          </div> : <div style={{ color: '#8290a1', padding: 20 }}>No sales recorded for this period.</div>}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(250px,1fr))', gap: 14 }}>
          <div style={section}>
            <div style={{ fontWeight: 800, marginBottom: 13 }}>Profit Summary</div>
            {[['Sales Revenue', totalSales], ['Recorded Cost of Sales', costOfSales], ['Gross Profit', grossProfit], ['Operating Expenses', totalExpenses], ['Net Profit', netProfit]].map(([label, value]: any) =>
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, padding: '10px 0', borderBottom: '1px solid #edf1f5', fontSize: 13 }}>
                <span style={{ color: '#64748b' }}>{label}</span><strong>{money(value)}</strong>
              </div>)}
            {missingCost > 0 && <div style={{ background: '#fff7e8', color: '#98621b', padding: 10, borderRadius: 9, fontSize: 12, marginTop: 12 }}>{missingCost} older sale(s) have no recorded purchase cost. Profit may be incomplete.</div>}
          </div>
          <div style={section}>
            <div style={{ fontWeight: 800, marginBottom: 13 }}>Business Overview</div>
            {[['Sales Bills', sales.length], ['Purchase Entries', buys.length], ['Expense Entries', costs.length], ['Customers', customers.length], ['Suppliers', suppliers.length]].map(([label, value]: any) =>
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #edf1f5', fontSize: 13 }}>
                <span style={{ color: '#64748b' }}>{label}</span><strong>{value}</strong>
              </div>)}
          </div>
        </div>

        <div style={section}>
          <div style={{ fontSize: 17, fontWeight: 800, marginBottom: 12 }}>Recent Sales</div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 460 }}>
              <thead><tr>{['Date', 'Customer', 'Bill / Product', 'Amount'].map(x => <th key={x} style={th}>{x}</th>)}</tr></thead>
              <tbody>{sales.slice().reverse().slice(0, 10).map((x, i) => <tr key={x.id || i}>
                <td style={td}>{dateOf(x)?.toLocaleDateString('en-IN') || '-'}</td>
                <td style={td}>{x.customer || x.customerName || 'Walk-in'}</td>
                <td style={td}>{x.invoiceNo || x.billNo || x.product || 'Sale'}</td>
                <td style={{ ...td, fontWeight: 700 }}>{money(Number(x.total || x.totalAmount || 0))}</td>
              </tr>)}</tbody>
            </table>
            {!sales.length && <div style={{ padding: 18, color: '#8290a1' }}>No sales found for this period.</div>}
          </div>
        </div>
        <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: 11, padding: 18 }}>SmartLedger · Business Reports</div>
      </div>
    </div>
  );
}
