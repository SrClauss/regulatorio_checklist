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
            <h2 className="sidebar-brand-title">Claudio</h2>
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
                  {item.label}
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
