import { postJournal } from './accounting';
import { useState, useRef } from 'react'
import { BrowserMultiFormatReader } from '@zxing/browser'

function money(value: number) {
  return `₹${Number(value || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`
}

export default function Sales() {
  const [customer, setCustomer] = useState('')
  const [placeOfSupply, setPlaceOfSupply] = useState('Jammu & Kashmir')
  const [product, setProduct] = useState('')
const [productSuggestions, setProductSuggestions] = useState<any[]>([])
const [cartItems, setCartItems] = useState<any[]>([])

  const [price, setPrice] = useState('')
  const [qty, setQty] = useState('1')
  const [paid, setPaid] = useState('0')
const [billNo, setBillNo] = useState('')
const [receiptNo, setReceiptNo] = useState('')
  const [lastSavedBill, setLastSavedBill] = useState<any>(null)
  const [message, setMessage] = useState('')
const [scanning, setScanning] = useState(false)
const videoRef = useRef<HTMLVideoElement>(null)
const readerRef = useRef<BrowserMultiFormatReader | null>(null)
const controlsRef = useRef<{ stop: () => void } | null>(null)


  async function startScanner() {
  try {
    if (!videoRef.current) {
      setMessage("Scanner video is unavailable. Reload the page.")
      return
    }

    const reader = new BrowserMultiFormatReader()
    readerRef.current = reader

    setScanning(true)
    setMessage("Starting camera...")

    const controls = await reader.decodeFromVideoDevice(
      undefined,
      videoRef.current,
      (result, _error, controls) => {
        if (!result) return

        const barcode = result.getText()
        const products = JSON.parse(
          localStorage.getItem("smartledger-products") || "[]"
        )
        const matched = products.find((item: any) =>
          String(item.code || "").toLowerCase() === barcode.toLowerCase()
        )

        if (matched) {
          setProduct(matched.name)
          setPrice(String(matched.selling))
          setProductSuggestions([])
          setMessage("Barcode scanned: " + matched.name)
        } else {
          setProduct(barcode)
          setMessage("Barcode not found. Add this code to Products & Stock.")
        }

        controls.stop()
        controlsRef.current = null
        setScanning(false)
      }
    )

    controlsRef.current = controls
  } catch (error) {
    setScanning(false)
    setMessage("Camera error: " + String(error))
  }
}

function addToCart() {
  const name = product.trim()
  const unitPrice = Number(price)
  const quantity = Number(qty)

  if (!name || !Number.isFinite(unitPrice) || unitPrice < 0 || !Number.isFinite(quantity) || quantity <= 0) {
    setMessage("Enter a valid product, price and quantity.")
    return
  }

  try {
    const products = JSON.parse(localStorage.getItem("smartledger-products") || "[]")
    const matched = products.find((p: any) =>
      p.name?.trim().toLowerCase() === name.toLowerCase() ||
      String(p.code || "").trim().toLowerCase() === name.toLowerCase()
    )

    if (!matched) {
      setMessage("Product not found in inventory.")
      return
    }

    const alreadyAdded = cartItems
      .filter((item: any) => item.productId === matched.id)
      .reduce((sum: number, item: any) => sum + item.quantity, 0)

    if (Number(matched.stock || 0) < alreadyAdded + quantity) {
      setMessage("Not enough stock available for this quantity.")
      return
    }

    setCartItems((items: any[]) => [...items, {
      productId: matched.id,
      product: matched.name,
      price: unitPrice,
      purchasePrice: (() => {
        const purchaseRate = Number(matched.purchase) || 0;
        const gstRate = Math.max(0, Number(matched.gstRate) || 0);
        return Number((purchaseRate / (1 + gstRate / 100)).toFixed(2));
      })(),
      quantity,
      hsn: matched.hsn || "",
      gstRate: Number(matched.gstRate) || 0
    }])

    setProduct("")
    setPrice("")
    setQty("1")
    setMessage("Product added to bill.")
  } catch {
    setMessage("Could not add product to bill.")
  }
}

function stopScanner() {
  controlsRef.current?.stop()
  controlsRef.current = null
  setScanning(false)
}

const total = cartItems.reduce((sum: number, item: any) => sum + item.price * item.quantity, 0)
    Math.max(0, Number(qty) || 0)

  const selectedCustomer = customer.trim() || "Walk-in Customer"
const customerRecord = JSON.parse(localStorage.getItem("smartledger-customers") || "[]").find((c: any) => c.name === selectedCustomer)
const previousBills = JSON.parse(localStorage.getItem("smartledger-bills") || "[]").filter((b: any) => b.customer === selectedCustomer)
const previousBillDue = previousBills.reduce((sum: number, b: any) => sum + Number(b.balance ?? (Number(b.total || 0) - Number(b.paid || 0))), 0)
const previousReceipts = JSON.parse(localStorage.getItem("smartledger-payments") || "[]").filter((p: any) => p.type === "Customer Receipt" && p.party === selectedCustomer).reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0)
const lastBalance = Number(customerRecord?.openingBalance || 0) + previousBillDue - previousReceipts
const totalPayable = lastBalance + total

function saveBill() {
  if (cartItems.length === 0) {
    setMessage("Add at least one product to the bill.")
    return
  }

  if (Number(paid) < 0 || Number(paid) > totalPayable) {
    setMessage("Payment must be between zero and the bill total.")
    return
  }

  try {
    const products = JSON.parse(localStorage.getItem("smartledger-products") || "[]")

    for (const item of cartItems) {
      const matched = products.find((p: any) => p.id === item.productId)
      if (!matched || Number(matched.stock || 0) < item.quantity) {
        setMessage("Stock changed or is insufficient for " + item.product)
        return
      }
    }

    const updatedBatches = JSON.parse(
  localStorage.getItem("smartledger-batches") || "[]"
);

for (const item of cartItems) {
  let remaining = Number(item.quantity) || 0;

  const matchingBatches = updatedBatches
    .filter((b: any) => Number(b.productId) === Number(item.productId))
    .sort((a: any, b: any) => {
      if (!a.expiryDate) return 1;
      if (!b.expiryDate) return -1;
      return a.expiryDate.localeCompare(b.expiryDate);
    });

  for (const batch of matchingBatches) {
    if (remaining <= 0) break;

    const available = Number(batch.remainingQuantity ?? batch.quantity) || 0;
    const deducted = Math.min(available, remaining);

    batch.remainingQuantity = available - deducted;
    remaining -= deducted;
  }
}

const updatedProducts = products.map((p: any) => {
      const soldQuantity = cartItems
        .filter((item: any) => item.productId === p.id)
        .reduce((sum: number, item: any) => sum + item.quantity, 0)

      return soldQuantity > 0
        ? { ...p, stock: Number(p.stock || 0) - soldQuantity }
        : p
    })

    const bills = JSON.parse(localStorage.getItem("smartledger-bills") || "[]")
    const finalBillNo = billNo.trim() || `SL-${Date.now()}`

    if (bills.some((b: any) => b.billNo === finalBillNo)) {
      setMessage("Bill number already exists.")
      return
    }

    const businessSettings = JSON.parse(localStorage.getItem("smartledger-settings") || "{}")
    const businessState = businessSettings.businessState || "Jammu & Kashmir"
    const selectedPlaceOfSupply = placeOfSupply || businessState
    const isIntraState = businessState.trim().toLowerCase() === selectedPlaceOfSupply.trim().toLowerCase()

    const items = cartItems.map((item: any) => {
      const gross = item.price * item.quantity
      const rate = Number(item.gstRate) || 0
      const taxable = Math.round((gross / (1 + rate / 100)) * 100) / 100
      const tax = Math.round((gross - taxable) * 100) / 100
      const itemCgst = isIntraState ? Math.round(tax / 2 * 100) / 100 : 0
      const itemSgst = isIntraState ? Math.round((tax - itemCgst) * 100) / 100 : 0

      return {
        ...item,
        taxableValue: taxable,
        gstAmount: tax,
        cgst: itemCgst,
        sgst: itemSgst,
        igst: isIntraState ? 0 : tax,
        total: gross
      }
    })

    const taxableValue = items.reduce((sum: number, item: any) => sum + item.taxableValue, 0)
    const gstAmount = items.reduce((sum: number, item: any) => sum + item.gstAmount, 0)
    const cgst = items.reduce((sum: number, item: any) => sum + item.cgst, 0)
    const sgst = items.reduce((sum: number, item: any) => sum + item.sgst, 0)
    const igst = items.reduce((sum: number, item: any) => sum + item.igst, 0)
    const totalQuantity = items.reduce((sum: number, item: any) => sum + item.quantity, 0)
    const totalCost = items.reduce((sum: number, item: any) => sum + item.purchasePrice * item.quantity, 0)
    const averagePurchasePrice = totalQuantity > 0 ? totalCost / totalQuantity : 0
    const averageSellingPrice = totalQuantity > 0 ? total / totalQuantity : 0

    const savedBill = {
      id: Date.now(),
      billNo: finalBillNo,
      receiptNo: receiptNo.trim(),
      lastBalance,
      totalPayable,
      customer: customer.trim() || "Walk-in Customer",
      product: items.map((item: any) => item.product).join(", "),
      items,
      price: averageSellingPrice,
      purchasePrice: averagePurchasePrice,
      hsn: items.length === 1 ? items[0].hsn : "",
      gstRate: items.length === 1 ? items[0].gstRate : 0,
      taxableValue,
      gstAmount,
      cgst,
      sgst,
      igst,
      businessState,
      placeOfSupply: selectedPlaceOfSupply,
      quantity: totalQuantity,
      total,
      paid: Number(paid),
      balance: total,
      date: new Date().toISOString()
    }

    bills.push(savedBill)
    localStorage.setItem("smartledger-bills", JSON.stringify(bills))

postJournal("Sales Invoice", finalBillNo, savedBill.date, "Sales invoice " + finalBillNo, [
  { account: "Customer Receivables", debit: Number(savedBill.total) || 0, credit: 0 },
  { account: "Sales Income", debit: 0, credit: Number(taxableValue) || 0 },
  { account: "GST Payable", debit: 0, credit: Number(gstAmount) || 0 }
]);

if (totalCost > 0) {
  postJournal("Cost of Goods Sold", finalBillNo, savedBill.date, "Stock cost for " + finalBillNo, [
    { account: "Purchase / Cost of Goods", debit: totalCost, credit: 0 },
    { account: "Inventory / Stock", debit: 0, credit: totalCost }
  ]);
}


    if (Number(paid) > 0) {
      const payments = JSON.parse(localStorage.getItem("smartledger-payments") || "[]")
      payments.push({
        id: Date.now() + 1,
        date: new Date().toISOString(),
        type: "Customer Receipt",
        party: customer.trim() || "Walk-in Customer",
        amount: Number(paid),
        method: "Cash",
        receiptNo: receiptNo.trim(),
        billNo: finalBillNo,
        reference: "Sales invoice"
      })
      localStorage.setItem("smartledger-payments", JSON.stringify(payments))

postJournal("Customer Receipt", finalBillNo + "-receipt", savedBill.date, "Receipt against " + finalBillNo, [
  { account: "Cash in Hand", debit: Number(paid), credit: 0 },
  { account: "Customer Receivables", debit: 0, credit: Number(paid) }
]);

    }

    localStorage.setItem("smartledger-batches", JSON.stringify(updatedBatches));
    localStorage.setItem("smartledger-products", JSON.stringify(updatedProducts))
    setLastSavedBill(savedBill)
    setMessage("Bill saved and inventory stock updated.")
    setCartItems([])
    setCustomer("")
    setProduct("")
    setPrice("")
    setQty("1")
    setPaid("0")
    setBillNo("")
    setReceiptNo("")
  } catch {
    setMessage("Could not save the bill. Please try again.")
  }
}

function printLastInvoice() {
    if (!lastSavedBill) return;
    const b = lastSavedBill;
    const settings = JSON.parse(localStorage.getItem('smartledger-settings') || '{}');
    const w = window.open('', '_blank', 'width=900,height=700');
    if (!w) {
      setMessage('Please allow pop-ups to print the invoice.');
      return;
    }
    const esc = (v: any) => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c] || c));
    const gross=Number(b.total)||0
    const taxable=Number(b.taxableValue??gross)||0
    const rate=Number(b.gstRate)||0
    const tax=Number(b.gstAmount)||0
    const cgst=Number(b.cgst)||0
    const sgst=Number(b.sgst)||0
    const igst=Number(b.igst)||0
    const payable=Number(b.totalPayable??(Number(b.lastBalance||0)+gross))
    const received=Number(b.paid)||0
    const remaining=Math.max(0,payable-received)
    const hasGst=rate>0&&tax>0
    
  const invoiceItems = Array.isArray(b.items) && b.items.length
    ? b.items
    : [{ product: b.product, hsn: b.hsn, price: b.price, quantity: b.quantity, gstRate: rate, taxableValue: taxable, total: gross }];
  const itemRows = invoiceItems.map((item: any) => {
    const itemGross = Number(item.price || 0) * Number(item.quantity || 0);
    const itemRate = Number(item.gstRate || 0);
    const itemTaxable = Number(item.taxableValue ?? (itemRate > 0 ? itemGross / (1 + itemRate / 100) : itemGross));
    const itemAmount = Number(item.total ?? itemGross);
    return `<tr><td>${esc(item.product || '')}</td><td>${esc(item.hsn || '-')}</td><td class="num">${money(Number(item.price) || 0)}</td><td class="num">${esc(item.quantity || 0)}</td><td class="num">${money(itemTaxable)}</td><td class="num">${itemRate > 0 ? itemRate + '%' : '-'}</td><td class="num">${money(itemAmount)}</td></tr>`;
  }).join('');
w.document.write(`<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>Invoice ${esc(b.billNo||'')}</title>
<style>
@page{size:A4;margin:14mm}*{box-sizing:border-box}
body{font-family:Arial,sans-serif;color:#243447;margin:0;font-size:12px}
.header{display:flex;justify-content:space-between;border-bottom:3px solid #176b58;padding-bottom:18px}
.brand h1{color:#123047;font-size:25px;margin:0 0 8px}
.brand div{margin:4px 0;color:#526170}.logo{max-width:105px;max-height:85px;object-fit:contain}
.title{display:flex;justify-content:space-between;margin:22px 0 14px}
.title h2{color:#123047;margin:0;font-size:21px}
.pill{background:#e8f3ef;color:#176b58;padding:7px 12px;font-weight:bold}
.info{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:20px}
.box{border:1px solid #dce3e8;border-radius:5px;padding:12px;line-height:1.8}
.label{color:#687785}table{width:100%;border-collapse:collapse;margin:12px 0 18px}
th{background:#123047;color:white;text-align:left}
th,td{padding:9px 7px;border:1px solid #dce3e8}
.num{text-align:right}.tax-area{display:flex;justify-content:flex-end;margin:12px 0}
.tax-box{width:280px;border:1px solid #dce3e8;padding:10px 12px}
.tax-box p,.totals p{display:flex;justify-content:space-between;margin:7px 0}
.totals{width:320px;margin:18px 0 0 auto}
.totals p{padding:5px 0;border-bottom:1px solid #edf0f2}
.grand{color:#176b58;font-size:16px;font-weight:bold;border-top:2px solid #176b58;padding-top:10px!important}
.footer{border-top:1px solid #dce3e8;margin-top:45px;padding-top:14px;text-align:center;color:#687785;line-height:1.8}
.sign{text-align:right;margin-top:38px}
@media print{body{print-color-adjust:exact;-webkit-print-color-adjust:exact}}
</style></head><body>
<div class="header"><div class="brand">
<h1>${esc(settings.businessName||'SmartLedger')}</h1>
<div>${esc(settings.address||'')}</div>
<div>${esc(settings.phone||'')}${settings.email?' | '+esc(settings.email):''}</div>
<div>${settings.gstin?'GSTIN: '+esc(settings.gstin):''}</div>
</div>${settings.logo?`<img class="logo" src="${esc(settings.logo)}">`:''}</div>
<div class="title"><h2>${hasGst?'TAX INVOICE':'SALES INVOICE'}</h2><span class="pill">${hasGst?'GST INVOICE':'SALES BILL'}</span></div>
<div class="info">
<div class="box"><b>Bill To</b><br><b>${esc(b.customer||'Walk-in Customer')}</b><br><span class="label">Place of Supply:</span> ${esc(b.placeOfSupply||'')}</div>
<div class="box"><b>Invoice Details</b><br><span class="label">Bill No:</span> ${esc(b.billNo||'-')}<br><span class="label">Receipt No:</span> ${esc(b.receiptNo||'-')}<br><span class="label">Date:</span> ${esc(b.date?new Date(b.date).toLocaleDateString('en-IN'):'-')}<br><span class="label">Business State:</span> ${esc(b.businessState||'')}</div>
</div>
<table><thead><tr><th>Product</th><th>HSN</th><th class="num">Rate</th><th class="num">Qty</th><th class="num">Taxable Value</th><th class="num">GST</th><th class="num">Amount</th></tr></thead>
<tbody>${itemRows}</tbody></table>
${hasGst?`<div class="tax-area"><div class="tax-box"><b>GST Breakdown</b>
${cgst?`<p><span>CGST</span><b>${money(cgst)}</b></p>`:''}
${sgst?`<p><span>SGST</span><b>${money(sgst)}</b></p>`:''}
${igst?`<p><span>IGST</span><b>${money(igst)}</b></p>`:''}
<p><span>Total GST</span><b>${money(tax)}</b></p></div></div>`:''}
<div class="totals">
<p><span>Bill Total</span><b>${money(gross)}</b></p>
<p><span>Previous Balance</span><b>${money(Number(b.lastBalance)||0)}</b></p>
<p class="grand"><span>Total Payable</span><b>${money(payable)}</b></p>
<p><span>Amount Received</span><b>${money(received)}</b></p>
<p><span>Remaining Balance</span><b>${money(remaining)}</b></p>
</div>
<div class="sign">Authorized Signatory<br><br>________________________</div>
<div class="footer">${esc(settings.invoiceFooter||'Thank you for your business!')}<br>Powered by SmartLedger</div>
</body></html>`)
    w.document.close();
    w.focus();
    w.print();
  }

  return (
    <div className="sales-card">
      <h1>Sales & Billing</h1>
      <p>Create a basic customer bill.</p>

      <label>Customer name</label>
      <input
        value={customer}
        onChange={e => {
  const value = e.target.value
  setCustomer(value)
  const savedCustomers = JSON.parse(localStorage.getItem('smartledger-customers') || '[]')
  const matchedCustomer = savedCustomers.find((c: any) =>
    String(c.name || '').trim().toLowerCase() === value.trim().toLowerCase()
  )
  if (matchedCustomer?.state) setPlaceOfSupply(matchedCustomer.state)
}}
        placeholder="Customer name"
        style={{ display: 'block', width: '100%', padding: 12, margin: '8px 0 16px' }}
      />

<label>Place of Supply (Customer State)</label>
<select
  value={placeOfSupply}
  onChange={e => setPlaceOfSupply(e.target.value)}
  style={{ display: 'block', width: '100%', padding: 12, margin: '8px 0 16px', borderRadius: 8 }}
>
  {['Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Goa','Gujarat','Haryana','Himachal Pradesh','Jharkhand','Karnataka','Kerala','Madhya Pradesh','Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland','Odisha','Punjab','Rajasthan','Sikkim','Tamil Nadu','Telangana','Tripura','Uttar Pradesh','Uttarakhand','West Bengal','Andaman and Nicobar Islands','Chandigarh','Dadra and Nagar Haveli and Daman and Diu','Delhi','Jammu & Kashmir','Ladakh','Lakshadweep','Puducherry'].map(state => <option key={state} value={state}>{state}</option>)}
</select>

<label>Product name / Barcode</label>
<input
value={product}
onChange={e => {
  const value = e.target.value
  setProduct(value)
try {
  const allProducts = JSON.parse(localStorage.getItem('smartledger-products') || '[]')
  const search = value.trim().toLowerCase()
  setProductSuggestions(search ? allProducts.filter((item: any) =>
    item.name.toLowerCase().includes(search) ||
    String(item.code || '').toLowerCase().includes(search)
  ).slice(0, 6) : [])
} catch {
  setProductSuggestions([])
}
  try {
    const products = JSON.parse(localStorage.getItem('smartledger-products') || '[]')
    const matched = products.find((p: { name: string; code?: string }) =>
      p.name.toLowerCase() === value.trim().toLowerCase() ||
      String(p.code || '').toLowerCase() === value.trim().toLowerCase()
    )
    if (matched) setPrice(String(matched.selling))
  } catch {
    setMessage('Could not find product price.')
  }
}}
placeholder="Enter name or scan barcode"
style={{ display: 'block', width: '100%', padding: 12, margin: '8px 0 16px' }}
/>
{productSuggestions.length > 0 && (
  <div style={{ border: '1px solid #ccc', borderRadius: 8, marginTop: -12, marginBottom: 16 }}>
    {productSuggestions.map((item: any) => (
      <button
        key={item.id}
        type="button"
        onClick={() => {
          setProduct(item.name)
          setPrice(String(item.selling))
          setProductSuggestions([])
        }}
        style={{ display: 'block', width: '100%', padding: 12, textAlign: 'left', background: 'white', border: 'none', borderBottom: '1px solid #eee' }}
      >
        {item.name} — ₹{item.selling} | Stock: {item.stock}
      </button>
    ))}
  </div>
)}

      <div style={{ marginBottom: 16 }}>
  {!scanning ? (
    <button type="button" onClick={startScanner}
      style={{ padding: 12, background: '#176b58', color: 'white', border: 0, borderRadius: 6 }}>
      📷 Scan Barcode
    </button>
  ) : (
    <button type="button" onClick={stopScanner}
      style={{ padding: 12, background: '#b42318', color: 'white', border: 0, borderRadius: 6 }}>
      Stop Scanner
    </button>
  )}
  <video ref={videoRef} playsInline
      muted
      style={{
        display: scanning ? 'block' : 'none',
        width: '100%',
        maxWidth: 400,
        marginTop: 12
      }} />
</div>

<label>Manual Bill No.</label>
<input value={billNo} onChange={e => setBillNo(e.target.value)} placeholder="Enter bill number" style={{display:'block',width:'100%',padding:12,margin:'8px 0 15px'}} />
<label>Receipt No.</label>
<input value={receiptNo} onChange={e => setReceiptNo(e.target.value)} placeholder="Enter receipt number" style={{display:'block',width:'100%',padding:12,margin:'8px 0 15px'}} />
<label>Price per unit (₹)</label>
      <input
        type="number"
        min="0.01"
        step="0.01"
        value={price}
        onChange={e => setPrice(e.target.value)}
        style={{ display: 'block', width: '100%', padding: 12, margin: '8px 0 16px' }}
      />

      <label>Quantity</label>
      <input
        type="number"
        min="0.01"
        step="any"
        value={qty}
        onChange={e => setQty(e.target.value)}
        style={{ display: 'block', width: '100%', padding: 12, margin: '8px 0 16px' }}
      />

          <button
            type="button"
            onClick={addToCart}
            style={{ padding: 12, background: '#176b58', color: 'white', border: 0, borderRadius: 8, width: '100%', margin: '8px 0 16px' }}
          >
            + Add Item to Bill
          </button>

          {cartItems.length > 0 && (
            <div style={{ margin: '12px 0', padding: 12, background: '#f1f5f5', borderRadius: 8 }}>
              <h3>Bill Items ({cartItems.length})</h3>
              {cartItems.map((item: any, index: number) => (
                <div key={index} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, padding: '10px 0', borderBottom: '1px solid #ddd' }}>
                  <div>
                    <strong>{item.product}</strong>
                    <div>{item.quantity} × {money(item.price)} = {money(item.quantity * item.price)}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCartItems((old: any[]) => old.filter((_: any, i: number) => i !== index))}
                    style={{ background: '#b42318', color: 'white', border: 0, borderRadius: 6, padding: '6px 10px' }}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}

      <h2>Bill total: {money(total)}</h2>
<p>Last Balance: {money(lastBalance)}</p>
<h2>Total Payable: {money(totalPayable)}</h2>

      <label>Amount received (₹)</label>
      <input
        type="number"
        min="0"
        step="0.01"
        value={paid}
        onChange={e => setPaid(e.target.value)}
        style={{ display: 'block', width: '100%', padding: 12, margin: '8px 0 16px' }}
      />

      <p>Outstanding balance: {money(totalPayable - (Number(paid) || 0))}</p>

      <button
        onClick={saveBill}
        style={{ padding: 14, background: '#176b58', color: 'white', border: 0, borderRadius: 8 }}
      >
        Save Bill
      </button>

      <button type="button" onClick={printLastInvoice} disabled={!lastSavedBill} style={{padding:14,marginLeft:10,background:"#123047",color:"white",border:0,borderRadius:8}}>Print Last Invoice</button>
{message && <p>{message}</p>}
    </div>
  )
}
