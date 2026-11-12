import { useState } from 'react';

type Account = {
  id: number;
  name: string;
  group: string;
  openingDebit: number;
  openingCredit: number;
};

const groups = ['Assets', 'Liabilities', 'Capital', 'Income', 'Expenses'];

const defaults: Account[] = [
  { id: 1, name: 'Cash in Hand', group: 'Assets', openingDebit: 0, openingCredit: 0 },
  { id: 2, name: 'Bank Account', group: 'Assets', openingDebit: 0, openingCredit: 0 },
  { id: 3, name: 'Inventory / Stock', group: 'Assets', openingDebit: 0, openingCredit: 0 },
  { id: 4, name: 'Customer Receivables', group: 'Assets', openingDebit: 0, openingCredit: 0 },
  { id: 5, name: 'Supplier Payables', group: 'Liabilities', openingDebit: 0, openingCredit: 0 },
  { id: 6, name: 'Business Capital', group: 'Capital', openingDebit: 0, openingCredit: 0 },
  { id: 7, name: 'Sales Income', group: 'Income', openingDebit: 0, openingCredit: 0 },
  { id: 8, name: 'Purchase / Cost of Goods', group: 'Expenses', openingDebit: 0, openingCredit: 0 },
  { id: 9, name: 'Shop Expenses', group: 'Expenses', openingDebit: 0, openingCredit: 0 },
];

function readAccounts(): Account[] {
  const extraDefaults: Account[] = [
    { id: 13, name: 'Historical Receipt Clearing', group: 'Assets', openingDebit: 0, openingCredit: 0 },
    { id: 12, name: 'Historical Payment Clearing', group: 'Liabilities', openingDebit: 0, openingCredit: 0 },
    { id: 10, name: 'GST Payable', group: 'Liabilities', openingDebit: 0, openingCredit: 0 },
    { id: 11, name: 'Input GST', group: 'Assets', openingDebit: 0, openingCredit: 0 }
  ];

  const allDefaults = [...defaults, ...extraDefaults];

  try {
    const saved = JSON.parse(localStorage.getItem('smartledger-accounts') || 'null');

    if (!Array.isArray(saved)) {
      localStorage.setItem('smartledger-accounts', JSON.stringify(allDefaults));
      return allDefaults;
    }

    const merged = [...saved];

    for (const account of allDefaults) {
      const exists = merged.some(
        (item: Account) =>
          String(item.name || '').trim().toLowerCase() === account.name.toLowerCase()
      );

      if (!exists) merged.push(account);
    }

    localStorage.setItem('smartledger-accounts', JSON.stringify(merged));
    return merged;
  } catch {
    return allDefaults;
  }
}

const money = (n: number) =>
  n.toLocaleString('en-IN', { style: 'currency', currency: 'INR' });

export default function ChartOfAccounts() {
  const [accounts, setAccounts] = useState<Account[]>(readAccounts);
  const [name, setName] = useState('');
  const [group, setGroup] = useState('Assets');
  const [debit, setDebit] = useState('0');
  const [credit, setCredit] = useState('0');

  function save(next: Account[]) {
    setAccounts(next);
    localStorage.setItem('smartledger-accounts', JSON.stringify(next));
  }

  function addAccount(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    if (Number(debit) < 0 || Number(credit) < 0 || (Number(debit) > 0 && Number(credit) > 0)) {
      alert('Enter a non-negative opening balance on only one side.');
      return;
    }
    if (accounts.some(a => a.name.toLowerCase() === name.trim().toLowerCase())) {
      alert('An account with this name already exists.');
      return;
    }
    save([...accounts, {
      id: Date.now(),
      name: name.trim(),
      group,
      openingDebit: Number(debit) || 0,
      openingCredit: Number(credit) || 0,
    }]);
    setName('');
    setDebit('0');
    setCredit('0');
  }

  const openingDebitTotal = accounts.reduce((sum, a) => sum + (Number(a.openingDebit) || 0), 0);
  const openingCreditTotal = accounts.reduce((sum, a) => sum + (Number(a.openingCredit) || 0), 0);
  const openingDifference = Math.abs(openingDebitTotal - openingCreditTotal);
  const openingBalanced = openingDifference < 0.01;

  return (
    <div className="accounts-card">
      <h1>Chart of Accounts</h1>
      <p>Manage account groups and opening balances.</p>
      <section style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))',gap:12,margin:'18px 0',padding:16,background:'#F6F3EA',borderRadius:14}}>
        <article><small>Opening Debit</small><h2>{money(openingDebitTotal)}</h2></article>
        <article><small>Opening Credit</small><h2>{money(openingCreditTotal)}</h2></article>
        <article><small>Difference</small><h2>{money(openingDifference)}</h2><strong style={{color:openingBalanced?'#287A55':'#D96C61'}}>{openingBalanced?'Balanced':'Not Balanced'}</strong></article>
      </section>

      <form onSubmit={addAccount} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 12, margin: '18px 0' }}>
        <label>Account Name
          <input required value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Electricity Expense" />
        </label>
        <label>Account Group
          <select value={group} onChange={e => setGroup(e.target.value)}>
            {groups.map(g => <option key={g}>{g}</option>)}
          </select>
        </label>
        <label>Opening Debit (₹)
          <input type="number" min="0" step="0.01" value={debit} onChange={e => setDebit(e.target.value)} />
        </label>
        <label>Opening Credit (₹)
          <input type="number" min="0" step="0.01" value={credit} onChange={e => setCredit(e.target.value)} />
        </label>
        <button type="submit">Add Account</button>
      </form>

      {groups.map(g => {
        const list = accounts.filter(a => a.group === g);
        if (!list.length) return null;
        return (
          <section key={g} style={{ marginTop: 22 }}>
            <h2>{g}</h2>
            <div style={{ overflowX: 'auto' }}>
              <table>
                <thead><tr><th>Account</th><th>Opening Debit</th><th>Opening Credit</th><th>Action</th></tr></thead>
                <tbody>
                  {list.map(a => (
                    <tr key={a.id}>
                      <td>{a.name}</td>
                      <td>{money(a.openingDebit)}</td>
                      <td>{money(a.openingCredit)}</td>
                      <td>
                        <button type="button" disabled={defaults.some(d => d.id === a.id)} onClick={() => save(accounts.filter(x => x.id !== a.id))}>Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        );
      })}
    </div>
  );
}
