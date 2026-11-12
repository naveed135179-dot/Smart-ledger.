import { jsPDF } from 'jspdf';
import { useEffect, useState } from 'react';

const read = (key: string) => {
  try {
    return JSON.parse(localStorage.getItem(key) || '[]');
  } catch {
    return [];
  }
};

const money = (n: number) =>
  '₹' + n.toLocaleString('en-IN', { maximumFractionDigits: 2 });

export default function Ledger() {
  const [type, setType] = useState<'Customer' | 'Supplier'>('Customer');
  const [partyName, setPartyName] = useState('');
const [fromDate, setFromDate] = useState('');
const [toDate, setToDate] = useState('');
const [transactionType, setTransactionType] = useState('All');


  const parties = read(
    type === 'Customer' ? 'smartledger-customers' : 'smartledger-suppliers'
  );
  const sales = read('smartledger-bills');
  const purchases = read('smartledger-purchases');
  const payments = read('smartledger-payments');

  useEffect(() => {
    setPartyName('');
  }, [type]);

  const party = parties.find((p: any) => p.name === partyName);

  const entries: any[] = [];

  if (party) {
    entries.push({
      date: '',
      description: 'Opening Balance',
      reference: '',
      debit: type === 'Customer' ? Number(party.openingBalance || 0) : 0,
      credit: type === 'Supplier' ? Number(party.openingBalance || 0) : 0,
    });

    if (type === 'Customer') {
      sales.filter((x: any) => x.customer === partyName).forEach((x: any) => {
        entries.push({
          date: x.date,
          description: 'Sales Bill',
          reference: x.id || '',
          debit: Number(x.total || 0),
          credit: Number(x.paid || 0),
        });
      });
    } else {
      purchases.filter((x: any) => x.supplier === partyName).forEach((x: any) => {
        entries.push({
          date: x.date,
          description: 'Purchase',
          reference: x.invoice || '',
          debit: Number(x.paid || 0),
          credit: Number(x.total || 0),
        });
      });
    }

    payments.filter((x: any) =>
      x.party === partyName &&
      x.type === (type === 'Customer' ? 'Customer Receipt' : 'Supplier Payment')
    ).forEach((x: any) => {
      entries.push({
        date: x.date,
        description: type === 'Customer' ? 'Customer Receipt' : 'Supplier Payment',
        reference: [x.receiptNo, x.billNo, x.reference].filter(Boolean).join(' / '),
        debit: type === 'Supplier' ? Number(x.amount || 0) : 0,
        credit: type === 'Customer' ? Number(x.amount || 0) : 0,
      });
    });
  }

  entries.sort((a, b) => {
    if (!a.date) return -1;
    if (!b.date) return 1;
    return String(a.date).localeCompare(String(b.date));
  });

  const totalDebit = entries.reduce((sum, x) => sum + Number(x.debit || 0), 0);
const totalCredit = entries.reduce((sum, x) => sum + Number(x.credit || 0), 0);

let balance = 0;
  const statement = entries.map((x) => {
    balance += type === 'Customer' ? x.debit - x.credit : x.credit - x.debit;
    return { ...x, balance };
  });


  

const filteredStatement = statement.filter((x: any) => {
  const date = String(x.date || '').slice(0, 10);
  const matchesFrom = !fromDate || date >= fromDate;
  const matchesTo = !toDate || date <= toDate;
  const description = String(x.description || '');
  const matchesType =
    transactionType === 'All' ||
    (transactionType === 'Sales' && description === 'Sales Bill') ||
    (transactionType === 'Purchases' && description === 'Purchase') ||
    (transactionType === 'Payments' &&
      (description === 'Customer Receipt' || description === 'Supplier Payment'));
  return matchesFrom && matchesTo && matchesType;
});

const sharePDF = async () => {
  if (!party) return;

  const doc = new jsPDF();
  doc.setFontSize(18);
  doc.text('SMARTLEDGER PARTY STATEMENT', 14, 20);
  doc.setFontSize(12);
  doc.text(`${type}: ${party.name}`, 14, 32);
  doc.text(`Outstanding Balance: ${money(balance)}`, 14, 42);

  let y = 55;
  doc.setFontSize(9);
  doc.text('Date', 14, y);
  doc.text('Description', 38, y);
  doc.text('Debit', 105, y);
  doc.text('Credit', 140, y);
  doc.text('Balance', 175, y);
  y += 8;

  filteredStatement.forEach((x) => {
    if (y > 275) {
      doc.addPage();
      y = 20;
    }
    doc.text(String(x.date || '-').slice(0, 12), 14, y);
    doc.text(String(x.description || '').slice(0, 32), 38, y);
    doc.text(money(x.debit), 105, y);
    doc.text(money(x.credit), 140, y);
    doc.text(money(x.balance), 175, y);
    y += 7;
  });

  const file = new File(
    [doc.output('blob')],
    'SmartLedger-Statement.pdf',
    { type: 'application/pdf' }
  );

  if (navigator.share && navigator.canShare?.({ files: [file] })) {
    await navigator.share({
      title: 'SmartLedger Party Statement',
      files: [file]
    });
  } else {
    doc.save('SmartLedger-Statement.pdf');
    alert('PDF downloaded. You can share it from your Downloads folder.');
  }
};

const downloadPDF = () => {
    if (!party) return;

    const doc = new jsPDF();
    let y = 20;

    doc.setFontSize(18);
    doc.text('SMARTLEDGER - PARTY STATEMENT', 14, y);
    y += 12;

    doc.setFontSize(12);
    doc.text(`${type}: ${party.name}`, 14, y);
    y += 9;
    doc.text(`Opening Balance: ${money(Number(party.openingBalance || 0))}`, 14, y);
    y += 12;

    doc.setFontSize(9);
    doc.text('Date', 14, y);
    doc.text('Description', 38, y);
    doc.text('Debit', 105, y);
    doc.text('Credit', 140, y);
    doc.text('Balance', 175, y);
    y += 7;

    statement.forEach((x) => {
      if (y > 275) {
        doc.addPage();
        y = 20;
      }

      doc.text(String(x.date || '-').slice(0, 12), 14, y);
      doc.text(String(x.description || '').slice(0, 32), 38, y);
      doc.text(money(x.debit), 105, y);
      doc.text(money(x.credit), 140, y);
      doc.text(money(x.balance), 175, y);
      y += 7;
    });

    doc.save(`SmartLedger-${party.name.replace(/[^a-z0-9]/gi, '_')}-Statement.pdf`);
  };

  return (
    <main style={{ padding: 16, maxWidth: 1000, margin: 'auto' }}>
      <h2>Party Ledger</h2>
      <p>Individual customer and supplier account statements.</p>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button onClick={() => setType('Customer')}>Customers</button>
        <button onClick={() => setType('Supplier')}>Suppliers</button>
      </div>

      <label style={{ display: 'block', marginBottom: 8 }}>
        Select {type}
      </label>

      <select
        value={partyName}
        onChange={(e) => setPartyName(e.target.value)}
        style={{ width: '100%', padding: 12, marginBottom: 20 }}
      >
        <option value="">Choose {type}</option>
        {parties.map((p: any) => (
          <option key={p.id} value={p.name}>{p.name}</option>
        ))}
      </select>

      {party && (
        <>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, margin: '12px 0' }}>
            <div>Total Debit: <strong>{money(totalDebit)}</strong></div>
            <div>Total Credit: <strong>{money(totalCredit)}</strong></div>
            <div>Closing Balance: <strong>{money(balance)}</strong></div>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, margin: '16px 0' }}>
            <label>From: <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} /></label>
            <label>To: <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} /></label>
            <label>Type:
              <select value={transactionType} onChange={(e) => setTransactionType(e.target.value)}>
                <option>All</option>
                <option>Sales</option>
                <option>Purchases</option>
                <option>Payments</option>
              </select>
            </label>
            <button onClick={() => { setFromDate(''); setToDate(''); setTransactionType('All'); }}>
              Clear Filters
            </button>
          </div>

          <h3>{party.name}</h3>
          <h3>Outstanding Balance: {money(balance)}</h3>

          <button
            onClick={sharePDF}
            style={{ padding: '10px 18px', margin: '12px 8px', cursor: 'pointer' }}
          >
            Share Statement
          </button>

          <button
            onClick={downloadPDF}
            style={{ padding: '10px 18px', margin: '12px 0', cursor: 'pointer' }}
          >
            Download PDF Statement
          </button>

          {filteredStatement.length === 0 ? (
            <p>No transactions recorded for this party yet.</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', minWidth: 650, borderCollapse: 'collapse', background: 'white' }}>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Description</th>
                    <th>Reference</th>
                    <th>Debit</th>
                    <th>Credit</th>
                    <th>Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStatement.map((x: any, i: number) => (
                    <tr key={i}>
                      <td>{x.date || '-'}</td>
                      <td>{x.description}</td>
                      <td>{x.reference || '-'}</td>
                      <td>{money(x.debit)}</td>
                      <td>{money(x.credit)}</td>
                      <td><strong>{money(x.balance)}</strong></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {!partyName && <p>Select a party to view its statement.</p>}
      {parties.length === 0 && <p>No {type.toLowerCase()} records found.</p>}
    </main>
  );
}
