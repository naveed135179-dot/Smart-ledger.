export type JournalLine = {
  account: string;
  debit: number;
  credit: number;
};

export type JournalEntry = {
  id: number;
  date: string;
  sourceType: string;
  sourceId: string;
  narration: string;
  lines: JournalLine[];
};

const KEY = 'smartledger-journal-entries';

export function readJournal(): JournalEntry[] {
  try {
    const data = JSON.parse(localStorage.getItem(KEY) || '[]');
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export function postJournal(
  sourceType: string,
  sourceId: string,
  date: string,
  narration: string,
  lines: JournalLine[]
): boolean {
  if (!sourceType || !sourceId || !lines.length) return false;

  const valid = lines.every(line =>
    line.account.trim() &&
    Number.isFinite(line.debit) &&
    Number.isFinite(line.credit) &&
    line.debit >= 0 &&
    line.credit >= 0 &&
    !(line.debit > 0 && line.credit > 0)
  );

  if (!valid) return false;

  const debitTotal = lines.reduce((sum, line) => sum + line.debit, 0);
  const creditTotal = lines.reduce((sum, line) => sum + line.credit, 0);

  if (debitTotal <= 0 || Math.abs(debitTotal - creditTotal) > 0.01) {
    return false;
  }

  const entries = readJournal();
  const filtered = entries.filter(entry =>
    !(entry.sourceType === sourceType && entry.sourceId === sourceId)
  );

  filtered.push({
    id: Date.now(),
    date,
    sourceType,
    sourceId,
    narration,
    lines
  });

  localStorage.setItem(KEY, JSON.stringify(filtered));
  return true;
}


export function migrateLegacyTransactions() {
  const marker = "smartledger-legacy-journal-migration-v1";
  if (localStorage.getItem(marker) === "completed") {
    return { alreadyCompleted: true, migrated: 0, skipped: 0 };
  }

  const records = (key: string): any[] => {
    try {
      const value = JSON.parse(localStorage.getItem(key) || "[]");
      return Array.isArray(value) ? value : [];
    } catch {
      return [];
    }
  };

  let migrated = 0;
  let skipped = 0;
  let failed = 0;

  const exists = (type: string, id: string) =>
    readJournal().some(e => e.sourceType === type && e.sourceId === id);

  const post = (
    type: string,
    id: string,
    date: string,
    narration: string,
    lines: JournalLine[]
  ) => {
    if (exists(type, id)) {
      skipped++;
      return;
    }
    if (!date || !postJournal(type, id, date, narration, lines)) {
      failed++;
      return;
    }
    migrated++;
  };

  const sales = records("smartledger-bills");
  const purchases = records("smartledger-purchases");
  const payments = records("smartledger-payments");
  const expenses = records("smartledger-expenses");

  for (const bill of sales) {
    const id = String(bill.billNo || bill.invoiceNo || bill.id || "");
    if (!id) { failed++; continue; }

    const total = Number(bill.total) || 0;
    const gst = Number(bill.gstAmount) || 0;
    const taxable = Number(bill.taxableValue ?? (total - gst)) || 0;

    if (total > 0) {
      post("Sales Invoice", id, bill.date, "Historical sales invoice " + id, [
        { account: "Customer Receivables", debit: total, credit: 0 },
        { account: "Sales Income", debit: 0, credit: taxable },
        { account: "GST Payable", debit: 0, credit: Math.max(0, total - taxable) }
      ]);
    }

    const items = Array.isArray(bill.items) ? bill.items : [];
    const cost = items.reduce((sum: number, item: any) => {
      const inclusiveCost = Number(item.purchasePrice ?? item.purchase) || 0;
      const gstRate = Math.max(0, Number(item.gstRate) || 0);
      const exclusiveCost = gstRate > 0
        ? inclusiveCost / (1 + gstRate / 100)
        : inclusiveCost;
      return sum + exclusiveCost * (Number(item.quantity ?? item.qty) || 0);
    }, 0);

    if (cost > 0) {
      post("Cost of Goods Sold", id, bill.date, "Historical stock cost " + id, [
        { account: "Purchase / Cost of Goods", debit: cost, credit: 0 },
        { account: "Inventory / Stock", debit: 0, credit: cost }
      ]);
    }

    const paid = Number(bill.paid) || 0;
    if (paid > 0) {
      const linked = payments.find((x: any) =>
        String(x.billNo || "") === id
      );
      const method = linked?.method;
      const account = !linked
        ? "Historical Receipt Clearing"
        : method === "Cash"
          ? "Cash in Hand"
          : "Bank Account";
      post("Customer Receipt", id + "-receipt", bill.date,
        "Historical receipt against " + id, [
          { account, debit: paid, credit: 0 },
          { account: "Customer Receivables", debit: 0, credit: paid }
        ]);
    }
  }

  for (const purchase of purchases) {
    const id = String(purchase.id || "");
    if (!id) { failed++; continue; }

    const total = Number(purchase.total) ||
      (Number(purchase.quantity) || 0) * (Number(purchase.rate) || 0);
    if (total > 0) {
      const products = records("smartledger-products");
      const matchedProduct = products.find((item: any) =>
        (purchase.productId && Number(item.id) === Number(purchase.productId)) ||
        (!purchase.productId && String(item.name || "").trim().toLowerCase() ===
          String(purchase.product || "").trim().toLowerCase())
      );
      const gstRate = Math.max(0, Number(matchedProduct?.gstRate) || 0);
      const inputGst = gstRate > 0
        ? Number((total * gstRate / (100 + gstRate)).toFixed(2))
        : 0;
      const inventoryCost = Number((total - inputGst).toFixed(2));

      post("Purchase Invoice", id, purchase.date,
        "Historical purchase " + (purchase.invoice || id) +
          (gstRate > 0 ? " (estimated GST split)" : " (GST rate unavailable)"), [
          { account: "Inventory / Stock", debit: inventoryCost, credit: 0 },
          { account: "Input GST", debit: inputGst, credit: 0 },
          { account: "Supplier Payables", debit: 0, credit: total }
        ]);
    }

    const paid = Number(purchase.paid) || 0;
    if (paid > 0) {
      const account = purchase.paymentMethod === "Cash"
        ? "Cash in Hand"
        : purchase.paymentMethod
          ? "Bank Account"
          : "Historical Payment Clearing";

      post("Purchase Payment", id + "-payment", purchase.date,
        "Historical payment against " + (purchase.invoice || id), [
          { account: "Supplier Payables", debit: paid, credit: 0 },
          { account, debit: 0, credit: paid }
        ]);
    }
  }

  for (const expense of expenses) {
    const id = String(expense.id || "");
    const amount = Number(expense.amount) || 0;
    if (!id || amount <= 0) { skipped++; continue; }

    const account = expense.payment === "Cash"
      ? "Cash in Hand"
      : expense.payment === "Credit"
        ? "Supplier Payables"
        : "Bank Account";

    post("Expense", id, expense.date, expense.description || "Historical expense", [
      { account: "Shop Expenses", debit: amount, credit: 0 },
      { account, debit: 0, credit: amount }
    ]);
  }

  for (const payment of payments) {
    const id = String(payment.id || "");
    if (!id) { skipped++; continue; }

    const type = payment.type;
    const billNo = String(payment.billNo || "");
    const linkedSale = sales.find((b: any) =>
      billNo && String(b.billNo || b.invoiceNo || b.id || "") === billNo
    );
    const linkedPurchase = purchases.find((p: any) =>
      billNo && String(p.invoice || "") === billNo
    );
    const amount = Number(payment.amount) || 0;

    if (amount <= 0) { skipped++; continue; }

    const duplicateSaleReceipt =
      type === "Customer Receipt" &&
      !!linkedSale &&
      Math.abs(amount - (Number(linkedSale.paid) || 0)) < 0.01 &&
      String(payment.reference || "").toLowerCase().includes("sales invoice");

    const duplicatePurchasePayment =
      type === "Supplier Payment" &&
      !!linkedPurchase &&
      Math.abs(amount - (Number(linkedPurchase.paid) || 0)) < 0.01 &&
      payment.date === linkedPurchase.date;

    if (duplicateSaleReceipt || duplicatePurchasePayment) {
      skipped++;
      continue;
    }

    const account = payment.method === "Cash" ? "Cash in Hand" : "Bank Account";
    const lines = type === "Customer Receipt"
      ? [
          { account, debit: amount, credit: 0 },
          { account: "Customer Receivables", debit: 0, credit: amount }
        ]
      : type === "Supplier Payment"
        ? [
            { account: "Supplier Payables", debit: amount, credit: 0 },
            { account, debit: 0, credit: amount }
          ]
        : [];

    if (lines.length) {
      post(type, id, payment.date, "Historical " + type + " - " + payment.party, lines);
    } else {
      skipped++;
    }
  }

  if (failed === 0) localStorage.setItem(marker, "completed");

  return { alreadyCompleted: false, migrated, skipped, failed };
}
