import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search, Plus, RefreshCw, Trash2, Download } from 'lucide-react';
import { invoiceApi } from '../services/api';
import { Invoice } from '../types';
import { formatINR, formatDate } from '../utils/formatters';
import { StatusBadge } from '../components/StatusBadge';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { EmptyState } from '../components/EmptyState';
import { useToast } from '../components/Toast';

export const InvoicesPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { showToast } = useToast();

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status')?.toUpperCase() || 'ALL');
  const [riskFilter, setRiskFilter] = useState('ALL');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const q = searchParams.get('status')?.toUpperCase();
    if (q) setStatusFilter(q);
  }, [searchParams]);

  const handleStatusChange = (val: string) => {
    setStatusFilter(val);
    const p = new URLSearchParams(searchParams);
    val === 'ALL' ? p.delete('status') : p.set('status', val);
    setSearchParams(p, { replace: true });
  };

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const res = await invoiceApi.getAll();
      setInvoices(res.data);
    } catch {
      showToast('error', 'Failed to load invoices.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchInvoices(); }, []);

  const handleDeleteConfirm = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await invoiceApi.delete(deleteId);
      showToast('success', `Invoice ${deleteId} deleted.`);
      setDeleteId(null);
      fetchInvoices();
    } catch (err: any) {
      showToast('error', err.response?.data?.detail || 'Delete failed.');
    } finally { setDeleting(false); }
  };

  const filtered = invoices.filter(inv => {
    const s = search.toLowerCase();
    const matchSearch = inv.id.toLowerCase().includes(s) ||
      (inv.invoice_number?.toLowerCase().includes(s) ?? false) ||
      (inv.supplier_name?.toLowerCase().includes(s) ?? false);
    if (!matchSearch) return false;
    if (statusFilter !== 'ALL') {
      const a = (inv.approval_status || '').toUpperCase();
      if (a !== statusFilter && !(statusFilter === 'PENDING' && a === 'PENDING_APPROVAL')) return false;
    }
    if (riskFilter !== 'ALL' && inv.fraud_status !== riskFilter) return false;
    return true;
  });

  const handleCsvExport = () => {
    if (!filtered.length) { showToast('info', 'No records to export.'); return; }
    const headers = ['Invoice ID','Invoice #','Supplier','Date','Amount','Validation','Risk','Approval'];
    const rows = filtered.map(i => [`"${i.id}"`,`"${i.invoice_number||''}"`,`"${(i.supplier_name||'').replace(/"/g,'""')}"`,`"${i.invoice_date||''}"`,`"${i.total_amount||0}"`,`"${i.validation_status||''}"`,`"${i.fraud_status||''}"`,`"${i.approval_status||''}"`]);
    const csv = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const link = document.createElement('a');
    link.href = encodeURI(csv);
    link.download = `invoices_${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
    showToast('success', `Exported ${filtered.length} records.`);
  };

  const tabs = [
    { key: 'ALL',       label: 'All',       count: invoices.length },
    { key: 'PENDING',   label: 'Pending',   count: invoices.filter(i => (i.approval_status||'').toUpperCase().includes('PENDING')).length },
    { key: 'APPROVED',  label: 'Approved',  count: invoices.filter(i => (i.approval_status||'').toUpperCase() === 'APPROVED').length },
    { key: 'REJECTED',  label: 'Rejected',  count: invoices.filter(i => (i.approval_status||'').toUpperCase() === 'REJECTED').length },
    { key: 'ESCALATED', label: 'Escalated', count: invoices.filter(i => (i.approval_status||'').toUpperCase() === 'ESCALATED').length },
  ];

  const riskBadge = (r: string) => {
    if (!r || r === 'PENDING') return { bg: 'var(--surface-subtle)', color: 'var(--text-muted)', label: r || 'N/A' };
    if (r === 'LOW')    return { bg: 'var(--success-bg)', color: 'var(--success)', label: 'Low' };
    if (r === 'MEDIUM') return { bg: 'var(--warning-bg)', color: 'var(--warning)', label: 'Medium' };
    return { bg: 'var(--danger-bg)', color: 'var(--danger)', label: 'High' };
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Invoice Management</h1>
          <p className="page-desc">Centralized ledger with OCR extraction, GST verification, and dual-control approvals.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <button onClick={handleCsvExport} className="btn btn-secondary">
            <Download size={14} /> Export CSV
          </button>
          <button onClick={fetchInvoices} className="btn btn-secondary btn-icon" title="Refresh">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
          <button onClick={() => navigate('/upload')} className="btn btn-primary">
            <Plus size={14} /> Upload Invoice
          </button>
        </div>
      </div>

      {/* Status filter tabs */}
      <div className="tab-scroll">
        {tabs.map(t => (
          <button key={t.key} type="button" onClick={() => handleStatusChange(t.key)}
            className={`tab-pill ${statusFilter === t.key ? 'active' : ''}`}>
            {t.label}
            <span className="tab-count">{t.count}</span>
          </button>
        ))}
      </div>

      {/* Search & filter bar */}
      <div className="filter-bar">
        <div className="input-with-icon" style={{ flex: '1', minWidth: '14rem', maxWidth: '28rem' }}>
          <Search size={14} className="input-icon" />
          <input type="text" placeholder="Search by ID, number, or supplier…" value={search}
            onChange={e => setSearch(e.target.value)} className="input" />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <label className="section-label">Risk:</label>
          <select value={riskFilter} onChange={e => setRiskFilter(e.target.value)} className="input select-input" style={{ width: 'auto' }}>
            <option value="ALL">All levels</option>
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
          </select>
        </div>
        {(statusFilter !== 'ALL' || riskFilter !== 'ALL' || search) && (
          <button onClick={() => { handleStatusChange('ALL'); setRiskFilter('ALL'); setSearch(''); }}
            style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer' }}>
            Clear filters
          </button>
        )}
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="table-wrap">
          {loading ? (
            <div style={{ padding: '3.5rem', textAlign: 'center' }}>
              <RefreshCw size={20} className="animate-spin" style={{ color: 'var(--accent)', margin: '0 auto 0.5rem' }} />
              <p style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>Loading invoices…</p>
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState title="No invoices found" description="No records match the current filters."
              actionLabel="Reset filters" onAction={() => { setSearch(''); setStatusFilter('ALL'); setRiskFilter('ALL'); }} />
          ) : (
            <table className="data-table">
              <thead><tr>
                <th>Invoice ID</th>
                <th>Invoice #</th>
                <th>Supplier</th>
                <th>Date</th>
                <th style={{ textAlign: 'right' }}>Amount</th>
                <th style={{ textAlign: 'center' }}>Validation</th>
                <th style={{ textAlign: 'center' }}>Risk</th>
                <th style={{ textAlign: 'center' }}>Approval</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr></thead>
              <tbody>
                {filtered.map(inv => {
                  const risk = riskBadge(inv.fraud_status);
                  return (
                    <tr key={inv.id} onClick={() => navigate(`/extraction?invoiceId=${inv.id}`)} style={{ cursor: 'pointer' }}>
                      <td>
                        <span className="mono" style={{ fontWeight: 700, color: 'var(--accent)' }}>{inv.id}</span>
                      </td>
                      <td>
                        <span className="mono" style={{ color: 'var(--text-secondary)' }}>{inv.invoice_number || '—'}</span>
                      </td>
                      <td style={{ maxWidth: '12rem' }}>
                        <span style={{ fontWeight: 500, color: 'var(--text-primary)', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {inv.supplier_name || 'Unknown Supplier'}
                        </span>
                      </td>
                      <td className="tabular-nums" style={{ color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                        {inv.invoice_date ? formatDate(inv.invoice_date) : '—'}
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 700, whiteSpace: 'nowrap' }} className="tabular-nums">
                        {inv.total_amount != null ? formatINR(inv.total_amount) : '—'}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <StatusBadge status={inv.validation_status} size="sm" />
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span style={{ display: 'inline-block', padding: '0.1875rem 0.625rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600, backgroundColor: risk.bg, color: risk.color }}>
                          {risk.label}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <StatusBadge status={inv.approval_status} size="sm" />
                      </td>
                      <td style={{ textAlign: 'right' }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'inline-flex', gap: '0.375rem', alignItems: 'center' }}>
                          <button onClick={() => navigate(`/extraction?invoiceId=${inv.id}`)} className="btn btn-secondary" style={{ fontSize: '0.75rem', padding: '0.3125rem 0.625rem' }}>Review</button>
                          <button onClick={() => navigate(`/verification?invoiceId=${inv.id}`)} className="btn btn-secondary" style={{ fontSize: '0.75rem', padding: '0.3125rem 0.625rem' }}>Evidence</button>
                          <button onClick={() => setDeleteId(inv.id)} className="btn btn-ghost btn-icon" title="Delete" style={{ color: 'var(--text-muted)' }}>
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
        <div style={{ padding: '0.625rem 1rem', borderTop: '1px solid var(--border)', backgroundColor: 'var(--surface-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
            Showing <strong style={{ color: 'var(--text-primary)' }}>{filtered.length}</strong> of <strong style={{ color: 'var(--text-primary)' }}>{invoices.length}</strong> invoices
          </span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Click any row to open the review pane</span>
        </div>
      </div>

      <ConfirmDialog
        isOpen={deleteId !== null}
        title="Delete Invoice Record"
        description={`Permanently delete invoice ${deleteId}? This removes extracted data, validation results, and audit events.`}
        confirmLabel={deleting ? 'Deleting…' : 'Delete Invoice'}
        variant="danger"
        requireReason={false}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
};
