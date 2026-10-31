import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserCheck, CheckCircle2, XCircle, ShieldAlert, ArrowRight, TrendingUp, FileText, RefreshCw } from 'lucide-react';
import { dashboardApi, approvalApi } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { StatusBadge } from '../../components/StatusBadge';
import { useToast } from '../../components/Toast';
import { formatINR, formatDate } from '../../utils/formatters';

export const ManagerDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionModal, setActionModal] = useState<any>(null);
  const [actionReason, setActionReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const res = await dashboardApi.getManager();
      setData(res.data);
    } catch (err: any) {
      showToast('error', err.response?.data?.detail || 'Failed to load manager dashboard.');
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchDashboard(); }, []);

  const handleDecision = async () => {
    if (!actionModal) return;
    if (actionModal.type === 'reject' && actionReason.trim().length < 5) {
      showToast('error', 'Rejection reason must be at least 5 characters.');
      return;
    }
    setSubmitting(true);
    try {
      if (actionModal.type === 'approve') {
        await approvalApi.approve(actionModal.invoiceId, { reason: actionReason || 'Verified.' });
        showToast('success', `Invoice ${actionModal.invoiceId} approved.`);
      } else {
        await approvalApi.reject(actionModal.invoiceId, { reason: actionReason });
        showToast('warning', `Invoice ${actionModal.invoiceId} rejected.`);
      }
      setActionModal(null);
      setActionReason('');
      fetchDashboard();
    } catch (err: any) {
      showToast('error', err.response?.data?.detail || 'Action failed.');
    } finally { setSubmitting(false); }
  };

  if (loading) return (
    <div className="space-y-6">
      {[1,2,3].map(i => <div key={i} className="h-24 rounded-lg animate-pulse" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }} />)}
    </div>
  );

  const kpis = data?.kpis || {};
  const pending = data?.pending_queue || [];
  const mgrLimit = data?.manager_info?.approval_limit ?? 100000;

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <p className="section-label" style={{ marginBottom: '0.375rem' }}>Manager Console · {data?.manager_info?.department || 'Operations'}</p>
          <h1 className="page-title">{user?.name}</h1>
          <p className="page-desc">Review team invoices and authorize disbursements within your approval ceiling.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <div style={{ padding: '0.5rem 1rem', borderRadius: '6px', border: '1px solid var(--success-border)', backgroundColor: 'var(--success-bg)', textAlign: 'right' }}>
            <div className="section-label" style={{ color: 'var(--success)' }}>Approval Ceiling</div>
            <div style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--success)' }}>{formatINR(mgrLimit)}</div>
          </div>
          <button onClick={fetchDashboard} className="btn btn-secondary btn-icon"><RefreshCw size={14} /></button>
          <button onClick={() => navigate('/approvals')} className="btn btn-primary">
            <UserCheck size={14} /> Approval Center
          </button>
        </div>
      </div>

      <div className="kpi-grid kpi-grid-5">
        {[
          { label: 'Assigned Scope', value: kpis.total_assigned || 0, sub: 'Department invoices' },
          { label: 'Pending Review', value: kpis.pending_approvals || 0, sub: `${kpis.within_limit || 0} within · ${kpis.exceeding_limit || 0} escalated`, valueColor: 'var(--warning)' },
          { label: 'High Risk', value: kpis.high_risk_flags || 0, sub: 'Require written override', valueColor: 'var(--danger)' },
          { label: 'Approved', value: kpis.approved || 0, sub: 'Authorized', valueColor: 'var(--success)' },
          { label: 'Team Spend', value: formatINR(kpis.team_spend || 0), sub: 'Disbursed volume' },
        ].map((k, i) => (
          <div key={i} className="kpi-card">
            <p className="kpi-label">{k.label}</p>
            <p className="kpi-value" style={k.valueColor ? { color: k.valueColor } : {}}>{k.value}</p>
            <p className="kpi-sub">{k.sub}</p>
          </div>
        ))}
      </div>

      <div className="card overflow-hidden">
        <div className="card-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ fontSize: '0.9375rem', fontWeight: 600, margin: 0 }}>Awaiting Authorization</h2>
            <p className="page-desc" style={{ marginTop: '0.25rem' }}>Invoices pending your approval decision.</p>
          </div>
          <button onClick={() => navigate('/approvals')} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer' }}>
            Full center <ArrowRight size={13} />
          </button>
        </div>
        {pending.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center' }}>
            <CheckCircle2 size={36} style={{ color: 'var(--success)', margin: '0 auto 0.75rem' }} />
            <p style={{ fontWeight: 600, color: 'var(--text-primary)' }}>All caught up</p>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>No pending invoices at this time.</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr>
                <th>Invoice ID</th><th>Submitter</th><th>Supplier</th>
                <th style={{ textAlign: 'right' }}>Amount</th>
                <th>Limit Check</th><th>Validation</th><th>Risk</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr></thead>
              <tbody>
                {pending.map((inv: any) => (
                  <tr key={inv.id}>
                    <td><span className="mono" style={{ fontWeight: 700 }}>{inv.id}</span></td>
                    <td style={{ color: 'var(--text-secondary)' }}>{inv.uploader_name}</td>
                    <td style={{ color: 'var(--text-primary)' }}>{inv.supplier_name}</td>
                    <td style={{ textAlign: 'right', fontWeight: 700 }} className="tabular-nums">{formatINR(inv.total_amount)}</td>
                    <td>
                      <span style={{ fontSize: '0.75rem', fontWeight: 600, padding: '0.1875rem 0.5rem', borderRadius: '4px', backgroundColor: inv.within_limit ? 'var(--success-bg)' : 'var(--warning-bg)', color: inv.within_limit ? 'var(--success)' : 'var(--warning)' }}>
                        {inv.within_limit ? 'Within limit' : 'Exceeds'}
                      </span>
                    </td>
                    <td><StatusBadge status={inv.validation_status} size="sm" /></td>
                    <td><StatusBadge status={inv.fraud_status} size="sm" /></td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '0.375rem' }}>
                        <button onClick={() => navigate(`/verification?invoiceId=${inv.id}`)} className="btn btn-secondary" style={{ fontSize: '0.75rem' }}>Evidence</button>
                        <button onClick={() => setActionModal({ type: 'approve', invoiceId: inv.id, invoiceAmount: inv.total_amount, supplier: inv.supplier_name })}
                          disabled={!inv.within_limit} className="btn btn-success" style={{ fontSize: '0.75rem' }}>Approve</button>
                        <button onClick={() => setActionModal({ type: 'reject', invoiceId: inv.id, invoiceAmount: inv.total_amount, supplier: inv.supplier_name })}
                          className="btn btn-danger" style={{ fontSize: '0.75rem' }}>Reject</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Decision modal */}
      {actionModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '1rem' }}>
          <div className="card" style={{ maxWidth: '28rem', width: '100%', padding: '1.5rem' }}>
            <h3 style={{ margin: '0 0 0.25rem', fontSize: '1rem', fontWeight: 700 }}>
              {actionModal.type === 'approve' ? 'Authorize Payment' : 'Reject Invoice'}
            </h3>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
              {actionModal.invoiceId} · {actionModal.supplier} · {formatINR(actionModal.invoiceAmount)}
            </p>
            <label style={{ fontSize: '0.8125rem', fontWeight: 600, display: 'block', marginBottom: '0.5rem' }}>
              {actionModal.type === 'approve' ? 'Notes (optional)' : 'Rejection reason (required)'}
            </label>
            <textarea value={actionReason} onChange={e => setActionReason(e.target.value)}
              placeholder={actionModal.type === 'approve' ? 'Verified against vendor master.' : 'State reason for rejection...'}
              className="input" style={{ height: '6rem', resize: 'vertical', marginBottom: '1rem' }} />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <button onClick={() => { setActionModal(null); setActionReason(''); }} className="btn btn-secondary">Cancel</button>
              <button onClick={handleDecision} disabled={submitting}
                className={actionModal.type === 'approve' ? 'btn btn-success' : 'btn btn-danger'}>
                {submitting ? 'Processing…' : actionModal.type === 'approve' ? 'Confirm Approval' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
