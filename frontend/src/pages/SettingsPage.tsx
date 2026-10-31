import React, { useState, useEffect } from 'react';
import { Play, Plus, RefreshCw, Workflow, Building, FileCheck, Server } from 'lucide-react';
import { n8nApi, supplierApi, poApi, invoiceApi, API_BASE_URL } from '../services/api';
import { Invoice } from '../types';
import { formatINR } from '../utils/formatters';
import { useToast } from '../components/Toast';

type Tab = 'n8n' | 'suppliers' | 'pos' | 'system';

export const SettingsPage: React.FC = () => {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<Tab>('n8n');
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState('');
  const [simulationTrace, setSimulationTrace] = useState<any[] | null>(null);
  const [simulating, setSimulating] = useState(false);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [pos, setPos] = useState<any[]>([]);
  const [newSupName, setNewSupName] = useState('');
  const [newSupGstin, setNewSupGstin] = useState('');
  const [newPoNumber, setNewPoNumber] = useState('');
  const [newPoAmount, setNewPoAmount] = useState('');
  const [newPoSupplierId, setNewPoSupplierId] = useState(1);

  useEffect(() => {
    Promise.all([invoiceApi.getAll(), supplierApi.getAll(), poApi.getAll()])
      .then(([inv, sup, po]) => {
        setInvoices(inv.data);
        if (inv.data.length > 0) setSelectedInvoiceId(inv.data[0].id);
        setSuppliers(sup.data);
        setPos(po.data);
      }).catch(console.error);
  }, []);

  const handleRunSimulation = async () => {
    setSimulating(true); setSimulationTrace(null);
    try {
      const res = await n8nApi.simulate(selectedInvoiceId);
      setSimulationTrace(res.data.trace);
      showToast('success', `Pipeline simulated for ${selectedInvoiceId}.`);
    } catch (err: any) {
      showToast('error', err.response?.data?.detail || 'Simulation failed.');
    } finally { setSimulating(false); }
  };

  const handleAddSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSupName || !newSupGstin) return;
    try {
      await supplierApi.create({ supplier_name: newSupName, gstin: newSupGstin });
      showToast('success', `Supplier '${newSupName}' registered.`);
      setNewSupName(''); setNewSupGstin('');
      const res = await supplierApi.getAll(); setSuppliers(res.data);
    } catch (err: any) { showToast('error', err.response?.data?.detail || 'Failed.'); }
  };

  const handleAddPO = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPoNumber || !newPoAmount) return;
    try {
      await poApi.create({ po_number: newPoNumber, expected_amount: parseFloat(newPoAmount), supplier_id: newPoSupplierId });
      showToast('success', `PO '${newPoNumber}' created.`);
      setNewPoNumber(''); setNewPoAmount('');
      const res = await poApi.getAll(); setPos(res.data);
    } catch (err: any) { showToast('error', err.response?.data?.detail || 'Failed.'); }
  };

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'n8n',       label: 'n8n Pipeline Simulator', icon: <Workflow size={14} /> },
    { key: 'suppliers', label: `Supplier Master (${suppliers.length})`, icon: <Building size={14} /> },
    { key: 'pos',       label: `Purchase Orders (${pos.length})`, icon: <FileCheck size={14} /> },
    { key: 'system',    label: 'API & Architecture', icon: <Server size={14} /> },
  ];

  const sysFields = [
    { label: 'FastAPI Backend URL',        value: API_BASE_URL, note: 'Render Free — cold-start detection active' },
    { label: 'Database Engine',            value: 'SQLite + SQLAlchemy 2.0', note: 'Ephemeral on Render Free; auto-seeded on startup' },
    { label: 'Cryptographic Audit Ledger', value: 'SHA-256 Chained Hash Records', note: 'Immutable state history per transaction' },
    { label: 'Document Parsing Pipeline',  value: 'PyMuPDF + CV + Dual-Pass Checker', note: 'Zero-hallucination confidence scoring with retry' },
  ];

  return (
    <div className="space-y-5">
      {/* Page header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">System Configuration</h1>
          <p className="page-desc">Configure automation pipelines, supplier master, purchase orders, and runtime parameters.</p>
        </div>
        <span className="label-chip">Admin Only</span>
      </div>

      {/* Tab container */}
      <div className="card overflow-hidden">
        {/* Tab bar */}
        <div style={{ display: 'flex', gap: '1.5rem', padding: '0 1.25rem', borderBottom: '1px solid var(--border)', overflowX: 'auto' }}>
          {tabs.map(t => (
            <button key={t.key} onClick={() => setActiveTab(t.key)}
              className={`nav-tab ${activeTab === t.key ? 'active' : ''}`}
              style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', cursor: 'pointer', background: 'none', border: 'none', borderBottom: activeTab === t.key ? '2px solid var(--accent)' : '2px solid transparent', paddingBottom: '0.75rem', paddingTop: '0.75rem', fontSize: '0.8125rem', fontWeight: activeTab === t.key ? 600 : 500, color: activeTab === t.key ? 'var(--accent)' : 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
              {t.icon}{t.label}
            </button>
          ))}
        </div>

        {/* ── n8n Simulator ── */}
        {activeTab === 'n8n' && (
          <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Controls */}
            <div style={{ padding: '1rem 1.25rem', borderRadius: '8px', backgroundColor: 'var(--surface-subtle)', border: '1px solid var(--border)', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
              <div>
                <h3 style={{ margin: '0 0 0.25rem', fontSize: '0.9375rem', fontWeight: 600 }}>8-Node Workflow Simulator</h3>
                <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--text-secondary)', maxWidth: '32rem' }}>
                  Executes the webhook validation, AI summarization, and notification pipeline adapted from your n8n workflow.
                </p>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <select value={selectedInvoiceId} onChange={e => setSelectedInvoiceId(e.target.value)}
                  className="input select-input" style={{ width: 'auto' }}>
                  {invoices.map(inv => <option key={inv.id} value={inv.id}>{inv.id} ({inv.invoice_number || 'No #'})</option>)}
                </select>
                <button onClick={handleRunSimulation} disabled={simulating} className="btn btn-primary">
                  <Play size={13} className={simulating ? 'animate-spin' : ''} />
                  {simulating ? 'Running…' : 'Run Simulation'}
                </button>
              </div>
            </div>

            {/* Architecture overview */}
            <div>
              <p className="section-label" style={{ marginBottom: '0.625rem' }}>Pipeline Architecture</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(260px,100%), 1fr))', gap: '0.625rem' }}>
                {[
                  { node: 'Node 1',     label: 'Webhook Ingestion',   sub: 'FastAPI trigger' },
                  { node: 'Node 2–3',   label: 'Schema Validation',   sub: 'Payload sanity check' },
                  { node: 'Node 4–5',   label: 'AI Anomaly Scorer',   sub: 'Multi-layer evaluation' },
                  { node: 'Node 6–8',   label: 'AP Notifications',    sub: 'Gmail + ERP queue' },
                ].map((n, i) => (
                  <div key={i} style={{ padding: '0.875rem', borderRadius: '6px', border: '1px solid var(--border)', backgroundColor: 'var(--surface)' }}>
                    <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.25rem' }}>{n.node}</span>
                    <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)', display: 'block' }}>{n.label}</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{n.sub}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Trace log */}
            {simulationTrace && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <p className="section-label" style={{ marginBottom: '0.25rem' }}>Execution Trace</p>
                {simulationTrace.map((step, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', padding: '0.625rem 0.875rem', borderRadius: '6px', border: '1px solid var(--border)', backgroundColor: 'var(--surface-subtle)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--success)', flexShrink: 0 }} />
                      <span style={{ fontWeight: 600, fontSize: '0.8125rem', color: 'var(--text-primary)' }} className="mono">{step.node}:</span>
                      <span style={{ color: 'var(--accent)', fontWeight: 600, fontSize: '0.8125rem' }} className="mono">{step.status}</span>
                    </div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '28rem' }}>
                      {step.summary || (step.details ? JSON.stringify(step.details) : 'Executed.')}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Supplier Master ── */}
        {activeTab === 'suppliers' && (
          <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <form onSubmit={handleAddSupplier} style={{ padding: '1rem 1.25rem', borderRadius: '8px', backgroundColor: 'var(--surface-subtle)', border: '1px solid var(--border)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(200px,100%),1fr))', gap: '0.75rem', alignItems: 'flex-end' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.375rem' }}>Supplier / Vendor Name</label>
                <input type="text" placeholder="e.g. Acme Tech Solutions" value={newSupName} onChange={e => setNewSupName(e.target.value)} className="input" required />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.375rem' }}>GSTIN (15 digits)</label>
                <input type="text" placeholder="29ABCDE1234F1Z5" value={newSupGstin} onChange={e => setNewSupGstin(e.target.value.toUpperCase())} className="input mono" required />
              </div>
              <button type="submit" className="btn btn-primary" style={{ alignSelf: 'flex-end' }}>
                <Plus size={14} /> Register
              </button>
            </form>
            <div className="table-wrap card overflow-hidden">
              <table className="data-table">
                <thead><tr><th>#</th><th>Supplier Name</th><th>GSTIN</th><th>Contact</th><th>Status</th></tr></thead>
                <tbody>
                  {suppliers.map(s => (
                    <tr key={s.id}>
                      <td className="mono" style={{ color: 'var(--text-muted)' }}>#{s.id}</td>
                      <td style={{ fontWeight: 600 }}>{s.supplier_name}</td>
                      <td className="mono" style={{ color: 'var(--accent)' }}>{s.gstin}</td>
                      <td style={{ color: 'var(--text-secondary)' }}>{s.contact_details || 'Verified Vendor'}</td>
                      <td><span style={{ fontSize: '0.75rem', fontWeight: 600, padding: '0.1875rem 0.5rem', borderRadius: '4px', backgroundColor: 'var(--success-bg)', color: 'var(--success)' }}>Registered</span></td>
                    </tr>
                  ))}
                  {suppliers.length === 0 && (
                    <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>No suppliers registered yet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Purchase Orders ── */}
        {activeTab === 'pos' && (
          <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <form onSubmit={handleAddPO} style={{ padding: '1rem 1.25rem', borderRadius: '8px', backgroundColor: 'var(--surface-subtle)', border: '1px solid var(--border)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(180px,100%),1fr))', gap: '0.75rem', alignItems: 'flex-end' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.375rem' }}>PO Number</label>
                <input type="text" placeholder="PO-2026-9901" value={newPoNumber} onChange={e => setNewPoNumber(e.target.value.toUpperCase())} className="input mono" required />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.375rem' }}>Authorized Vendor</label>
                <select value={newPoSupplierId} onChange={e => setNewPoSupplierId(parseInt(e.target.value))} className="input select-input">
                  {suppliers.map(s => <option key={s.id} value={s.id}>{s.supplier_name}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.375rem' }}>Expected Amount (INR)</label>
                <input type="number" placeholder="50000" value={newPoAmount} onChange={e => setNewPoAmount(e.target.value)} className="input" required />
              </div>
              <button type="submit" className="btn btn-primary" style={{ alignSelf: 'flex-end' }}>
                <Plus size={14} /> Create PO
              </button>
            </form>
            <div className="table-wrap card overflow-hidden">
              <table className="data-table">
                <thead><tr><th>PO Number</th><th>Supplier</th><th style={{ textAlign: 'right' }}>Expected Amount</th><th style={{ textAlign: 'center' }}>Status</th></tr></thead>
                <tbody>
                  {pos.map(p => (
                    <tr key={p.id}>
                      <td className="mono" style={{ fontWeight: 700 }}>{p.po_number}</td>
                      <td style={{ fontWeight: 500 }}>{p.supplier_name}</td>
                      <td style={{ textAlign: 'right', fontWeight: 700 }} className="tabular-nums">{formatINR(p.expected_amount)}</td>
                      <td style={{ textAlign: 'center' }}><span style={{ fontSize: '0.75rem', fontWeight: 600, padding: '0.1875rem 0.5rem', borderRadius: '4px', backgroundColor: 'var(--success-bg)', color: 'var(--success)' }}>{p.status || 'Active'}</span></td>
                    </tr>
                  ))}
                  {pos.length === 0 && (
                    <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>No purchase orders found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── System Config ── */}
        {activeTab === 'system' && (
          <div style={{ padding: '1.5rem' }}>
            <div className="auto-grid" style={{ '--min': '240px' } as React.CSSProperties}>
              {sysFields.map((f, i) => (
                <div key={i} style={{ padding: '1rem 1.125rem', borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: 'var(--surface-subtle)' }}>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>{f.label}</label>
                  <input readOnly value={f.value} className="input mono" style={{ backgroundColor: 'var(--surface)', color: 'var(--text-secondary)', cursor: 'default' }} />
                  <p style={{ margin: '0.375rem 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>{f.note}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
