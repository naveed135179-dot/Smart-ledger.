import { useMemo } from 'react';
import { readJournal } from './accounting';

const money = (n: number) =>
  n.toLocaleString('en-IN', { style: 'currency', currency: 'INR' });

export default function BalanceSheet() {
  const accounts = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('smartledger-accounts') || '[]');
    } catch {
      return [];
    }
  }, []);

  const journal = useMemo(() => readJournal(), []);

  const balances = accounts.map((account: any) => {
    const lines = journal.flatMap(entry =>
      entry.lines.filter(line => line.account === account.name)
    );

    const debit = (Number(account.openingDebit) || 0) +
      lines.reduce((sum, line) => sum + (Number(line.debit) || 0), 0);

    const credit = (Number(account.openingCredit) || 0) +
      lines.reduce((sum, line) => sum + (Number(line.credit) || 0), 0);

    return {
      ...account,
      balance: ['Assets', 'Expenses'].includes(account.group)
        ? debit - credit
        : credit - debit
    };
  });

  const getGroup = (group: string) =>
    balances.filter((a: any) => a.group === group);

  const total = (group: string) =>
    getGroup(group).reduce(
      (sum: number, a: any) => sum + a.balance,
      0
    );

  const assets = total('Assets');
  const liabilities = -total('Liabilities');
  const capital = -total('Capital');
  const income = -total('Income');
  const expenses = total('Expenses');
  const currentProfit = income - expenses;
  const totalLiabilitiesAndCapital =
    liabilities + capital + currentProfit;

  const section = (title: string, group: string) => (
    <section style={{ marginTop: 22 }}>
      <h2>{title}</h2>
      <table style={{ width: '100%' }}>
        <tbody>
          {getGroup(group).map((a: any) => (
            <tr key={a.id}>
              <td>{a.name}</td>
              <td style={{ textAlign: 'right' }}>
                {money(Math.abs(a.balance))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );

  return (
    <div className="balancesheet-card">
      <h1>Balance Sheet</h1>
      <p>Assets, liabilities and capital from opening balances and posted journal entries.</p>

      {section('Assets', 'Assets')}
      <h3>Total Assets: {money(assets)}</h3>

      {section('Liabilities', 'Liabilities')}
      <h3>Total Liabilities: {money(liabilities)}</h3>

      {section('Capital', 'Capital')}
      <h3>Capital: {money(capital)}</h3>

      <section style={{ marginTop: 22 }}>
        <h2>Current Period Profit / Loss</h2>
        <h3>{money(currentProfit)}</h3>
      </section>

      <hr />

      <h2>Total Liabilities + Capital + Profit</h2>
      <h2>{money(totalLiabilitiesAndCapital)}</h2>

      <h3>
        Difference: {money(Math.abs(assets - totalLiabilitiesAndCapital))}
      </h3>

      <p style={{ marginTop: 16 }}>
        This statement includes opening balances and posted journal entries only.
        Existing transactions not yet posted to the journal are excluded.
      </p>
    </div>
  );
}
