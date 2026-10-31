import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { UploadCloud, FileText, RefreshCw, ArrowRight, CheckCircle2 } from 'lucide-react';
import { dashboardApi } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { StatusBadge } from '../../components/StatusBadge';
import { useToast } from '../../components/Toast';
import { formatINR, formatDate } from '../../utils/formatters';

export const EmployeeDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const res = await dashboardApi.getEmployee();
      setData(res.data);
    } catch (err: any) {
      showToast('error', err.response?.data?.detail || 'Failed to load workspace.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDashboard(); }, []);

  if (loading) return (
    <div className="space-y-6">
      {[1,2,3].map(i => <div key={i} className="h-24 rounded-lg animate-pulse" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }} />)}
    </div>
  );

  const kpis = data?.kpis || {};
  const recent = data?.recent_invoices || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="page-header">
        <div>
          <p className="section-label" style={{ marginBottom: '0.375rem' }}>Employee Workspace · {user?.department || 'General'}</p>
          <h1 className="page-title">Welcome, {user?.name?.split(' ')[0] || 'there'}</h1>
          <p className="page-desc">Submit vendor invoices, monitor extraction stages, and track disbursement status.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <button onClick={fetchDashboard} className="btn btn-secondary btn-icon"><RefreshCw size={14} /></button>
          <button onClick={() => navigate('/upload')} className="btn btn-primary">
            <UploadCloud size={14} /> Upload Invoice
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="kpi-grid kpi-grid-5">
        {[
          { label: 'Submitted', value: kpis.total_submitted || 0, sub: 'Your invoices' },
          { label: 'In Processing', value: kpis.processing || 0, sub: 'OCR & extraction' },
          { label: 'Pending Review', value: kpis.pending_approval || 0, sub: 'With manager' },
          { label: 'Approved', value: kpis.approved || 0, sub: 'Disbursal authorized', valueColor: 'var(--success)' },
          { label: 'Total Spend', value: formatINR(kpis.total_spend || 0), sub: 'Approved volume' },
        ].map((k, i) => (
          <div key={i} className="kpi-card">
            <p className="kpi-label">{k.label}</p>
            <p className="kpi-value" style={k.valueColor ? { color: k.valueColor } : {}}>{k.value}</p>
            <p className="kpi-sub">{k.sub}</p>
          </div>
        ))}
      </div>

      {/* Pipeline stages */}
      <div className="card">
        <div className="card-header">
          <h2 style={{ fontSize: '0.9375rem', fontWeight: 600, margin: 0 }}>Processing Pipeline</h2>
          <p className="page-desc" style={{ marginTop: '0.25rem' }}>Every invoice passes through these automated verification layers.</p>
        </div>
        <div className="card-body">
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))', gap:'0.75rem' }}>
            {[
              { step: '1', label: 'Document Upload',    sub: 'PDF, PNG, JPG' },
              { step: '2', label: 'OCR Extraction',     sub: 'PyMuPDF + CV' },
              { step: '3', label: 'GST Verification',   sub: 'Deterministic math' },
              { step: '4', label: 'Fraud & PO Match',   sub: 'Risk scoring' },
              { step: '5', label: 'Manager Approval',   sub: 'Dual-control' },
            ].map(s => (
              <div key={s.step} style={{ textAlign: 'center', padding: '0.875rem 0.5rem', borderRadius: '6px', border: '1px solid var(--border)', backgroundColor: 'var(--surface-subtle)' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '50%', margin: '0 auto 0.5rem', backgroundColor: 'var(--accent-light)', color: 'var(--accent)', fontWeight: 700, fontSize: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{s.step}</div>
                <p style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 0.25rem' }}>{s.label}</p>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>{s.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent invoices */}
      <div className="card overflow-hidden">
        <div className="card-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ fontSize: '0.9375rem', fontWeight: 600, margin: 0 }}>Recent Submissions</h2>
          </div>
          <button onClick={() => navigate('/invoices')} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer' }}>
            View all <ArrowRight size={13} />
          </button>
        </div>
        {recent.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center' }}>
            <FileText size={36} style={{ color: 'var(--border-strong)', margin: '0 auto 0.75rem' }} />
            <p style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>No invoices yet</p>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>Upload your first invoice to get started.</p>
            <button onClick={() => navigate('/upload')} className="btn btn-primary">
              <UploadCloud size={14} /> Upload Invoice
            </button>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr>
                <th>Invoice ID</th><th>Supplier</th><th>Date</th>
                <th style={{ textAlign: 'right' }}>Amount</th>
                <th>Validation</th><th>Status</th>
                <th style={{ textAlign: 'right' }}>Action</th>
              </tr></thead>
              <tbody>
                {recent.map((inv: any) => (
                  <tr key={inv.id}>
                    <td><span className="mono" style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{inv.id}</span></td>
                    <td style={{ color: 'var(--text-primary)' }}>{inv.supplier_name}</td>
                    <td style={{ color: 'var(--text-secondary)' }}>{formatDate(inv.invoice_date) || '—'}</td>
                    <td style={{ textAlign: 'right', fontWeight: 700 }} className="tabular-nums">{formatINR(inv.total_amount)}</td>
                    <td><StatusBadge status={inv.validation_status} size="sm" /></td>
                    <td><StatusBadge status={inv.approval_status} size="sm" /></td>
                    <td style={{ textAlign: 'right' }}>
                      <button onClick={() => navigate(`/extraction?invoiceId=${inv.id}`)} className="btn btn-secondary" style={{ fontSize: '0.75rem' }}>View</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
