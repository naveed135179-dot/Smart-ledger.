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
void businessName;
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
        const text = String(value ?? "").replace(/¹/g, "").replace(/₹/g, "Rs. ");
        const wrapped = doc.splitTextToSize(text, pageWidth - x - 12);
        pageCheck(wrapped.length * 4 + 2);
        doc.text(wrapped, x, y);
        y += wrapped.length * 4 + 2;
      };

      const heading = (value: string) => {
pageCheck(15);
y += 3;
doc.setFillColor(232, 242, 250);
doc.roundedRect(12, y - 5, pageWidth - 24, 10, 2, 2, "F");
doc.setFont("helvetica", "bold");
doc.setFontSize(11);
doc.setTextColor(25, 62, 91);
doc.text(String(value).replace(/¹/g, "").replace(/₹/g, "Rs. "), 16, y + 1);
y += 13;
doc.setFont("helvetica", "normal");
doc.setTextColor(45, 55, 65);
};

const table = (rows: any[]) => {
if (!Array.isArray(rows) || rows.length === 0) {
line("No records found for this period.");
return;
}
const data = rows.map((row: any) =>
Array.isArray(row) ? row :
typeof row === "object" && row !== null ?
Object.entries(row).map(([key, value]) => `${key}: ${value ?? ""}`) : [row]
);
const columns = Math.max(1, ...data.map((r: any[]) => r.length));
const usableWidth = pageWidth - 24;
const colWidth = usableWidth / columns;
const padding = 3;
data.forEach((row: any[], index: number) => {
const cells = Array.from({length: columns}, (_, i) =>
doc.splitTextToSize(String(row[i] ?? "").replace(/¹/g, "").replace(/₹/g, "Rs. "), colWidth - padding * 2)
);
const rowHeight = Math.max(10, ...cells.map((c: string[]) => c.length * 4.5 + 5));
pageCheck(rowHeight + 2);
if (index === 0) {
doc.setFillColor(221, 235, 247);
} else if (index % 2 === 0) {
doc.setFillColor(245, 249, 253);
} else {
doc.setFillColor(255, 255, 255);
}
doc.rect(12, y - 4, usableWidth, rowHeight, "F");
doc.setDrawColor(220, 230, 239);
doc.setLineWidth(0.25);
doc.line(12, y - 4 + rowHeight, pageWidth - 12, y - 4 + rowHeight);
for (let col = 0; col < columns; col++) {
doc.setFont("helvetica", index === 0 ? "bold" : "normal");
doc.setFontSize(index === 0 ? 9 : 8.5);
doc.setTextColor(index === 0 ? 25 : 45, index === 0 ? 63 : 61, index === 0 ? 91 : 78);
doc.text(cells[col], 12 + col * colWidth + padding, y + 2);
if (col > 0) {
doc.setDrawColor(232, 238, 244);
doc.line(12 + col * colWidth, y - 4, 12 + col * colWidth, y - 4 + rowHeight);
}
}
y += rowHeight;
});
y += 5;
};

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
    <div className="reports-page smartledger-report-theme" style={{ background: '#f1f5f9', minHeight: '100%', padding: 14, color: '#162b45', fontFamily: 'Arial, sans-serif' }}>
<style>{`
.smartledger-report-theme{color:#243b53!important;background:#f5f8fc!important}
.smartledger-report-theme h3{color:#17324d!important;font-weight:850!important;letter-spacing:-.3px}
.smartledger-report-theme button{border-radius:11px!important;font-weight:700!important;transition:all .18s ease}
.smartledger-report-theme input{border-radius:11px!important;background:#fff!important;border:1px solid #dbe5ef!important;color:#243b53!important;padding:12px!important}
.smartledger-report-theme table{width:100%;border-collapse:separate!important;border-spacing:0!important;background:#fff!important;border:1px solid #e2eaf2!important;border-radius:13px!important;overflow:hidden!important}
.smartledger-report-theme th{background:#eaf2fa!important;color:#294967!important;font-size:11px!important;font-weight:850!important;text-transform:uppercase!important;letter-spacing:.45px!important;padding:13px 11px!important;border-bottom:1px solid #dce6f0!important;text-align:left!important}
.smartledger-report-theme td{padding:12px 11px!important;border-bottom:1px solid #edf2f7!important;color:#344b61!important;font-size:13px!important}
.smartledger-report-theme tr:last-child td{border-bottom:0!important}
.smartledger-report-theme tr:nth-child(even) td{background:#f8fbff!important}
.smartledger-report-theme div[style*="box-shadow"]{border-radius:17px!important;border:1px solid #e0e9f2!important;box-shadow:0 7px 22px rgba(38,67,99,.09)!important}
.smartledger-report-theme div[style*="box-shadow"] div{line-height:1.5}
.smartledger-report-theme button:focus,.smartledger-report-theme input:focus{outline:2px solid #93c5fd!important;outline-offset:2px}
@media(max-width:600px){.smartledger-report-theme table{font-size:12px!important}.smartledger-report-theme td{padding:10px 8px!important}.smartledger-report-theme th{padding:10px 8px!important}}
`}</style>

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
        
<div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(145px,1fr))',gap:12,marginBottom:18}}>
{[
{label:'TOTAL SALES',value:money(salesTotal),color:'#2563eb',bg:'#eff6ff',border:'#bfdbfe',icon:'↗'},
{label:'TOTAL PURCHASES',value:money(purchaseTotal),color:'#7c3aed',bg:'#f5f3ff',border:'#ddd6fe',icon:'▤'},
{label:'COST OF SALES',value:money(knownCost),color:'#c2410c',bg:'#fff7ed',border:'#fed7aa',icon:'₹'},
{label:'GROSS PROFIT',value:money(gross),color:'#0f766e',bg:'#f0fdfa',border:'#99f6e4',icon:'↗'},
{label:'TOTAL EXPENSES',value:money(expenseTotal),color:'#be123c',bg:'#fff1f2',border:'#fecdd3',icon:'−'},
{label:'NET PROFIT',value:money(net),color:net>=0?'#15803d':'#b91c1c',bg:net>=0?'#f0fdf4':'#fef2f2',border:net>=0?'#bbf7d0':'#fecaca',icon:'★'},
{label:'SALES BILLS',value:S.length,color:'#0369a1',bg:'#f0f9ff',border:'#bae6fd',icon:'#'},
{label:'PURCHASE ENTRIES',value:P.length,color:'#475569',bg:'#f8fafc',border:'#cbd5e1',icon:'≡'}
].map(item=><div key={item.label} style={{background:'linear-gradient(145deg,#183653 0%,#0b1728 100%)',border:'1px solid rgba(255,255,255,0.12)',borderLeft:'4px solid '+item.color,borderRadius:17,padding:'18px 16px',boxShadow:'0 10px 24px rgba(7,20,38,0.22)',minWidth:0}}>
<div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:6}}>
<span style={{color:'#c3d2e2',fontSize:10,fontWeight:800,letterSpacing:1}}>{item.label}</span>
<span style={{color:item.color,fontSize:17,fontWeight:900,background:'rgba(255,255,255,0.10)',borderRadius:30,width:34,height:34,display:'flex',alignItems:'center',justifyContent:'center'}}>{item.icon}</span>
</div>
<div style={{color:'#ffffff',fontSize:22,fontWeight:900,marginTop:15,overflowWrap:'anywhere',letterSpacing:-0.5}}>{item.value}</div>
</div>)}
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
