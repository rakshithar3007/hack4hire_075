import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { RefreshCw, Search, CheckCircle2, XCircle, AlertTriangle, ArrowRight, FileCode, X } from 'lucide-react';
import { approvalApi, auditApi, extractionApi, validationApi, snapshotApi } from '../services/api';
import { Invoice, AuditLog, ValidationResult } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { StatusBadge } from '../components/StatusBadge';
import { DataTable, Column } from '../components/DataTable';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { ErrorState } from '../components/ErrorState';
import { useToast } from '../components/Toast';
import { formatINR, formatDate, formatDateTime } from '../utils/formatters';

export const ApprovalPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [checkerStatus, setCheckerStatus] = useState<any>(null);
  const [auditTrail, setAuditTrail] = useState<AuditLog[]>([]);
  const [validationData, setValidationData] = useState<ValidationResult | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [approveOpen, setApproveOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [escalateOpen, setEscalateOpen] = useState(false);
  const [snapshotOpen, setSnapshotOpen] = useState(false);
  const [snapshotData, setSnapshotData] = useState<any>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [approvalReason, setApprovalReason] = useState('');
  const [escalationReason, setEscalationReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const fetchQueue = async () => {
    setLoading(true); setError(null);
    try {
      const res = await approvalApi.getPending();
      setInvoices(res.data);
      if (res.data.length > 0 && !selectedInvoice) setSelectedInvoice(res.data[0]);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load queue.');
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchQueue(); }, []);

  useEffect(() => {
    if (!selectedInvoice) return;
    setDetailLoading(true);
    Promise.allSettled([
      extractionApi.getChecker(selectedInvoice.id),
      auditApi.getByInvoice(selectedInvoice.id),
      validationApi.get(selectedInvoice.id),
    ]).then(([c, a, v]) => {
      setCheckerStatus(c.status === 'fulfilled' ? c.value.data : null);
      setAuditTrail(a.status === 'fulfilled' ? a.value.data : []);
      setValidationData(v.status === 'fulfilled' ? v.value.data : null);
    }).finally(() => setDetailLoading(false));
  }, [selectedInvoice?.id]);

  const doApprove = async () => {
    if (!selectedInvoice) return;
    setActionLoading(true);
    try {
      await approvalApi.approve(selectedInvoice.id, { reason: approvalReason });
      toast.success('Approved', `${selectedInvoice.id} authorized for disbursement.`);
      setApproveOpen(false); setApprovalReason('');
      await fetchQueue();
    } catch (err: any) { toast.error('Failed', err.response?.data?.detail); }
    finally { setActionLoading(false); }
  };

  const doReject = async () => {
    if (!selectedInvoice) return;
    setActionLoading(true);
    try {
      await approvalApi.reject(selectedInvoice.id, { reason: rejectionReason });
      toast.success('Rejected', `${selectedInvoice.id} declined.`);
      setRejectOpen(false); setRejectionReason('');
      await fetchQueue();
    } catch (err: any) { toast.error('Failed', err.response?.data?.detail); }
    finally { setActionLoading(false); }
  };

  const doEscalate = async () => {
    if (!selectedInvoice) return;
    setActionLoading(true);
    try {
      await approvalApi.escalate(selectedInvoice.id, { reason: escalationReason });
      toast.info('Escalated', `${selectedInvoice.id} sent for senior audit.`);
      setEscalateOpen(false); setEscalationReason('');
      await fetchQueue();
    } catch (err: any) { toast.error('Failed', err.response?.data?.detail); }
    finally { setActionLoading(false); }
  };

  const handleSnapshot = async () => {
    if (!selectedInvoice) return;
    try { const res = await snapshotApi.get(selectedInvoice.id); setSnapshotData(res.data); setSnapshotOpen(true); }
    catch { toast.error('Snapshot Unavailable', 'No snapshot found.'); }
  };

  const isUploader = user && selectedInvoice && user.id === selectedInvoice.uploaded_by;
  const isCheckerFailed = checkerStatus && !checkerStatus.checker_passed;
  const isRoleRestricted = user?.role !== 'manager' && user?.role !== 'admin';
  let approveBlockReason: string | null = null;
  if (isRoleRestricted) approveBlockReason = 'Approval requires Manager or Admin.';
  else if (isUploader) approveBlockReason = 'Segregation of duties: you uploaded this invoice.';
  else if (isCheckerFailed) approveBlockReason = 'Independent checker flagged discrepancies.';

  const filtered = invoices.filter(inv => {
    const s = search.toLowerCase();
    const m = inv.id.toLowerCase().includes(s) || (inv.invoice_number?.toLowerCase().includes(s) ?? false) || (inv.supplier_name?.toLowerCase().includes(s) ?? false);
    if (!m) return false;
    if (statusFilter !== 'ALL' && inv.approval_status !== statusFilter) return false;
    return true;
  });

  const columns: Column<Invoice>[] = [
    { key: 'id', header: 'Invoice ID', width: '100px', render: inv => <span className="mono" style={{ fontWeight: 700 }}>{inv.id}</span> },
    { key: 'invoice_number', header: 'Invoice #', render: inv => <span className="mono">{inv.invoice_number || 'N/A'}</span> },
    { key: 'supplier_name', header: 'Supplier', render: inv => <span style={{ display: 'block', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{inv.supplier_name || '—'}</span> },
    { key: 'total_amount', header: 'Amount', align: 'right', render: inv => <span className="tabular-nums" style={{ fontWeight: 700 }}>{formatINR(inv.total_amount)}</span> },
    { key: 'uploader_name', header: 'Submitter', render: inv => <span style={{ color: 'var(--text-secondary)' }}>{inv.uploader_name || 'System'}</span> },
    { key: 'fraud_status', header: 'Risk', render: inv => <StatusBadge status={inv.fraud_status} size="sm" /> },
    { key: 'approval_status', header: 'Status', render: inv => <StatusBadge status={inv.approval_status} size="sm" /> },
    { key: 'created_at', header: 'Submitted', align: 'right', render: inv => <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }} className="tabular-nums">{formatDate(inv.created_at)}</span> },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Approval Center</h1>
          <p className="page-desc">Inspect invoice evidence and authorize disbursements with segregation-of-duties enforcement.</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
            Queue: <strong style={{ color: 'var(--text-primary)' }}>{invoices.length}</strong> awaiting
          </span>
          <button onClick={fetchQueue} className="btn btn-secondary btn-icon">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {error ? (
        <ErrorState title="Error Loading Queue" message={error} onRetry={fetchQueue} />
      ) : (
        <div className="split-grid split-grid-7-5" style={{ alignItems: 'start' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.25rem', alignItems: 'start' }}>
            {/* Queue table */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <div className="input-with-icon" style={{ flex: 1 }}>
                  <Search size={13} className="input-icon" />
                  <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                    placeholder="Filter by ID, number, supplier…" className="input" style={{ paddingLeft: '2rem' }} />
                </div>
                <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                  className="input select-input" style={{ width: 'auto' }}>
                  <option value="ALL">All</option>
                  <option value="PENDING">Pending</option>
                  <option value="ESCALATED">Escalated</option>
                </select>
              </div>
              <DataTable columns={columns} data={filtered} loading={loading}
                onRowClick={row => setSelectedInvoice(row)} selectedRowId={selectedInvoice?.id}
                emptyTitle="Queue is clear" emptyDescription="No invoices awaiting approval." />
            </div>

            {/* Detail panel */}
            <div className="card overflow-hidden" style={{ minHeight: '28rem' }}>
              {selectedInvoice ? (
                <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                  {/* Panel header */}
                  <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border)', backgroundColor: 'var(--surface-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                        <span className="mono" style={{ fontWeight: 700, fontSize: '0.9375rem', color: 'var(--text-primary)' }}>{selectedInvoice.id}</span>
                        <span className="mono" style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>{selectedInvoice.invoice_number || 'N/A'}</span>
                      </div>
                      <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>{selectedInvoice.supplier_name}</p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div className="tabular-nums" style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--text-primary)' }}>{formatINR(selectedInvoice.total_amount)}</div>
                      <button onClick={() => navigate(`/extraction?invoiceId=${selectedInvoice.id}`)}
                        style={{ fontSize: '0.75rem', color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem', marginLeft: 'auto' }}>
                        Open split-pane <ArrowRight size={12} />
                      </button>
                    </div>
                  </div>

                  {/* Scrollable body */}
                  <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                    {/* Checker status */}
                    <div style={{ padding: '0.75rem', borderRadius: '6px', border: `1px solid ${checkerStatus?.checker_passed ? 'var(--success-border)' : 'var(--danger-border)'}`, backgroundColor: checkerStatus?.checker_passed ? 'var(--success-bg)' : 'var(--danger-bg)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.375rem' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontWeight: 700, fontSize: '0.8125rem', color: checkerStatus?.checker_passed ? 'var(--success)' : 'var(--danger)' }}>
                          {checkerStatus?.checker_passed ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                          Independent Checker
                        </span>
                        <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: checkerStatus?.checker_passed ? 'var(--success)' : 'var(--danger)', textTransform: 'uppercase' }}>
                          {checkerStatus?.checker_passed ? 'VERIFIED' : 'DISCREPANCY'}
                        </span>
                      </div>
                      {checkerStatus?.discrepancies?.length > 0 ? (
                        <ul style={{ margin: 0, paddingLeft: '1rem', fontSize: '0.8125rem', color: 'var(--text-primary)' }}>
                          {checkerStatus.discrepancies.map((d: string, i: number) => <li key={i}>{d}</li>)}
                        </ul>
                      ) : (
                        <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--success)' }}>All arithmetic and supplier criteria satisfied.</p>
                      )}
                    </div>

                    {/* Approval block warning */}
                    {approveBlockReason && (
                      <div style={{ padding: '0.75rem', borderRadius: '6px', backgroundColor: 'var(--warning-bg)', border: '1px solid var(--warning-border)', display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                        <AlertTriangle size={14} style={{ color: 'var(--warning)', flexShrink: 0, marginTop: '0.125rem' }} />
                        <div>
                          <span style={{ fontWeight: 700, fontSize: '0.8125rem', color: 'var(--warning)', display: 'block' }}>Approval Restricted</span>
                          <span style={{ fontSize: '0.8125rem', color: 'var(--text-primary)' }}>{approveBlockReason}</span>
                        </div>
                      </div>
                    )}

                    {/* Status summary */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                      {[
                        { label: 'Validation', status: selectedInvoice.validation_status },
                        { label: 'Fraud Risk', status: selectedInvoice.fraud_status },
                      ].map(s => (
                        <div key={s.label} style={{ padding: '0.625rem', borderRadius: '6px', border: '1px solid var(--border)', backgroundColor: 'var(--surface-subtle)' }}>
                          <div className="section-label" style={{ marginBottom: '0.375rem' }}>{s.label}</div>
                          <StatusBadge status={s.status} size="sm" />
                        </div>
                      ))}
                    </div>

                    {/* Audit timeline */}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                        <span className="section-label">Audit Timeline</span>
                        <button onClick={handleSnapshot} style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <FileCode size={12} /> Snapshot
                        </button>
                      </div>
                      <div style={{ border: '1px solid var(--border)', borderRadius: '6px', overflow: 'hidden', maxHeight: '10rem', overflowY: 'auto' }}>
                        {auditTrail.length === 0 ? (
                          <p style={{ padding: '0.75rem', textAlign: 'center', fontSize: '0.8125rem', color: 'var(--text-muted)', margin: 0 }}>No entries logged yet.</p>
                        ) : auditTrail.map(ev => (
                          <div key={ev.id} style={{ padding: '0.625rem 0.875rem', borderBottom: '1px solid var(--border)', fontSize: '0.8125rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{ev.action}</span>
                              <span className="mono" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{formatDateTime(ev.timestamp)}</span>
                            </div>
                            <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.75rem' }}>By: {ev.user_name || 'System'}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div style={{ padding: '0.875rem 1.25rem', borderTop: '1px solid var(--border)', backgroundColor: 'var(--surface-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
                    <button onClick={() => setEscalateOpen(true)} className="btn btn-secondary" style={{ fontSize: '0.8125rem' }}>
                      Escalate
                    </button>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button onClick={() => setRejectOpen(true)} className="btn btn-danger" style={{ fontSize: '0.8125rem' }}>
                        Reject
                      </button>
                      <button onClick={() => setApproveOpen(true)} disabled={!!approveBlockReason}
                        title={approveBlockReason || 'Authorize disbursement'}
                        className="btn btn-success" style={{ fontSize: '0.8125rem' }}>
                        Approve Invoice
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ padding: '3rem', textAlign: 'center' }}>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>Select an invoice from the queue to view details.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog isOpen={approveOpen} title={`Approve ${selectedInvoice?.id}`}
        description={<span>Authorize payment of <strong>{formatINR(selectedInvoice?.total_amount)}</strong> to <strong>{selectedInvoice?.supplier_name}</strong>?</span>}
        confirmLabel="Authorize Payment" variant="primary" loading={actionLoading}
        onConfirm={doApprove} onCancel={() => setApproveOpen(false)} />

      <ConfirmDialog isOpen={rejectOpen} title={`Reject ${selectedInvoice?.id}`}
        description="Provide a mandatory rejection reason."
        confirmLabel="Confirm Rejection" variant="danger" requireReason={true}
        reasonLabel="Rejection Reason" reasonPlaceholder="State reason…"
        reasonValue={rejectionReason} onReasonChange={setRejectionReason} minReasonLength={5}
        loading={actionLoading} onConfirm={doReject} onCancel={() => setRejectOpen(false)} />

      <ConfirmDialog isOpen={escalateOpen} title={`Escalate ${selectedInvoice?.id}`}
        description="Escalate for senior finance audit." confirmLabel="Escalate" variant="warning"
        requireReason={true} reasonLabel="Escalation Details"
        reasonPlaceholder="Describe concerns…" reasonValue={escalationReason}
        onReasonChange={setEscalationReason} minReasonLength={5}
        loading={actionLoading} onConfirm={doEscalate} onCancel={() => setEscalateOpen(false)} />

      {snapshotOpen && snapshotData && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '1rem' }}>
          <div className="card" style={{ maxWidth: '36rem', width: '100%', overflow: 'hidden' }}>
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <FileCode size={15} style={{ color: 'var(--accent)' }} />
                <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Snapshot v{snapshotData.version}</span>
              </div>
              <button onClick={() => setSnapshotOpen(false)} className="btn btn-ghost btn-icon"><X size={14} /></button>
            </div>
            <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ padding: '0.625rem', borderRadius: '6px', backgroundColor: 'var(--surface-subtle)', border: '1px solid var(--border)' }}>
                <div className="section-label" style={{ marginBottom: '0.25rem' }}>SHA-256 Hash</div>
                <span className="mono" style={{ fontSize: '0.75rem', color: 'var(--accent)', wordBreak: 'break-all' }}>{snapshotData.snapshot_hash}</span>
              </div>
              <pre style={{ background: '#0f172a', color: '#e2e8f0', padding: '0.875rem', borderRadius: '6px', fontSize: '0.75rem', overflow: 'auto', maxHeight: '18rem', margin: 0 }}>
                {JSON.stringify(snapshotData.snapshot_json, null, 2)}
              </pre>
            </div>
            <div style={{ padding: '0.875rem 1.25rem', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={() => setSnapshotOpen(false)} className="btn btn-secondary">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
