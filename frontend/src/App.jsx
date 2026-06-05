import React, { useState, useEffect } from 'react';
import { api } from './api';
import Login from './components/Login';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import Calendario from './components/Calendario';
import Checklist from './components/Checklist';
import Cadastros from './components/Cadastros';
import { registerPushNotifications } from './utils/pushSubscription';

function App() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [selectedTaskId, setSelectedTaskId] = useState(null);

  const handleViewTask = (taskId) => {
    setSelectedTaskId(taskId);
    setActiveTab('checklist');
  };

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    const verifyUser = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const userData = await api.getMe();
          setUser(userData);
          if (userData.role === 'cliente') {
            setActiveTab('checklist');
          }
          // Registra push notification se suportado e autenticado
          setTimeout(() => registerPushNotifications(), 1500);
        } catch (err) {
          console.error("Token expirado ou inválido.");
          api.logout();
        }
      }
      setCheckingAuth(false);
    };

    verifyUser();
  }, []);

  const handleLoginSuccess = (userData) => {
    setUser(userData);
    setActiveTab(userData.role === 'cliente' ? 'checklist' : 'dashboard');
    setTimeout(() => registerPushNotifications(), 1000);
  };

  const handleLogout = () => {
    setUser(null);
  };

  if (checkingAuth) {
    return (
      <div style={styles.loaderContainer}>
        <div className="animate-spin" style={styles.spinner}></div>
        <p style={{ marginTop: '1rem', color: 'var(--text-muted)', fontFamily: 'var(--font-heading)', fontWeight: '500' }}>
          Autenticando sessão segura...
        </p>
      </div>
    );
  }

  // Se não autenticado, renderiza a tela de login
  if (!user) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  // Determina qual conteúdo renderizar com base no activeTab
  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard user={user} />;
      case 'calendario':
        return <Calendario user={user} onViewTask={handleViewTask} />;
      case 'checklist':
        return (
          <Checklist 
            user={user} 
            selectedTaskId={selectedTaskId} 
            onClearSelectedTask={() => setSelectedTaskId(null)} 
          />
        );
      case 'cadastros':
        return <Cadastros user={user} />;
      default:
        return <Dashboard user={user} />;
    }
  };

  return (
    <div className="app-container">
      {/* Sidebar de Navegação */}
      <Sidebar 
        user={user} 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        onLogout={handleLogout} 
        isOnline={isOnline}
      />

      {/* Área de Conteúdo Principal */}
      <main className="main-content">
        {renderContent()}
      </main>
    </div>
  );
}

const styles = {
  loaderContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
    width: '100vw',
    background: 'linear-gradient(135deg, #f0f4f9 0%, #e1e7f0 100%)',
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '4px solid rgba(15, 23, 42, 0.08)',
    borderTopColor: 'var(--primary)',
    borderRadius: '50%',
  },
};

export default App;
