import React, { useState } from 'react';

const money = (v: any) => '₹' + Number(v || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });
const read = (key: string) => {
  try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch { return []; }
};
const dateOf = (x: any) => {
  const d = new Date(x?.date || x?.createdAt || x?.billDate || '');
  return isNaN(d.getTime()) ? null : d;
};
const totalOf = (x: any) => Number(x?.total ?? x?.totalAmount ?? x?.amount ?? 0);
const costOf = (x: any) => {
  if (Array.isArray(x?.items) && x.items.length) {
    return x.items.reduce((s: number, i: any) => s + Number(i.purchasePrice ?? i.purchase ?? 0) * Number(i.quantity ?? i.qty ?? 0), 0);
  }
  if (x?.purchasePrice !== undefined) return Number(x.purchasePrice || 0) * Number(x.quantity || x.qty || 0);
  return undefined;
};
const cell: React.CSSProperties = { padding: '11px 10px', borderBottom: '1px solid #e8edf2', textAlign: 'left', whiteSpace: 'nowrap', fontSize: 13 };
const head: React.CSSProperties = { ...cell, background: '#102a43', color: '#ffffff', fontWeight: 800, position: 'sticky', top: 0 };
const card: React.CSSProperties = { background: '#fff', border: '1px solid #dce4ec', borderTop: '3px solid #087f8c', borderRadius: 12, padding: 17, minWidth: 135, boxShadow: '0 3px 12px rgba(16,42,67,0.06)' };
const btn: React.CSSProperties = { border: '1px solid #d7e1e9', borderRadius: 9, padding: '10px 13px', background: '#fff', color: '#29445c', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', boxShadow: '0 1px 3px rgba(16,42,67,0.05)' };

export default function Reports() {
  const sales = read('smartledger-bills');
  const buys = read('smartledger-purchases');
  const costs = read('smartledger-expenses');
  const payments = read('smartledger-payments');
  const customers = read('smartledger-customers');
  const suppliers = read('smartledger-suppliers');
  const products = read('smartledger-products');

  const [tab, setTab] = useState('Overview');
  const [period, setPeriod] = useState('all');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [search, setSearch] = useState('');

  const tabs = ['Overview', 'Daily Sales', 'Sales Details', 'Purchase Details', 'Customer Report', 'Supplier Report', 'Product Profit', 'Expense Report', 'Payments', 'Profit & Loss'];

  const inRange = (x: any) => {
    const d = dateOf(x);
    if (!d) return false;
    const day = d.toISOString().slice(0, 10);
    if (from || to) return (!from || day >= from) && (!to || day <= to);
    const now = new Date();
    if (period === 'today') return day === now.toISOString().slice(0, 10);
    if (period === 'month') return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    if (period === 'year') return d.getFullYear() === now.getFullYear();
    return true;
  };

  const S = sales.filter(inRange);
  const P = buys.filter(inRange);
  const E = costs.filter(inRange);
  const M = payments.filter(inRange);
  const salesTotal = S.reduce((a: number, x: any) => a + totalOf(x), 0);
  const purchaseTotal = P.reduce((a: number, x: any) => a + totalOf(x), 0);
  const expenseTotal = E.reduce((a: number, x: any) => a + totalOf(x), 0);
  const knownCost = S.reduce((a: number, x: any) => a + (costOf(x) ?? 0), 0);
  const missingCost = S.filter((x: any) => costOf(x) === undefined).length;
  const gross = salesTotal - knownCost;
  const net = gross - expenseTotal;

  const filtered = (rows: any[]) => rows.filter(x => JSON.stringify(x).toLowerCase().includes(search.toLowerCase()));
  const table = (headers: string[], rows: any[][]) => (
    <div style={{ overflowX: 'auto', background: '#fff', border: '1px solid #dce4ec', borderRadius: 10 }} className="business-overview-panel">
      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 650 }}>
        <thead><tr>{headers.map(h => <th key={h} style={head}>{h}</th>)}</tr></thead>
        <tbody>{rows.length ? rows.map((r, i) => <tr key={i}>{r.map((v, j) => <td key={j} style={cell}>{v ?? '-'}</td>)}</tr>) : <tr><td colSpan={headers.length} style={{ ...cell, padding: 25, textAlign: 'center', color: '#8293a3' }}>No records found for this report and date range.</td></tr>}</tbody>
      </table>
    </div>
  );

  const salesRows = filtered(S).map((x: any) => [
    dateOf(x)?.toLocaleDateString('en-IN') || '-',
    x.customer || x.customerName || 'Walk-in',
    x.invoiceNo || x.billNo || x.id || '-',
    Array.isArray(x.items) ? x.items.map((i: any) => i.product || i.name).join(', ') : x.product || '-',
    money(totalOf(x)), money(x.paid), money(x.balance)
  ]);

  const purchaseRows = filtered(P).map((x: any) => [
    dateOf(x)?.toLocaleDateString('en-IN') || '-',
    x.supplier || x.supplierName || '-',
    x.invoiceNo || x.billNo || x.invoice || '-',
    x.product || (Array.isArray(x.items) ? x.items.map((i: any) => i.product || i.name).join(', ') : '-'),
    Number(x.quantity ?? x.qty ?? 0),
    money(x.rate ?? x.price ?? x.purchasePrice), money(totalOf(x)), money(x.paid), money(x.balance)
  ]);

  const customerGroups = new Map<string, number>();
  S.forEach((x: any) => { const n = x.customer || x.customerName || 'Walk-in'; customerGroups.set(n, (customerGroups.get(n) || 0) + totalOf(x)); });
  const customerRows = filtered(Array.from(customerGroups, ([name, amount]) => ({ name, amount }))).map((x: any) => [x.name, money(x.amount), money(customers.find((c: any) => c.name === x.name)?.balance)]);

  const supplierGroups = new Map<string, number>();
  P.forEach((x: any) => { const n = x.supplier || x.supplierName || 'Unknown'; supplierGroups.set(n, (supplierGroups.get(n) || 0) + totalOf(x)); });
  const supplierRows = filtered(Array.from(supplierGroups, ([name, amount]) => ({ name, amount }))).map((x: any) => [x.name, money(x.amount), money(suppliers.find((s: any) => s.name === x.name)?.balance)]);

  const productGroups = new Map<string, { qty: number; revenue: number; cost: number; missing: boolean }>();
  S.forEach((bill: any) => {
    const items = Array.isArray(bill.items) ? bill.items : [{ product: bill.product, quantity: bill.quantity, price: bill.price, purchasePrice: bill.purchasePrice }];
    items.forEach((i: any) => {
      const name = i.product || i.name || 'Unknown';
      const qty = Number(i.quantity ?? i.qty ?? 0);
      const revenue = Number(i.total ?? (Number(i.price || 0) * qty));
      const hasCost = i.purchasePrice !== undefined || i.purchase !== undefined;
      const c = productGroups.get(name) || { qty: 0, revenue: 0, cost: 0, missing: false };
      c.qty += qty; c.revenue += revenue; c.cost += Number(i.purchasePrice ?? i.purchase ?? 0) * qty; c.missing ||= !hasCost;
      productGroups.set(name, c);
    });
  });
  const productRows = filtered(Array.from(productGroups, ([name, v]) => ({ name, ...v }))).map((x: any) => [x.name, x.qty, money(x.revenue), x.missing ? 'Cost missing' : money(x.cost), x.missing ? 'Unavailable' : money(x.revenue - x.cost)]);

  const expenseGroups = new Map<string, number>();
  E.forEach((x: any) => { const n = x.category || x.description || 'Other'; expenseGroups.set(n, (expenseGroups.get(n) || 0) + totalOf(x)); });
  const expenseRows = filtered(E).map((x: any) => [dateOf(x)?.toLocaleDateString('en-IN') || '-', x.category || '-', x.description || '-', money(totalOf(x))]);
  const paymentRows = filtered(M).map((x: any) => [dateOf(x)?.toLocaleDateString('en-IN') || '-', x.type || '-', x.party || x.customer || x.supplier || '-', x.method || '-', x.receiptNo || x.billNo || x.reference || '-', money(totalOf(x))]);

  const daily = new Map<string, number>();
  S.forEach((x: any) => { const d = dateOf(x); if (d) { const k = d.toLocaleDateString('en-IN'); daily.set(k, (daily.get(k) || 0) + totalOf(x)); } });
  const dailyRows = filtered(Array.from(daily, ([date, amount]) => ({ date, amount }))).map((x: any) => [x.date, money(x.amount)]);

  const downloadFullReport = async () => {
    try {
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
      const settings = (() => {
        try { return JSON.parse(localStorage.getItem("smartledger-settings") || "{}"); }
        catch { return {}; }
      })();

      const businessName = settings.businessName || "SmartLedger Business Report";
      const sections: [string, any[]][] = [
        ["DAILY SALES", dailyRows],
        ["SALES / INVOICE DETAILS", salesRows],
        ["PURCHASE DETAILS", purchaseRows],
        ["CUSTOMER REPORT", customerRows],
        ["SUPPLIER REPORT", supplierRows],
        ["PRODUCT PROFIT", productRows],
        ["EXPENSE DETAILS", expenseRows],
        ["PAYMENT DETAILS", paymentRows]
      ];

      let y = 18;
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      const pageCheck = (height = 8) => {
        if (y + height > pageHeight - 15) {
          doc.addPage();
          y = 16;
        }
      };

      const line = (value: any, x = 12, size = 8) => {
        doc.setFontSize(size);
        const text = String(value ?? "");
        const wrapped = doc.splitTextToSize(text, pageWidth - x - 12);
        pageCheck(wrapped.length * 4 + 2);
        doc.text(wrapped, x, y);
        y += wrapped.length * 4 + 2;
      };

      const heading = (value: string) => {
        pageCheck(12);
        y += 3;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.text(value, 12, y);
        y += 7;
        doc.setFont("helvetica", "normal");
      };

      const table = (rows: any[]) => {
        if (!Array.isArray(rows) || rows.length === 0) {
          line("No records found for this period.");
          return;
        }
        rows.forEach((row: any) => {
          const values = Array.isArray(row)
            ? row
            : typeof row === "object" && row !== null
              ? Object.entries(row).map(([key, value]) => `${key}: ${value ?? ""}`)
              : [row];
          line(values.map(v => String(v ?? "")).join("   |   "));
          doc.setDrawColor(220);
          pageCheck(2);
          doc.line(12, y - 1, pageWidth - 12, y - 1);
        });
      };

      doc.setFont("helvetica", "bold");
      doc.setFontSize(19);
      doc.text(businessName, 12, y);
      y += 9;
      doc.setFontSize(13);
      doc.text("COMPLETE BUSINESS REPORT", 12, y);
      y += 8;
      doc.setFont("helvetica", "normal");
      line(`Period: ${period || "Selected period"}    From: ${from || "All"}    To: ${to || "All"}`);
      line(`Generated: ${new Date().toLocaleString("en-IN")}`);
      heading("FINANCIAL SUMMARY");
      [
        ["Total Sales", salesTotal],
        ["Total Purchases", purchaseTotal],
        ["Cost of Sales", knownCost],
        ["Gross Profit", gross],
        ["Total Expenses", expenseTotal],
        ["Net Profit", net],
        ["Sales Bills", S.length],
        ["Purchase Entries", P.length],
        ["Sales Missing Cost", missingCost]
      ].forEach(([label, value]) => line(`${label}: ${typeof value === "number" ? money(value) : value}`));

      sections.forEach(([name, rows]) => {
        heading(name);
        table(rows);
      });

      heading("PROFIT & LOSS SUMMARY");
      line(`Sales Revenue: ${money(salesTotal)}`);
      line(`Cost of Sales: ${money(knownCost)}`);
      line(`Gross Profit: ${money(gross)}`);
      line(`Expenses: ${money(expenseTotal)}`);
      line(`Net Profit: ${money(net)}`);
      line(`Sales with missing cost information: ${missingCost}`);

      const pages = doc.getNumberOfPages();
      for (let i = 1; i <= pages; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.text(`SmartLedger | Page ${i} of ${pages}`, pageWidth - 12, pageHeight - 7, { align: "right" });
      }

      doc.save("SmartLedger-Full-Business-Report.pdf");
    } catch (error) {
      console.error(error);
      alert("PDF export failed. Check the browser console for details.");
    }
  };


  const title = tab === 'Overview' ? 'Business Overview' : tab;
  return (
    <div className="reports-page" style={{ background: '#f1f5f9', minHeight: '100%', padding: 14, color: '#162b45', fontFamily: 'Arial, sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 17, background: '#102a43', color: '#fff', padding: 18, borderRadius: 13, boxShadow: '0 4px 14px rgba(16,42,67,0.12)' }}>
        <div><div style={{ fontSize: 23, fontWeight: 900, color: '#fff' }}>Business Reports</div><div style={{ color: '#8290a1', fontSize: 12, marginTop: 4 }}>Detailed sales, purchases, stock and financial analysis</div></div>
        <button style={{ ...btn, background: '#087f8c', color: '#fff', borderColor: '#13a6a0' }} onClick={() => window.print()}>Print Report</button><button onClick={downloadFullReport} style={{ marginLeft: 8, padding: "10px 16px", borderRadius: 8, border: 0, background: "#087f8c", color: "#fff", fontWeight: 700, cursor: "pointer" }}>Download Full PDF</button>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
        {['all', 'today', 'month', 'year'].map(p => <button key={p} onClick={() => { setPeriod(p); setFrom(''); setTo(''); }} style={{ ...btn, background: period === p && !from && !to ? '#dff3f2' : '#fff', borderColor: period === p && !from && !to ? '#087f8c' : '#d7e1e9' }}>{p === 'all' ? 'All Time' : p === 'month' ? 'This Month' : p === 'year' ? 'This Year' : 'Today'}</button>)}
      </div>
      <div style={{ display: 'flex', gap: 9, flexWrap: 'wrap', alignItems: 'center', marginBottom: 16 }}>
        <label style={{ fontSize: 12, fontWeight: 700 }}>From <input type="date" value={from} onChange={e => { setFrom(e.target.value); setPeriod('custom'); }} style={{ ...btn, padding: 8 }} /></label>
        <label style={{ fontSize: 12, fontWeight: 700 }}>To <input type="date" value={to} onChange={e => { setTo(e.target.value); setPeriod('custom'); }} style={{ ...btn, padding: 8 }} /></label>
        <button style={btn} onClick={() => { setFrom(''); setTo(''); setPeriod('all'); }}>Clear Dates</button>
      </div>

      <div style={{ display: 'flex', gap: 7, overflowX: 'auto', paddingBottom: 12, marginBottom: 14 }}>
        {tabs.map(t => <button key={t} onClick={() => { setTab(t); setSearch(''); }} style={{ ...btn, background: tab === t ? '#087f8c' : '#fff', color: tab === t ? '#fff' : '#29445c', borderColor: tab === t ? '#087f8c' : '#d7e1e9' }}>{t}</button>)}
      </div>

      <h3 style={{ margin: '0 0 13px', fontSize: 18 }}>{title}</h3>

      {tab === 'Overview' && <>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(145px,1fr))', gap: 10, marginBottom: 15 }}>
          {[
            ['Total Sales', money(salesTotal)], ['Total Purchases', money(purchaseTotal)],
            ['Cost of Sales', money(knownCost)], ['Gross Profit', money(gross)],
            ['Expenses', money(expenseTotal)], ['Net Profit', money(net)],
            ['Sales Bills', S.length], ['Purchase Entries', P.length]
          ].map(([label, value]) => <div key={label} style={card}><div style={{ color: '#8290a1', fontSize: 12, fontWeight: 700 }}>{label}</div><div style={{ fontSize: 19, fontWeight: 900, marginTop: 8 }}>{value}</div></div>)}
        </div>
        {missingCost > 0 && <div style={{ background: '#fff4df', color: '#805500', padding: 12, borderRadius: 10, marginBottom: 13, fontSize: 13 }}>⚠️ Purchase cost is missing for {missingCost} sales bill(s). Profit may be overstated. Update product purchase prices for accurate reports.</div>}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(230px,1fr))', gap: 12 }}>
          <div style={card}><b>Business Records</b>{[['Sales Bills', S.length], ['Purchase Entries', P.length], ['Expense Entries', E.length], ['Payment Entries', M.length], ['Customers', customers.length], ['Suppliers', suppliers.length], ['Products', products.length]].map(([a,b]) => <div key={a} style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px solid #edf1f5', fontSize: 13 }}><span>{a}</span><b>{b}</b></div>)}</div>
          <div style={card}><b>Profit Calculation</b><div style={{ marginTop: 12, fontSize: 13, lineHeight: 2 }}><div>Sales Revenue: <b>{money(salesTotal)}</b></div><div>Less Cost of Goods: <b>{money(knownCost)}</b></div><div>Gross Profit: <b>{money(gross)}</b></div><div>Less Expenses: <b>{money(expenseTotal)}</b></div><div style={{ borderTop: '1px solid #dce5ec', marginTop: 6, paddingTop: 6 }}>Net Profit: <b>{money(net)}</b></div></div></div>
        </div>
        
{/* SMARTLEDGER_OVERVIEW_ENHANCED */}
<div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(260px,1fr))',gap:14,marginTop:18}}>
  <div style={{background:"#fff",border:"1px solid #e7edf3",borderRadius:16,padding:18,boxShadow:"0 3px 12px #10243608"}}>
    <div style={{fontSize:17,fontWeight:800,marginBottom:5}}>Sales Trend</div>
    <div style={{fontSize:12,color:'#8290a1',marginBottom:18}}>Monthly sales performance · Last 6 months</div>
    {(() => {
      const buckets: Record<string,{label:string,value:number,sort:number}> = {};
      sales.forEach((bill:any) => {
        const d = dateOf(bill);
        if (!d || isNaN(d.getTime())) return;
        const key = d.getFullYear() + '-' + d.getMonth();
        if (!buckets[key]) buckets[key] = {
          label:d.toLocaleDateString('en-IN',{month:'short',year:'2-digit'}),
          value:0,sort:d.getFullYear()*12+d.getMonth()
        };
        buckets[key].value += Number(bill.total || bill.totalAmount || 0);
      });
      const rows = Object.values(buckets).sort((a,b)=>a.sort-b.sort).slice(-6);
      const max = Math.max(1,...rows.map(x=>x.value));
      return rows.length ? <div style={{display:'flex',alignItems:'end',gap:10,height:155,paddingTop:8}}>
        {rows.map((row,i)=><div key={i} style={{flex:1,minWidth:0,textAlign:'center',height:'100%',display:'flex',flexDirection:'column',justifyContent:'end',gap:7}}>
          <div style={{fontSize:10,fontWeight:700,color:'#294450',overflowWrap:'anywhere'}}>{money(row.value)}</div>
          <div style={{height:Math.max(5,row.value/max*100)+'%',width:'100%',maxWidth:38,margin:'0 auto',borderRadius:'7px 7px 2px 2px',background:'linear-gradient(180deg,#13a6a0,#087f8c)'}} />
          <div style={{fontSize:10,color:'#8290a1'}}>{row.label}</div>
        </div>)}
      </div> : <div style={{padding:20,color:'#8290a1',fontSize:13}}>No sales data available for this period.</div>;
    })()}
  </div>
  <div style={{background:"#fff",border:"1px solid #e7edf3",borderRadius:16,padding:18,boxShadow:"0 3px 12px #10243608"}}>
    <div style={{fontSize:17,fontWeight:800,marginBottom:5}}>Business Overview</div>
    <div style={{fontSize:12,color:'#8290a1',marginBottom:12}}>Your business activity at a glance</div>
    {[
      ['Sales Bills',sales.length],
      ['Purchase Entries',buys.length],
      ['Expense Entries',costs.length],
      ['Customers',customers.length],
      ['Suppliers',suppliers.length]
    ].map(([label,value]:any,i)=><div key={label} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'11px 2px',borderBottom:i===4?'none':'1px solid #edf1f5',fontSize:13}}>
      <span style={{color:'#64748b'}}>{label}</span>
      <strong style={{color:'#102a43',fontSize:15}}>{value}</strong>
    </div>)}
  </div>
</div>
<h3 style={{ marginTop: 18 }}>Recent Sales</h3>
        {table(['Date', 'Customer', 'Invoice', 'Products', 'Amount', 'Paid', 'Balance'], salesRows.slice(-10).reverse())}
      </>}

      {tab !== 'Overview' && <div style={{ marginBottom: 12 }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder={'Search ' + tab + '...'} style={{ width: '100%', maxWidth: 380, boxSizing: 'border-box', padding: 12, border: '1px solid #d7e1e9', borderRadius: 9, fontSize: 14, marginBottom: 12 }} />
        {tab === 'Daily Sales' && table(['Date', 'Total Sales'], dailyRows)}
        {tab === 'Sales Details' && table(['Date', 'Customer', 'Invoice', 'Products', 'Total', 'Paid', 'Balance'], salesRows)}
        {tab === 'Purchase Details' && table(['Date', 'Supplier', 'Invoice', 'Products', 'Quantity', 'Rate', 'Total', 'Paid', 'Balance'], purchaseRows)}
        {tab === 'Customer Report' && table(['Customer', 'Sales Total', 'Current Balance'], customerRows)}
        {tab === 'Supplier Report' && table(['Supplier', 'Purchase Total', 'Current Balance'], supplierRows)}
        {tab === 'Product Profit' && table(['Product', 'Qty Sold', 'Sales Revenue', 'Cost of Goods', 'Gross Profit'], productRows)}
        {tab === 'Expense Report' && table(['Date', 'Category', 'Description', 'Amount'], expenseRows)}
        {tab === 'Payments' && table(['Date', 'Type', 'Party', 'Method', 'Reference', 'Amount'], paymentRows)}
        {tab === 'Profit & Loss' && table(['Particulars', 'Amount'], [['Sales Revenue', money(salesTotal)], ['Cost of Goods Sold', money(knownCost)], ['Gross Profit', money(gross)], ['Operating Expenses', money(expenseTotal)], ['Net Profit', money(net)], ['Sales with missing cost', missingCost]])}
      </div>}
      <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: 11, padding: 18 }}>SmartLedger Business Reports</div>
    </div>
  );
}
