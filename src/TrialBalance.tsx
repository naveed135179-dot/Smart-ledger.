import { useMemo, useState } from 'react';
import { readJournal } from './accounting';

type Account = {
  id: number;
  name: string;
  group: string;
  openingDebit: number;
  openingCredit: number;
};

function readAccounts(): Account[] {
  try {
    const data = JSON.parse(localStorage.getItem('smartledger-accounts') || 'null');
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

const money = (n: number) =>
  n.toLocaleString('en-IN', { style: 'currency', currency: 'INR' });

export default function TrialBalance() {
  const [accounts] = useState<Account[]>(readAccounts);
  const [journal] = useState(readJournal);

  const rows = useMemo(() => accounts.map(account => {
    const openingDebit = Number(account.openingDebit) || 0;
    const openingCredit = Number(account.openingCredit) || 0;

    const entries = journal.flatMap(entry =>
      entry.lines.filter(line => line.account === account.name)
    );

    const debit = openingDebit + entries.reduce(
      (sum, line) => sum + (Number(line.debit) || 0), 0
    );

    const credit = openingCredit + entries.reduce(
      (sum, line) => sum + (Number(line.credit) || 0), 0
    );

    return {
      ...account,
      debit,
      credit,
      closingDebit: Math.max(0, debit - credit),
      closingCredit: Math.max(0, credit - debit)
    };
  }), [accounts, journal]);

  const totalDebit = rows.reduce((sum, row) => sum + row.closingDebit, 0);
  const totalCredit = rows.reduce((sum, row) => sum + row.closingCredit, 0);
  const balanced = Math.abs(totalDebit - totalCredit) < 0.01;

  return (
    <div className="trialbalance-card">
      <h1>Trial Balance</h1>
      <p>Account-wise debit and credit balances from opening balances and posted journal entries.</p>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))',
        gap: 12,
        margin: '18px 0'
      }}>
        <article>
          <small>Total Debit</small>
          <h2>{money(totalDebit)}</h2>
        </article>
        <article>
          <small>Total Credit</small>
          <h2>{money(totalCredit)}</h2>
        </article>
        <article>
          <small>Difference</small>
          <h2>{money(Math.abs(totalDebit - totalCredit))}</h2>
          <strong>{balanced ? 'Balanced' : 'Not Balanced'}</strong>
        </article>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table>
          <thead>
            <tr>
              <th>Account</th>
              <th>Group</th>
              <th>Debit Balance</th>
              <th>Credit Balance</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <tr key={row.id}>
                <td>{row.name}</td>
                <td>{row.group}</td>
                <td>{row.closingDebit ? money(row.closingDebit) : '—'}</td>
                <td>{row.closingCredit ? money(row.closingCredit) : '—'}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={4}>No accounts found. Add accounts first.</td></tr>
            )}
          </tbody>
          <tfoot>
            <tr>
              <th colSpan={2}>Total</th>
              <th>{money(totalDebit)}</th>
              <th>{money(totalCredit)}</th>
            </tr>
          </tfoot>
        </table>
      </div>

      <p style={{ marginTop: 16 }}>
        Note: Only opening balances and transactions posted to the accounting journal are included.
        Existing sales, purchases, payments and expenses are not automatically included yet.
      </p>
    </div>
  );
}
