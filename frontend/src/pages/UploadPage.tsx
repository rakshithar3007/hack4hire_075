import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UploadCloud, AlertCircle, CheckCircle2, RefreshCw, FileText, ArrowRight, X, Clock } from 'lucide-react';
import { invoiceApi } from '../services/api';
import { StatusBadge } from '../components/StatusBadge';
import { useToast } from '../components/Toast';
import { formatINR } from '../utils/formatters';

export const UploadPage: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [processedResult, setProcessedResult] = useState<any>(null);

  const validateAndSet = (file: File) => {
    setUploadError(null);
    setProcessedResult(null);
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!['.pdf', '.png', '.jpg', '.jpeg'].includes(ext)) {
      setUploadError(`Unsupported format '${ext}'. Accepted: PDF, PNG, JPG.`);
      return;
    }
    if (file.size > 25 * 1024 * 1024) { setUploadError('File exceeds 25 MB limit.'); return; }
    if (file.size < 30) { setUploadError('File appears empty or corrupted.'); return; }
    setSelectedFile(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    setDragActive(e.type === 'dragenter' || e.type === 'dragover');
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation(); setDragActive(false);
    if (e.dataTransfer.files?.[0]) validateAndSet(e.dataTransfer.files[0]);
  };

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) validateAndSet(e.target.files[0]);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    setIsUploading(true); setUploadError(null);
    const fd = new FormData();
    fd.append('file', selectedFile);
    try {
      const res = await invoiceApi.upload(fd);
      setProcessedResult(res.data);
      toast.success('Invoice Processed', `${res.data.invoice_id} extracted and audited successfully.`);
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Upload failed. Please check the file.';
      setUploadError(msg);
      toast.error('Upload Failed', msg);
    } finally { setIsUploading(false); }
  };

  return (
    <div style={{ maxWidth: '48rem', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Upload Invoice</h1>
          <p className="page-desc">Upload a vendor invoice for automated OCR extraction, GST verification, and fraud scoring.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {(['PDF', 'PNG', 'JPG'] as const).map(f => (
            <span key={f} className="label-chip mono">{f}</span>
          ))}
          <span className="label-chip">Max 25 MB</span>
        </div>
      </div>

      {/* Upload card */}
      <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {/* Drop zone */}
        <div onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop}
          style={{
            position: 'relative', borderRadius: '8px', padding: '3rem 2rem', textAlign: 'center',
            border: `2px dashed ${dragActive ? 'var(--accent)' : 'var(--border)'}`,
            backgroundColor: dragActive ? 'var(--accent-light)' : 'var(--surface-subtle)',
            transition: 'all 150ms ease',
          }}>
          <input type="file" accept=".pdf,.png,.jpg,.jpeg" onChange={handleInput} disabled={isUploading}
            style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', width: '100%', height: '100%' }} />

          <div style={{ width: '48px', height: '48px', borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem', color: 'var(--accent)' }}>
            <UploadCloud size={22} />
          </div>

          <h3 style={{ margin: '0 0 0.375rem', fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-primary)' }}>
            {selectedFile ? selectedFile.name : 'Drag & drop invoice here, or click to browse'}
          </h3>
          <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
            Supports official tax invoices in PDF, PNG, or JPG format.
          </p>

          {selectedFile && (
            <div style={{ marginTop: '0.875rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.375rem 0.75rem', borderRadius: '6px', backgroundColor: 'var(--surface)', border: '1px solid var(--border)', fontSize: '0.8125rem' }}>
              <FileText size={13} style={{ color: 'var(--accent)' }} />
              <span className="mono" style={{ color: 'var(--text-primary)' }}>{selectedFile.name}</span>
              <span style={{ color: 'var(--text-muted)' }}>({(selectedFile.size / 1024).toFixed(1)} KB)</span>
              <button type="button" onClick={e => { e.stopPropagation(); setSelectedFile(null); setProcessedResult(null); }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '0.125rem', display: 'flex', alignItems: 'center' }}>
                <X size={13} />
              </button>
            </div>
          )}
        </div>

        {/* Error */}
        {uploadError && (
          <div style={{ padding: '0.75rem 1rem', borderRadius: '6px', backgroundColor: 'var(--danger-bg)', border: '1px solid var(--danger-border)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem', color: 'var(--danger)' }}>
            <AlertCircle size={14} style={{ flexShrink: 0 }} />
            {uploadError}
          </div>
        )}

        {/* Processing indicator */}
        {isUploading && (
          <div style={{ padding: '1rem', borderRadius: '6px', backgroundColor: 'var(--surface-subtle)', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.625rem' }}>
              <RefreshCw size={14} className="animate-spin" style={{ color: 'var(--accent)', flexShrink: 0 }} />
              <span style={{ fontWeight: 600, fontSize: '0.8125rem', color: 'var(--text-primary)' }}>Processing through OCR, extraction &amp; fraud engine…</span>
            </div>
            <div style={{ height: '4px', borderRadius: '4px', backgroundColor: 'var(--border)', overflow: 'hidden' }}>
              <div style={{ height: '100%', backgroundColor: 'var(--accent)', borderRadius: '4px', width: '60%', animation: 'pulse 1.5s ease-in-out infinite' }} />
            </div>
            <p style={{ margin: '0.5rem 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>Parsing layout, comparing with supplier master, calculating field confidences…</p>
          </div>
        )}

        {/* Success result */}
        {processedResult && (
          <div style={{ padding: '1rem', borderRadius: '6px', backgroundColor: 'var(--success-bg)', border: '1px solid var(--success-border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.875rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--success)', fontWeight: 700, fontSize: '0.875rem' }}>
                <CheckCircle2 size={16} /> Invoice Processed Successfully
              </div>
              <span className="mono" style={{ fontWeight: 700, fontSize: '0.8125rem', color: 'var(--text-primary)' }}>{processedResult.invoice_id}</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '0.5rem', marginBottom: '1rem' }}>
              {[
                { label: 'Invoice No',   value: processedResult.invoice_number || 'N/A' },
                { label: 'Supplier',     value: processedResult.supplier_name || '—' },
                { label: 'Amount',       value: formatINR(processedResult.total_amount) },
                { label: 'Validation',   value: null, badge: processedResult.validation_status },
              ].map((f, i) => (
                <div key={i} style={{ padding: '0.625rem', borderRadius: '6px', backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
                  <div className="section-label" style={{ marginBottom: '0.25rem' }}>{f.label}</div>
                  {f.badge ? <StatusBadge status={f.badge} size="sm" /> : (
                    <div style={{ fontWeight: 600, fontSize: '0.8125rem', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.value}</div>
                  )}
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={() => navigate(`/extraction?invoiceId=${processedResult.invoice_id}`)} className="btn btn-primary">
                Open Review Pane <ArrowRight size={13} />
              </button>
            </div>
          </div>
        )}

        {/* Upload button */}
        {!processedResult && (
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button type="button" disabled={!selectedFile || isUploading} onClick={handleUpload} className="btn btn-primary" style={{ minWidth: '12rem', justifyContent: 'center' }}>
              {isUploading ? <><RefreshCw size={13} className="animate-spin" /> Processing…</> : <><UploadCloud size={14} /> Upload &amp; Process Invoice</>}
            </button>
          </div>
        )}
      </div>

      {/* Disclosure */}
      <div style={{ padding: '0.75rem 1rem', borderRadius: '6px', backgroundColor: 'var(--surface-subtle)', border: '1px solid var(--border)', display: 'flex', alignItems: 'flex-start', gap: '0.5rem', fontSize: '0.8125rem' }}>
        <Clock size={14} style={{ color: 'var(--accent)', flexShrink: 0, marginTop: '0.125rem' }} />
        <p style={{ margin: 0, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
          <strong style={{ color: 'var(--text-primary)' }}>Hosting Note:</strong> Files uploaded during demo sessions are stored temporarily. On free-tier cloud hosts (Render Free), storage is ephemeral and resets on service restart.
        </p>
      </div>
    </div>
  );
};
