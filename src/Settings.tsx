import { migrateLegacyTransactions } from './accounting';
import { useState } from 'react'

type BusinessSettings = {
  businessName: string
  ownerName: string
  phone: string
  email: string
  address: string
  gstin: string
  businessState: string
  logo: string
  invoiceFooter: string
}

const defaults: BusinessSettings = {
  businessName: '',
  ownerName: '',
  phone: '',
  email: '',
  address: '',
  gstin: '',
  businessState: 'Jammu & Kashmir',
  logo: '',
  invoiceFooter: 'Thank you for your business!'
}

export default function Settings() {
  const [migrationResult, setMigrationResult] = useState<string>('');

  function runHistoricalMigration() {
    const confirmed = window.confirm(
      'Run the one-time historical accounting migration? Existing journal entries will be preserved. Please ensure you have a backup first.'
    );
    if (!confirmed) return;

    const result = migrateLegacyTransactions();
    setMigrationResult(
      result.alreadyCompleted
        ? 'Migration was already completed. No records were changed.'
        : `Migration complete: ${result.migrated} entries added, ${result.skipped} skipped, ${result.failed} failed.`
    );
  }

  const [data, setData] = useState<BusinessSettings>(() => {
    try {
      return { ...defaults, ...JSON.parse(localStorage.getItem('smartledger-settings') || '{}') }
    } catch {
      return defaults
    }
  })

  const [saved, setSaved] = useState(false)

  function update(field: keyof BusinessSettings, value: string) {
    setData(previous => ({ ...previous, [field]: value }))
    setSaved(false)
  }

  function handleLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file.')
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      alert('Please select an image smaller than 2 MB.')
      return
    }
    const reader = new FileReader()
    reader.onload = () => update('logo', String(reader.result))
    reader.readAsDataURL(file)
  }

  function saveSettings(e: React.FormEvent) {
    e.preventDefault()
    localStorage.setItem('smartledger-settings', JSON.stringify(data))
    setSaved(true)
  }

  return (
    <div className="settings-card">
      <h2>Business Settings</h2>
      <p className="settings-description">Manage your business profile and invoice details.</p>

      <form onSubmit={saveSettings}>
        <h3>Business Logo</h3>
        <div className="settings-logo">
          {data.logo && <img src={data.logo} alt="Business logo preview" />}
          <label>Choose Logo
            <input type="file" accept="image/*" onChange={handleLogo} />
          </label>
          {data.logo && <button type="button" onClick={() => update('logo', '')}>Remove Logo</button>}
        </div>
        <h3>Business Profile</h3>
        <div className="settings-grid">
          <label>Business Name<input value={data.businessName} onChange={e => update('businessName', e.target.value)} placeholder="Enter business name" /></label>
          <label>Owner Name<input value={data.ownerName} onChange={e => update('ownerName', e.target.value)} placeholder="Enter owner name" /></label>
          <label>Phone Number<input value={data.phone} onChange={e => update('phone', e.target.value)} placeholder="Enter phone number" /></label>
          <label>Email Address<input type="email" value={data.email} onChange={e => update('email', e.target.value)} placeholder="Enter email address" /></label>
          <label className="settings-full">Business Address<textarea value={data.address} onChange={e => update('address', e.target.value)} placeholder="Enter complete business address" /></label>
        </div>

        <h3>Tax Details</h3>
        <div className="settings-grid">
          <label>GSTIN<input value={data.gstin} onChange={e => update('gstin', e.target.value)} placeholder="Enter GSTIN (optional)" /></label>
        </div>

        <h3>Invoice Details</h3>
        <label className="settings-full">Invoice Footer / Thank You Message<textarea value={data.invoiceFooter} onChange={e => update('invoiceFooter', e.target.value)} /></label>

        <button className="settings-save" type="submit">Save Business Settings</button>
        {saved && <p className="settings-success">Settings saved successfully.</p>}
      </form>

      
<div style={{ marginTop: 24, padding: 18, border: '1px solid #dddccf', borderRadius: 12 }}>
  <h3>Historical Accounting Migration</h3>
  <p>Import older sales, purchases, payments and expenses into the accounting journal. Make a backup before running this one-time operation.</p>
  <button type="button" className="settings-save" onClick={runHistoricalMigration}>
    Run Historical Migration
  </button>
  {migrationResult && <p role="status">{migrationResult}</p>}
</div>

<div className="settings-about">
        <h3>About SmartLedger</h3>
        <strong>SmartLedger</strong>
        <p>Your Business. Your Numbers. Your Growth.</p>
        <small>Designed and Developed by Naveed.</small>
      </div>
    </div>
  )
}
