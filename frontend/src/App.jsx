import React, { useState, useEffect } from 'react';
import { api } from './api';
import Login from './components/Login';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import Calendario from './components/Calendario';
import Cadastros from './components/Cadastros';
import Empresas from './components/Empresas';
import Documentos from './components/Documentos';
import EmpresaDetail from './components/EmpresaDetail';
import DocumentoDetail from './components/DocumentoDetail';
import CondicionanteDetail from './components/CondicionanteDetail';
import { registerPushNotifications } from './utils/pushSubscription';

function App() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [selectedCompanyId, setSelectedCompanyId] = useState(null);
  const [selectedDocumentId, setSelectedDocumentId] = useState(null);

  const handleViewCompany = (companyId) => {
    setSelectedCompanyId(companyId);
    setActiveTab('empresa-detail');
  };

  const handleViewDocument = (documentId) => {
    setSelectedDocumentId(documentId);
    setActiveTab('documento-detail');
  };

  const handleViewTask = (taskId) => {
    setSelectedTaskId(taskId);
    setActiveTab('condicionante-detail');
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
            setActiveTab('calendario');
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
    setActiveTab(userData.role === 'cliente' ? 'calendario' : 'dashboard');
    setTimeout(() => registerPushNotifications(), 1000);
  };

  const handleLogout = () => {
    setUser(null);
    setSelectedTaskId(null);
    setSelectedCompanyId(null);
    setSelectedDocumentId(null);
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
        return (
          <Dashboard 
            user={user} 
            onViewTask={handleViewTask} 
            onViewDocument={handleViewDocument} 
          />
        );
      case 'empresas':
        return (
          <Empresas 
            user={user} 
            onViewCompany={handleViewCompany} 
          />
        );
      case 'documentos':
        return (
          <Documentos 
            user={user} 
            onViewDocument={handleViewDocument} 
            onGoToCompany={handleViewCompany} 
          />
        );
      case 'calendario':
        return (
          <Calendario 
            user={user} 
            onViewTask={handleViewTask} 
            onViewDocument={handleViewDocument} 
          />
        );
      case 'cadastros':
        return <Cadastros user={user} />;
      case 'empresa-detail':
        return (
          <EmpresaDetail 
            companyId={selectedCompanyId} 
            user={user} 
            onBack={() => setActiveTab('empresas')} 
            onViewDocument={handleViewDocument} 
            onViewTask={handleViewTask} 
          />
        );
      case 'documento-detail':
        return (
          <DocumentoDetail 
            documentId={selectedDocumentId} 
            user={user} 
            onBack={() => {
              if (selectedCompanyId) {
                setActiveTab('empresa-detail');
              } else {
                setActiveTab('calendario');
              }
            }} 
            onGoToCompany={handleViewCompany} 
            onViewTask={handleViewTask} 
          />
        );
      case 'condicionante-detail':
        return (
          <CondicionanteDetail 
            taskId={selectedTaskId} 
            user={user} 
            onBack={() => {
              if (selectedDocumentId) {
                setActiveTab('documento-detail');
              } else if (selectedCompanyId) {
                setActiveTab('empresa-detail');
              } else {
                setActiveTab('calendario');
              }
            }} 
            onGoToCompany={handleViewCompany} 
            onGoToDocument={handleViewDocument} 
          />
        );
      default:
        return (
          <Dashboard 
            user={user} 
            onViewTask={handleViewTask} 
            onViewDocument={handleViewDocument} 
          />
        );
    }
  };

  return (
    <div className="app-container">
      {/* Sidebar de Navegação */}
      <Sidebar 
        user={user} 
        activeTab={activeTab} 
        setActiveTab={(tab) => {
          // Reset context values when selecting main sidebar tabs
          setSelectedTaskId(null);
          setSelectedCompanyId(null);
          setSelectedDocumentId(null);
          setActiveTab(tab);
        }} 
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
