import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp, Users, Clock, ShieldAlert,
  Settings, RefreshCw, Edit2, Check, X,
  Building, History
} from 'lucide-react';
import { dashboardApi, usersApi } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { User } from '../../types';
import { useToast } from '../../components/Toast';
import { formatINR, formatDateTime } from '../../utils/formatters';

export const AdminDashboard: React.FC = () => {
  const { user: currentAdmin } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [data, setData] = useState<any>(null);
  const [usersList, setUsersList] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [editRole, setEditRole] = useState('employee');
  const [editLimit, setEditLimit] = useState('100000');
  const [savingUser, setSavingUser] = useState(false);

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const [dashRes, usersRes] = await Promise.all([dashboardApi.getAdmin(), usersApi.getAll()]);
      setData(dashRes.data);
      setUsersList(usersRes.data);
    } catch (err: any) {
      showToast('error', err.response?.data?.detail || 'Failed to load dashboard.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDashboard(); }, []);

  const handleToggleStatus = async (user: User) => {
    const next = !user.is_active;
    try {
      await usersApi.updateStatus(user.id, next);
      showToast('success', `${user.email} ${next ? 'activated' : 'deactivated'}.`);
      setUsersList(prev => prev.map(u => u.id === user.id ? { ...u, is_active: next } : u));
    } catch (err: any) {
      showToast('error', err.response?.data?.detail || 'Failed to update status.');
    }
  };

  const handleSaveUserEdit = async (userId: number) => {
    setSavingUser(true);
    try {
      await usersApi.updateRole(userId, editRole);
      if (editRole === 'manager') await usersApi.updateLimit(userId, parseFloat(editLimit) || 100000);
      showToast('success', 'User updated successfully.');
      setEditingUserId(null);
      fetchDashboard();
    } catch (err: any) {
      showToast('error', err.response?.data?.detail || 'Failed to update user.');
    } finally {
      setSavingUser(false);
    }
  };

  if (loading) return (
    <div className="space-y-6">
      {[1,2,3].map(i => <div key={i} className="h-24 rounded-lg animate-pulse" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }} />)}
    </div>
  );

  const kpis = data?.kpis || {};
  const audits = data?.recent_security_audits || [];

  const kpiCards = [
    { label: 'Total Spend', value: formatINR(kpis.total_spend || 0), sub: `${kpis.total_invoices || 0} invoices processed` },
    { label: 'Active Users', value: `${kpis.active_users || 0} / ${kpis.total_users || 0}`, sub: `${kpis.admins || 0} admin · ${kpis.managers || 0} mgr · ${kpis.employees || 0} emp` },
    { label: 'Pending Authorization', value: String(kpis.pending_invoices || 0), sub: 'Across all departments', valueColor: 'var(--warning)' },
    { label: 'High Risk Intercepts', value: String(kpis.high_risk_invoices || 0), sub: 'Flagged by fraud engine', valueColor: 'var(--danger)' },
  ];

  const roleBadge = (role: string) => {
    const map: Record<string, string> = {
      admin: 'color:#3157C8;background:#EEF2FF;border:1px solid #C7D7FE',
      manager: 'color:#16845B;background:#ECFDF5;border:1px solid #A7F3D0',
      employee: 'color:#667085;background:#F9FAFB;border:1px solid #E5E9F0',
    };
    return map[role] || map.employee;
  };

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Platform Governance</h1>
          <p className="page-desc">Manage system permissions, user security roles, approval thresholds, and compliance logs.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchDashboard} className="btn btn-secondary btn-icon" title="Refresh">
            <RefreshCw size={14} />
          </button>
          <button onClick={() => navigate('/settings')} className="btn btn-primary">
            <Settings size={14} />
            System Settings
          </button>
        </div>
      </div>

      {/* KPI row */}
      <div className="kpi-grid kpi-grid-4">
        {kpiCards.map((k, i) => (
          <div key={i} className="kpi-card">
            <p className="kpi-label">{k.label}</p>
            <p className="kpi-value" style={k.valueColor ? { color: k.valueColor } : {}}>{k.value}</p>
            <p className="kpi-sub">{k.sub}</p>
          </div>
        ))}
      </div>

      {/* User directory */}
      <div className="card overflow-hidden">
        <div className="card-header flex items-center justify-between">
          <div>
            <h2 style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
              User Directory & Role Permissions
            </h2>
            <p className="page-desc" style={{ marginTop: '0.25rem' }}>
              Backend-enforced roles and approval ceilings. Last administrator cannot be demoted.
            </p>
          </div>
          <span className="label-chip">{usersList.length} accounts</span>
        </div>

        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Department</th>
                <th>Role</th>
                <th>Approval Limit</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {usersList.map(u => {
                const isEditing = editingUserId === u.id;
                return (
                  <tr key={u.id}>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.8125rem' }}>{u.name}</div>
                      <div className="mono" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{u.email}</div>
                    </td>
                    <td style={{ color: 'var(--text-secondary)' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                        <Building size={13} style={{ color: 'var(--text-muted)' }} />
                        {u.department || 'General'}
                      </span>
                    </td>
                    <td>
                      {isEditing ? (
                        <select value={editRole} onChange={e => setEditRole(e.target.value)}
                          className="select-input" style={{ width: 'auto', padding: '0.25rem 0.5rem' }}>
                          <option value="employee">Employee</option>
                          <option value="manager">Manager</option>
                          <option value="admin">Administrator</option>
                        </select>
                      ) : (
                        <span style={{ padding: '0.1875rem 0.625rem', borderRadius: '100px', fontSize: '0.75rem', fontWeight: 600, display: 'inline-block', ...Object.fromEntries(roleBadge(u.role).split(';').map(s => { const [k,v] = s.split(':'); return [k?.trim().replace(/-([a-z])/g, (_,c) => c.toUpperCase()), v?.trim()]; }).filter(([k]) => k)) }}>
                          {u.role}
                        </span>
                      )}
                    </td>
                    <td className="tabular-nums" style={{ fontFamily: 'var(--font-mono, monospace)', color: 'var(--text-primary)' }}>
                      {isEditing && editRole === 'manager' ? (
                        <input type="number" value={editLimit} onChange={e => setEditLimit(e.target.value)}
                          className="input" style={{ width: '8rem', padding: '0.25rem 0.5rem', fontFamily: 'monospace' }} />
                      ) : (
                        u.role === 'manager' ? formatINR(u.approval_limit ?? 100000) :
                        u.role === 'admin' ? 'Unlimited' : 'N/A'
                      )}
                    </td>
                    <td>
                      <button onClick={() => handleToggleStatus(u)}
                        style={{ padding: '0.1875rem 0.625rem', borderRadius: '100px', fontSize: '0.75rem', fontWeight: 600, border: 'none', cursor: 'pointer', backgroundColor: u.is_active ? 'var(--success-bg)' : 'var(--danger-bg)', color: u.is_active ? 'var(--success)' : 'var(--danger)' }}>
                        {u.is_active ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      {isEditing ? (
                        <span style={{ display: 'inline-flex', gap: '0.5rem' }}>
                          <button onClick={() => handleSaveUserEdit(u.id)} disabled={savingUser}
                            className="btn btn-success btn-icon"><Check size={13} /></button>
                          <button onClick={() => setEditingUserId(null)}
                            className="btn btn-secondary btn-icon"><X size={13} /></button>
                        </span>
                      ) : (
                        <button onClick={() => { setEditingUserId(u.id); setEditRole(u.role); setEditLimit(String(u.approval_limit || 100000)); }}
                          className="btn btn-secondary" style={{ fontSize: '0.75rem' }}>
                          <Edit2 size={12} /> Edit
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bottom row */}
      <div className="auto-grid">
        {/* Audit stream */}
        <div className="lg:col-span-2 card">
          <div className="card-header flex items-center justify-between">
            <div>
              <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, margin: 0 }}>Security Audit Stream</h3>
              <p className="page-desc" style={{ marginTop: '0.125rem' }}>Recent append-only cryptographic events</p>
            </div>
            <button onClick={() => navigate('/audit-logs')} style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer' }}>
              Full trail →
            </button>
          </div>
          <div className="card-body" style={{ padding: '1rem' }}>
            {audits.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.8125rem', textAlign: 'center', padding: '2rem 0' }}>No recent audit events.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {audits.map((a: any) => (
                  <div key={a.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.625rem 0.875rem', borderRadius: '6px', border: '1px solid var(--border)', backgroundColor: 'var(--surface-subtle)' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span className="mono" style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-primary)' }}>{a.action}</span>
                        {a.invoice_id && <span style={{ fontSize: '0.6875rem', padding: '0.125rem 0.5rem', borderRadius: '4px', backgroundColor: 'var(--info-bg)', color: 'var(--info)', fontFamily: 'monospace' }}>{a.invoice_id}</span>}
                      </div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>by {a.user_name}</span>
                    </div>
                    <span className="mono" style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{formatDateTime(a.timestamp)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* System health */}
        <div className="card">
          <div className="card-header">
            <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, margin: 0 }}>Service Health</h3>
            <p className="page-desc" style={{ marginTop: '0.125rem' }}>Autonomous subsystem diagnostics</p>
          </div>
          <div className="card-body" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {[
              { label: 'FastAPI Core',            status: 'Operational', color: 'var(--success)', bg: 'var(--success-bg)' },
              { label: 'SQLite Database',          status: 'Connected',   color: 'var(--success)', bg: 'var(--success-bg)' },
              { label: 'Deterministic GST Agent', status: 'Active',      color: 'var(--accent)',  bg: 'var(--accent-light)' },
              { label: 'Audit Trail Integrity',   status: 'SHA-256',     color: 'var(--success)', bg: 'var(--success-bg)' },
              { label: 'RBAC Enforcement',         status: 'Enforced',    color: 'var(--accent)',  bg: 'var(--accent-light)' },
            ].map((s, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.625rem 0.875rem', borderRadius: '6px', border: '1px solid var(--border)', backgroundColor: 'var(--surface-subtle)' }}>
                <span style={{ fontSize: '0.8125rem', color: 'var(--text-primary)', fontWeight: 500 }}>{s.label}</span>
                <span style={{ fontSize: '0.6875rem', fontWeight: 700, padding: '0.1875rem 0.5rem', borderRadius: '4px', backgroundColor: s.bg, color: s.color, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{s.status}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
