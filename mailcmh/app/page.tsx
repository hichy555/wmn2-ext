'use client'

import { useState, useRef, useEffect } from 'react'

// ─── Type s ────────────────────────────────────────────────────────────────────

interface EmailRecord {
  [key: string]: string
  category: string
  ipAddress: string
  fullEmail: string
  subdomain: string
  fromEmail: string
  fromDomain: string
  fromName: string
  subject: string
  toAddress: string
  ccAddress: string
  spfStatus: string
  dkimStatus: string
  dkimParams: string
  dmarcStatus: string
  messageId: string
  returnPath: string
  sender: string
  replyTo: string
  inReplyTo: string
  contentType: string
  mimeVersion: string
  listId: string
  listUnsubscribe: string
  feedbackId: string
  date: string
}

const ALL_CATEGORIES = ['Primary', 'Social', 'Promotions', 'Updates', 'Forums', 'Spam']

const ALL_FIELDS = [
  { key: 'fullEmail', label: 'Full Email' },
  { key: 'subdomain', label: 'Subdomain' },
  { key: 'fromEmail', label: 'From Email' },
  { key: 'fromDomain', label: 'From Domain' },
  { key: 'fromName', label: 'From Name' },
  { key: 'subject', label: 'Subject' },
  { key: 'toAddress', label: 'To Address' },
  { key: 'ccAddress', label: 'CC Address' },
  { key: 'spfStatus', label: 'SPF Status' },
  { key: 'dkimStatus', label: 'DKIM Status' },
  { key: 'dkimParams', label: 'DKIM Parameters' },
  { key: 'dmarcStatus', label: 'DMARC Status' },
  { key: 'messageId', label: 'Message ID' },
  { key: 'returnPath', label: 'Return Path' },
  { key: 'sender', label: 'Sender' },
  { key: 'replyTo', label: 'Reply-To' },
  { key: 'inReplyTo', label: 'In Reply To' },
  { key: 'contentType', label: 'Content Type' },
  { key: 'mimeVersion', label: 'MIME Version' },
  { key: 'listId', label: 'List ID' },
  { key: 'listUnsubscribe', label: 'List Unsubscribe' },
  { key: 'feedbackId', label: 'Feedback ID' },
]

const DEFAULT_FIELDS = ['fromEmail', 'fromName', 'fromDomain', 'subject', 'spfStatus', 'dkimStatus', 'dkimParams', 'dmarcStatus']
const DEFAULT_CATEGORIES = ['Primary', 'Social', 'Promotions', 'Updates', 'Forums', 'Spam']

// ─── Helpers ──────────────────────────────────────────────────────────────────

const categoryClass: Record<string, string> = {
  Primary: 'tag-primary', Social: 'tag-social', Promotions: 'tag-promotions',
  Updates: 'tag-updates', Forums: 'tag-forums', Spam: 'tag-spam',
}

function StatusBadge({ value }: { value: string }) {
  const v = (value || '').toLowerCase()
  if (v === 'pass') return <span className="status-pass">✓ pass</span>
  if (v === 'fail' || v === 'none' && false) return <span className="status-fail">✗ fail</span>
  if (!v || v === 'none') return <span className="status-none">—</span>
  return <span className="status-pass">✓ {v}</span>
}

function truncate(s: string, n = 40) {
  return s && s.length > n ? s.slice(0, n) + '…' : s
}

// ─── Multi-select Dropdown ────────────────────────────────────────────────────

function MultiSelect({
  label, icon, options, selected, onChange,
}: {
  label: string; icon: string; options: string[] | { key: string; label: string }[];
  selected: string[]; onChange: (s: string[]) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const isObj = typeof options[0] === 'object'
  const getKey = (o: typeof options[number]) => isObj ? (o as { key: string }).key : o as string
  const getLabel = (o: typeof options[number]) => isObj ? (o as { label: string }).label : o as string

  const allSelected = selected.length === options.length
  const toggleAll = () => onChange(allSelected ? [] : options.map(getKey))
  const toggle = (k: string) => selected.includes(k)
    ? onChange(selected.filter(s => s !== k))
    : onChange([...selected, k])

  const previewLabel = selected.length === options.length
    ? `All ${label}`
    : selected.length === 0
      ? `None`
      : selected.length <= 2
        ? selected.map(k => {
            const o = options.find(o => getKey(o) === k)
            return o ? getLabel(o) : k
          }).join(', ')
        : `${selected.length} selected`

  return (
    <div style={{ position: 'relative' }} ref={ref}>
      <button
        className="btn-secondary"
        onClick={() => setOpen(!open)}
        style={{ minWidth: 180, justifyContent: 'space-between', fontSize: 12 }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span>{icon}</span>
          <span style={{ color: 'var(--text-secondary)' }}>{label}:</span>
          <span style={{ color: 'var(--text-primary)' }}>{truncate(previewLabel, 28)}</span>
        </span>
        <span style={{ color: 'var(--text-muted)', fontSize: 10 }}>▾</span>
      </button>
      {open && (
        <div className="dropdown fade-in" style={{ position: 'absolute', top: '110%', left: 0, zIndex: 100, maxHeight: 260, overflowY: 'auto' }}>
          <label className="checkbox-item" style={{ borderBottom: '1px solid var(--border)', marginBottom: 4 }}>
            <input type="checkbox" checked={allSelected} onChange={toggleAll} />
            <span style={{ fontWeight: 600 }}>Select All</span>
          </label>
          {options.map(o => {
            const k = getKey(o), l = getLabel(o)
            return (
              <label key={k} className="checkbox-item">
                <input type="checkbox" checked={selected.includes(k)} onChange={() => toggle(k)} />
                <span>{l}</span>
              </label>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Copy Dropdown ────────────────────────────────────────────────────────────

function CopyDropdown({ emails }: { emails: EmailRecord[] }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const copy = (text: string) => {
    navigator.clipboard.writeText(text)
    setOpen(false)
  }

  const uniqueIPs = [...new Set(emails.map(e => e.ipAddress).filter(Boolean))]
  const uniqueDomains = [...new Set(emails.map(e => e.fromDomain).filter(Boolean))]

  const groupByDomain = () => {
    const g: Record<string, string[]> = {}
    emails.forEach(e => {
      if (e.fromDomain) {
        if (!g[e.fromDomain]) g[e.fromDomain] = []
        g[e.fromDomain].push(e.fromEmail)
      }
    })
    return Object.entries(g).map(([d, emails]) => `${d}:\n  ${emails.join('\n  ')}`).join('\n\n')
  }

  const groupByIP = () => {
    const g: Record<string, string[]> = {}
    emails.forEach(e => {
      if (e.ipAddress) {
        if (!g[e.ipAddress]) g[e.ipAddress] = []
        g[e.ipAddress].push(e.fromEmail)
      }
    })
    return Object.entries(g).map(([ip, emails]) => `${ip}:\n  ${emails.join('\n  ')}`).join('\n\n')
  }

  const items = [
    { icon: '⚡', label: 'Copy IPs', action: () => copy(uniqueIPs.join('\n')) },
    { icon: '🌐', label: 'Copy Domains', action: () => copy(uniqueDomains.join('\n')) },
    { icon: '📋', label: 'Copy by Domain', action: () => copy(groupByDomain()) },
    { icon: '📌', label: 'Copy by IP', action: () => copy(groupByIP()) },
  ]

  return (
    <div style={{ position: 'relative' }} ref={ref}>
      <button
        className="btn-secondary"
        onClick={() => setOpen(!open)}
        style={{ background: 'var(--accent-purple)', border: 'none', color: 'white', padding: '8px 16px' }}
      >
        📋 Copy <span style={{ fontSize: 10 }}>▾</span>
      </button>
      {open && (
        <div className="dropdown fade-in" style={{ position: 'absolute', top: '110%', right: 0, zIndex: 100 }}>
          {items.map(item => (
            <div key={item.label} className="dropdown-item" onClick={item.action}>
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Export ───────────────────────────────────────────────────────────────────

function exportCSV(emails: EmailRecord[], fields: string[]) {
  const headers = ['category', 'ipAddress', ...fields]
  const rows = emails.map(e =>
    headers.map(h => {
      const v = (e as Record<string, string>)[h] || ''
      return `"${v.replace(/"/g, '""')}"`
    }).join(',')
  )
  const csv = [headers.join(','), ...rows].join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a'); a.href = url; a.download = 'emails.csv'; a.click()
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function Home() {
  const [emailAddr, setEmailAddr] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [startFrom, setStartFrom] = useState(1)
  const [count, setCount] = useState(10)
  const [categories, setCategories] = useState<string[]>(DEFAULT_CATEGORIES)
  const [fields, setFields] = useState<string[]>(DEFAULT_FIELDS)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [emails, setEmails] = useState<EmailRecord[]>([])
  const [search, setSearch] = useState('')
  const [filterCat, setFilterCat] = useState('All')
  const [sortField, setSortField] = useState('')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [emailValid, setEmailValid] = useState<boolean | null>(null)

  const validateEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)

  const handleEmailChange = (v: string) => {
    setEmailAddr(v)
    setEmailValid(v ? validateEmail(v) : null)
  }

  const handleExtract = async () => {
    if (!emailAddr || !password) { setError('Email and password are required'); return }
    setLoading(true); setError(''); setEmails([])
    try {
      const res = await fetch('/api/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailAddr, password, startFrom, count, categories, fields }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Extraction failed')
      setEmails(data.emails || [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error')
    } finally { setLoading(false) }
  }

  const handleSort = (f: string) => {
    if (sortField === f) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortField(f); setSortDir('asc') }
  }

  const filtered = emails
    .filter(e => filterCat === 'All' || e.category === filterCat)
    .filter(e => {
      if (!search) return true
      const s = search.toLowerCase()
      return Object.values(e).some(v => v.toLowerCase().includes(s))
    })
    .sort((a, b) => {
      if (!sortField) return 0
      const av = (a as Record<string, string>)[sortField] || ''
      const bv = (b as Record<string, string>)[sortField] || ''
      return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av)
    })

  const visibleFields = ALL_FIELDS.filter(f => fields.includes(f.key))

  const SortIcon = ({ f }: { f: string }) => (
    <span style={{ marginLeft: 4, opacity: sortField === f ? 1 : 0.3, fontSize: 10 }}>
      {sortField === f ? (sortDir === 'asc' ? '▲' : '▼') : '⇅'}
    </span>
  )

  const statusFields = ['spfStatus', 'dkimStatus', 'dmarcStatus']

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* ── Sidebar ── */}
      <aside style={{
        width: 220, flexShrink: 0, background: 'var(--bg-secondary)',
        borderRight: '1px solid var(--border)', padding: '24px 16px',
        display: 'flex', flexDirection: 'column', gap: 8,
      }}>
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>
            MailCMH
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Email Tools</div>
        </div>

        <button style={{
          display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
          borderRadius: 8, border: 'none', background: 'var(--accent-blue)',
          color: 'white', cursor: 'pointer', fontSize: 13, fontFamily: 'inherit', fontWeight: 600,
        }}>
          <span>✉</span> Email Extraction
        </button>
      </aside>

      {/* ── Main ── */}
      <main style={{ flex: 1, padding: 24, display: 'flex', flexDirection: 'column', gap: 20, overflowX: 'hidden' }}>

        {/* ── Controls Panel ── */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Row 1: inputs */}
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>

            {/* Email Address */}
            <div style={{ flex: '1 1 200px', minWidth: 200 }}>
              <label style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                <span>✉</span> Email Address
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="email"
                  className={`input-field ${emailValid === true ? 'valid' : emailValid === false ? 'invalid' : ''}`}
                  placeholder="your.email@gmail.com"
                  value={emailAddr}
                  onChange={e => handleEmailChange(e.target.value)}
                />
                {emailValid === true && (
                  <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--accent-green)', fontSize: 14 }}>✓</span>
                )}
              </div>
            </div>

            {/* App Password */}
            <div style={{ flex: '1 1 200px', minWidth: 200 }}>
              <label style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                <span>🔒</span> App Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPass ? 'text' : 'password'}
                  className="input-field"
                  placeholder="Google App Password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  style={{ paddingRight: 40 }}
                />
                <button
                  onClick={() => setShowPass(!showPass)}
                  style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 14 }}
                >
                  {showPass ? '🙈' : '👁'}
                </button>
              </div>
            </div>

            {/* Email Range */}
            <div style={{ flexShrink: 0 }}>
              <label style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                <span>📋</span> Email Range
              </label>
              <div style={{ display: 'flex', gap: 8 }}>
                <div>
                  <input
                    type="number" min={1} className="input-field" value={startFrom}
                    onChange={e => setStartFrom(Number(e.target.value))}
                    style={{ width: 80 }}
                  />
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 3 }}>Start from</div>
                </div>
                <div>
                  <input
                    type="number" min={1} max={500} className="input-field" value={count}
                    onChange={e => setCount(Number(e.target.value))}
                    style={{ width: 80 }}
                  />
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 3 }}>Count</div>
                </div>
              </div>
            </div>

            {/* Categories */}
            <div style={{ flexShrink: 0 }}>
              <label style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                <span>🏷</span> Email Categories
              </label>
              <MultiSelect
                label="Categories" icon="🏷"
                options={ALL_CATEGORIES}
                selected={categories}
                onChange={setCategories}
              />
            </div>

            {/* Data Fields */}
            <div style={{ flexShrink: 0 }}>
              <label style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                <span>📊</span> Data Fields to Extract
              </label>
              <MultiSelect
                label="Fields" icon="📊"
                options={ALL_FIELDS}
                selected={fields}
                onChange={setFields}
              />
            </div>
          </div>

          {/* Row 2: Extract button + error */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button className="btn-primary" onClick={handleExtract} disabled={loading}>
              {loading ? <><div className="spinner" /> Extracting...</> : <><span>🚀</span> Extract Emails</>}
            </button>
            {error && (
              <div style={{
                background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
                borderRadius: 8, padding: '8px 14px', color: '#f87171', fontSize: 13,
                display: 'flex', alignItems: 'center', gap: 8,
              }}>
                <span>⚠</span> {error}
              </div>
            )}
          </div>
        </div>

        {/* ── Results Panel ── */}
        {emails.length > 0 && (
          <div className="card fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 10, background: 'linear-gradient(135deg, var(--accent-blue), var(--accent-purple))',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
                }}>✉</div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 16 }}>Email Results</div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{emails.length} emails extracted</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <button className="btn-secondary" onClick={() => exportCSV(emails, fields)}>
                  ⬇ Export
                </button>
                <CopyDropdown emails={emails} />
              </div>
            </div>

            {/* Search + filter row */}
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ position: 'relative', flex: '1 1 300px' }}>
                <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: 14 }}>🔍</span>
                <input
                  className="input-field"
                  style={{ paddingLeft: 36 }}
                  placeholder="Search emails by any field..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {['All', ...ALL_CATEGORIES].map(cat => (
                  <button
                    key={cat}
                    onClick={() => setFilterCat(cat)}
                    style={{
                      padding: '5px 12px', borderRadius: 20, fontSize: 11, fontFamily: 'inherit',
                      fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s',
                      background: filterCat === cat ? 'var(--accent-blue)' : 'var(--bg-input)',
                      color: filterCat === cat ? 'white' : 'var(--text-secondary)',
                      border: `1px solid ${filterCat === cat ? 'var(--accent-blue)' : 'var(--border)'}`,
                    }}
                  >
                    {cat}
                  </button>
                ))}
                {filterCat !== 'All' && (
                  <button onClick={() => setFilterCat('All')} style={{
                    padding: '5px 10px', borderRadius: 20, fontSize: 11, fontFamily: 'inherit',
                    cursor: 'pointer', background: 'none', border: '1px solid var(--border)', color: 'var(--text-muted)',
                  }}>✕ Clear</button>
                )}
              </div>
            </div>

            {/* Table */}
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th onClick={() => handleSort('category')}>Category <SortIcon f="category" /></th>
                    <th onClick={() => handleSort('ipAddress')}>IP Address <SortIcon f="ipAddress" /></th>
                    {visibleFields.map(f => (
                      <th key={f.key} onClick={() => handleSort(f.key)}>
                        {f.label} <SortIcon f={f.key} />
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={2 + visibleFields.length} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 40 }}>
                        No results found
                      </td>
                    </tr>
                  ) : (
                    filtered.map((email, i) => (
                      <tr key={i}>
                        <td>
                          <span className={`tag ${categoryClass[email.category] || 'tag-primary'}`}>
                            {email.category}
                          </span>
                        </td>
                        <td style={{ color: 'var(--text-secondary)', fontFamily: 'monospace', fontSize: 12 }}>
                          {email.ipAddress || '—'}
                        </td>
                        {visibleFields.map(f => (
                          <td key={f.key} title={(email as Record<string, string>)[f.key] || ''}>
                            {statusFields.includes(f.key) ? (
                              <StatusBadge value={(email as Record<string, string>)[f.key]} />
                            ) : (
                              <span style={{ color: 'var(--text-primary)', fontSize: 12 }}>
                                {truncate((email as Record<string, string>)[f.key] || '—', 45)}
                              </span>
                            )}
                          </td>
                        ))}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {filtered.length > 0 && (
              <div style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'right' }}>
                Showing {filtered.length} of {emails.length} emails
              </div>
            )}
          </div>
        )}

        {/* ── Empty state ── */}
        {!loading && emails.length === 0 && !error && (
          <div style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexDirection: 'column', gap: 12, color: 'var(--text-muted)', padding: 60,
          }}>
            <div style={{ fontSize: 48, opacity: 0.3 }}>📬</div>
            <div style={{ fontSize: 14, fontWeight: 500 }}>Enter your Gmail credentials to extract emails</div>
            <div style={{ fontSize: 12, maxWidth: 400, textAlign: 'center', lineHeight: 1.6 }}>
              Use a Gmail App Password for secure access. Enable 2FA on your Google account, then generate an App Password at myaccount.google.com/apppasswords
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
