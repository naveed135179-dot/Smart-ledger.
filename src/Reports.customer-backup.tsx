import { useState } from 'react'

function readData(key: string): any[] {
  try {
    const data = JSON.parse(localStorage.getItem(key) || '[]')
    return Array.isArray(data) ? data : []
  } catch {
    return []
  }
}

export default function Reports() {
  const [refresh, setRefresh] = useState(0)

  const sales = readData('smartledger-bills')
  const purchases = readData('smartledger-purchases')
  const expenses = readData('smartledger-expenses')
  const customers = readData('smartledger-customers')
  const suppliers = readData('smartledger-suppliers')
  const payments = readData('smartledger-payments')

  const customerReceipts = payments
    .filter(p => p.type === 'Customer Receipt')
    .reduce((sum, p) => sum + (Number(p.amount) || 0), 0)

  const supplierPayments = payments
    .filter(p => p.type === 'Supplier Payment')
    .reduce((sum, p) => sum + (Number(p.amount) || 0), 0)

  const sum = (items: any[], field: string) =>
    items.reduce((total, item) => total + (Number(item[field]) || 0), 0)

  const salesTotal = sum(sales, 'total')
  const salesPaid = sum(sales, 'paid')
  const purchaseTotal = sum(purchases, 'total')
  const purchasePaid = sum(purchases, 'paid')
  const expenseTotal = sum(expenses, 'amount')
const grossProfit = sales.reduce((sum, bill) => sum + (bill.purchasePrice !== undefined ? Number(bill.total) - Number(bill.purchasePrice) * Number(bill.quantity) : 0), 0)
const netProfit = grossProfit - expenseTotal
const salesWithoutCost = sales.filter(bill => bill.purchasePrice === undefined).length


  const customerDue =
    sum(customers, 'openingBalance') +
    sum(sales, 'balance') - customerReceipts

  const supplierDue =
    sum(suppliers, 'openingBalance') +
    purchaseTotal - purchasePaid - supplierPayments

  const cashMovement =
    salesPaid - purchasePaid - expenseTotal

  const money = (n: number) =>
    n.toLocaleString('en-IN', {
      style: 'currency',
      currency: 'INR'
    })

  const cards = [
    ['Total Sales', salesTotal],
    ['Total Purchases', purchaseTotal],
    ['Total Expenses', expenseTotal],
  ['Gross Profit', grossProfit],
  ['Net Profit', netProfit],
    ['Customer Outstanding', customerDue],
    ['Supplier Outstanding', supplierDue],
    ['Cash Movement Estimate', cashMovement]
  ]

  return (
    <div style={{ padding: 20, maxWidth: 1100, margin: 'auto' }}>
      <h1>Business Reports</h1>
      <p>Overview of your recorded business transactions.</p>

      <button onClick={() => setRefresh(refresh + 1)}
        style={{ padding: 10, marginBottom: 18, borderRadius: 7 }}>
        Refresh Reports
      </button>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit,minmax(190px,1fr))',
        gap: 14
      }}>
        {cards.map(([title, value]) => (
          <div key={String(title)} style={{
            background: 'white', padding: 20,
            border: '1px solid #e2e8f0', borderRadius: 12
          }}>
            <small style={{ color: '#64748b' }}>{title}</small>
            <h2 style={{ marginBottom: 0 }}>{money(Number(value))}</h2>
          </div>
        ))}
      </div>

      <h2>Transaction Summary</h2>
      <div style={{
        background: 'white', padding: 18,
        border: '1px solid #e2e8f0', borderRadius: 12
      }}>
        <p>Sales records: {sales.length}</p>
      <p>Older sales without cost records: {salesWithoutCost}</p>
        <p>Purchase records: {purchases.length}</p>
        <p>Expense records: {expenses.length}</p>
        <p>Customers: {customers.length}</p>
        <p>Suppliers: {suppliers.length}</p>
      </div>

      <p style={{ color: '#a16207', marginTop: 20 }}>
        These figures are based on records saved in this browser.
        Cash movement is an estimate, not a verified profit figure.
        Opening balances may need reconciliation.
      </p>
    </div>
  )
}
