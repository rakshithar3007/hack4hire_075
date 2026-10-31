import React, { useState, useEffect } from 'react';
import { Filter, RefreshCw, FileSpreadsheet, FileText } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { reportsApi, dashboardApi, supplierApi } from '../services/api';
import { formatINR, formatDate } from '../utils/formatters';
import { StatusBadge } from '../components/StatusBadge';
import { useToast } from '../components/Toast';

const PIE_COLORS = ['#16845B', '#C58A25', '#D14343', '#3157C8'];

export const ReportsPage: React.FC = () => {
  const { showToast } = useToast();
  const [reportData, setReportData] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedRisk, setSelectedRisk] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [repRes, analRes, supRes] = await Promise.all([
        reportsApi.getInvoices(), dashboardApi.getAnalytics(), supplierApi.getAll(),
      ]);
      setReportData(repRes.data.data || []);
      setAnalytics(analRes.data);
      setSuppliers(supRes.data || []);
    } catch { showToast('error', 'Failed to load analytics.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const applyFilter = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (selectedSupplier) params.supplier_id = selectedSupplier;
      if (selectedStatus) params.approval_status = selectedStatus;
      if (selectedRisk) params.fraud_status = selectedRisk;
      const res = await reportsApi.getInvoices(params);
      setReportData(res.data.data || []);
      showToast('info', `${res.data.data?.length || 0} records filtered.`);
    } catch { showToast('error', 'Filter failed.'); }
    finally { setLoading(false); }
  };

  const pieData = [
    { name: 'Approved',  value: analytics?.approval_distribution?.APPROVED  || 0 },
    { name: 'Pending',   value: analytics?.approval_distribution?.PENDING    || 0 },
    { name: 'Rejected',  value: analytics?.approval_distribution?.REJECTED   || 0 },
    { name: 'Escalated', value: analytics?.approval_distribution?.ESCALATED  || 0 },
  ].filter(d => d.value > 0);

  const spendData = analytics?.supplier_spend || [];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Analytics & Reports</h1>
          <p className="page-desc">Reconciled spend reports, supplier disbursement totals, and authorization compliance metrics.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <a href={reportsApi.exportCsvUrl} target="_blank" rel="noreferrer" download className="btn btn-secondary">
            <FileSpreadsheet size={14} /> Export CSV
          </a>
          <a href={reportsApi.exportPdfUrl} target="_blank" rel="noreferrer" download className="btn btn-primary">
            <FileText size={14} /> Executive PDF
          </a>
          <button onClick={fetchData} className="btn btn-secondary btn-icon" title="Refresh">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Filter bar */}
      <div className="filter-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
          <Filter size={13} style={{ color: 'var(--text-muted)' }} />
          <span className="section-label">Filters:</span>
        </div>
        <select value={selectedSupplier} onChange={e => setSelectedSupplier(e.target.value)}
          className="input select-input" style={{ width: 'auto' }}>
          <option value="">All Suppliers</option>
          {suppliers.map(s => <option key={s.id} value={s.id}>{s.supplier_name}</option>)}
        </select>
        <select value={selectedStatus} onChange={e => setSelectedStatus(e.target.value)}
          className="input select-input" style={{ width: 'auto' }}>
          <option value="">All Statuses</option>
          <option value="APPROVED">Approved</option>
          <option value="PENDING">Pending</option>
          <option value="REJECTED">Rejected</option>
          <option value="ESCALATED">Escalated</option>
        </select>
        <select value={selectedRisk} onChange={e => setSelectedRisk(e.target.value)}
          className="input select-input" style={{ width: 'auto' }}>
          <option value="">All Risk Levels</option>
          <option value="LOW">Low</option>
          <option value="MEDIUM">Medium</option>
          <option value="HIGH">High</option>
        </select>
        <button onClick={applyFilter} className="btn btn-primary" style={{ fontSize: '0.8125rem' }}>Apply</button>
        {(selectedSupplier || selectedStatus || selectedRisk) && (
          <button onClick={() => { setSelectedSupplier(''); setSelectedStatus(''); setSelectedRisk(''); fetchData(); }}
            style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}>
            Clear
          </button>
        )}
      </div>

      {/* Charts */}
      <div className="split-grid split-grid-2">
        {/* Spend bar chart */}
        <div className="card">
          <div className="card-header">
            <h2 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 600 }}>Vendor Spend Distribution</h2>
            <p className="page-desc" style={{ marginTop: '0.25rem' }}>Disbursements across registered suppliers</p>
          </div>
          <div className="card-body">
            <div style={{ height: '240px' }}>
              {spendData.length === 0 ? (
                <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>No spend data available.</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={spendData} layout="vertical" margin={{ left: 8, right: 24, top: 4, bottom: 4 }}>
                    <XAxis type="number" stroke="var(--text-muted)" fontSize={11} tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} />
                    <YAxis dataKey="supplier_name" type="category" stroke="var(--text-muted)" fontSize={11} width={120} />
                    <Tooltip formatter={(val: any) => [formatINR(Number(val)), 'Total Spend']}
                      contentStyle={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '6px', fontSize: '12px' }} />
                    <Bar dataKey="total_spend" fill="var(--accent)" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>

        {/* Approval pie chart */}
        <div className="card">
          <div className="card-header">
            <h2 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 600 }}>Approval Distribution</h2>
            <p className="page-desc" style={{ marginTop: '0.25rem' }}>Breakdown of executive workflow decisions</p>
          </div>
          <div className="card-body">
            <div style={{ height: '200px', marginBottom: '1rem' }}>
              {pieData.length === 0 ? (
                <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>No decision data available.</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                      {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '6px', fontSize: '12px' }} />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '12px', color: 'var(--text-secondary)' }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem' }}>
              {[
                { l: 'Approved',  v: analytics?.approval_distribution?.APPROVED  || 0 },
                { l: 'Pending',   v: analytics?.approval_distribution?.PENDING    || 0 },
                { l: 'Rejected',  v: analytics?.approval_distribution?.REJECTED   || 0 },
                { l: 'Escalated', v: analytics?.approval_distribution?.ESCALATED  || 0 },
              ].map((d, i) => (
                <div key={i} style={{ padding: '0.5rem', borderRadius: '6px', backgroundColor: 'var(--surface-subtle)', border: '1px solid var(--border)', textAlign: 'center' }}>
                  <div className="tabular-nums" style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '1rem' }}>{d.v}</div>
                  <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', marginTop: '0.125rem' }}>{d.l}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Data table */}
      <div className="card overflow-hidden">
        <div className="card-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 600 }}>Compliance Ledger</h2>
          <span className="label-chip">{reportData.length} records</span>
        </div>
        <div className="table-wrap">
          {loading ? (
            <div style={{ padding: '3rem', textAlign: 'center' }}>
              <RefreshCw size={18} className="animate-spin" style={{ color: 'var(--accent)', margin: '0 auto 0.5rem' }} />
              <p style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>Loading data…</p>
            </div>
          ) : reportData.length === 0 ? (
            <p style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8125rem' }}>No records for the current filters.</p>
          ) : (
            <table className="data-table">
              <thead><tr>
                <th>Invoice ID</th><th>Invoice #</th><th>Supplier</th><th>Date</th>
                <th style={{ textAlign: 'right' }}>Amount</th>
                <th style={{ textAlign: 'center' }}>Validation</th>
                <th style={{ textAlign: 'center' }}>Risk</th>
                <th style={{ textAlign: 'center' }}>Approval</th>
              </tr></thead>
              <tbody>
                {reportData.map((r, i) => (
                  <tr key={i}>
                    <td><span className="mono" style={{ fontWeight: 700, color: 'var(--accent)' }}>{r.id}</span></td>
                    <td><span className="mono">{r.invoice_number || '—'}</span></td>
                    <td style={{ fontWeight: 500 }}>{r.supplier}</td>
                    <td style={{ color: 'var(--text-secondary)' }} className="tabular-nums">{r.date ? formatDate(r.date) : '—'}</td>
                    <td style={{ textAlign: 'right', fontWeight: 700 }} className="tabular-nums">{r.amount != null ? formatINR(r.amount) : '—'}</td>
                    <td style={{ textAlign: 'center' }}><StatusBadge status={r.validation} size="sm" /></td>
                    <td style={{ textAlign: 'center' }}><StatusBadge status={r.fraud_risk} size="sm" /></td>
                    <td style={{ textAlign: 'center' }}><StatusBadge status={r.approval} size="sm" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};
