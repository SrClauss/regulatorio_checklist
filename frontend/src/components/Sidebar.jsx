import React from 'react';
import { api } from '../api';
import { 
  Shield, 
  LayoutDashboard, 
  Calendar, 
  FileText, 
  Settings, 
  LogOut, 
  User,
  WifiOff,
  Building,
  BarChart3,
  Briefcase
} from 'lucide-react';

export default function Sidebar({ user, activeTab, setActiveTab, onLogout, isOnline }) {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', shortLabel: 'Dashboard', icon: LayoutDashboard, roles: ['admin', 'consultor'] },
    { id: 'empresas', label: 'Empresas', shortLabel: 'Empresas', icon: Building, roles: ['admin', 'consultor'] },
    { id: 'documentos', label: 'Documentos & Licenças', shortLabel: 'Documentos', icon: FileText, roles: ['admin', 'consultor', 'cliente'] },
    // Substituindo o calendário direto pelo Cronograma Operacional na navegação principal
    { id: 'cronograma', label: 'Cronograma', shortLabel: 'Cronograma', icon: Calendar, roles: ['admin', 'consultor', 'cliente'] },
    { id: 'relatorios', label: 'Relatórios', shortLabel: 'Relatórios', icon: BarChart3, roles: ['admin', 'consultor', 'cliente'] },
    { id: 'prestadores', label: 'Prestadores de Serviço', shortLabel: 'Prestadores', icon: Briefcase, roles: ['admin', 'consultor', 'cliente'] },
    { id: 'cadastros', label: 'Cadastros & Painel', shortLabel: 'Cadastros', icon: Settings, roles: ['admin'] },
  ];

  const filteredMenuItems = menuItems.filter(item => item.roles.includes(user.role));

  const handleLogout = () => {
    api.logout();
    onLogout();
  };

  const getRoleLabel = (role) => {
    switch (role) {
      case 'admin': return 'Administrador';
      case 'consultor': return 'Consultor Técnico';
      case 'cliente': return 'Cliente';
      default: return role;
    }
  };

  return (
    <>
      {/* Top Header (Visible Only on Mobile) */}
      <header className="mobile-top-header glass-panel">
        <div className="mobile-brand">
          <div className="mobile-brand-icon">
            <Shield size={20} color="#2563eb" />
          </div>
          <h2>Claudio</h2>
          {!isOnline && (
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.2rem',
              background: 'rgba(239, 68, 68, 0.15)',
              color: 'var(--danger)',
              fontSize: '0.7rem',
              fontWeight: '600',
              padding: '0.2rem 0.45rem',
              borderRadius: '6px',
              marginLeft: '0.5rem'
            }}>
              <WifiOff size={10} /> Offline
            </span>
          )}
        </div>
        <button onClick={handleLogout} className="glass-btn mobile-logout-btn">
          <LogOut size={16} /> Sair
        </button>
      </header>

      {/* Main Sidebar / Bottom Nav on Mobile */}
      <div className="glass-panel sidebar-container">
        {/* Brand Header */}
        <div className="sidebar-brand">
          <div className="sidebar-brand-icon">
            <Shield size={24} color="#2563eb" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <h2 className="sidebar-brand-title">Claudio</h2>
              {!isOnline && (
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.2rem',
                  background: 'rgba(239, 68, 68, 0.15)',
                  color: 'var(--danger)',
                  fontSize: '0.65rem',
                  fontWeight: '600',
                  padding: '0.15rem 0.35rem',
                  borderRadius: '6px',
                }}>
                  <WifiOff size={9} /> Offline
                </span>
              )}
            </div>
            <span className="sidebar-brand-subtitle">Gestão Regulatória</span>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="sidebar-nav">
          {filteredMenuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`sidebar-nav-item ${isActive ? 'active' : ''}`}
              >
                <Icon size={20} color={isActive ? '#2563eb' : 'var(--text-muted)'} />
                <span className="sidebar-nav-label">
                  <span className="nav-label-desktop">{item.label}</span>
                  <span className="nav-label-mobile">{item.shortLabel || item.label}</span>
                </span>
              </button>
            );
          })}
        </nav>

        {/* User Footer Profile */}
        <div className="sidebar-footer">
          <div className="sidebar-user-card">
            <div className="sidebar-user-avatar">
              <User size={20} color="var(--text-main)" />
            </div>
            <div className="sidebar-user-info">
              <h4 className="sidebar-user-name">{user.nome}</h4>
              <span className="sidebar-user-role">{getRoleLabel(user.role)}</span>
            </div>
          </div>

          <button onClick={handleLogout} className="glass-btn sidebar-logout-btn">
            <LogOut size={16} />
            <span>Sair do Sistema</span>
          </button>
        </div>
      </div>
    </>
  );
}
