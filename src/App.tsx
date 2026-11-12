import BalanceSheet from './BalanceSheet';
import TrialBalance from './TrialBalance';
import ChartOfAccounts from './ChartOfAccounts';
import DayBook from './DayBook';
import CashBook from './CashBook';
import BulkAction from './BulkAction';
import Payments from './Payments'
import Reports from './Reports'
import Expenses from './Expenses'
import Purchases from './Purchases'
import Suppliers from './Suppliers'
import Customers from './Customers'
import Sales from './Sales'
import Products from './Products'
import GodownTransfers from './GodownTransfers'
import { useEffect, useState } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { App as CapacitorApp } from '@capacitor/app';import { LayoutDashboard, Package, ShoppingCart, Users, Truck, Receipt, Wallet, BarChart3, Menu, Search, Settings } from 'lucide-react'
import './App.css'

import Ledger from './Ledger';
import Outstanding from './Outstanding';
import Backup from './Backup';
import SettingsScreen from './Settings';

const modules = [
  { name: 'Dashboard', icon: LayoutDashboard },
  { name: 'Products & Stock', icon: Package },
{ name: 'Godown Transfers', icon: Package },
  { name: 'Bulk Action', icon: Package },
  { name: 'Sales & Billing', icon: ShoppingCart },
  { name: 'Customers', icon: Users },
  { name: 'Suppliers', icon: Truck },
  { name: 'Purchases', icon: Receipt },
  { name: 'Expenses', icon: Wallet },
    { name: 'Cash Book', icon: Wallet },
    { name: 'Day Book', icon: BarChart3 },
  { name: 'Chart of Accounts', icon: BarChart3 },
  { name: 'Trial Balance', icon: BarChart3 },
  { name: 'Balance Sheet', icon: BarChart3 },
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

useEffect(() => {
  let listener: { remove: () => Promise<void> } | undefined;
  let disposed = false;

  void CapacitorApp.addListener('backButton', () => {
    if (menuOpen) {
      setMenuOpen(false);
      return;
    }

    if (active !== 'Dashboard') {
      setActive('Dashboard');
      setHomeSearch('');
      return;
    }

    if (window.confirm('Do you want to exit SmartLedger?')) {
      void CapacitorApp.exitApp();
    }
  }).then(handle => {
    if (disposed) {
      void handle.remove();
    } else {
      listener = handle;
    }
  });

  return () => {
    disposed = true;
    if (listener) void listener.remove();
  };
}, [active, menuOpen]);


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

  
const expenses = readDashboardData('smartledger-expenses');

const stockStatusData = [
  { name: 'In Stock', value: products.filter((p: any) => Number(p.stock) >= 5).length, color: '#287A55' },
  { name: 'Low Stock', value: products.filter((p: any) => Number(p.stock) > 0 && Number(p.stock) < 5).length, color: '#D6AE62' },
  { name: 'Out of Stock', value: products.filter((p: any) => Number(p.stock) <= 0).length, color: '#D96C61' }
];

const dashboardTotalPurchases = purchases.reduce(
  (sum: number, item: any) => sum + Number(item.total || 0), 0
);
const dashboardTotalExpenses = expenses.reduce(
  (sum: number, item: any) => sum + Number(item.amount || 0), 0
);
const dashboardGrossProfit = bills.reduce((sum: number, bill: any) => {
  const items = Array.isArray(bill.items) ? bill.items : [];
  if (items.length > 0) {
    return sum + items.reduce((itemSum: number, item: any) => {
      const quantity = Number(item.quantity || 0);
      const cost = Number(item.purchasePrice ?? bill.purchasePrice ?? 0);
      const revenue = Number(item.taxableValue ?? item.total ?? (Number(item.price || 0) * quantity));
      return itemSum + (cost > 0 ? revenue - cost * quantity : 0);
    }, 0);
  }
  const cost = Number(bill.purchasePrice || 0) * Number(bill.quantity || 0);
  const revenue = Number(bill.taxableValue ?? (Number(bill.total || 0) - Number(bill.gstAmount || 0)));
  return sum + (cost > 0 ? revenue - cost : 0);
}, 0);



const dashboardMonthTotal = (records: any[], offset: number) => {
  const target = new Date();
  target.setDate(1);
  target.setMonth(target.getMonth() - offset);

  return records.reduce((sum: number, item: any) => {
    const date = new Date(item.date);
    return sum + (
      !isNaN(date.getTime()) &&
      date.getFullYear() === target.getFullYear() &&
      date.getMonth() === target.getMonth()
        ? Number(item.total || 0)
        : 0
    );
  }, 0);
};

const currentMonthSales = dashboardMonthTotal(bills, 0);
const previousMonthSales = dashboardMonthTotal(bills, 1);
const currentMonthPurchases = dashboardMonthTotal(purchases, 0);
const previousMonthPurchases = dashboardMonthTotal(purchases, 1);

const dashboardChange = (current: number, previous: number) =>
  previous === 0
    ? current > 0 ? 100 : 0
    : ((current - previous) / previous) * 100;

const chartData = Array.from({ length: 7 }, (_, index) => {
  const date = new Date();
  date.setDate(date.getDate() - (6 - index));
  const key = date.toISOString().slice(0, 10);

  const totalForDate = (records: any[]) =>
    records.reduce((sum: number, item: any) => {
      const itemDate = new Date(item.date);
      return sum + (
        !isNaN(itemDate.getTime()) &&
        itemDate.toISOString().slice(0, 10) === key
          ? Number(item.total || item.amount || 0)
          : 0
      );
    }, 0);

  return {
    day: date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
    sales: totalForDate(bills),
    purchases: totalForDate(purchases)
  };
});

const recentActivities = [
  ...bills.map((item: any) => ({
    type: 'Sale',
    party: item.customer || 'Walk-in Customer',
    date: item.date,
    amount: Number(item.total || 0)
  })),
  ...purchases.map((item: any) => ({
    type: 'Purchase',
    party: item.supplier || 'Supplier',
    date: item.date,
    amount: Number(item.total || 0)
  })),
  ...payments.map((item: any) => ({
    type: item.type || 'Payment',
    party: item.party || 'Business',
    date: item.date,
    amount: Number(item.amount || 0)
  })),
  ...expenses.map((item: any) => ({
    type: 'Expense',
    party: item.category || item.description || 'Shop Expense',
    date: item.date,
    amount: Number(item.amount || 0)
  }))
].sort((a, b) =>
  new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime()
).slice(0, 8);

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

{menuOpen && (
  <button
    className="sidebar-overlay"
    aria-label="Close navigation menu"
    onClick={() => setMenuOpen(false)}
  />
)}


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


        {active === 'Bulk Action' ? (<BulkAction />) : active === 'Godown Transfers' ? (
<GodownTransfers />
): active === 'Products & Stock' ? (
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
): active === 'Cash Book' ? (
<CashBook />
): active === 'Balance Sheet' ? (
<BalanceSheet />
): active === 'Trial Balance' ? (
<TrialBalance />
): active === 'Chart of Accounts' ? (
<ChartOfAccounts />
): active === 'Day Book' ? (
<DayBook />
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
        <section className="dashboard-hero">
  <div>
    <small>SMARTLEDGER BUSINESS CENTER</small>
    <h1>Welcome to your business overview</h1>
    <p>Your Business. Your Numbers. Your Growth.</p>
  </div>
  <div className="dashboard-logo">SL</div>
</section>

<section className="dashboard-metrics">
  <article><span>₹</span><small>TODAY'S SALES</small><strong>{dashboardMoney(todaySales)}</strong><p>Sales recorded today</p></article>
  <article><span>↗</span><small>TOTAL PURCHASES</small><strong>{dashboardMoney(dashboardTotalPurchases)}</strong><p>Recorded purchase invoices</p></article>
  <article><span>₹</span><small>GROSS PROFIT</small><strong>{dashboardMoney(dashboardGrossProfit)}</strong><p>Sales less recorded item costs</p></article>
  <article><span>↙</span><small>EXPENSES</small><strong>{dashboardMoney(dashboardTotalExpenses)}</strong><p>Recorded shop expenses</p></article>
  <article><span>↓</span><small>TO COLLECT</small><strong>{dashboardMoney(receivables)}</strong><p>Outstanding from customers</p></article>
  <article><span>↑</span><small>TO PAY</small><strong>{dashboardMoney(payables)}</strong><p>Outstanding to suppliers</p></article>
  <article><span>▦</span><small>STOCK ITEMS</small><strong>{products.length}</strong><p>Products in inventory</p></article>
</section>


<section className="dashboard-insights">
  <div className="dashboard-chart-card">
    <div className="dashboard-heading">
      <small>LAST 7 DAYS</small>
      <h2>Business Overview</h2>
      <p>Sales compared with purchases.</p>
    </div>
    <div className="dashboard-chart">
      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={chartData}>
          <defs>
            <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#287A55" stopOpacity={0.28} />
              <stop offset="95%" stopColor="#287A55" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="purchaseGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#659BC5" stopOpacity={0.24} />
              <stop offset="95%" stopColor="#659BC5" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="day" />
          <YAxis />
          <Tooltip formatter={(value: any) => dashboardMoney(Number(value))} />
          <Legend />
          <Area type="monotone" dataKey="sales" name="Sales" stroke="#287A55" fill="url(#salesGradient)" strokeWidth={3} />
          <Area type="monotone" dataKey="purchases" name="Purchases" stroke="#659BC5" fill="url(#purchaseGradient)" strokeWidth={3} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  </div>

  <div className="dashboard-activity-card">
    <div className="dashboard-heading">
      <small>RECENT TRANSACTIONS</small>
      <h2>Recent Activities</h2>
      <p>Your latest business entries.</p>
    </div>
    <div className="dashboard-activity-list">
      {recentActivities.length === 0 ? (
        <p className="dashboard-empty">No recent transactions yet.</p>
      ) : recentActivities.map((item, index) => (
        <div className="dashboard-activity-item" key={`${item.type}-${item.date}-${index}`}>
          <div>
            <strong>{item.type}</strong>
            <small>{item.party} · {item.date || 'No date'}</small>
          </div>
          <b>₹{dashboardMoney(item.amount)}</b>
        </div>
      ))}
    </div>
  </div>
</section>

<section className="dashboard-monthly-performance">
  <div className="dashboard-heading">
    <small>MONTHLY ANALYSIS</small>
    <h2>Business Performance</h2>
    <p>This month compared with last month.</p>
  </div>
  <div className="monthly-performance-grid">
    {[
      { name: 'Sales', current: currentMonthSales, previous: previousMonthSales },
      { name: 'Purchases', current: currentMonthPurchases, previous: previousMonthPurchases }
    ].map((item) => {
      const change = dashboardChange(item.current, item.previous);
      return (
        <div className="monthly-performance-item" key={item.name}>
          <strong>{item.name}</strong>
          <b>{dashboardMoney(item.current)}</b>
          <small>Last month: {dashboardMoney(item.previous)}</small>
          <span className={change >= 0 ? 'performance-up' : 'performance-down'}>
            {change >= 0 ? '▲' : '▼'} {Math.abs(change).toFixed(1)}% {change >= 0 ? 'increase' : 'decrease'}
          </span>
        </div>
      );
    })}
  </div>
</section>

<section className="dashboard-stock-status">
  <div className="dashboard-heading">
    <small>INVENTORY HEALTH</small>
    <h2>Stock Status</h2>
    <p>Current availability across your products.</p>
  </div>
  <div className="stock-status-content">
    <div className="stock-status-chart">
      <ResponsiveContainer width="100%" height={230}>
        <PieChart>
          <Pie
            data={stockStatusData}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={58}
            outerRadius={88}
            paddingAngle={4}
          >
            {stockStatusData.map((entry) => (
              <Cell key={entry.name} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip />
        </PieChart>
      </ResponsiveContainer>
    </div>
    <div className="stock-status-legend">
      {stockStatusData.map((entry) => (
        <div key={entry.name}>
          <span style={{ background: entry.color }} />
          <strong>{entry.name}</strong>
          <b>{entry.value}</b>
        </div>
      ))}
    </div>
  </div>
</section>

<section className="dashboard-low-stock">
  <div className="dashboard-heading">
    <small>INVENTORY ALERTS</small>
    <h2>Low Stock Alerts</h2>
    <p>Products that may need replenishment.</p>
  </div>
  <div className="low-stock-list">
    {products.filter((p: any) => Number(p.stock) < 5).length === 0 ? (
      <p className="dashboard-empty">All products have sufficient stock.</p>
    ) : products
      .filter((p: any) => Number(p.stock) < 5)
      .slice(0, 8)
      .map((p: any) => (
        <div className="low-stock-item" key={p.id}>
          <strong>{p.name}</strong>
          <span>{Number(p.stock) <= 0 ? 'Out of Stock' : 'Low Stock'}</span>
          <b>{p.stock} {p.unit || 'units'}</b>
        </div>
      ))}
  </div>
</section>

<section className="dashboard-quick-actions">
  <div className="dashboard-heading">
    <small>SHORTCUTS</small>
    <h2>Quick Actions</h2>
    <p>Access frequently used business operations.</p>
  </div>
  <div className="quick-actions-grid">
    {[
      ['New Sale', 'Sales'],
      ['Add Purchase', 'Purchases'],
      ['Add Customer', 'Customers'],
      ['Add Supplier', 'Suppliers'],
      ['Record Expense', 'Expenses']
    ].map(([label, section]) => (
      <button key={label} onClick={() => setActive(section)}>
        + {label}
      </button>
    ))}
  </div>
</section>

<section className="dashboard-workspace">
  <div className="dashboard-heading">
    <small>YOUR WORKSPACE</small>
    <h2>Business Management</h2>
    <p>Choose a module to manage your business.</p>
  </div>
  <div className="dashboard-module-grid">
    {modules.map(({ name, icon: Icon }) => (
      <button key={name} className="dashboard-module" onClick={() => setActive(name)}>
        <span className="dashboard-module-icon"><Icon size={23} /></span>
        <strong>{name}</strong>
        <small>Open section →</small>
      </button>
    ))}
  </div>
</section>
<footer className="dashboard-footer">SMARTLEDGER · YOUR BUSINESS. YOUR NUMBERS. YOUR GROWTH.</footer>

        </>
        )}
      </main>
    </div>
  )
}
