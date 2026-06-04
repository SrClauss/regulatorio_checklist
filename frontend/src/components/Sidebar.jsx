import React from 'react';
import { api } from '../api';
import { 
  Shield, 
  LayoutDashboard, 
  Calendar, 
  CheckSquare, 
  Settings, 
  LogOut, 
  User 
} from 'lucide-react';

export default function Sidebar({ user, activeTab, setActiveTab, onLogout }) {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['admin', 'consultor'] },
    { id: 'calendario', label: 'Calendário', icon: Calendar, roles: ['admin', 'consultor', 'cliente'] },
    { id: 'checklist', label: 'Checklist & Auditoria', icon: CheckSquare, roles: ['admin', 'consultor', 'cliente'] },
    { id: 'cadastros', label: 'Cadastros & Painel', icon: Settings, roles: ['admin'] },
  ];

  // Filtra itens de menu de acordo com a role do usuário logado
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
    <div className="glass-panel" style={styles.sidebar}>
      {/* Brand Header */}
      <div style={styles.brand}>
        <div style={styles.brandIconBg}>
          <Shield size={24} color="#2563eb" />
        </div>
        <div>
          <h2 style={styles.brandTitle}>Claudio</h2>
          <span style={styles.brandSubtitle}>Gestão Regulatória</span>
        </div>
      </div>

      {/* Navigation Menu */}
      <nav style={styles.nav}>
        {filteredMenuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              style={{
                ...styles.navItem,
                ...(isActive ? styles.navItemActive : {}),
              }}
            >
              <Icon size={20} color={isActive ? '#2563eb' : 'var(--text-muted)'} />
              <span style={{
                ...styles.navLabel,
                ...(isActive ? styles.navLabelActive : {}),
              }}>
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>

      {/* User Footer Profile */}
      <div style={styles.footer}>
        <div style={styles.userCard}>
          <div style={styles.userAvatarBg}>
            <User size={20} color="var(--text-main)" />
          </div>
          <div style={styles.userInfo}>
            <h4 style={styles.userName}>{user.nome}</h4>
            <span style={styles.userRole}>{getRoleLabel(user.role)}</span>
          </div>
        </div>

        <button onClick={handleLogout} style={styles.logoutBtn} className="glass-btn">
          <LogOut size={16} />
          Sair do Sistema
        </button>
      </div>
    </div>
  );
}

const styles = {
  sidebar: {
    position: 'fixed',
    top: '1.5rem',
    left: '1.5rem',
    bottom: '1.5rem',
    width: '260px',
    display: 'flex',
    flexDirection: 'column',
    padding: '2rem 1.25rem',
    zIndex: 100,
    borderRadius: '24px',
    height: 'calc(100vh - 3rem)',
  },
  brand: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.85rem',
    marginBottom: '2.5rem',
    paddingLeft: '0.5rem',
  },
  brandIconBg: {
    width: '44px',
    height: '44px',
    borderRadius: '12px',
    background: 'rgba(37, 99, 235, 0.08)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandTitle: {
    fontSize: '1.25rem',
    fontWeight: '700',
    color: 'var(--text-main)',
    lineHeight: 1.1,
  },
  brandSubtitle: {
    fontSize: '0.75rem',
    color: 'var(--text-muted)',
    fontWeight: '500',
  },
  nav: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
    flex: 1,
  },
  navItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.85rem',
    padding: '0.85rem 1rem',
    borderRadius: '12px',
    border: '1px solid transparent',
    background: 'transparent',
    cursor: 'pointer',
    textAlign: 'left',
    width: '100%',
  },
  navItemActive: {
    background: 'rgba(255, 255, 255, 0.55)',
    borderColor: 'var(--glass-border)',
    boxShadow: 'var(--shadow-sm)',
  },
  navLabel: {
    fontFamily: 'var(--font-heading)',
    fontSize: '0.925rem',
    fontWeight: '500',
    color: 'var(--text-muted)',
  },
  navLabelActive: {
    color: '#2563eb',
    fontWeight: '600',
  },
  footer: {
    borderTop: '1px solid var(--glass-border)',
    paddingTop: '1.5rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  userCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '0.5rem',
  },
  userAvatarBg: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    background: 'rgba(255, 255, 255, 0.6)',
    border: '1px solid var(--glass-border)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userInfo: {
    display: 'flex',
    flexDirection: 'column',
    textAlign: 'left',
  },
  userName: {
    fontSize: '0.9rem',
    fontWeight: '600',
    color: 'var(--text-main)',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    maxWidth: '140px',
  },
  userRole: {
    fontSize: '0.75rem',
    color: 'var(--text-light)',
    fontWeight: '500',
  },
  logoutBtn: {
    width: '100%',
    padding: '0.65rem',
    fontSize: '0.85rem',
    color: 'var(--text-muted)',
    background: 'rgba(255,255,255,0.2)',
  },
};
