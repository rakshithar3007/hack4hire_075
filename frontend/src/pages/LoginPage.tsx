import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Lock, Mail, User as UserIcon, ArrowRight } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export const LoginPage: React.FC = () => {
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const [isRegistering, setIsRegistering] = useState(false);
  const [name, setName]         = useState('');
  const [email, setEmail]       = useState('admin@invoiceguard.ai');
  const [password, setPassword] = useState('Admin@123');
  const [role, setRole]         = useState('admin');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading]   = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);
    try {
      if (isRegistering) {
        await register(name, email, password, role);
      } else {
        await login(email, password);
      }
      navigate('/');
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoFill = (demoEmail: string, demoPass: string, demoRole: string) => {
    setIsRegistering(false);
    setEmail(demoEmail);
    setPassword(demoPass);
    setRole(demoRole);
  };

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', overflow: 'hidden', backgroundColor: '#F5F7FA' }}>
      {/* Left panel — branding */}
      <div style={{ width: 480, flexShrink: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '3rem', backgroundColor: '#111827' }} className="hidden lg:flex">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-[7px] overflow-hidden bg-white flex items-center justify-center flex-shrink-0 shadow-sm">
            <img src="/logo-icon.png" alt="InvoiceGuard AI Logo" className="w-full h-full object-contain p-0.5" />
          </div>
          <span className="text-white font-semibold text-[15px]">InvoiceGuard AI</span>
        </div>

        <div className="space-y-8">
          <div>
            <h1 className="text-3xl font-bold text-white leading-snug">
              Intelligent Invoice<br />Processing & Fraud Detection
            </h1>
            <p className="mt-4 text-[15px] leading-relaxed" style={{ color: '#9CA3AF' }}>
              Deterministic GST verification, SHA-256 cryptographic audit trail, and multi-engine fraud analysis — built for enterprise AP operations.
            </p>
          </div>

          <div className="space-y-3">
            {[
              'Three-way PO reconciliation',
              'Duplicate invoice detection via SHA-256 hash',
              'Role-based approval with segregation of duties',
              'Cryptographic append-only audit ledger',
            ].map((feature, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: '#3157C8' }} />
                <span className="text-[13.5px]" style={{ color: '#D1D5DB' }}>{feature}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="text-[12px]" style={{ color: '#6B7280' }}>
          © 2026 InvoiceGuard AI · Enterprise AP Intelligence Platform
        </p>
      </div>

      {/* Right panel — form */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem 1.5rem', overflowY: 'auto', minHeight: 0 }}>
        <div className="w-full max-w-[400px]">
          {/* Mobile brand */}
          <div className="lg:hidden flex items-center gap-2.5 mb-8">
            <div className="w-8 h-8 rounded-[7px] overflow-hidden bg-white flex items-center justify-center flex-shrink-0 shadow-sm border border-slate-200">
              <img src="/logo-icon.png" alt="InvoiceGuard AI Logo" className="w-full h-full object-contain p-0.5" />
            </div>
            <span className="font-semibold text-[15px]" style={{ color: '#172033' }}>InvoiceGuard AI</span>
          </div>

          <div className="mb-8">
            <h2 className="text-[26px] font-bold" style={{ color: '#172033', letterSpacing: '-0.025em' }}>
              {isRegistering ? 'Create account' : 'Sign in'}
            </h2>
            <p className="mt-1.5 text-[14px]" style={{ color: '#667085' }}>
              {isRegistering
                ? 'Register a new InvoiceGuard account.'
                : 'Access the enterprise invoice platform.'}
            </p>
          </div>

          {/* Quick demo login */}
          <div className="mb-6 p-4 rounded-[8px]" style={{ backgroundColor: '#F9FAFB', border: '1px solid #E5E9F0' }}>
            <p className="section-label mb-2.5">Quick demo access</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '0.5rem' }}>
              {[
                { label: 'Admin',    email: 'admin@invoiceguard.ai',    pass: 'Admin@123',    role: 'admin' },
                { label: 'Manager', email: 'manager@invoiceguard.ai',  pass: 'Manager@123',  role: 'manager' },
                { label: 'Employee',email: 'employee@invoiceguard.ai', pass: 'Employee@123', role: 'employee' },
              ].map(d => (
                <button
                  key={d.role}
                  type="button"
                  onClick={() => handleDemoFill(d.email, d.pass, d.role)}
                  style={{
                    padding: '0.5rem 0',
                    fontSize: '0.8125rem',
                    fontWeight: 500,
                    borderRadius: '6px',
                    border: '1px solid #E5E9F0',
                    backgroundColor: email === d.email ? '#3157C8' : '#FFFFFF',
                    color: email === d.email ? '#fff' : '#172033',
                    cursor: 'pointer',
                    minWidth: 0,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          {errorMsg && (
            <div className="mb-5 p-3 rounded-[6px] text-[13px] font-medium" style={{ backgroundColor: '#FEF2F2', border: '1px solid #FECACA', color: '#D14343' }}>
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegistering && (
              <div>
                <label className="block text-[13px] font-medium mb-1.5" style={{ color: '#172033' }}>Full Name</label>
                <div className="input-with-icon">
                  <UserIcon size={14} className="input-icon" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Alex Henderson"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="input"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-[13px] font-medium mb-1.5" style={{ color: '#172033' }}>Email address</label>
              <div className="input-with-icon">
                <Mail size={14} className="input-icon" />
                <input
                  type="email"
                  required
                  placeholder="you@company.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="input"
                />
              </div>
            </div>

            <div>
              <label className="block text-[13px] font-medium mb-1.5" style={{ color: '#172033' }}>Password</label>
              <div className="input-with-icon">
                <Lock size={14} className="input-icon" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="input"
                />
              </div>
            </div>

            {isRegistering && (
              <div>
                <label className="block text-[13px] font-medium mb-1.5" style={{ color: '#172033' }}>Role</label>
                <select
                  value={role}
                  onChange={e => setRole(e.target.value)}
                  className="input select-input"
                >
                  <option value="employee">Employee — Upload & Extract</option>
                  <option value="manager">Manager — Approve & Escalate</option>
                  <option value="admin">Administrator — Full Control</option>
                </select>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary w-full py-2.5 text-[14px] mt-2"
              style={{ justifyContent: 'center' }}
            >
              {loading ? 'Authenticating…' : (isRegistering ? 'Create Account' : 'Sign In')}
              {!loading && <ArrowRight size={15} />}
            </button>
          </form>

          <p className="mt-6 text-center text-[13px]" style={{ color: '#667085' }}>
            {isRegistering ? (
              <>Already have an account?{' '}
                <button type="button" onClick={() => setIsRegistering(false)} className="font-semibold transition-colors" style={{ color: '#3157C8' }}>Sign in</button>
              </>
            ) : (
              <>Need an enterprise account?{' '}
                <button type="button" onClick={() => setIsRegistering(true)} className="font-semibold transition-colors" style={{ color: '#3157C8' }}>Register</button>
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
};
