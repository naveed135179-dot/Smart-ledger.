import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';
import React, { useMemo, useState } from 'react';

type Product = {
  id: number;
  name: string;
  code: string;
  purchase: number;
  selling: number;
  stock: number;
  unit: string;
  hsn?: string;
  gstRate?: number;
};

export default function BulkAction() {
  const [products, setProducts] = useState<Product[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('smartledger-products') || '[]');
    } catch {
      return [];
    }
  });

  const [search, setSearch] = useState('');
  const [action, setAction] = useState('stock-add');
  const [value, setValue] = useState('');
  const [message, setMessage] = useState('');

  const filtered = useMemo(() => products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.code || '').toLowerCase().includes(search.toLowerCase())
  ), [products, search]);

  const save = (updated: Product[]) => {
    localStorage.setItem('smartledger-products', JSON.stringify(updated));
    setProducts(updated);
    setMessage('Bulk action completed successfully.');
    setValue('');
  };

  const apply = () => {
    const amount = Number(value);
    if (!value.trim() || !Number.isFinite(amount) || amount < 0) {
      setMessage('Enter a valid non-negative value.');
      return;
    }
    if (!filtered.length) {
      setMessage('No matching products found.');
      return;
    }

    const ids = new Set(filtered.map(p => p.id));

    const updated = products.map(p => {
      if (!ids.has(p.id)) return p;

      if (action === 'stock-add')
        return { ...p, stock: p.stock + amount };

      if (action === 'stock-set')
        return { ...p, stock: amount };

      if (action === 'purchase')
        return { ...p, purchase: amount };

      return { ...p, selling: amount };
    });

    if (action === 'purchase' || action === 'selling') {
      const invalid = updated.some(p =>
        p.purchase < 0 || p.selling < 0
      );
      if (invalid) {
        setMessage('Invalid product price.');
        return;
      }
    }

    save(updated);
  };

  const exportCSV = () => {
    const headers = ['id','name','code','purchase','selling','stock','unit','hsn','gstRate'];
    const rows = [headers, ...filtered.map(p => headers.map(h =>
      String((p as any)[h] ?? '')
    ))];

    const csv = rows.map(row => row.map(v =>
      '"' + String(v).replace(/"/g, '""') + '"'
    ).join(',')).join('\r\n');

    const url = URL.createObjectURL(
      new Blob([csv], { type: 'text/csv;charset=utf-8' })
    );
    const a = document.createElement('a');
    a.href = url;
    a.download = 'SmartLedger-Products.csv';
    a.click();
    URL.revokeObjectURL(url);
    setMessage('Product CSV exported.');
  };

  const importCSV = (file?: File) => {
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const lines = String(reader.result || '').split(/\r?\n/).filter(Boolean);
        if (lines.length < 2) throw new Error('CSV has no product records.');

        const parse = (line: string) => {
          const result: string[] = [];
          let current = '', quoted = false;
          for (let i = 0; i < line.length; i++) {
            const c = line[i];
            if (c === '"' && line[i + 1] === '"' && quoted) {
              current += '"'; i++;
            } else if (c === '"') quoted = !quoted;
            else if (c === ',' && !quoted) {
              result.push(current); current = '';
            } else current += c;
          }
          result.push(current);
          return result;
        };

        const headers = parse(lines[0]).map(h => h.trim().toLowerCase());
        const required = ['name','purchase','selling','stock','unit'];
        if (!required.every(h => headers.includes(h)))
          throw new Error('CSV needs name, purchase, selling, stock and unit columns.');

        const imported = lines.slice(1).map(line => {
          const cells = parse(line);
          const get = (key: string) => cells[headers.indexOf(key)]?.trim() || '';
          const name = get('name');
          const purchase = Number(get('purchase'));
          const selling = Number(get('selling'));
          const stock = Number(get('stock'));

          if (!name || !Number.isFinite(purchase) || !Number.isFinite(selling) ||
              !Number.isFinite(stock) || purchase < 0 || selling < 0 || stock < 0)
            throw new Error('Invalid product row: ' + name);

          return {
            id: Number(get('id')) || Date.now() + Math.random() * 100000,
            name,
            code: get('code'),
            purchase,
            selling,
            stock,
            unit: get('unit') || 'Piece',
            hsn: get('hsn'),
            gstRate: Number(get('gstrate')) || 0
          };
        });

        const existing = [...products];
        imported.forEach(item => {
          const index = existing.findIndex(p =>
            (item.code && p.code === item.code) ||
            (!item.code && p.name.toLowerCase() === item.name.toLowerCase())
          );
          if (index >= 0) existing[index] = { ...existing[index], ...item, id: existing[index].id };
          else existing.push(item);
        });

        save(existing);
        setMessage(imported.length + ' CSV rows imported or updated.');
      } catch (error) {
        setMessage(error instanceof Error ? error.message : 'CSV import failed.');
      }
    };
    reader.readAsText(file);
  };

  const card: React.CSSProperties = {
    background: '#fff', padding: 18, borderRadius: 12,
    border: '1px solid #e2e8f0', marginBottom: 16
  };
  const button: React.CSSProperties = {
    padding: '11px 16px', border: 0, borderRadius: 8,
    background: '#176b87', color: '#fff', fontWeight: 600
  };

  const downloadExcelTemplate = () => {
    const headers = [
      ['name', 'code', 'purchase', 'selling', 'stock', 'unit', 'hsn', 'gstRate']
    ];
    const ws = XLSX.utils.aoa_to_sheet(headers);
    ws['!cols'] = [
      { wch: 25 }, { wch: 18 }, { wch: 15 }, { wch: 15 },
      { wch: 15 }, { wch: 12 }, { wch: 15 }, { wch: 12 }
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Product Import');
    XLSX.writeFile(wb, 'SmartLedger-Bulk-Product-Template.xlsx');
    setMessage('Excel template downloaded. Add your products in separate rows.');
  };

  const exportExcel = () => {
    const rows = filtered.map(p => ({
      ID: p.id, Product: p.name, Code: p.code,
      Purchase: p.purchase, Selling: p.selling,
      Stock: p.stock, Unit: p.unit, HSN: p.hsn || '',
      GST: p.gstRate ?? ''
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Products');
    XLSX.writeFile(wb, 'SmartLedger-Products.xlsx');
    setMessage('Excel file exported successfully.');
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text('SmartLedger - Stock Report', 14, 18);
    doc.setFontSize(9);
    doc.text('Product | Code | Purchase | Selling | Stock | Unit', 14, 29);
    let y = 37;
    filtered.forEach(p => {
      if (y > 280) {
        doc.addPage();
        y = 18;
      }
      const line = `${p.name} | ${p.code || ''} | ${p.purchase} | ${p.selling} | ${p.stock} | ${p.unit}`;
      doc.text(line.substring(0, 110), 14, y);
      y += 7;
    });
    doc.save('SmartLedger-Stock-Report.pdf');
    setMessage('PDF stock report exported.');
  };

  const importExcel = async (file?: File) => {
  if (!file) return;
  try {
    const data = await file.arrayBuffer();
    const workbook = XLSX.read(data, { type: 'array' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
    const key = (v: any) => String(v ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');

    const aliases: Record<string, string[]> = {
      name: ['itemname', 'productname', 'name', 'product', 'item', 'description'],
      selling: ['saleprice', 'sellingprice', 'selling', 'salerate', 'sellingrate', 'retailprice', 'mrp'],
      purchase: ['purchaseprice', 'purchaserate', 'purchase', 'costprice', 'cost', 'buyingprice'],
      stock: ['itemstockquantity', 'stockquantity', 'openingstock', 'openingquantity', 'closingstock', 'quantity', 'qty', 'stock'],
      code: ['itemcode', 'productcode', 'code', 'barcode', 'sku'],
      unit: ['unit', 'uom', 'measurement']
    };

    let headerRow = -1;
    let columns: Record<string, number> = {};

    for (let i = 0; i < Math.min(rows.length, 50); i++) {
      const found: Record<string, number> = {};
      for (const field of Object.keys(aliases)) {
        found[field] = rows[i].findIndex(cell => aliases[field].includes(key(cell)));
      }
      if (found.name >= 0 && found.selling >= 0 && found.purchase >= 0 && found.stock >= 0) {
        headerRow = i;
        columns = found;
        break;
      }
    }

    if (headerRow < 0) {
      throw new Error('Could not find the Vyapar headings: Item Name, Sale Price, Purchase Price and Item Stock quantity.');
    }

    const get = (row: any[], field: string) => columns[field] >= 0 ? row[columns[field]] : '';
    const number = (v: any) => {
      if (typeof v === 'number') return v;
      const n = String(v ?? '').replace(/,/g, '').replace(/[₹$]/g, '').trim();
      return n === '' ? 0 : Number(n);
    };

    const updated = [...products];
    let added = 0;
    let changed = 0;

    for (const row of rows.slice(headerRow + 1)) {
      const name = String(get(row, 'name') ?? '').trim();
      if (!name) continue;
      const code = String(get(row, 'code') ?? '').trim();
      const purchase = number(get(row, 'purchase'));
      const selling = number(get(row, 'selling'));
      const stock = number(get(row, 'stock'));
      const unit = String(get(row, 'unit') || 'pcs').trim();

      if (![purchase, selling, stock].every(Number.isFinite) || purchase < 0 || selling < 0 || stock < 0) continue;

      const index = updated.findIndex(p =>
        (code && p.code && p.code.toLowerCase() === code.toLowerCase()) ||
        p.name.trim().toLowerCase() === name.toLowerCase()
      );

      const item: Product = {
        id: index >= 0 ? updated[index].id : Date.now() + added + changed,
        name, code, purchase, selling, stock, unit, hsn: '', gstRate: 0
      };

      if (index >= 0) {
        updated[index] = { ...updated[index], ...item };
        changed++;
      } else {
        updated.push(item);
        added++;
      }
    }

    if (added + changed === 0) throw new Error('No valid products found below the detected headings.');
    save(updated);
    setMessage('Import complete: ' + added + ' products added and ' + changed + ' existing products updated.');
  } catch (error) {
    setMessage(error instanceof Error ? error.message : 'Excel import failed.');
  }
};

return (
    <div className="bulk-action-card">
      <h2>Bulk Action</h2>
      <p>Manage multiple products using your existing SmartLedger inventory.</p>

      <div style={card}>
        <h3>Bulk Stock & Price Update</h3>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search product name or code; blank means all products"
          style={{ width: '100%', padding: 12, boxSizing: 'border-box', marginBottom: 12 }}
        />
        <select value={action} onChange={e => setAction(e.target.value)}
          style={{ width: '100%', padding: 12, marginBottom: 12 }}>
          <option value="stock-add">Add quantity to stock</option>
          <option value="stock-set">Set stock quantity</option>
          <option value="purchase">Set purchase price</option>
          <option value="selling">Set selling price</option>
        </select>
        <input type="number" min="0" step="any" value={value}
          onChange={e => setValue(e.target.value)}
          placeholder="Enter quantity or price"
          style={{ width: '100%', padding: 12, boxSizing: 'border-box', marginBottom: 12 }}
        />
        <button style={button} onClick={apply}>
          Apply to {filtered.length} products
        </button>
      </div>

      <div style={card}>
        <h3>CSV Product Import & Export</h3>
        <p>Import CSV using the columns: name, purchase, selling, stock, unit.
          Optional columns: id, code, hsn, gstRate.</p>
        <input type="file" accept=".csv,text/csv"
          onChange={e => importCSV(e.target.files?.[0])} />
        <div style={{ marginTop: 14 }}>
          <button style={button} onClick={exportCSV}>Export Products CSV</button>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
          <button style={button} onClick={exportPDF}>Export PDF</button>
          <button style={button} onClick={exportExcel}>Export Excel</button>
          <button style={button} onClick={downloadExcelTemplate}>Download Excel Template</button>
          <label style={{ ...button, display: 'inline-block', cursor: 'pointer' }}>
            Import Excel
            <input type="file" accept=".xlsx,.xls,.csv" style={{ display: 'none' }}
              onChange={e => importExcel(e.target.files?.[0])} />
          </label>
        </div>
        </div>
      </div>

      <div style={card}>
        <h3>Matching Products ({filtered.length})</h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 550 }}>
            <thead><tr>
              {['Product','Code','Purchase','Selling','Stock','Unit'].map(h =>
                <th key={h} style={{ textAlign: 'left', padding: 9, borderBottom: '1px solid #ddd' }}>{h}</th>
              )}
            </tr></thead>
            <tbody>
              {filtered.map(p => <tr key={p.id}>
                {[p.name,p.code,p.purchase,p.selling,p.stock,p.unit].map((v,i) =>
                  <td key={i} style={{ padding: 9, borderBottom: '1px solid #eee' }}>{v}</td>
                )}
              </tr>)}
            </tbody>
          </table>
        </div>
      </div>
      {message && <p role="status">{message}</p>}
    </div>
  );
}
