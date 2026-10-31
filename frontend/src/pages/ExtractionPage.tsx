import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  FileText,
  ScanText,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Edit2,
  Save,
  X,
  Download,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  ShieldCheck,
  ShieldAlert,
  HelpCircle,
  ArrowRight,
  ExternalLink,
  ChevronRight,
  FileSearch,
  Sliders,
  DollarSign
} from 'lucide-react';
import { invoiceApi, extractionApi, validationApi, fraudApi } from '../services/api';
import { Invoice, ExtractionResult, ValidationResult, FraudAnalysis } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { ConfidenceChip } from '../components/ConfidenceChip';
import { Skeleton } from '../components/Skeleton';
import { EmptyState } from '../components/EmptyState';
import { ErrorState } from '../components/ErrorState';
import { useToast } from '../components/Toast';
import { formatINR, formatDate } from '../utils/formatters';

export const ExtractionPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>(
    searchParams.get('invoiceId') || 'INV-1001'
  );
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [extraction, setExtraction] = useState<ExtractionResult | null>(null);
  const [checker, setChecker] = useState<any>(null);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [fraud, setFraud] = useState<FraudAnalysis | null>(null);

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Split-pane preview controls
  const [zoomLevel, setZoomLevel] = useState<number>(100);

  // Field Edit Mode
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [isVerifyingPending, setIsVerifyingPending] = useState<boolean>(false);
  const [editForm, setEditForm] = useState<any>({});
  const [saveLoading, setSaveLoading] = useState<boolean>(false);

  // Re-extraction strategy
  const [reExtractLoading, setReExtractLoading] = useState<boolean>(false);
  const [strategy, setStrategy] = useState<string>('heuristic_ai');

  // Load all invoices for invoice switcher
  useEffect(() => {
    const fetchInvoices = async () => {
      try {
        const res = await invoiceApi.getAll();
        setInvoices(res.data);
        if (res.data.length > 0 && !searchParams.get('invoiceId')) {
          setSelectedInvoiceId(res.data[0].id);
        }
      } catch (err) {
        console.error('Failed to load invoices list', err);
      }
    };
    fetchInvoices();
  }, [searchParams]);

  // Load all data for selected invoice
  const loadInvoiceData = async (invId: string) => {
    setLoading(true);
    setError(null);
    setIsEditing(false);

    try {
      const [invRes, extRes, checkRes, valRes, fraudRes] = await Promise.allSettled([
        invoiceApi.getById(invId),
        extractionApi.get(invId),
        extractionApi.getChecker(invId),
        validationApi.get(invId),
        fraudApi.get(invId)
      ]);

      if (invRes.status === 'fulfilled') {
        const payload = invRes.value.data;
        const invObj = payload.invoice || payload;
        setInvoice(invObj);

        if (extRes.status === 'fulfilled') {
          setExtraction(extRes.value.data);
          const data = extRes.value.data.extracted_data || {};
          setEditForm({
            invoice_number: data.invoice_details?.number || '',
            invoice_date: data.invoice_details?.date || '',
            due_date: data.invoice_details?.due_date || '',
            po_number: data.invoice_details?.po_number || '',
            supplier_name: data.supplier?.name || '',
            supplier_gstin: data.supplier?.gstin || '',
            subtotal: data.financials?.subtotal ?? 0,
            cgst: data.financials?.cgst ?? 0,
            sgst: data.financials?.sgst ?? 0,
            igst: data.financials?.igst ?? 0,
            grand_total: data.financials?.grand_total ?? 0
          });
        } else if (payload.extraction) {
          setExtraction(payload.extraction);
          const data = payload.extraction.extracted_data || {};
          setEditForm({
            invoice_number: data.invoice_details?.number || '',
            invoice_date: data.invoice_details?.date || '',
            due_date: data.invoice_details?.due_date || '',
            po_number: data.invoice_details?.po_number || '',
            supplier_name: data.supplier?.name || '',
            supplier_gstin: data.supplier?.gstin || '',
            subtotal: data.financials?.subtotal ?? 0,
            cgst: data.financials?.cgst ?? 0,
            sgst: data.financials?.sgst ?? 0,
            igst: data.financials?.igst ?? 0,
            grand_total: data.financials?.grand_total ?? 0
          });
        } else {
          setExtraction(null);
        }

        if (checkRes.status === 'fulfilled') {
          setChecker(checkRes.value.data);
        } else {
          setChecker(null);
        }

        if (valRes.status === 'fulfilled') {
          setValidation(valRes.value.data);
        } else if (payload.validation) {
          setValidation(payload.validation);
        } else {
          setValidation(null);
        }

        if (fraudRes.status === 'fulfilled') {
          setFraud(fraudRes.value.data);
        } else if (payload.fraud_analysis) {
          setFraud(payload.fraud_analysis);
        } else {
          setFraud(null);
        }
      } else {
        throw new Error('Invoice record could not be found.');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load invoice extraction.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedInvoiceId) {
      loadInvoiceData(selectedInvoiceId);
      setSearchParams({ invoiceId: selectedInvoiceId });
    }
  }, [selectedInvoiceId]);

  // Handle Manual Field Edit Save
  const handleSaveEdit = async () => {
    setSaveLoading(true);
    setIsVerifyingPending(true);

    try {
      const res = await extractionApi.update(selectedInvoiceId, {
        invoice_number: editForm.invoice_number,
        invoice_date: editForm.invoice_date,
        due_date: editForm.due_date,
        po_number: editForm.po_number,
        supplier_name: editForm.supplier_name,
        supplier_gstin: editForm.supplier_gstin,
        subtotal: parseFloat(editForm.subtotal) || 0,
        cgst: parseFloat(editForm.cgst) || 0,
        sgst: parseFloat(editForm.sgst) || 0,
        igst: parseFloat(editForm.igst) || 0,
        grand_total: parseFloat(editForm.grand_total) || 0
      });

      toast.success('Fields Updated', 'Re-validation and fraud analysis completed.');
      setIsEditing(false);
      // Reload full state
      await loadInvoiceData(selectedInvoiceId);
    } catch (err: any) {
      toast.error('Update Failed', err.response?.data?.detail || 'Failed to update extraction.');
    } finally {
      setSaveLoading(false);
      setIsVerifyingPending(false);
    }
  };

  // Handle Re-extraction
  const handleReExtract = async () => {
    setReExtractLoading(true);
    try {
      const res = await extractionApi.reExtract(selectedInvoiceId, { strategy });
      toast.success('Re-extraction Succeeded', `Attempt ${res.data.attempt_number} evaluated by independent checker.`);
      await loadInvoiceData(selectedInvoiceId);
    } catch (err: any) {
      toast.error('Re-extraction Failed', err.response?.data?.detail || 'Execution failed.');
    } finally {
      setReExtractLoading(false);
    }
  };

  const extData: any = extraction?.extracted_data || {};
  const confScores = extraction?.confidence_scores || {};
  const items = extData.items || [];

  // File URL
  const fileUrl = invoice?.file_name ? `/storage/invoices/${invoice.file_name}` : null;
  const isPdf = invoice?.file_name?.toLowerCase().endsWith('.pdf');

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="page-header" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <h1 className="page-title">Extraction &amp; Field Review</h1>
            <p className="page-desc">Review extracted tokens side-by-side with the original document.</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            {checker?.checker_passed ? (
              <span style={{ display:'inline-flex', alignItems:'center', gap:'0.3rem', padding:'0.1875rem 0.625rem', borderRadius:'100px', fontSize:'0.75rem', fontWeight:600, backgroundColor:'var(--success-bg)', color:'var(--success)', border:'1px solid var(--success-border)' }}>
                <CheckCircle2 size={11}/> Checker: Verified
              </span>
            ) : (
              <span style={{ display:'inline-flex', alignItems:'center', gap:'0.3rem', padding:'0.1875rem 0.625rem', borderRadius:'100px', fontSize:'0.75rem', fontWeight:600, backgroundColor:'var(--danger-bg)', color:'var(--danger)', border:'1px solid var(--danger-border)' }}>
                <XCircle size={11}/> Checker: Discrepancy
              </span>
            )}
            <StatusBadge status={invoice?.validation_status} size="sm" customLabel={`Validation: ${invoice?.validation_status || 'PENDING'}`} />
            <StatusBadge status={invoice?.fraud_status} size="sm" customLabel={`Risk: ${invoice?.fraud_status || 'PENDING'}`} />
            <StatusBadge status={invoice?.approval_status} size="sm" customLabel={`Approval: ${invoice?.approval_status || 'PENDING'}`} />
          </div>
        </div>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:'0.75rem', flexWrap:'wrap', paddingTop:'0.75rem', borderTop:'1px solid var(--border)' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'0.625rem', flex:1, minWidth:0 }}>
            <label className="section-label" style={{ flexShrink:0 }}>Invoice:</label>
            <select value={selectedInvoiceId} onChange={e => setSelectedInvoiceId(e.target.value)}
              className="input select-input" style={{ flex:1, maxWidth:'32rem' }}>
              {invoices.map(inv => (
                <option key={inv.id} value={inv.id}>
                  {inv.id} — {inv.invoice_number || 'No #'} ({inv.supplier_name || 'Vendor'}) — {formatINR(inv.total_amount)}
                </option>
              ))}
            </select>
            <button type="button" onClick={() => loadInvoiceData(selectedInvoiceId)}
              className="btn btn-secondary btn-icon" title="Refresh">
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
          <button type="button" onClick={() => navigate(`/verification?invoiceId=${selectedInvoiceId}`)}
            className="btn btn-secondary">
            Verification Analysis <ArrowRight size={13}/>
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem' }}>
          <Skeleton style={{ height:'600px', borderRadius:'8px' }} />
          <Skeleton style={{ height:'600px', borderRadius:'8px' }} />
        </div>
      ) : error ? (
        <ErrorState title="Invoice Load Error" message={error} onRetry={() => loadInvoiceData(selectedInvoiceId)} />
      ) : (
        <>
          {/* SPLIT PANE */}
          <div className="split-grid split-grid-5-7" style={{ alignItems: 'start' }}>
            {/* LEFT PANE: Document Preview */}
            <div className="card flex flex-col overflow-hidden" style={{ height: 'clamp(320px, 60vh, 680px)' }}>
              {/* Toolbar */}
              <div style={{ height:'44px', backgroundColor:'var(--surface-subtle)', borderBottom:'1px solid var(--border)', padding:'0 0.875rem', display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0, fontSize:'0.8125rem', color:'var(--text-secondary)' }}>
                <div style={{ display:'flex', alignItems:'center', gap:'0.5rem', minWidth:0, overflow:'hidden' }}>
                  <FileText size={14} style={{ color:'var(--accent)', flexShrink:0 }} />
                  <span style={{ fontWeight:600, color:'var(--text-primary)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                    {invoice?.file_name || 'Document Preview'}
                  </span>
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:'0.125rem' }}>
                  <button type="button" onClick={() => setZoomLevel(z => Math.max(50, z-15))} className="btn btn-ghost btn-icon" title="Zoom Out"><ZoomOut size={13}/></button>
                  <span className="mono tabular-nums" style={{ fontSize:'0.75rem', padding:'0 0.25rem', color:'var(--text-muted)' }}>{zoomLevel}%</span>
                  <button type="button" onClick={() => setZoomLevel(z => Math.min(200, z+15))} className="btn btn-ghost btn-icon" title="Zoom In"><ZoomIn size={13}/></button>
                  <button type="button" onClick={() => setZoomLevel(100)} className="btn btn-ghost btn-icon" title="Reset"><RotateCcw size={12}/></button>
                  {fileUrl && (
                    <a href={fileUrl} download={invoice?.file_name||'invoice.pdf'} target="_blank" rel="noopener noreferrer"
                      className="btn btn-ghost btn-icon" title="Download" style={{ color:'var(--accent)', marginLeft:'0.25rem' }}>
                      <Download size={13}/>
                    </a>
                  )}
                </div>
              </div>

              {/* Document Viewport */}
              <div style={{ flex:1, backgroundColor:'var(--surface-subtle)', overflow:'auto', padding:'0.75rem', display:'flex', alignItems:'flex-start', justifyContent:'center' }}>
                {fileUrl ? (
                  isPdf ? (
                    <object data={fileUrl} type="application/pdf"
                      style={{ transform:`scale(${zoomLevel/100})`, transformOrigin:'top center', width:'100%', height:'100%', border:'1px solid var(--border)', backgroundColor:'var(--surface)', borderRadius:'4px' }}>
                      <div style={{ padding:'2rem', textAlign:'center', fontSize:'0.8125rem', color:'var(--text-muted)' }}>
                        <p style={{ marginBottom:'0.5rem' }}>Unable to display PDF inline.</p>
                        <a href={fileUrl} target="_blank" rel="noreferrer" style={{ color:'var(--accent)', fontWeight:600 }}>Open in new tab</a>
                      </div>
                    </object>
                  ) : (
                    <img src={fileUrl} alt="Invoice"
                      style={{ transform:`scale(${zoomLevel/100})`, transformOrigin:'top center', maxWidth:'100%', borderRadius:'4px', border:'1px solid var(--border)' }} />
                  )
                ) : (
                  <EmptyState title="No document" description="File reference not available." />
                )}
              </div>
            </div>

            {/* RIGHT PANE: Structured Fields */}
            <div className="card flex flex-col overflow-hidden" style={{ height: 'clamp(400px, 70vh, 680px)' }}>
              {/* Right pane toolbar */}
              <div style={{ height:'44px', backgroundColor:'var(--surface-subtle)', borderBottom:'1px solid var(--border)', padding:'0 1rem', display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
                <div style={{ display:'flex', alignItems:'center', gap:'0.5rem' }}>
                  <ScanText size={14} style={{ color:'var(--accent)' }} />
                  <span style={{ fontWeight:600, fontSize:'0.8125rem', color:'var(--text-primary)' }}>Extracted Fields</span>
                  {isVerifyingPending && (
                    <span style={{ fontSize:'0.75rem', fontWeight:600, padding:'0.125rem 0.5rem', borderRadius:'4px', backgroundColor:'var(--warning-bg)', color:'var(--warning)', border:'1px solid var(--warning-border)', animation:'pulse 1.5s ease-in-out infinite' }}>
                      Verifying…
                    </span>
                  )}
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:'0.5rem' }}>
                  {isEditing ? (
                    <>
                      <button type="button" disabled={saveLoading} onClick={() => setIsEditing(false)} className="btn btn-secondary" style={{ fontSize:'0.75rem' }}>Cancel</button>
                      <button type="button" disabled={saveLoading} onClick={handleSaveEdit} className="btn btn-primary" style={{ fontSize:'0.75rem' }}>
                        <Save size={12}/> {saveLoading ? 'Re-validating…' : 'Save & Re-verify'}
                      </button>
                    </>
                  ) : (
                    <button type="button" onClick={() => setIsEditing(true)} className="btn btn-secondary" style={{ fontSize:'0.75rem' }}>
                      <Edit2 size={12}/> Edit Fields
                    </button>
                  )}
                </div>
              </div>

              {/* Scrollable Form Body */}
              <div style={{ flex:1, overflowY:'auto', padding:'1rem', display:'flex', flexDirection:'column', gap:'0.875rem' }}>
                {/* Independent Checker Alert */}
                {checker && !checker.checker_passed && (
                  <div style={{ padding:'0.75rem', borderRadius:'6px', border:'1px solid var(--danger-border)', backgroundColor:'var(--danger-bg)', fontSize:'0.8125rem' }}>
                    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'0.5rem' }}>
                      <span style={{ display:'flex', alignItems:'center', gap:'0.375rem', fontWeight:700, color:'var(--danger)' }}>
                        <AlertTriangle size={14}/> Checker Flagged Discrepancies
                      </span>
                      <span className="mono" style={{ fontSize:'0.75rem', color:'var(--text-muted)' }}>
                        Attempt {checker.attempt_number} / {checker.max_attempts}
                      </span>
                    </div>
                    <ul style={{ margin:'0 0 0.5rem', paddingLeft:'1.25rem', color:'var(--text-primary)', lineHeight:1.6 }}>
                      {checker.discrepancies?.map((disc: string, dIdx: number) => (
                        <li key={`disc-${dIdx}`}>{disc}</li>
                      ))}
                    </ul>
                    {checker.can_retry && (
                      <div style={{ paddingTop:'0.5rem', borderTop:'1px solid var(--danger-border)', display:'flex', flexWrap:'wrap', alignItems:'center', justifyContent:'space-between', gap:'0.5rem' }}>
                        <span style={{ fontSize:'0.75rem', color:'var(--text-secondary)' }}>
                          Recommended: <strong>{checker.recommended_strategy}</strong>
                        </span>
                        <div style={{ display:'flex', alignItems:'center', gap:'0.5rem' }}>
                          <select value={strategy} onChange={e => setStrategy(e.target.value)} className="input select-input" style={{ width:'auto', fontSize:'0.75rem', padding:'0.25rem 0.5rem' }}>
                            <option value="heuristic_ai">Heuristic AI Parser</option>
                            <option value="ocr_enhancement">Adaptive OCR Enhancement</option>
                            <option value="alternative_patterns">Alternative RegEx Patterns</option>
                          </select>
                          <button type="button" disabled={reExtractLoading} onClick={handleReExtract} className="btn btn-danger" style={{ fontSize:'0.75rem' }}>
                            {reExtractLoading ? 'Re-running…' : 'Re-Extract'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Primary Metadata Grid */}
                <div className="split-grid split-grid-2" style={{ gap:'0.625rem' }}>
                  {[
                    { label:'Invoice Number', key:'invoice_number', editKey:'invoice_number', value: extData.invoice_details?.number, conf: confScores.invoice_number, mono:true },
                    { label:'PO Reference',   key:'po_number',      editKey:'po_number',      value: extData.invoice_details?.po_number, tag:'RULE-BASED', mono:true },
                    { label:'Supplier Name',  key:'supplier_name',  editKey:'supplier_name',  value: extData.supplier?.name, conf: confScores.supplier_name },
                    { label:'Supplier GSTIN', key:'supplier_gstin', editKey:'supplier_gstin', value: extData.supplier?.gstin, conf: confScores.supplier_gstin, mono:true },
                    { label:'Invoice Date',   key:'invoice_date',   editKey:'invoice_date',   value: formatDate(extData.invoice_details?.date), type:'date', tag:'RULE-BASED' },
                    { label:'Due Date',       key:'due_date',       editKey:'due_date',       value: formatDate(extData.invoice_details?.due_date), type:'date', tag:'RULE-BASED' },
                  ].map(f => (
                    <div key={f.key} style={{ padding:'0.625rem 0.75rem', borderRadius:'6px', border:'1px solid var(--border)', backgroundColor:'var(--surface-subtle)' }}>
                      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'0.375rem' }}>
                        <label className="section-label">{f.label}</label>
                        {f.conf !== undefined ? <ConfidenceChip score={f.conf} /> : f.tag && <span className="section-label">{f.tag}</span>}
                      </div>
                      {isEditing ? (
                        <input
                          type={f.type === 'date' ? 'date' : 'text'}
                          value={editForm[f.editKey] ?? ''}
                          onChange={e => setEditForm({ ...editForm, [f.editKey]: e.target.value })}
                          className={`input${f.mono ? ' mono' : ''}`}
                          style={{ padding:'0.25rem 0.5rem', fontSize:'0.8125rem' }}
                        />
                      ) : (
                        <div className={f.mono ? 'mono' : ''} style={{ fontWeight:700, fontSize:'0.875rem', color:'var(--text-primary)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                          {f.value || '—'}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                {/* Line Items Table */}
                <div style={{ border:'1px solid var(--border)', borderRadius:'6px', overflow:'hidden' }}>
                  <div style={{ padding:'0.5rem 0.875rem', backgroundColor:'var(--surface-subtle)', borderBottom:'1px solid var(--border)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <span style={{ fontWeight:600, fontSize:'0.8125rem', color:'var(--text-primary)' }}>Line Items</span>
                    <span style={{ fontSize:'0.75rem', color:'var(--text-muted)' }}>{items.length} item(s)</span>
                  </div>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Description</th>
                        <th style={{ textAlign:'right' }}>Qty</th>
                        <th style={{ textAlign:'right' }}>Unit Price</th>
                        <th style={{ textAlign:'right' }}>Tax</th>
                        <th style={{ textAlign:'right' }}>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.length === 0 ? (
                        <tr><td colSpan={5} style={{ textAlign:'center', padding:'1.5rem', color:'var(--text-muted)', fontSize:'0.8125rem' }}>No line items extracted.</td></tr>
                      ) : items.map((it: any, iIdx: number) => (
                        <tr key={`item-${iIdx}`}>
                          <td style={{ fontWeight:500 }}>{it.description || 'Line Item'}</td>
                          <td className="mono tabular-nums" style={{ textAlign:'right' }}>{it.quantity || 1}</td>
                          <td className="mono tabular-nums" style={{ textAlign:'right' }}>{formatINR(it.unit_price)}</td>
                          <td className="mono tabular-nums" style={{ textAlign:'right' }}>{formatINR(it.tax)}</td>
                          <td className="mono tabular-nums" style={{ textAlign:'right', fontWeight:700 }}>{formatINR(it.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Financials breakdown */}
                <div style={{ padding:'0.875rem', borderRadius:'6px', border:'1px solid var(--border)', backgroundColor:'var(--surface-subtle)', display:'flex', flexDirection:'column', gap:'0.5rem', fontSize:'0.8125rem' }}>
                  {[
                    { label:'Subtotal',          value: formatINR(extData.financials?.subtotal) },
                    { label:'CGST + SGST',        value: formatINR((extData.financials?.cgst||0)+(extData.financials?.sgst||0)) },
                    ...(extData.financials?.igst > 0 ? [{ label:'IGST (Interstate)', value: formatINR(extData.financials?.igst) }] : []),
                  ].map((row, i) => (
                    <div key={i} style={{ display:'flex', justifyContent:'space-between', color:'var(--text-secondary)' }}>
                      <span>{row.label}</span>
                      <span className="mono tabular-nums">{row.value}</span>
                    </div>
                  ))}
                  <div style={{ paddingTop:'0.5rem', borderTop:'1px solid var(--border)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:'0.5rem' }}>
                      <span style={{ fontWeight:700, fontSize:'0.9375rem', color:'var(--text-primary)' }}>Grand Total</span>
                      <ConfidenceChip score={confScores.grand_total} />
                    </div>
                    {isEditing ? (
                      <input type="number" value={editForm.grand_total}
                        onChange={e => setEditForm({ ...editForm, grand_total: e.target.value })}
                        className="input mono tabular-nums" style={{ width:'8rem', textAlign:'right', padding:'0.25rem 0.5rem' }} />
                    ) : (
                      <span className="mono tabular-nums" style={{ fontWeight:800, fontSize:'1rem', color:'var(--accent)' }}>
                        {formatINR(extData.financials?.grand_total || invoice?.total_amount)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer CTA */}
          <div className="card" style={{ padding:'1rem 1.25rem', display:'flex', flexWrap:'wrap', justifyContent:'space-between', alignItems:'center', gap:'1rem' }}>
            <div>
              <h3 style={{ margin:'0 0 0.25rem', fontSize:'0.9375rem', fontWeight:600, color:'var(--text-primary)' }}>Verification &amp; Fraud Analysis</h3>
              <p style={{ margin:0, fontSize:'0.8125rem', color:'var(--text-secondary)' }}>
                Statutory GST arithmetic, duplicate invoice hash detection, and model-based fraud scoring.
              </p>
            </div>
            <button onClick={() => navigate(`/verification?invoiceId=${selectedInvoiceId}`)} className="btn btn-primary">
              View Verification &amp; Fraud Analysis <ArrowRight size={13}/>
            </button>
          </div>
        </>
      )}
    </div>
  );
};
