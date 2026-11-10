import { useEffect, useState } from 'react';

const read = (key: string) => {
  try {
    return JSON.parse(localStorage.getItem(key) || '[]');
  } catch {
    return [];
  }
};

const money = (value: number) =>
  '₹' + value.toLocaleString('en-IN', { minimumFractionDigits: 2 });

export default function Outstanding({ onOpenLedger }: { onOpenLedger: () => void }) {
  const [customers, setCustomers] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [sales, setSales] = useState<any[]>([]);
  const [purchases, setPurchases] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [view, setView] = useState<'All' | 'Customers' | 'Suppliers'>('All');

  useEffect(() => {
    setCustomers(read('smartledger-customers'));
    setSuppliers(read('smartledger-suppliers'));
    setSales(read('smartledger-bills'));
    setPurchases(read('smartledger-purchases'));
    setPayments(read('smartledger-payments'));
  }, []);

  const customerRows = customers.map((party) => {
    const bills = sales.filter((x) => x.customer === party.name);
    const receipts = payments
      .filter((x) => x.party === party.name && x.type === 'Customer Receipt')
      .reduce((sum, x) => sum + Number(x.amount || 0), 0);
    const billed = bills.reduce((sum, x) => sum + Number(x.total || 0), 0);
    const paid = bills.reduce((sum, x) => sum + Number(x.paid || 0), 0);

    return {
      ...party,
      balance: Number(party.openingBalance || 0) + billed - paid - receipts
    };
  });

  const supplierRows = suppliers.map((party) => {
    const bills = purchases.filter((x) => x.supplier === party.name);
    const paymentsMade = payments
      .filter((x) => x.party === party.name && x.type === 'Supplier Payment')
      .reduce((sum, x) => sum + Number(x.amount || 0), 0);
    const purchased = bills.reduce((sum, x) => sum + Number(x.total || 0), 0);
    const paid = bills.reduce((sum, x) => sum + Number(x.paid || 0), 0);

    return {
      ...party,
      balance: Number(party.openingBalance || 0) + purchased - paid - paymentsMade
    };
  });

  const customerTotal = customerRows.reduce((sum, x) => sum + x.balance, 0);
  const supplierTotal = supplierRows.reduce((sum, x) => sum + x.balance, 0);
  const matches = (name: string) => name.toLowerCase().includes(search.toLowerCase());

  return (
    <div className="outstanding-card">
      <h2>Outstanding Summary</h2>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginBottom: 24 }}>
        <div style={{ padding: 16, border: '1px solid #ddd', borderRadius: 10, flex: 1 }}>
          <div>Customer Dues</div>
          <h2>{money(customerTotal)}</h2>
        </div>
        <div style={{ padding: 16, border: '1px solid #ddd', borderRadius: 10, flex: 1 }}>
          <div>Supplier Dues</div>
          <h2>{money(supplierTotal)}</h2>
        </div>
      </div>

      <input
      autoFocus={false}
      readOnly={false}
      disabled={false}
      onClick={(e) => e.stopPropagation()} onFocus={() => alert("Search field focused")}
        type="text"
        placeholder="Search customer or supplier..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{ width: '100%', padding: 12, marginBottom: 16, boxSizing: 'border-box' }}
      />

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
        {(['All', 'Customers', 'Suppliers'] as const).map((item) => (
          <button key={item} onClick={() => setView(item)}
            style={{ padding: '9px 14px', fontWeight: view === item ? 'bold' : 'normal' }}>
            {item}
          </button>
        ))}
      </div>

      {view !== 'Suppliers' && (
        <>
          <h3>Customer Balances</h3>
          {customerRows.filter((x) => matches(x.name)).length === 0
            ? <p>No matching customers found.</p>
            : customerRows.filter((x) => matches(x.name)).map((x) => (
              <div key={x.id || x.name} style={{ padding: 12, borderBottom: '1px solid #ddd' }}>
                <strong>{x.name}</strong>
                <div>{money(x.balance)}</div>
                <button onClick={onOpenLedger} style={{ marginTop: 8 }}>Open Party Ledger</button>
              </div>
            ))}
        </>
      )}

      {view !== 'Customers' && (
        <>
          <h3 style={{ marginTop: 24 }}>Supplier Balances</h3>
          {supplierRows.filter((x) => matches(x.name)).length === 0
            ? <p>No matching suppliers found.</p>
            : supplierRows.filter((x) => matches(x.name)).map((x) => (
              <div key={x.id || x.name} style={{ padding: 12, borderBottom: '1px solid #ddd' }}>
                <strong>{x.name}</strong>
                <div>{money(x.balance)}</div>
                <button onClick={onOpenLedger} style={{ marginTop: 8 }}>Open Party Ledger</button>
              </div>
            ))}
        </>
      )}
    </div>
  );
}
