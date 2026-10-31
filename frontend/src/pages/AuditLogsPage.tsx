import React, { useState, useEffect } from 'react';
import { Search, RefreshCw, Copy, Lock, Info } from 'lucide-react';
import { auditApi } from '../services/api';
import { AuditLog } from '../types';
import { formatDateTime } from '../utils/formatters';
import { useToast } from '../components/Toast';
import { EmptyState } from '../components/EmptyState';

export const AuditLogsPage: React.FC = () => {
  const { showToast } = useToast();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [invoiceFilter, setInvoiceFilter] = useState('');
  const [copiedHash, setCopiedHash] = useState<string | null>(null);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await auditApi.getAll({ invoice_id: invoiceFilter || undefined });
      setLogs(res.data);
    } catch { showToast('error', 'Failed to retrieve audit logs.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchLogs(); }, [invoiceFilter]);

  const handleCopy = (hash: string) => {
    navigator.clipboard.writeText(hash);
    setCopiedHash(hash);
    showToast('info', 'Hash copied to clipboard.');
    setTimeout(() => setCopiedHash(null), 2000);
  };

  const filtered = logs.filter(l => {
    const s = search.toLowerCase();
    return l.action.toLowerCase().includes(s) ||
      (l.invoice_id?.toLowerCase().includes(s) ?? false) ||
      (l.user_name?.toLowerCase().includes(s) ?? false) ||
      (l.record_hash?.toLowerCase().includes(s) ?? false);
  });

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Audit Trail Ledger</h1>
          <p className="page-desc">Append-only log recording all extraction, validation, and approval decisions.</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.875rem', borderRadius: '6px', border: '1px solid var(--border)', backgroundColor: 'var(--surface-subtle)' }}>
          <Lock size={13} style={{ color: 'var(--accent)' }} />
          <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)' }}>SHA-256 Verified Chain</span>
        </div>
      </div>

      {/* Info banner */}
      <div style={{ padding: '0.75rem 1rem', borderRadius: '6px', backgroundColor: 'var(--info-bg)', border: '1px solid var(--info-border)', display: 'flex', alignItems: 'flex-start', gap: '0.625rem' }}>
        <Info size={14} style={{ color: 'var(--info)', flexShrink: 0, marginTop: '0.125rem' }} />
        <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--text-primary)', lineHeight: 1.5 }}>
          <strong>Cryptographic Integrity:</strong> Every entry is hashed with SHA-256 using its timestamp, actor ID, invoice ID, and payload diff. The chain is verified per transaction.
        </p>
      </div>

      {/* Search & filter */}
      <div className="filter-bar">
        <div className="input-with-icon" style={{ flex: 1, minWidth: '14rem' }}>
          <Search size={13} className="input-icon" />
          <input type="text" placeholder="Search action, invoice ID, actor…" value={search}
            onChange={e => setSearch(e.target.value)} className="input" style={{ paddingLeft: '2rem' }} />
        </div>
        <input type="text" placeholder="Filter by Invoice ID (e.g. INV-1001)" value={invoiceFilter}
          onChange={e => setInvoiceFilter(e.target.value)} className="input" style={{ width: '16rem' }} />
        {invoiceFilter && (
          <button onClick={() => setInvoiceFilter('')} style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}>
            Clear
          </button>
        )}
        <button onClick={fetchLogs} className="btn btn-secondary btn-icon">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="table-wrap">
          {loading ? (
            <div style={{ padding: '3.5rem', textAlign: 'center' }}>
              <RefreshCw size={18} className="animate-spin" style={{ color: 'var(--accent)', margin: '0 auto 0.5rem' }} />
              <p style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>Loading audit stream…</p>
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState title="No Audit Records" description="No events match the current filters."
              actionLabel="Clear Filters" onAction={() => { setSearch(''); setInvoiceFilter(''); }} />
          ) : (
            <table className="data-table">
              <thead><tr>
                <th style={{ width: '4rem' }}>#</th>
                <th>Timestamp</th>
                <th>Action Event</th>
                <th>Target Invoice</th>
                <th>Actor</th>
                <th>Details</th>
                <th style={{ textAlign: 'right' }}>SHA-256</th>
              </tr></thead>
              <tbody>
                {filtered.map(log => (
                  <tr key={log.id}>
                    <td className="mono" style={{ color: 'var(--text-muted)' }}>#{log.id}</td>
                    <td className="mono tabular-nums" style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                      {log.timestamp ? formatDateTime(log.timestamp) : '—'}
                    </td>
                    <td>
                      <span className="mono" style={{ display: 'inline-block', padding: '0.1875rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600, backgroundColor: 'var(--surface-subtle)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}>
                        {log.action}
                      </span>
                    </td>
                    <td className="mono" style={{ fontWeight: 600, color: 'var(--accent)' }}>
                      {log.invoice_id || 'SYSTEM'}
                    </td>
                    <td style={{ color: 'var(--text-primary)' }}>{log.user_name || 'System'}</td>
                    <td className="mono" style={{ fontSize: '0.75rem', color: 'var(--text-muted)', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {log.details ? (typeof log.details === 'string' ? log.details : JSON.stringify(log.details)) : '—'}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      {log.record_hash ? (
                        <button onClick={() => handleCopy(log.record_hash!)}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.1875rem 0.5rem', borderRadius: '4px', fontSize: '0.6875rem', fontWeight: 600, backgroundColor: 'var(--info-bg)', color: 'var(--info)', border: '1px solid var(--info-border)', cursor: 'pointer' }}
                          title="Click to copy full hash">
                          <span className="mono">{log.record_hash.slice(0, 10)}…</span>
                          <Copy size={11} />
                        </button>
                      ) : (
                        <span className="mono" style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>0x000…</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div style={{ padding: '0.625rem 1rem', borderTop: '1px solid var(--border)', backgroundColor: 'var(--surface-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
          <span>Entries: <strong style={{ color: 'var(--text-primary)' }}>{filtered.length}</strong></span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Append-only — no records can be edited or deleted</span>
        </div>
      </div>
    </div>
  );
};
