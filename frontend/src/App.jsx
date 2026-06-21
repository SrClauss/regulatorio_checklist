import React, { useState, useEffect } from 'react';
import { api } from './api';
import Login from './components/Login';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import Cronograma from './components/Cronograma';
import Calendario from './components/Calendario';
import Cadastros from './components/Cadastros';
import Empresas from './components/Empresas';
import Documentos from './components/Documentos';
import Relatorios from './components/Relatorios';
import EmpresaDetail from './components/EmpresaDetail';
import DocumentoDetail from './components/DocumentoDetail';
import CondicionanteDetail from './components/CondicionanteDetail';
import Prestadores from './components/Prestadores';
import { registerPushNotifications } from './utils/pushSubscription';

function App() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [selectedCompanyId, setSelectedCompanyId] = useState(null);
  const [selectedDocumentId, setSelectedDocumentId] = useState(null);
  const [selectedProviderId, setSelectedProviderId] = useState(null);

  // Analisa o hash da URL e sincroniza os estados correspondentes
  const parseHash = (currentUser) => {
    const activeUser = currentUser || user;
    if (!activeUser) return;
    
    const defaultHash = activeUser.role === 'cliente' ? '#/cronograma' : '#/dashboard';
    const hash = window.location.hash || defaultHash;

    if (hash.startsWith('#/empresas/')) {
      const id = hash.replace('#/empresas/', '');
      setSelectedCompanyId(id);
      setActiveTab('empresa-detail');
    } else if (hash.startsWith('#/documentos/')) {
      const id = hash.replace('#/documentos/', '');
      setSelectedDocumentId(id);
      setActiveTab('documento-detail');
    } else if (hash.startsWith('#/condicionantes/')) {
      const id = hash.replace('#/condicionantes/', '');
      setSelectedTaskId(id);
      setActiveTab('condicionante-detail');
    } else if (hash.startsWith('#/prestadores/')) {
      const id = hash.replace('#/prestadores/', '');
      setSelectedProviderId(id);
      setActiveTab('prestadores');
    } else {
      const tab = hash.replace('#/', '');
      const validTabs = ['dashboard', 'empresas', 'documentos', 'cronograma', 'relatorios', 'cadastros', 'calendario', 'prestadores'];
      if (validTabs.includes(tab)) {
        setActiveTab(tab);
      } else {
        setActiveTab(activeUser.role === 'cliente' ? 'cronograma' : 'dashboard');
      }
      setSelectedTaskId(null);
      setSelectedCompanyId(null);
      setSelectedDocumentId(null);
      setSelectedProviderId(null);
    }
  };

  const handleViewCompany = (companyId) => {
    window.location.hash = `#/empresas/${companyId}`;
  };

  const handleViewDocument = (documentId) => {
    window.location.hash = `#/documentos/${documentId}`;
  };

  const handleViewTask = (taskId) => {
    window.location.hash = `#/condicionantes/${taskId}`;
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

  // Escuta as alterações de navegação nativa do navegador (Avançar / Voltar)
  useEffect(() => {
    const handleHashChange = () => {
      if (user) {
        parseHash(user);
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [user]);

  useEffect(() => {
    const verifyUser = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const userData = await api.getMe();
          setUser(userData);
          // Analisa a URL no primeiro carregamento pós-login
          parseHash(userData);
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
    const targetHash = userData.role === 'cliente' ? '#/cronograma' : '#/dashboard';
    window.location.hash = targetHash;
    parseHash(userData);
    setTimeout(() => registerPushNotifications(), 1000);
  };

  const handleLogout = () => {
    setUser(null);
    setSelectedTaskId(null);
    setSelectedCompanyId(null);
    setSelectedDocumentId(null);
    setSelectedProviderId(null);
    window.location.hash = '';
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
    const onNavigateTab = (tab) => {
      window.location.hash = '#/' + tab;
    };

    switch (activeTab) {
      case 'dashboard':
        return (
          <Dashboard 
            user={user} 
            onNavigateTab={onNavigateTab}
          />
        );
      case 'cronograma':
        return (
          <Cronograma
            user={user}
            onViewTask={handleViewTask}
            onViewDocument={handleViewDocument}
            onNavigateTab={onNavigateTab}
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
      case 'relatorios':
        return <Relatorios user={user} />;
      case 'cadastros':
        return <Cadastros user={user} />;
      case 'prestadores':
        return (
          <Prestadores 
            user={user} 
            selectedProviderId={selectedProviderId} 
          />
        );
      case 'empresa-detail':
        return (
          <EmpresaDetail 
            companyId={selectedCompanyId} 
            user={user} 
            onBack={() => { window.location.hash = '#/empresas'; }} 
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
                window.location.hash = `#/empresas/${selectedCompanyId}`;
              } else {
                window.location.hash = '#/cronograma';
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
                window.location.hash = `#/documentos/${selectedDocumentId}`;
              } else if (selectedCompanyId) {
                window.location.hash = `#/empresas/${selectedCompanyId}`;
              } else {
                window.location.hash = '#/cronograma';
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
            onNavigateTab={onNavigateTab}
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
          // Alteração do hash da URL aciona a navegação
          window.location.hash = '#/' + tab;
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
