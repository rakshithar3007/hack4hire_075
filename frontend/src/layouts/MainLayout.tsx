import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, FileText, UploadCloud, UserCheck,
  ShieldAlert, BarChart3, History, Settings,
  Bell, Search, LogOut, ChevronDown, Menu, X, ChevronLeft, ChevronRight
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { notificationApi } from '../services/api';
import { AppNotification } from '../types';
import { ServerStatusBanner } from '../components/ServerStatusBanner';
import { GlobalSearch } from '../components/GlobalSearch';
import { formatDateTime } from '../utils/formatters';

interface MainLayoutProps { children: React.ReactNode; }

export const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const { user, logout, quickSwitchRole } = useAuth();
  const location = useLocation();

  const [isCollapsed, setIsCollapsed] = useState<boolean>(() =>
    localStorage.getItem('invoiceguard_sidebar_collapsed') === 'true'
  );
  const [mobileOpen,        setMobileOpen]        = useState(false);
  const [searchOpen,        setSearchOpen]        = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [userMenuOpen,      setUserMenuOpen]      = useState(false);
  const [notifications,     setNotifications]     = useState<AppNotification[]>([]);
  const [unreadCount,       setUnreadCount]       = useState(0);

  /* keyboard shortcut ─────────────────────── */
  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      if ((e.key === '/' || (e.ctrlKey && e.key.toLowerCase() === 'k')) &&
          !['INPUT','TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
        e.preventDefault(); setSearchOpen(true);
      }
    };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, []);

  const toggleCollapse = () => {
    setIsCollapsed(prev => {
      const next = !prev;
      localStorage.setItem('invoiceguard_sidebar_collapsed', String(next));
      return next;
    });
  };

  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  const fetchNotifications = async () => {
    try {
      const res = await notificationApi.getAll();
      setNotifications(res.data);
      setUnreadCount(res.data.filter((n: AppNotification) => !n.read_status).length);
    } catch {}
  };
  useEffect(() => {
    fetchNotifications();
    const id = setInterval(fetchNotifications, 20000);
    return () => clearInterval(id);
  }, []);

  const handleMarkAllRead = async () => {
    try {
      await notificationApi.markAllRead();
      setUnreadCount(0);
      setNotifications(p => p.map(n => ({ ...n, read_status: true })));
    } catch {}
  };

  /* nav items ─────────────────────────────── */
  const role = (user?.role || 'employee').toLowerCase();
  const getNavItems = () => {
    if (role === 'employee') return [
      { label: 'Dashboard',      icon: LayoutDashboard, path: '/' },
      { label: 'My Invoices',    icon: FileText,        path: '/invoices' },
      { label: 'Upload Invoice', icon: UploadCloud,     path: '/upload' },
      { label: 'My Reports',     icon: BarChart3,       path: '/analytics' },
    ];
    if (role === 'manager') return [
      { label: 'Dashboard',         icon: LayoutDashboard, path: '/' },
      { label: 'Invoices',          icon: FileText,        path: '/invoices' },
      { label: 'Verification',      icon: ShieldAlert,     path: '/verification' },
      { label: 'Approvals',         icon: UserCheck,       path: '/approvals' },
      { label: 'Analytics',         icon: BarChart3,       path: '/analytics' },
    ];
    return [
      { label: 'Dashboard',    icon: LayoutDashboard, path: '/' },
      { label: 'Invoices',     icon: FileText,        path: '/invoices' },
      { label: 'Verification', icon: ShieldAlert,     path: '/verification' },
      { label: 'Approvals',    icon: UserCheck,       path: '/approvals' },
      { label: 'Analytics',    icon: BarChart3,       path: '/analytics' },
      { label: 'Audit Logs',   icon: History,         path: '/audit-logs' },
      { label: 'Settings',     icon: Settings,        path: '/settings' },
    ];
  };
  const navItems = getNavItems();

  /* breadcrumbs ───────────────────────────── */
  const getBreadcrumbs = () => {
    const p = location.pathname;
    if (p === '/')             return [{ label: 'Dashboard' }];
    if (p === '/invoices')     return [{ label: 'Invoices' }];
    if (p === '/upload')       return [{ label: 'Invoices', path: '/invoices' }, { label: 'Upload' }];
    if (p === '/extraction')   return [{ label: 'Invoices', path: '/invoices' }, { label: 'Review' }];
    if (p === '/verification') return [{ label: 'Verification & Fraud' }];
    if (p === '/approvals')    return [{ label: 'Approval Center' }];
    if (p === '/analytics')    return [{ label: 'Analytics' }];
    if (p === '/audit-logs')   return [{ label: 'Audit Logs' }];
    if (p === '/settings')     return [{ label: 'Settings' }];
    return [{ label: p.replace('/', '') }];
  };
  const breadcrumbs = getBreadcrumbs();

  const initials = user?.name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || 'U';
  const rolePillStyle: Record<string, React.CSSProperties> = {
    admin:    { backgroundColor: 'rgba(49,87,200,.12)', color: '#3157C8' },
    manager:  { backgroundColor: 'rgba(22,132,91,.12)', color: '#16845B' },
    employee: { backgroundColor: 'rgba(102,112,133,.12)', color: '#667085' },
  };
  const roleLabel: Record<string, string> = { admin: 'Admin', manager: 'Manager', employee: 'Employee' };

  /* active-link helper */
  const isActive = (path: string) =>
    location.pathname === path ||
    (path !== '/' && location.pathname.startsWith(path)) ||
    (path === '/invoices'     && ['/upload', '/extraction'].includes(location.pathname)) ||
    (path === '/verification' && ['/fraud', '/validation'].includes(location.pathname)) ||
    (path === '/analytics'    && location.pathname === '/reports') ||
    (path === '/audit-logs'   && location.pathname === '/audit');

  /* ─── render ──────────────────────────── */
  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100dvh', overflow:'hidden', backgroundColor:'var(--bg)', fontFamily:"'Inter',sans-serif" }}>
      <ServerStatusBanner />

      <div style={{ display:'flex', flex:1, overflow:'hidden', position:'relative' }}>

        {/* Mobile backdrop */}
        {mobileOpen && (
          <div onClick={() => setMobileOpen(false)}
            style={{ position:'fixed', inset:0, zIndex:40, backgroundColor:'rgba(0,0,0,0.5)' }}
            className="md:hidden" />
        )}

        {/* ═══════════ SIDEBAR ═══════════ */}
        <aside style={{
          position:'fixed', top:0, bottom:0, left:0, zIndex:41,
          display:'flex', flexDirection:'column', flexShrink:0,
          width: isCollapsed ? '60px' : '220px',
          backgroundColor:'var(--nav-bg)',
          borderRight:'1px solid var(--nav-border)',
          transition:'width 200ms ease, transform 200ms ease',
          transform: mobileOpen ? 'translateX(0)' : undefined,
        }}
          // On md+ always visible; on mobile hidden unless mobileOpen
          className={mobileOpen ? '' : '-translate-x-full md:translate-x-0 md:static'}
        >
          {/* Brand */}
          <div style={{ height:56, display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 14px', flexShrink:0, borderBottom:'1px solid var(--nav-border)' }}>
            <Link to="/" style={{ display:'flex', alignItems:'center', gap:'10px', minWidth:0, overflow:'hidden', textDecoration:'none' }}>
              <div style={{ width:28, height:28, borderRadius:6, backgroundColor:'var(--accent)', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontWeight:700, fontSize:11, flexShrink:0 }}>
                IG
              </div>
              {!isCollapsed && (
                <div style={{ minWidth:0, overflow:'hidden' }}>
                  <div style={{ fontWeight:600, color:'#fff', fontSize:13.5, lineHeight:'1.2', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>InvoiceGuard</div>
                  <div style={{ fontSize:11, color:'var(--nav-text)', lineHeight:'1.2' }}>AI Platform</div>
                </div>
              )}
            </Link>
            {/* Mobile close */}
            <button type="button" onClick={() => setMobileOpen(false)}
              style={{ background:'none', border:'none', cursor:'pointer', color:'var(--nav-text)', padding:4, display:'flex', alignItems:'center' }}
              className="md:hidden">
              <X size={16} />
            </button>
          </div>

          {/* Nav links */}
          <nav style={{ flex:1, overflowY:'auto', padding:'12px 8px', display:'flex', flexDirection:'column', gap:2 }}>
            {navItems.map(item => {
              const Icon = item.icon;
              const active = isActive(item.path);
              return (
                <Link key={item.path} to={item.path} title={isCollapsed ? item.label : undefined}
                  style={{
                    display:'flex', alignItems:'center', gap:10,
                    padding: isCollapsed ? '10px 0' : '8px 12px',
                    justifyContent: isCollapsed ? 'center' : 'flex-start',
                    borderRadius:6, textDecoration:'none',
                    backgroundColor: active ? 'var(--nav-active-bg)' : 'transparent',
                    color: active ? 'var(--nav-text-active)' : 'var(--nav-text)',
                    fontWeight: active ? 500 : 400,
                    transition:'background-color 100ms ease, color 100ms ease',
                  }}
                  onMouseEnter={e => { if (!active) { const el = e.currentTarget as HTMLAnchorElement; el.style.backgroundColor='rgba(255,255,255,.06)'; el.style.color='#fff'; } }}
                  onMouseLeave={e => { if (!active) { const el = e.currentTarget as HTMLAnchorElement; el.style.backgroundColor='transparent'; el.style.color='var(--nav-text)'; } }}
                >
                  <Icon size={16} style={{ flexShrink:0 }} />
                  {!isCollapsed && <span style={{ fontSize:13, lineHeight:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{item.label}</span>}
                </Link>
              );
            })}
          </nav>

          {/* User footer */}
          <div style={{ padding:'8px', flexShrink:0, borderTop:'1px solid var(--nav-border)' }}>
            {!isCollapsed ? (
              <div style={{ display:'flex', alignItems:'center', gap:10, padding:'8px' }}>
                <div style={{ width:28, height:28, borderRadius:'50%', backgroundColor:'var(--accent)', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontWeight:600, fontSize:11, flexShrink:0 }}>
                  {initials}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:12.5, fontWeight:500, color:'#fff', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', lineHeight:'1.2' }}>{user?.name || 'User'}</div>
                  <span style={{ ...rolePillStyle[role], fontSize:10.5, fontWeight:600, padding:'1px 6px', borderRadius:3, display:'inline-block', marginTop:2 }}>
                    {roleLabel[role] || role}
                  </span>
                </div>
                <button type="button" onClick={logout} title="Sign out"
                  style={{ background:'none', border:'none', cursor:'pointer', color:'var(--nav-text)', padding:4, display:'flex', alignItems:'center', flexShrink:0 }}>
                  <LogOut size={14} />
                </button>
              </div>
            ) : (
              <div style={{ display:'flex', justifyContent:'center' }}>
                <button type="button" onClick={logout} title={`Sign out (${user?.name})`}
                  style={{ background:'none', border:'none', cursor:'pointer', color:'var(--nav-text)', padding:8, display:'flex', alignItems:'center' }}>
                  <LogOut size={14} />
                </button>
              </div>
            )}
          </div>

          {/* Collapse toggle (desktop) */}
          <button type="button" onClick={toggleCollapse}
            className="hidden md:flex"
            style={{ position:'absolute', right:-12, top:70, width:24, height:24, borderRadius:'50%', border:'1px solid var(--border)', backgroundColor:'var(--surface)', color:'var(--text-secondary)', alignItems:'center', justifyContent:'center', cursor:'pointer', zIndex:50, boxShadow:'0 1px 4px rgba(0,0,0,.1)' }}>
            {isCollapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
          </button>
        </aside>

        {/* Spacer that pushes main content when sidebar is static on desktop */}
        <div className="hidden md:block flex-shrink-0" style={{ width: isCollapsed ? 60 : 220, transition:'width 200ms ease' }} />

        {/* ═══════════ MAIN AREA ═══════════ */}
        <div style={{ flex:1, display:'flex', flexDirection:'column', minWidth:0, overflow:'hidden' }}>

          {/* Top header */}
          <header style={{ height:56, backgroundColor:'var(--surface)', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 16px', flexShrink:0, zIndex:20, gap:12 }}>

            {/* Left */}
            <div style={{ display:'flex', alignItems:'center', gap:10, minWidth:0, overflow:'hidden' }}>
              {/* Mobile menu toggle */}
              <button type="button" onClick={() => setMobileOpen(true)}
                className="md:hidden"
                style={{ padding:6, border:'1px solid var(--border)', borderRadius:6, background:'var(--surface)', color:'var(--text-primary)', display:'flex', alignItems:'center', cursor:'pointer', flexShrink:0 }}
                aria-label="Open menu">
                <Menu size={16} />
              </button>

              {/* Breadcrumbs */}
              <nav aria-label="Breadcrumb" style={{ display:'flex', alignItems:'center', gap:6, minWidth:0, overflow:'hidden' }}>
                <span style={{ fontSize:13, color:'var(--text-muted)', whiteSpace:'nowrap' }} className="hidden sm:inline">InvoiceGuard</span>
                {breadcrumbs.map((bc, idx) => {
                  const isLast = idx === breadcrumbs.length - 1;
                  return (
                    <React.Fragment key={idx}>
                      <span style={{ color:'var(--text-muted)', fontSize:13 }} className="hidden sm:inline">/</span>
                      {isLast
                        ? <span style={{ fontSize:13, fontWeight:600, color:'var(--text-primary)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{bc.label}</span>
                        : <Link to={bc.path!} style={{ fontSize:13, color:'var(--text-secondary)', textDecoration:'none', whiteSpace:'nowrap' }}>{bc.label}</Link>
                      }
                    </React.Fragment>
                  );
                })}
              </nav>
            </div>

            {/* Right controls */}
            <div style={{ display:'flex', alignItems:'center', gap:8, flexShrink:0 }}>
              {/* Search */}
              <button type="button" onClick={() => setSearchOpen(true)}
                style={{ display:'flex', alignItems:'center', gap:8, padding:'6px 12px', borderRadius:6, border:'1px solid var(--border)', backgroundColor:'var(--surface-subtle)', color:'var(--text-muted)', cursor:'pointer', whiteSpace:'nowrap' }}>
                <Search size={13} />
                <span style={{ fontSize:12.5 }} className="hidden sm:inline">Search…</span>
                <kbd style={{ fontSize:11, padding:'1px 6px', borderRadius:4, border:'1px solid var(--border)', backgroundColor:'var(--surface)', fontFamily:'monospace' }} className="hidden sm:inline">/</kbd>
              </button>

              {/* Notifications */}
              <div style={{ position:'relative' }}>
                <button type="button" onClick={() => setNotificationsOpen(p => !p)}
                  style={{ position:'relative', padding:6, borderRadius:6, border:'1px solid var(--border)', backgroundColor:'var(--surface)', color:'var(--text-secondary)', cursor:'pointer', display:'flex', alignItems:'center' }}
                  aria-label="Notifications">
                  <Bell size={15} />
                  {unreadCount > 0 && (
                    <span style={{ position:'absolute', top:-4, right:-4, width:16, height:16, borderRadius:'50%', backgroundColor:'var(--danger)', color:'#fff', fontSize:10, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center' }}>
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>

                {notificationsOpen && (
                  <>
                    <div style={{ position:'fixed', inset:0, zIndex:40 }} onClick={() => setNotificationsOpen(false)} />
                    <div style={{ position:'absolute', right:0, top:42, width:300, maxWidth:'calc(100vw - 32px)', backgroundColor:'var(--surface)', border:'1px solid var(--border)', borderRadius:8, boxShadow:'var(--shadow-md)', zIndex:50, overflow:'hidden' }}>
                      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 16px', borderBottom:'1px solid var(--border)' }}>
                        <span style={{ fontSize:13, fontWeight:600, color:'var(--text-primary)' }}>Notifications</span>
                        {unreadCount > 0 && (
                          <button type="button" onClick={handleMarkAllRead} style={{ fontSize:12, color:'var(--accent)', background:'none', border:'none', cursor:'pointer' }}>Mark all read</button>
                        )}
                      </div>
                      <div style={{ maxHeight:240, overflowY:'auto' }}>
                        {notifications.length === 0
                          ? <div style={{ padding:16, textAlign:'center', fontSize:13, color:'var(--text-muted)' }}>No notifications.</div>
                          : notifications.slice(0,6).map(n => (
                            <div key={n.id} style={{ padding:'10px 16px', borderBottom:'1px solid var(--border)', backgroundColor: n.read_status ? 'var(--surface)' : 'var(--surface-subtle)' }}>
                              <p style={{ fontSize:13, color:'var(--text-primary)', lineHeight:1.4, margin:0 }}>{n.message}</p>
                              <span style={{ fontSize:11.5, color:'var(--text-muted)', display:'block', marginTop:3 }}>{formatDateTime(n.created_at)}</span>
                            </div>
                          ))
                        }
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* User */}
              <div style={{ position:'relative' }}>
                <button type="button" onClick={() => setUserMenuOpen(p => !p)}
                  style={{ display:'flex', alignItems:'center', gap:6, padding:'4px 6px 4px 8px', borderRadius:6, border:'1px solid var(--border)', backgroundColor:'var(--surface)', cursor:'pointer' }}>
                  <div style={{ width:24, height:24, borderRadius:'50%', backgroundColor:'var(--accent)', color:'#fff', fontWeight:600, fontSize:11, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                    {initials}
                  </div>
                  <span style={{ fontSize:12.5, fontWeight:500, color:'var(--text-primary)' }} className="hidden sm:inline">{user?.name}</span>
                  <span style={{ ...rolePillStyle[role], fontSize:11, fontWeight:600, padding:'2px 6px', borderRadius:4, whiteSpace:'nowrap' }}>
                    {roleLabel[role]}
                  </span>
                  <ChevronDown size={12} style={{ color:'var(--text-muted)', flexShrink:0 }} />
                </button>

                {userMenuOpen && (
                  <>
                    <div style={{ position:'fixed', inset:0, zIndex:40 }} onClick={() => setUserMenuOpen(false)} />
                    <div style={{ position:'absolute', right:0, top:42, width:220, maxWidth:'calc(100vw - 32px)', backgroundColor:'var(--surface)', border:'1px solid var(--border)', borderRadius:8, boxShadow:'var(--shadow-md)', zIndex:50, overflow:'hidden' }}>
                      <div style={{ padding:'12px 16px', borderBottom:'1px solid var(--border)' }}>
                        <p style={{ fontSize:13.5, fontWeight:600, color:'var(--text-primary)', margin:'0 0 2px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{user?.name}</p>
                        <p style={{ fontSize:12, color:'var(--text-muted)', margin:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{user?.email}</p>
                      </div>
                      <div style={{ padding:'10px 16px', borderBottom:'1px solid var(--border)' }}>
                        <p className="section-label" style={{ marginBottom:8 }}>Quick role switch</p>
                        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:6 }}>
                          {(['admin','manager','employee'] as const).map(r => (
                            <button key={r} type="button" onClick={async () => { await quickSwitchRole(r); setUserMenuOpen(false); }}
                              style={{ padding:'5px 0', fontSize:11.5, fontWeight:500, borderRadius:5, border:'1px solid var(--border)', backgroundColor: role===r ? 'var(--accent)' : 'var(--surface-subtle)', color: role===r ? '#fff' : 'var(--text-primary)', cursor:'pointer', textTransform:'capitalize' }}>
                              {r}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div style={{ padding:'6px 12px' }}>
                        <button type="button" onClick={() => { setUserMenuOpen(false); logout(); }}
                          style={{ width:'100%', textAlign:'left', fontSize:13, fontWeight:500, color:'var(--danger)', background:'none', border:'none', cursor:'pointer', padding:'8px', borderRadius:5, display:'flex', alignItems:'center', gap:8 }}
                          onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.backgroundColor='var(--danger-bg)'}
                          onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.backgroundColor='transparent'}>
                          <LogOut size={13} /> Sign Out
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </header>

          {/* Page content */}
          <main style={{ flex:1, overflowY:'auto', overflowX:'hidden' }}>
            <div style={{ maxWidth:1280, margin:'0 auto', padding:'20px 16px' }} className="sm:px-6 lg:px-8">
              {children}
            </div>
          </main>
        </div>
      </div>

      <GlobalSearch isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  );
};
