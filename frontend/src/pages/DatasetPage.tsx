import React, { useState, useEffect, useCallback } from 'react';
import {
  Search, RefreshCw, Download, Filter,
  TrendingUp, ShieldAlert, CheckCircle2, AlertTriangle, BarChart3
} from 'lucide-react';
import {
  PieChart, Pie, Cell, Tooltip, Legend,
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer
} from 'recharts';
import { datasetApi, reportsApi } from '../services/api';
import { StatusBadge } from '../components/StatusBadge';
import { formatINR } from '../utils/formatters';

// ── Colour map for risk scores ──────────────────────────────────────────────
const riskColor = (score: number | null) => {
  if (score === null || score === undefined) return 'var(--text-muted)';
  if (score < 30) return 'var(--success)';
  if (score < 70) return 'var(--warning)';
  return 'var(--danger)';
};
const riskBg = (score: number | null) => {
  if (score === null || score === undefined) return 'var(--surface-subtle)';
  if (score < 30) return 'var(--success-bg)';
  if (score < 70) return 'var(--warning-bg)';
  return 'var(--danger-bg)';
};

const PIE_COLORS = ['#16845B', '#C58A25', '#D14343', '#98A2B3'];
const BAR_COLORS = { PASSED: '#16845B', WARNING: '#C58A25', FAILED: '#D14343' };

// ── Tiny score bar ──────────────────────────────────────────────────────────
const RiskBar: React.FC<{ score: number | null }> = ({ score }) => {
  if (score === null || score === undefined) return <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>—</span>;
  const pct = Math.min(100, Math.max(0, score));
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0 }}>
      <div style={{ flex: 1, height: 6, borderRadius: 3, backgroundColor: 'var(--border)', overflow: 'hidden', minWidth: 40 }}>
        <div style={{ width: `${pct}%`, height: '100%', borderRadius: 3, backgroundColor: riskColor(score), transition: 'width 0.4s ease' }} />
      </div>
      <span className="tabular-nums mono" style={{ fontSize: '0.75rem', color: riskColor(score), fontWeight: 700, flexShrink: 0 }}>
        {score.toFixed(0)}
      </span>
    </div>
  );
};

// ── Main page ────────────────────────────────────────────────────────────────
export const DatasetPage: React.FC = () => {
  const [summary, setSummary] = useState<any>(null);
  const [rows,    setRows]    = useState<any[]>([]);
  const [total,   setTotal]   = useState(0);
  const [pages,   setPages]   = useState(1);
  const [page,    setPage]    = useState(1);
  const PAGE_SIZE = 15;

  const [search,     setSearch]     = useState('');
  const [fraudF,     setFraudF]     = useState('');
  const [validF,     setValidF]     = useState('');
  const [approvalF,  setApprovalF]  = useState('');

  const [loadingData,    setLoadingData]    = useState(true);
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [error,          setError]          = useState<string | null>(null);

  // ── fetch summary ──────────────────────────────────────────────────────────
  useEffect(() => {
    setLoadingSummary(true);
    datasetApi.getSummary()
      .then(r => { setSummary(r.data); })
      .catch(() => setError('Could not load dataset summary. Check the backend connection.'))
      .finally(() => setLoadingSummary(false));
  }, []);

  // ── fetch rows ─────────────────────────────────────────────────────────────
  const fetchRows = useCallback(() => {
    setLoadingData(true);
    datasetApi.getAll({
      search:            search     || undefined,
      fraud_status:      fraudF     || undefined,
      validation_status: validF     || undefined,
      approval_status:   approvalF  || undefined,
      page,
      page_size: PAGE_SIZE,
    })
      .then(r => {
        setRows(r.data.data || []);
        setTotal(r.data.total || 0);
        setPages(r.data.pages || 1);
        setError(null);
      })
      .catch(() => setError('Could not load dataset records. The backend may be waking up — try again in 30 s.'))
      .finally(() => setLoadingData(false));
  }, [search, fraudF, validF, approvalF, page]);

  useEffect(() => { fetchRows(); }, [fetchRows]);

  // reset to page 1 when filters change
  useEffect(() => { setPage(1); }, [search, fraudF, validF, approvalF]);

  // ── CSV export (uses existing reports endpoint) ────────────────────────────
  const handleExport = () => {
    const url = reportsApi.exportCsvUrl;
    const a = document.createElement('a');
    a.href = url;
    a.download = `invoiceguard_dataset_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  // ── pie / bar chart data ───────────────────────────────────────────────────
  const fraudPie = summary ? [
    { name: 'Low Risk',    value: summary.fraud_distribution?.LOW    || 0 },
    { name: 'Medium Risk', value: summary.fraud_distribution?.MEDIUM || 0 },
    { name: 'High Risk',   value: summary.fraud_distribution?.HIGH   || 0 },
    { name: 'Pending',     value: summary.fraud_distribution?.PENDING|| 0 },
  ].filter(d => d.value > 0) : [];

  const validBar = summary ? [
    { label: 'Passed',  value: summary.validation?.passed  || 0, fill: BAR_COLORS.PASSED  },
    { label: 'Warning', value: summary.validation?.warning || 0, fill: BAR_COLORS.WARNING },
    { label: 'Failed',  value: summary.validation?.failed  || 0, fill: BAR_COLORS.FAILED  },
  ] : [];

  // ── KPI card ───────────────────────────────────────────────────────────────
  const KpiCard: React.FC<{ label: string; value: React.ReactNode; sub?: string; color?: string }> =
    ({ label, value, sub, color }) => (
      <div className="kpi-card">
        <p className="kpi-label">{label}</p>
        <p className="kpi-value" style={color ? { color } : {}}>{value}</p>
        {sub && <p className="kpi-sub">{sub}</p>}
      </div>
    );

  return (
    <div className="space-y-5">
      {/* ── Page header ────────────────────────────────────────────────── */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Invoice Fraud Detection Dataset</h1>
          <p className="page-desc">
            Live dataset from the InvoiceGuard AI processing pipeline — {total} records with OCR extraction, deterministic GST validation, and multivariate fraud scoring.
          </p>
        </div>
        <div className="page-header-actions">
          <button onClick={() => fetchRows()} className="btn btn-secondary btn-icon" title="Refresh data">
            <RefreshCw size={14} className={loadingData ? 'animate-spin' : ''} />
          </button>
          <button onClick={handleExport} className="btn btn-secondary">
            <Download size={14} /> Export CSV
          </button>
        </div>
      </div>

      {/* ── Error banner ───────────────────────────────────────────────── */}
      {error && (
        <div style={{ padding: '0.875rem 1rem', borderRadius: 8, backgroundColor: 'var(--warning-bg)', border: '1px solid var(--warning-border)', display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
          <AlertTriangle size={15} style={{ color: 'var(--warning)', flexShrink: 0 }} />
          <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--text-primary)' }}>
            <strong>Connection issue:</strong> {error}
          </p>
          <button onClick={() => { fetchRows(); setError(null); }} className="btn btn-secondary" style={{ marginLeft: 'auto', fontSize: '0.75rem' }}>Retry</button>
        </div>
      )}

      {/* ── KPI summary ────────────────────────────────────────────────── */}
      <div className="kpi-grid kpi-grid-4">
        {loadingSummary ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="kpi-card" style={{ height: 88, animation: 'pulse 1.5s ease-in-out infinite', backgroundColor: 'var(--border)' }} />
          ))
        ) : summary ? (
          <>
            <KpiCard label="Total Invoices"       value={summary.total_invoices}                        sub="In processing pipeline" />
            <KpiCard label="Total Invoice Value"  value={formatINR(summary.total_amount)}               sub={`Avg risk: ${summary.avg_risk_score}/100`} />
            <KpiCard label="Fraud Rate"           value={`${summary.fraud_rate}%`}                      sub={`${summary.fraudulent_count} flagged (Med + High)`} color="var(--danger)" />
            <KpiCard label="Legitimacy Rate"      value={`${(100 - summary.fraud_rate).toFixed(1)}%`}   sub={`${summary.legitimate} low-risk invoices`} color="var(--success)" />
          </>
        ) : null}
      </div>

      {/* ── Secondary KPI row ──────────────────────────────────────────── */}
      {summary && (
        <div className="kpi-grid kpi-grid-4">
          <KpiCard label="Validation Passed"  value={summary.validation?.passed}   sub="All 8 rules passed"         color="var(--success)" />
          <KpiCard label="Validation Warning" value={summary.validation?.warning}  sub="Partial compliance issues"  color="var(--warning)" />
          <KpiCard label="Validation Failed"  value={summary.validation?.failed}   sub="Rule violations detected"   color="var(--danger)" />
          <KpiCard label="Approvals Pending"  value={summary.approval?.pending}    sub={`${summary.approval?.approved} approved`} />
        </div>
      )}

      {/* ── Charts ─────────────────────────────────────────────────────── */}
      {summary && (
        <div className="split-grid split-grid-2">
          {/* Fraud distribution donut */}
          <div className="card">
            <div className="card-header">
              <h2 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 600 }}>Fraud Risk Distribution</h2>
              <p className="page-desc" style={{ marginTop: '0.25rem' }}>Breakdown by risk category</p>
            </div>
            <div className="card-body" style={{ height: 240, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              {fraudPie.length === 0 ? (
                <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8125rem' }}>No data available.</p>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={fraudPie} cx="50%" cy="50%" innerRadius={52} outerRadius={80} paddingAngle={3} dataKey="value">
                      {fraudPie.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, fontSize: 12 }} />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, color: 'var(--text-secondary)' }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Validation bar chart */}
          <div className="card">
            <div className="card-header">
              <h2 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 600 }}>Validation Results</h2>
              <p className="page-desc" style={{ marginTop: '0.25rem' }}>8-rule deterministic engine outcomes</p>
            </div>
            <div className="card-body" style={{ height: 240, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              {validBar.every(d => d.value === 0) ? (
                <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8125rem' }}>No data available.</p>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={validBar} margin={{ top: 4, right: 16, bottom: 4, left: 0 }}>
                    <XAxis dataKey="label" tick={{ fontSize: 12, fill: 'var(--text-secondary)' }} />
                    <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                    <Tooltip contentStyle={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, fontSize: 12 }} />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                      {validBar.map((d, i) => <Cell key={i} fill={d.fill} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Filter bar ─────────────────────────────────────────────────── */}
      <div className="filter-bar">
        <div className="input-with-icon" style={{ flex: 1, minWidth: '14rem', maxWidth: '26rem' }}>
          <Search size={13} className="input-icon" />
          <input
            type="text"
            placeholder="Search Invoice ID or number…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input"
            style={{ paddingLeft: '2rem' }}
          />
        </div>

        {[
          { label: 'Fraud Risk',  value: fraudF,    setter: setFraudF,    options: ['LOW', 'MEDIUM', 'HIGH'] },
          { label: 'Validation',  value: validF,    setter: setValidF,    options: ['PASSED', 'WARNING', 'FAILED'] },
          { label: 'Approval',    value: approvalF, setter: setApprovalF, options: ['PENDING', 'APPROVED', 'REJECTED', 'ESCALATED'] },
        ].map(f => (
          <div key={f.label} style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
            <label className="section-label">{f.label}:</label>
            <select value={f.value} onChange={e => f.setter(e.target.value)}
              className="input select-input" style={{ width: 'auto' }}>
              <option value="">All</option>
              {f.options.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
        ))}

        {(search || fraudF || validF || approvalF) && (
          <button
            onClick={() => { setSearch(''); setFraudF(''); setValidF(''); setApprovalF(''); }}
            style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer' }}>
            Clear filters
          </button>
        )}

        <span style={{ marginLeft: 'auto', fontSize: '0.8125rem', color: 'var(--text-muted)', flexShrink: 0 }}>
          {total} record{total !== 1 ? 's' : ''}
        </span>
      </div>

      {/* ── Dataset table ───────────────────────────────────────────────── */}
      <div className="card overflow-hidden">
        <div className="table-wrap">
          {loadingData ? (
            <div style={{ padding: '3.5rem', textAlign: 'center' }}>
              <RefreshCw size={20} className="animate-spin" style={{ color: 'var(--accent)', margin: '0 auto 0.625rem', display: 'block' }} />
              <p style={{ color: 'var(--text-muted)', fontSize: '0.8125rem', margin: 0 }}>Loading dataset records…</p>
            </div>
          ) : rows.length === 0 ? (
            <div style={{ padding: '3.5rem', textAlign: 'center' }}>
              <BarChart3 size={36} style={{ color: 'var(--border-strong)', margin: '0 auto 0.75rem', display: 'block' }} />
              <p style={{ fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 0.375rem' }}>No records found</p>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', margin: 0 }}>
                {error ? 'Backend connection error — check above.' : 'Adjust filters or reset search.'}
              </p>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Invoice ID</th>
                  <th>Invoice #</th>
                  <th>Supplier</th>
                  <th>Date</th>
                  <th style={{ textAlign: 'right' }}>Amount</th>
                  <th style={{ textAlign: 'center' }}>Fraud Label</th>
                  <th style={{ minWidth: 120 }}>Risk Score</th>
                  <th style={{ textAlign: 'center' }}>Validation</th>
                  <th style={{ textAlign: 'center' }}>Approval</th>
                  <th style={{ textAlign: 'right' }}>Confidence</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr key={row.invoice_id ?? i}>
                    <td>
                      <span className="mono" style={{ fontWeight: 700, color: 'var(--accent)' }}>{row.invoice_id}</span>
                    </td>
                    <td>
                      <span className="mono" style={{ color: 'var(--text-secondary)' }}>{row.invoice_number}</span>
                    </td>
                    <td style={{ maxWidth: 160 }}>
                      <span className="truncate-text" style={{ display: 'block', fontWeight: 500, color: 'var(--text-primary)' }}
                        title={`${row.supplier_name} | ${row.supplier_gstin}`}>
                        {row.supplier_name}
                      </span>
                      <span className="mono" style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>{row.supplier_gstin}</span>
                    </td>
                    <td className="tabular-nums" style={{ color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                      {row.invoice_date || '—'}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 700, whiteSpace: 'nowrap' }} className="tabular-nums">
                      {formatINR(row.total_amount)}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <StatusBadge status={row.fraud_label} size="sm" />
                    </td>
                    <td>
                      <RiskBar score={row.risk_score} />
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <StatusBadge status={row.validation_status} size="sm" />
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <StatusBadge status={row.approval_status} size="sm" />
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      {row.extraction_confidence != null ? (
                        <span className="mono tabular-nums" style={{ fontSize: '0.75rem', fontWeight: 700,
                          color: row.extraction_confidence >= 90 ? 'var(--success)' : row.extraction_confidence >= 70 ? 'var(--warning)' : 'var(--danger)' }}>
                          {row.extraction_confidence.toFixed(1)}%
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {pages > 1 && (
          <div style={{ padding: '0.625rem 1rem', borderTop: '1px solid var(--border)', backgroundColor: 'var(--surface-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
              Showing <strong style={{ color: 'var(--text-primary)' }}>{(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)}</strong> of <strong style={{ color: 'var(--text-primary)' }}>{total}</strong>
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="btn btn-secondary" style={{ fontSize: '0.75rem', padding: '0.3125rem 0.625rem' }}>← Prev</button>
              <span style={{ fontSize: '0.8125rem', fontWeight: 600, padding: '0 0.5rem' }} className="tabular-nums">{page} / {pages}</span>
              <button disabled={page >= pages} onClick={() => setPage(p => p + 1)} className="btn btn-secondary" style={{ fontSize: '0.75rem', padding: '0.3125rem 0.625rem' }}>Next →</button>
            </div>
          </div>
        )}
      </div>

      {/* ── Fraud detail cards ──────────────────────────────────────────── */}
      {rows.some(r => r.fraud_explanation) && (
        <div className="card overflow-hidden">
          <div className="card-header">
            <h2 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 600 }}>Fraud Detection Narratives</h2>
            <p className="page-desc" style={{ marginTop: '0.25rem' }}>Explainable AI audit reasoning for each invoice</p>
          </div>
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {rows.filter(r => r.fraud_explanation && r.fraud_label !== 'LOW').map(row => (
              <div key={row.invoice_id} style={{ padding: '0.875rem', borderRadius: 6, border: `1px solid ${row.fraud_label === 'HIGH' ? 'var(--danger-border)' : 'var(--warning-border)'}`, backgroundColor: row.fraud_label === 'HIGH' ? 'var(--danger-bg)' : 'var(--warning-bg)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                  <span className="mono" style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-primary)' }}>{row.invoice_id}</span>
                  <StatusBadge status={row.fraud_label} size="sm" />
                  {row.risk_score != null && (
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: riskColor(row.risk_score), backgroundColor: riskBg(row.risk_score), padding: '0.125rem 0.5rem', borderRadius: 4 }}>
                      Risk Score: {row.risk_score.toFixed(0)}/100
                    </span>
                  )}
                  {row.fraud_issues_count > 0 && (
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{row.fraud_issues_count} issue{row.fraud_issues_count > 1 ? 's' : ''} detected</span>
                  )}
                </div>
                <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--text-primary)', lineHeight: 1.55 }}>
                  {row.fraud_explanation}
                </p>
              </div>
            ))}
            {rows.filter(r => r.fraud_explanation && r.fraud_label !== 'LOW').length === 0 && (
              <div style={{ textAlign: 'center', padding: '2rem 0' }}>
                <CheckCircle2 size={28} style={{ color: 'var(--success)', margin: '0 auto 0.5rem', display: 'block' }} />
                <p style={{ fontWeight: 600, color: 'var(--success)', margin: '0 0 0.25rem' }}>All visible invoices are low risk</p>
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', margin: 0 }}>Filter by Medium or High fraud risk to see detailed narratives.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
