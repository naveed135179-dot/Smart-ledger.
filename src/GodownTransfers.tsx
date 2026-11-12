import { useState } from 'react';

type Batch = {
  id: string | number;
  productId: number;
  product: string;
  batchNumber?: string;
  expiryDate?: string;
  godown?: string;
  quantity: number;
  remainingQuantity?: number;
  purchaseRate?: number;
  date?: string;
};

export default function GodownTransfers() {
  const [batches, setBatches] = useState<Batch[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('smartledger-batches') || '[]');
    } catch {
      return [];
    }
  });

  const [productId, setProductId] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [batchId, setBatchId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [message, setMessage] = useState('');

  const active = batches.filter(
    b => Number(b.remainingQuantity ?? b.quantity ?? 0) > 0
  );

  const products = Array.from(
    new Map(active.map(b => [b.productId, b.product])).entries()
  );

  const godowns = Array.from(
    new Set(active.map(b => b.godown || 'Main Godown'))
  );

  const sourceBatches = active.filter(
    b => String(b.productId) === productId &&
      (b.godown || 'Main Godown') === from
  );

  const selectedBatch = sourceBatches.find(
    b => String(b.id) === batchId
  );

  function transferStock(e: React.FormEvent) {
    e.preventDefault();
    const amount = Number(quantity);

    if (!selectedBatch || !from || !to || from === to ||
        !Number.isFinite(amount) || amount <= 0) {
      setMessage('Enter valid transfer details.');
      return;
    }

    const available = Number(
      selectedBatch.remainingQuantity ?? selectedBatch.quantity
    );

    if (amount > available) {
      setMessage('Transfer quantity exceeds available batch stock.');
      return;
    }

    const updated = batches.map(b =>
      b.id === selectedBatch.id
        ? {
            ...b,
            remainingQuantity: available - amount
          }
        : b
    );

    const destinationBatch: Batch = {
      ...selectedBatch,
      id: `transfer-${Date.now()}`,
      godown: to,
      quantity: amount,
      remainingQuantity: amount,
      date: new Date().toISOString().slice(0, 10)
    };

    updated.push(destinationBatch);

    const history = JSON.parse(
      localStorage.getItem('smartledger-godown-transfers') || '[]'
    );

    history.unshift({
      id: Date.now(),
      date: new Date().toISOString(),
      product: selectedBatch.product,
      productId: selectedBatch.productId,
      batchNumber: selectedBatch.batchNumber || '',
      from,
      to,
      quantity: amount
    });

    localStorage.setItem('smartledger-batches', JSON.stringify(updated));
    localStorage.setItem('smartledger-godown-transfers', JSON.stringify(history));

    setBatches(updated);
    setQuantity('');
    setBatchId('');
    setMessage('Stock transferred successfully.');
  }

  const history = JSON.parse(
    localStorage.getItem('smartledger-godown-transfers') || '[]'
  );

  return (
    <div className="godowntransfers-card">
      <h1>Godown Transfers</h1>
      <p>Move inventory between storage locations.</p>

      <form onSubmit={transferStock} style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))',
        gap: 14,
        padding: 20,
        background: '#fbf9f3',
        borderRadius: 14
      }}>
        <label>
          Product
          <select required value={productId}
            onChange={e => {
              setProductId(e.target.value);
              setBatchId('');
            }}>
            <option value="">Select product</option>
            {products.map(([id, name]) => (
              <option key={id} value={id}>{name}</option>
            ))}
          </select>
        </label>

        <label>
          From Godown
          <select required value={from}
            onChange={e => {
              setFrom(e.target.value);
              setBatchId('');
            }}>
            <option value="">Select source</option>
            {godowns.map(g => <option key={g}>{g}</option>)}
          </select>
        </label>

        <label>
          To Godown
          <input required value={to}
            onChange={e => setTo(e.target.value)}
            placeholder="Destination godown" />
        </label>

        <label>
          Batch
          <select required value={batchId}
            onChange={e => setBatchId(e.target.value)}>
            <option value="">Select batch</option>
            {sourceBatches.map(b => (
              <option key={b.id} value={b.id}>
                {b.batchNumber || 'Unnumbered'} — Available: {Number(b.remainingQuantity ?? b.quantity)}
              </option>
            ))}
          </select>
        </label>

        <label>
          Transfer Quantity
          <input required type="number" min="0.01" step="any"
            value={quantity}
            onChange={e => setQuantity(e.target.value)} />
        </label>

        <button type="submit">Transfer Stock</button>
      </form>

      {message && <p>{message}</p>}

      <h2>Transfer History</h2>
      <div style={{overflowX: 'auto'}}>
        <table style={{width: '100%', borderCollapse: 'collapse'}}>
          <thead>
            <tr>
              <th>Date</th><th>Product</th><th>Batch</th>
              <th>From</th><th>To</th><th>Quantity</th>
            </tr>
          </thead>
          <tbody>
            {history.map((h: any) => (
              <tr key={h.id}>
                <td>{String(h.date).slice(0, 10)}</td>
                <td>{h.product}</td>
                <td>{h.batchNumber || '-'}</td>
                <td>{h.from}</td>
                <td>{h.to}</td>
                <td>{h.quantity}</td>
              </tr>
            ))}
            {!history.length && (
              <tr><td colSpan={6}>No transfers recorded yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
