import BulkAction from './BulkAction';
import Payments from './Payments'
import Reports from './Reports'
import Expenses from './Expenses'
import Purchases from './Purchases'
import Suppliers from './Suppliers'
import Customers from './Customers'
import Sales from './Sales'
import Products from './Products'
import { useState } from 'react'
import { LayoutDashboard, Package, ShoppingCart, Users, Truck, Receipt, Wallet, BarChart3, Menu, Search, Settings } from 'lucide-react'
import './App.css'

import Ledger from './Ledger';
import Outstanding from './Outstanding';
import Backup from './Backup';
import SettingsScreen from './Settings';

const modules = [
  { name: 'Dashboard', icon: LayoutDashboard },
  { name: 'Products & Stock', icon: Package },
  { name: 'Bulk Action', icon: Package },
  { name: 'Sales & Billing', icon: ShoppingCart },
  { name: 'Customers', icon: Users },
  { name: 'Suppliers', icon: Truck },
  { name: 'Purchases', icon: Receipt },
  { name: 'Expenses', icon: Wallet },
  { name: 'Business Reports', icon: BarChart3 },
  { name: 'Payments', icon: BarChart3 },
  { name: 'Party Ledger', icon: BarChart3 },
  { name: 'Backup & Restore', icon: Wallet },
    { name: 'Settings', icon: Settings },
  { name: 'Outstanding', icon: BarChart3 },
]

function readDashboardData(key: string): any[] {
  try {
    const data = JSON.parse(localStorage.getItem(key) || '[]');
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export default function App() {
  const [active, setActive] = useState('Dashboard')
  const [menuOpen, setMenuOpen] = useState(false)
const [homeSearch, setHomeSearch] = useState('')

const homeResults = homeSearch.trim() ? [
  ...JSON.parse(localStorage.getItem('smartledger-products') || '[]')
    .filter((x: any) => (x.name || '').toLowerCase().includes(homeSearch.toLowerCase()))
    .map((x: any) => ({ name: x.name, type: 'Product', module: 'Products & Stock', stock: x.stock, selling: x.selling })),
  ...JSON.parse(localStorage.getItem('smartledger-customers') || '[]')
    .filter((x: any) => (x.name || '').toLowerCase().includes(homeSearch.toLowerCase()))
    .map((x: any) => ({ name: x.name, type: 'Customer', module: 'Customers' })),
  ...JSON.parse(localStorage.getItem('smartledger-suppliers') || '[]')
    .filter((x: any) => (x.name || '').toLowerCase().includes(homeSearch.toLowerCase()))
    .map((x: any) => ({ name: x.name, type: 'Supplier', module: 'Suppliers' }))
] : []



  const bills = readDashboardData('smartledger-bills');
  const purchases = readDashboardData('smartledger-purchases');
  const payments = readDashboardData('smartledger-payments');
  const customers = readDashboardData('smartledger-customers');
  const suppliers = readDashboardData('smartledger-suppliers');
  const products = readDashboardData('smartledger-products');

  const now = new Date();
  const todaySales = bills.reduce((sum: number, b: any) => {
    const d = new Date(b.date);
    return sum + (
      !isNaN(d.getTime()) &&
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate()
        ? Number(b.total || 0) : 0
    );
  }, 0);

  const receivables = customers.reduce((sum: number, c: any) => {
    const due = bills
      .filter((b: any) => b.customer === c.name)
      .reduce((v: number, b: any) =>
        v + Number(b.balance ?? (Number(b.total || 0) - Number(b.paid || 0))), 0);
    const received = payments
      .filter((p: any) => p.type === 'Customer Receipt' && p.party === c.name)
      .reduce((v: number, p: any) => v + Number(p.amount || 0), 0);
    return sum + Number(c.openingBalance || 0) + due - received;
  }, 0);

  const payables = suppliers.reduce((sum: number, s: any) => {
    const due = purchases
      .filter((p: any) => p.supplier === s.name)
      .reduce((v: number, p: any) =>
        v + Number(p.total || 0) - Number(p.paid || 0), 0);
    const paid = payments
      .filter((p: any) => p.type === 'Supplier Payment' && p.party === s.name)
      .reduce((v: number, p: any) => v + Number(p.amount || 0), 0);
    return sum + Number(s.openingBalance || 0) + due - paid;
  }, 0);

  const dashboardMoney = (n: number) =>
    '₹' + n.toLocaleString('en-IN', { maximumFractionDigits: 2 });

  return (
    <div className="app">
      <aside className={menuOpen ? 'sidebar open' : 'sidebar'}>
        <h2>Smart<span>Ledger</span></h2>
        <p className="subtitle">YOUR BUSINESS, ORGANIZED</p>
        {modules.map(({ name, icon: Icon }) => (
          <button key={name} className={active === name ? 'nav active' : 'nav'} onClick={() => { setActive(name); setMenuOpen(false) }}>
            <Icon size={19} /> {name}
          </button>
        ))}
        <p className="sidebar-foot">SmartLedger • Business Edition</p>
      </aside>

      <main className="main">
        <header>
          <button className="menu-btn" onClick={() => setMenuOpen(!menuOpen)}><Menu /></button>
          <div><small>MY BUSINESS</small><h2>{active}</h2></div>
          <div className="search"><Search size={18} /><input type="text" placeholder="Search products, customers, suppliers..." value={homeSearch} onChange={(e) => setHomeSearch(e.target.value)} /></div>
        </header>

{homeSearch.trim() && (
  <div style={{ background: 'white', padding: 12, border: '1px solid #ddd', borderRadius: 8, marginBottom: 16 }}>
    {homeResults.length ? homeResults.map((item, index) => (
      <div key={item.type + item.name + index}
        onClick={() => { setActive(item.module); setHomeSearch(''); }}
        style={{ padding: 10, borderBottom: '1px solid #eee', cursor: 'pointer' }}>
        <strong>{item.name}</strong>
        <small style={{ marginLeft: 10, color: '#666' }}>{item.type}</small>{item.type === 'Product' && <div style={{ fontSize: 13, marginTop: 5 }}>Stock: {item.stock ?? 0} | Selling: ₹{item.selling ?? 0}</div>}
      </div>
    )) : <p>No matching records found.</p>}
  </div>
)}


        {active === 'Bulk Action' ? (<BulkAction />) : active === 'Products & Stock' ? (
          <Products />
        ) : active === 'Sales & Billing' ? (
          <Sales />
        ) : active === 'Customers' ? (
          <Customers />
        ) : active === 'Suppliers' ? (
      <Suppliers />
    ) : active === 'Purchases' ? (
      <Purchases />
    ) : active === 'Expenses' ? (
      <Expenses />
    ) : active === 'Business Reports' ? (
      <Reports />
    ) : active === 'Payments' ? (
      <Payments />
        ) : active === 'Party Ledger' ? (
          <Ledger />
        ) : active === 'Outstanding' ? (
          <Outstanding onOpenLedger={() => setActive('Party Ledger')} />
): active === 'Settings' ? <SettingsScreen /> :
   active === 'Backup & Restore' ? (
<Backup />
):(
        <>
        <section className="welcome">
          <div><small>BUSINESS OVERVIEW</small><h1>Welcome to SmartLedger</h1><p>Your Business. Your Numbers. Your Growth.</p></div>
        </section>

        <section className="stats">
          <article><span>Today's Sales</span><strong>{dashboardMoney(todaySales)}</strong><small>Sales recorded today</small></article>
          <article><span>Outstanding Receivables</span><strong>{dashboardMoney(receivables)}</strong><small>Customer balances due</small></article>
          <article><span>Supplier Payables</span><strong>{dashboardMoney(payables)}</strong><small>Payments to suppliers</small></article>
          <article><span>Stock Items</span><strong>{products.length}</strong><small>Products in inventory</small></article>
        </section>

        <section className="section">
          <h3>Business Management</h3>
          <p className="muted">Choose a module to get started.</p>
          <div className="modules">
            {modules.map(({ name, icon: Icon }) => (
              <button key={name} className="module" onClick={() => setActive(name)}>
                <span className="icon"><Icon size={23} /></span>
                <strong>{name}</strong>
                <small>{name === 'Dashboard' ? 'Business summary' : 'Open ' + name.toLowerCase()}</small>
              </button>
            ))}
          </div>
        </section>
        <footer>SmartLedger • Built for your business</footer>
        </>
        )}
      </main>
    </div>
  )
}
