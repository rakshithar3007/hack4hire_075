import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { RefreshCw, ArrowRight, CheckCircle2, XCircle, AlertTriangle, Info, ShieldCheck } from 'lucide-react';
import { fraudApi, invoiceApi, validationApi, extractionApi } from '../services/api';
import { Invoice, FraudAnalysis, ValidationResult } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { useToast } from '../components/Toast';

export const FraudDetectionPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [selectedId, setSelectedId] = useState(searchParams.get('invoiceId') || '');
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [fraudData, setFraudData] = useState<FraudAnalysis | null>(null);
  const [validationData, setValidationData] = useState<ValidationResult | null>(null);
  const [checkerData, setCheckerData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [reChecking, setReChecking] = useState(false);

  useEffect(() => {
    invoiceApi.getAll().then(res => {
      setInvoices(res.data);
      const qId = searchParams.get('invoiceId');
      if (res.data.length > 0) {
        const match = res.data.find((i: Invoice) => i.id === qId);
        setSelectedId(match ? match.id : res.data[0].id);
      }
    }).catch(console.error);
  }, []);

  const load = async (id: string) => {
    setLoading(true);
    try {
      const [invR, fraudR, valR, checkR] = await Promise.allSettled([
        invoiceApi.getById(id), fraudApi.get(id), validationApi.get(id), extractionApi.getChecker(id),
      ]);
      if (invR.status === 'fulfilled') setInvoice(invR.value.data);
      if (fraudR.status === 'fulfilled') setFraudData(fraudR.value.data);
      if (valR.status === 'fulfilled') setValidationData(valR.value.data);
      if (checkR.status === 'fulfilled') setCheckerData(checkR.value.data);
    } catch { showToast('error', 'Failed to load verification data.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { if (selectedId) load(selectedId); }, [selectedId]);

  const handleSelect = (id: string) => { setSelectedId(id); setSearchParams({ invoiceId: id }); };

  const handleReAssess = async () => {
    setReChecking(true);
    try {
      await Promise.allSettled([validationApi.validate(selectedId), fraudApi.check(selectedId)]);
      showToast('success', `Re-assessed ${selectedId}.`);
      await load(selectedId);
    } catch (e: any) {
      showToast('error', e.response?.data?.detail || 'Re-assessment failed.');
    } finally { setReChecking(false); }
  };

  const score = fraudData?.risk_score || 0;
  const cat = fraudData?.risk_category || 'LOW';
  const scoreColor = cat === 'LOW' ? 'var(--success)' : cat === 'MEDIUM' ? 'var(--warning)' : 'var(--danger)';
  const scoreBg = cat === 'LOW' ? 'var(--success-bg)' : cat === 'MEDIUM' ? 'var(--warning-bg)' : 'var(--danger-bg)';

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Verification & Fraud Analysis</h1>
          <p className="page-desc">Dual-engine audit: deterministic rule verification and multivariate statistical risk scoring.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <label className="section-label">Invoice:</label>
            <select value={selectedId} onChange={e => handleSelect(e.target.value)}
              className="input select-input" style={{ width: 'auto', maxWidth: '22rem' }}>
              {invoices.map(inv => (
                <option key={inv.id} value={inv.id}>{inv.id} — {inv.supplier_name || 'Vendor'} ({inv.fraud_status || 'RISK'})</option>
              ))}
            </select>
          </div>
          <button onClick={handleReAssess} disabled={reChecking} className="btn btn-primary">
            <RefreshCw size={14} className={reChecking ? 'animate-spin' : ''} />
            {reChecking ? 'Re-assessing…' : 'Re-Assess'}
          </button>
          <button onClick={() => navigate(`/extraction?invoiceId=${selectedId}`)} className="btn btn-secondary">
            Review Pane <ArrowRight size={13} />
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: '4rem', textAlign: 'center', backgroundColor: 'var(--surface)', borderRadius: '8px', border: '1px solid var(--border)' }}>
          <RefreshCw size={20} className="animate-spin" style={{ color: 'var(--accent)', margin: '0 auto 0.5rem' }} />
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>Loading verification evidence…</p>
        </div>
      ) : (
        <div className="split-grid split-grid-2" style={{ alignItems: 'start' }}>
            {/* LEFT: rule-based validation */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div className="card overflow-hidden">
                <div className="card-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <h2 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 600 }}>Rule-Based Validation</h2>
                    <p className="page-desc" style={{ marginTop: '0.25rem' }}>Deterministic GST math, PO match, duplicate detection.</p>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.6875rem', fontWeight: 700, padding: '0.1875rem 0.5rem', borderRadius: '4px', backgroundColor: 'var(--info-bg)', color: 'var(--info)', textTransform: 'uppercase' }}>Zero-Hallucination</span>
                    <StatusBadge status={validationData?.validation_status || invoice?.validation_status || 'PENDING'} />
                  </div>
                </div>
                <div className="card-body" style={{ padding: '1rem' }}>
                  {(!validationData?.validation_details?.length) ? (
                    <div style={{ padding: '2rem', textAlign: 'center', backgroundColor: 'var(--surface-subtle)', borderRadius: '6px', border: '1px solid var(--border)' }}>
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>No rule records found. Click Re-Assess to run the validation pipeline.</p>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {validationData.validation_details.map((rule, i) => {
                        const isPass = rule.status === 'PASS';
                        const isWarn = rule.status === 'WARNING';
                        const bg = isPass ? 'var(--success-bg)' : isWarn ? 'var(--warning-bg)' : 'var(--danger-bg)';
                        const border = isPass ? 'var(--success-border)' : isWarn ? 'var(--warning-border)' : 'var(--danger-border)';
                        const iconColor = isPass ? 'var(--success)' : isWarn ? 'var(--warning)' : 'var(--danger)';
                        const Icon = isPass ? CheckCircle2 : isWarn ? AlertTriangle : XCircle;
                        return (
                          <div key={i} style={{ padding: '0.75rem', borderRadius: '6px', border: `1px solid ${border}`, backgroundColor: bg }}>
                            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem' }}>
                              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.625rem' }}>
                                <Icon size={15} style={{ color: iconColor, flexShrink: 0, marginTop: '0.125rem' }} />
                                <div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                                    <span style={{ fontWeight: 700, fontSize: '0.8125rem', color: 'var(--text-primary)' }}>{rule.name}</span>
                                    <span className="mono" style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>[{rule.rule_id}]</span>
                                  </div>
                                  <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', margin: 0 }}>{rule.reason}</p>
                                  {(rule.expected_value || rule.actual_value) && (
                                    <div style={{ marginTop: '0.5rem', display: 'flex', gap: '1rem', fontSize: '0.75rem' }} className="mono">
                                      {rule.expected_value && <span><span style={{ color: 'var(--text-muted)' }}>Expected: </span><strong>{rule.expected_value}</strong></span>}
                                      {rule.actual_value && <span><span style={{ color: 'var(--text-muted)' }}>Found: </span><strong>{rule.actual_value}</strong></span>}
                                    </div>
                                  )}
                                </div>
                              </div>
                              <span style={{ padding: '0.125rem 0.5rem', borderRadius: '4px', fontSize: '0.6875rem', fontWeight: 700, backgroundColor: 'rgba(255,255,255,0.6)', color: iconColor, textTransform: 'uppercase', whiteSpace: 'nowrap', flexShrink: 0 }}>
                                {rule.status}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Independent checker */}
              <div className="card">
                <div className="card-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <ShieldCheck size={15} style={{ color: 'var(--accent)' }} />
                    <h3 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 600 }}>Independent Checker Audit</h3>
                  </div>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '0.1875rem 0.625rem', borderRadius: '100px', backgroundColor: checkerData?.checker_passed ? 'var(--success-bg)' : 'var(--danger-bg)', color: checkerData?.checker_passed ? 'var(--success)' : 'var(--danger)' }}>
                    {checkerData?.checker_passed ? 'PASSED' : 'DISCREPANCY'}
                  </span>
                </div>
                <div className="card-body">
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem', marginBottom: '0.75rem' }}>
                    {[
                      { l: 'Attempt', v: `${checkerData?.attempt_number || 1}/${checkerData?.max_attempts || 3}` },
                      { l: 'Confidence', v: checkerData?.confidence != null ? `${(checkerData.confidence * 100).toFixed(0)}%` : '—' },
                      { l: 'Strategy', v: checkerData?.recommended_strategy || 'HYBRID_OCR' },
                      { l: 'Engine', v: 'Dual-Pass' },
                    ].map((m, i) => (
                      <div key={i} style={{ padding: '0.625rem', borderRadius: '6px', backgroundColor: 'var(--surface-subtle)', border: '1px solid var(--border)' }}>
                        <div className="section-label" style={{ marginBottom: '0.25rem' }}>{m.l}</div>
                        <div className="mono" style={{ fontWeight: 700, fontSize: '0.8125rem', color: 'var(--text-primary)' }}>{m.v}</div>
                      </div>
                    ))}
                  </div>
                  {checkerData?.discrepancies?.length > 0 ? (
                    <div style={{ padding: '0.75rem', borderRadius: '6px', backgroundColor: 'var(--danger-bg)', border: '1px solid var(--danger-border)' }}>
                      <strong style={{ fontSize: '0.8125rem', color: 'var(--danger)', display: 'block', marginBottom: '0.375rem' }}>Discrepancies Detected:</strong>
                      <ul style={{ margin: 0, paddingLeft: '1rem', fontSize: '0.8125rem', color: 'var(--text-primary)' }}>
                        {checkerData.discrepancies.map((d: string, i: number) => <li key={i}>{d}</li>)}
                      </ul>
                    </div>
                  ) : (
                    <div style={{ padding: '0.75rem', borderRadius: '6px', backgroundColor: 'var(--success-bg)', border: '1px solid var(--success-border)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <CheckCircle2 size={14} style={{ color: 'var(--success)' }} />
                      <span style={{ fontSize: '0.8125rem', color: 'var(--success)', fontWeight: 500 }}>Cross-verified without discrepancy.</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* RIGHT: model-based risk */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Risk score */}
              <div className="card">
                <div className="card-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <h3 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 600 }}>Fraud Risk Score</h3>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '0.1875rem 0.625rem', borderRadius: '100px', backgroundColor: scoreBg, color: scoreColor }}>
                    {cat} RISK
                  </span>
                </div>
                <div className="card-body" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div style={{ position: 'relative', width: '144px', height: '144px', margin: '0.5rem 0' }}>
                    <svg width="144" height="144" viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)' }}>
                      <circle cx="50" cy="50" r="40" fill="none" stroke="var(--border)" strokeWidth="10" />
                      <circle cx="50" cy="50" r="40" fill="none" stroke={scoreColor} strokeWidth="10"
                        strokeDasharray="251.2" strokeDashoffset={251.2 - (251.2 * score / 100)}
                        strokeLinecap="round" style={{ transition: 'stroke-dashoffset 0.7s ease' }} />
                    </svg>
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                      <span className="tabular-nums" style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>{score.toFixed(0)}</span>
                      <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>/ 100</span>
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', width: '100%', marginTop: '1rem' }}>
                    {[{ r: '0–29', l: 'LOW', c: 'var(--success)', bg: 'var(--success-bg)' }, { r: '30–69', l: 'MEDIUM', c: 'var(--warning)', bg: 'var(--warning-bg)' }, { r: '70–100', l: 'HIGH', c: 'var(--danger)', bg: 'var(--danger-bg)' }].map(b => (
                      <div key={b.l} style={{ padding: '0.5rem', textAlign: 'center', borderRadius: '6px', backgroundColor: b.bg, color: b.c, fontSize: '0.75rem', fontWeight: 700 }}>
                        <div>{b.r}</div><div style={{ fontSize: '0.6875rem' }}>{b.l}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* AI narrative */}
              <div className="card">
                <div className="card-header">
                  <h3 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 600 }}>Audit Narrative</h3>
                </div>
                <div className="card-body">
                  <div style={{ padding: '0.75rem', borderRadius: '6px', backgroundColor: 'var(--surface-subtle)', border: '1px solid var(--border)', fontSize: '0.8125rem', color: 'var(--text-primary)', lineHeight: 1.6 }}>
                    {fraudData?.explanation || 'No anomalies detected for this transaction.'}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', marginTop: '0.625rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    <Info size={13} />
                    <span>Risk scores guide AP personnel — not legal proof of fraud.</span>
                  </div>
                </div>
              </div>

              {/* Anomalies */}
              <div className="card">
                <div className="card-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <h3 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 600 }}>Detected Anomalies</h3>
                  <span className="label-chip">{fraudData?.detected_issues?.length || 0} detected</span>
                </div>
                <div className="card-body">
                  {!fraudData?.detected_issues?.length ? (
                    <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
                      <ShieldCheck size={28} style={{ color: 'var(--success)', margin: '0 auto 0.5rem' }} />
                      <p style={{ fontWeight: 600, color: 'var(--success)', margin: '0 0 0.25rem' }}>Zero Anomalies</p>
                      <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', margin: 0 }}>Historical prices and velocities appear normal.</p>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {fraudData.detected_issues.map((a, i) => {
                        const isHigh = a.risk_level === 'HIGH';
                        const bg = isHigh ? 'var(--danger-bg)' : 'var(--warning-bg)';
                        const border = isHigh ? 'var(--danger-border)' : 'var(--warning-border)';
                        const color = isHigh ? 'var(--danger)' : 'var(--warning)';
                        return (
                          <div key={i} style={{ padding: '0.75rem', borderRadius: '6px', backgroundColor: bg, border: `1px solid ${border}` }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                              <span style={{ fontWeight: 700, fontSize: '0.8125rem', color: 'var(--text-primary)' }}>{a.title}</span>
                              <span style={{ fontSize: '0.6875rem', fontWeight: 800, padding: '0.125rem 0.5rem', borderRadius: '4px', backgroundColor: 'rgba(255,255,255,0.6)', color }}>{a.risk_level}</span>
                            </div>
                            <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', margin: '0 0 0.25rem' }}>{a.description}</p>
                            <span className="mono" style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>Code: {a.code}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* AP recommendation */}
              <div className="card">
                <div className="card-header">
                  <h3 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 600 }}>Recommended AP Protocol</h3>
                </div>
                <div className="card-body">
                  <p style={{ padding: '0.75rem', borderRadius: '6px', backgroundColor: 'var(--surface-subtle)', border: '1px solid var(--border)', fontSize: '0.8125rem', color: 'var(--text-primary)', margin: 0 }}>
                    {fraudData?.recommended_action || 'Proceed with standard manager review.'}
                  </p>
                  <div style={{ marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end' }}>
                    <button onClick={() => navigate('/approvals')} className="btn btn-primary" style={{ fontSize: '0.8125rem' }}>
                      Go to Approval Center <ArrowRight size={13} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
        </div>
      )}
    </div>
  );
};
