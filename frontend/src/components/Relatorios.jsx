import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { 
  BarChart3, 
  Printer, 
  Calendar, 
  Building, 
  FileText,
  DollarSign, 
  Briefcase, 
  User, 
  Activity, 
  TrendingUp, 
  CheckCircle, 
  Clock, 
  AlertCircle,
  Sliders,
  Play
} from 'lucide-react';

export default function Relatorios({ user }) {
  // Dados de Referência (carregados no início para alimentar os filtros)
  const [empresasRef, setEmpresasRef] = useState([]);
  const [classeServicosRef, setClasseServicosRef] = useState([]);
  const [prestadoresRef, setPrestadoresRef] = useState([]);
  
  // Resultados da busca pós-"Gerar Relatório"
  const [empresasRes, setEmpresasRes] = useState([]);
  const [documentosRes, setDocumentosRes] = useState([]);
  const [tarefasRes, setTarefasRes] = useState([]);
  
  // Categoria ativa de Relatório (Hierarquia Superior)
  const [activeCategory, setActiveCategory] = useState('empresas'); // 'empresas', 'documentos', 'condicionantes', 'financeiro'
  
  // Controle de estado
  const [loading, setLoading] = useState(false);
  const [isReportGenerated, setIsReportGenerated] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // FILTROS - Aba Empresas
  const [filtroEmpresaSegmento, setFiltroEmpresaSegmento] = useState('');
  const [filtroEmpresaUf, setFiltroEmpresaUf] = useState('');
  const [filtroEmpresaStatus, setFiltroEmpresaStatus] = useState('Todos'); // 'Todos', 'Ativo', 'Inativo'

  // FILTROS - Aba Documentos
  const [filtroDocEmpresa, setFiltroDocEmpresa] = useState('');
  const [filtroDocStatus, setFiltroDocStatus] = useState('');
  const [filtroDocOrgao, setFiltroDocOrgao] = useState('');

  // FILTROS - Aba Condicionantes
  const [filtroCondEmpresa, setFiltroCondEmpresa] = useState('');
  const [filtroCondClasse, setFiltroCondClasse] = useState('');
  const [filtroCondStatus, setFiltroCondStatus] = useState('');
  const [filtroCondInicio, setFiltroCondInicio] = useState('');
  const [filtroCondFim, setFiltroCondFim] = useState('');
  const [filtroCondAgrupamento, setFiltroCondAgrupamento] = useState('prestador'); // 'prestador', 'classe', 'nenhum'

  // FILTROS - Aba Financeiro
  const [filtroFinEmpresa, setFiltroFinEmpresa] = useState('');
  const [filtroFinInicio, setFiltroFinInicio] = useState('');
  const [filtroFinFim, setFiltroFinFim] = useState('');

  // Carrega referências primárias para os seletores ao montar
  const loadReferences = async () => {
    try {
      const [eList, csList, pList] = await Promise.all([
        user.role !== 'cliente' ? api.listEmpresas() : Promise.resolve([]),
        api.listClasseServicos(),
        api.listPrestadores()
      ]);
      setEmpresasRef(eList);
      setClasseServicosRef(csList);
      setPrestadoresRef(pList);
    } catch (err) {
      console.error("Erro ao carregar referências de filtros:", err);
    }
  };

  useEffect(() => {
    loadReferences();
  }, []);

  // Limpa o estado quando muda de aba, para garantir uma tela limpa
  useEffect(() => {
    setIsReportGenerated(false);
    setErrorMessage('');
    setEmpresasRes([]);
    setDocumentosRes([]);
    setTarefasRes([]);
  }, [activeCategory]);

  // Executa a busca e formata os dados baseados na aba atual
  const handleGenerateReport = async () => {
    setLoading(true);
    setErrorMessage('');
    setIsReportGenerated(false);

    try {
      if (activeCategory === 'empresas') {
        const eList = await api.listEmpresas();
        // Filtros manuais locais no array de empresas
        let filtered = [...eList];
        if (filtroEmpresaSegmento) {
          filtered = filtered.filter(e => e.segmento.toLowerCase().includes(filtroEmpresaSegmento.toLowerCase()));
        }
        if (filtroEmpresaUf) {
          filtered = filtered.filter(e => e.uf === filtroEmpresaUf);
        }
        if (filtroEmpresaStatus !== 'Todos') {
          const isAtivo = filtroEmpresaStatus === 'Ativo';
          filtered = filtered.filter(e => e.ativo === isAtivo);
        }
        
        // Carrega também os documentos e tarefas para exibir resumos de conformidade
        const [allDocs, allTasks] = await Promise.all([
          api.listDocumentos(),
          api.listTarefas()
        ]);

        // Associa resumos de contagem de conformidade para cada empresa
        const enriched = filtered.map(emp => {
          const empDocs = allDocs.filter(d => d.empresa_id === emp._id);
          const empTasks = allTasks.filter(t => t.empresa_id === emp._id);
          return {
            ...emp,
            docs_vencidos: empDocs.filter(d => d.status === 'Vencido').length,
            docs_ativos: empDocs.filter(d => d.status === 'Ativo').length,
            tarefas_pendentes: empTasks.filter(t => t.status !== 'Concluído').length
          };
        });

        setEmpresasRes(enriched);
        setIsReportGenerated(true);
      } 
      
      else if (activeCategory === 'documentos') {
        const filters = {};
        if (user.role === 'cliente') {
          filters.empresa_id = user.empresa_cliente_id;
        } else if (filtroDocEmpresa) {
          filters.empresa_id = filtroDocEmpresa;
        }
        
        const dList = await api.listDocumentos();
        let filtered = [...dList];
        
        if (filters.empresa_id) {
          filtered = filtered.filter(d => d.empresa_id === filters.empresa_id);
        }
        if (filtroDocStatus) {
          filtered = filtered.filter(d => d.status === filtroDocStatus);
        }
        if (filtroDocOrgao) {
          filtered = filtered.filter(d => d.orgao.toLowerCase().includes(filtroDocOrgao.toLowerCase()));
        }

        setDocumentosRes(filtered);
        setIsReportGenerated(true);
      } 
      
      else if (activeCategory === 'condicionantes') {
        const filters = {};
        if (user.role === 'cliente') {
          filters.empresa_id = user.empresa_cliente_id;
        } else if (filtroCondEmpresa) {
          filters.empresa_id = filtroCondEmpresa;
        }
        if (filtroCondClasse) {
          filters.classe_servico_id = filtroCondClasse;
        }
        if (filtroCondStatus) {
          filters.status = filtroCondStatus;
        }
        if (filtroCondInicio) {
          filters.data_inicio = new Date(filtroCondInicio).toISOString();
        }
        if (filtroCondFim) {
          filters.data_fim = new Date(filtroCondFim).toISOString();
        }

        const tList = await api.listTarefas(filters);
        setTarefasRes(tList);
        setIsReportGenerated(true);
      } 
      
      else if (activeCategory === 'financeiro') {
        const filters = {};
        if (user.role === 'cliente') {
          filters.empresa_id = user.empresa_cliente_id;
        } else if (filtroFinEmpresa) {
          filters.empresa_id = filtroFinEmpresa;
        }
        if (filtroFinInicio) {
          filters.data_inicio = new Date(filtroFinInicio).toISOString();
        }
        if (filtroFinFim) {
          filters.data_fim = new Date(filtroFinFim).toISOString();
        }

        // Busca documentos e tarefas do período para estimar fluxo
        const [dList, tList] = await Promise.all([
          api.listDocumentos(),
          api.listTarefas(filters)
        ]);

        // Filtra documentos do período localmente
        let filteredDocs = [...dList];
        if (filters.empresa_id) {
          filteredDocs = filteredDocs.filter(d => d.empresa_id === filters.empresa_id);
        }
        if (filtroFinInicio || filtroFinFim) {
          filteredDocs = filteredDocs.filter(d => {
            const vDate = new Date(d.data_vencimento);
            if (filtroFinInicio && vDate < new Date(filtroFinInicio)) return false;
            if (filtroFinFim && vDate > new Date(filtroFinFim)) return false;
            return true;
          });
        }

        setDocumentosRes(filteredDocs);
        setTarefasRes(tList);
        setIsReportGenerated(true);
      }
    } catch (err) {
      console.error("Erro ao gerar relatório:", err);
      setErrorMessage("Erro ao buscar dados. Verifique a conexão com o servidor.");
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // Helper para buscar nome de empresa
  const getEmpresaNome = (id) => {
    if (user.role === 'cliente') {
      return user.nome_empresa || 'Minha Empresa';
    }
    const found = empresasRef.find(e => e._id === id);
    return found ? found.nome_fantasia : 'Outra';
  };

  // --- Processamento dos Agrupamentos de Condicionantes ---
  const getCondicionantesAgrupadas = () => {
    if (filtroCondAgrupamento === 'prestador') {
      const groups = {};
      prestadoresRef.forEach(p => {
        groups[p._id] = { label: p.nome, tarefas: [], totalValor: 0, totalCusto: 0 };
      });
      groups['sem_prestador'] = { label: 'Sem Prestador Designado', tarefas: [], totalValor: 0, totalCusto: 0 };

      tarefasRes.forEach(t => {
        const cs = classeServicosRef.find(c => c._id === t.classe_servico_id);
        const pId = cs?.prestador_id;
        if (pId && groups[pId]) {
          groups[pId].tarefas.push(t);
          groups[pId].totalValor += t.valor_estimado || 0;
          groups[pId].totalCusto += t.custo_projetado || 0;
        } else {
          groups['sem_prestador'].tarefas.push(t);
          groups['sem_prestador'].totalValor += t.valor_estimado || 0;
          groups['sem_prestador'].totalCusto += t.custo_projetado || 0;
        }
      });
      return Object.values(groups).filter(g => g.tarefas.length > 0);
    } 
    
    else if (filtroCondAgrupamento === 'classe') {
      const groups = {};
      classeServicosRef.forEach(cs => {
        groups[cs._id] = { label: cs.nome, tarefas: [], totalValor: 0, totalCusto: 0 };
      });
      groups['sem_classe'] = { label: 'Sem Classe de Serviço', tarefas: [], totalValor: 0, totalCusto: 0 };

      tarefasRes.forEach(t => {
        if (t.classe_servico_id && groups[t.classe_servico_id]) {
          groups[t.classe_servico_id].tarefas.push(t);
          groups[t.classe_servico_id].totalValor += t.valor_estimado || 0;
          groups[t.classe_servico_id].totalCusto += t.custo_projetado || 0;
        } else {
          groups['sem_classe'].tarefas.push(t);
          groups['sem_classe'].totalValor += t.valor_estimado || 0;
          groups['sem_classe'].totalCusto += t.custo_projetado || 0;
        }
      });
      return Object.values(groups).filter(g => g.tarefas.length > 0);
    }
    return [];
  };

  // --- Métricas e Resumos ---
  // Metricas Empresas
  const mEmpTotal = empresasRes.length;
  const mEmpAtivas = empresasRes.filter(e => e.ativo).length;
  const mEmpConformes = empresasRes.filter(e => e.docs_vencidos === 0).length;

  // Metricas Documentos
  const mDocTotal = documentosRes.length;
  const mDocAtivos = documentosRes.filter(d => d.status === 'Ativo').length;
  const mDocVencidos = documentosRes.filter(d => d.status === 'Vencido').length;
  const mDocValorTotal = documentosRes.reduce((acc, curr) => acc + (curr.valor_renovacao || 0), 0);

  // Metricas Condicionantes
  const mCondTotal = tarefasRes.length;
  const mCondConcluidas = tarefasRes.filter(t => t.status === 'Concluído').length;
  const mCondPendentes = mCondTotal - mCondConcluidas;
  const mCondValorTotal = tarefasRes.reduce((acc, curr) => acc + (curr.valor_estimado || 0), 0);
  const mCondCustoTotal = tarefasRes.reduce((acc, curr) => acc + (curr.custo_projetado || 0), 0);

  // Metricas Financeiro
  const mFinReceitasConcluidas = tarefasRes.filter(t => t.status === 'Concluído').reduce((acc, curr) => acc + (curr.valor_estimado || 0), 0);
  const mFinReceitasPendentes = tarefasRes.filter(t => t.status !== 'Concluído').reduce((acc, curr) => acc + (curr.valor_estimado || 0), 0);
  const mFinReceitasTotal = mFinReceitasConcluidas + mFinReceitasPendentes;

  const mFinCustosCondicionantes = tarefasRes.reduce((acc, curr) => acc + (curr.custo_projetado || 0), 0);
  const mFinCustosTaxasLicencas = documentosRes.reduce((acc, curr) => acc + (curr.valor_renovacao || 0), 0);
  const mFinCustosTotal = mFinCustosCondicionantes + mFinCustosTaxasLicencas;

  const mFinSaldoProjetado = mFinReceitasTotal - mFinCustosTotal;

  const printStyles = `
    /* Estilos Globais da Tabela (Visão Web) */
    .report-table th, .report-table td {
      padding: 1.1rem 1.25rem !important;
      border-bottom: 1px solid var(--glass-border);
      vertical-align: middle;
      line-height: 1.6;
    }
    .report-table th {
      background: rgba(37, 99, 235, 0.04);
      font-weight: 700;
      color: var(--text-main);
      text-transform: uppercase;
      font-size: 0.8rem;
      letter-spacing: 0.05em;
    }
    .report-table tbody tr:nth-child(even) {
      background-color: rgba(255, 255, 255, 0.35);
    }
    .report-table tbody tr:hover {
      background-color: rgba(255, 255, 255, 0.65);
    }

    @media print {
      @page {
        size: landscape;
        margin: 1cm;
      }
      html, body, #root, .app-container, .main-content {
        height: auto !important;
        min-height: auto !important;
        overflow: visible !important;
        position: static !important;
        display: block !important;
      }
      body {
        background: #ffffff !important;
        color: #000000 !important;
      }
      .sidebar-container, .mobile-top-header, .no-print, button, select, input {
        display: none !important;
      }
      .main-content {
        margin: 0 !important;
        padding: 0 !important;
        max-width: 100% !important;
      }
      .glass-panel, .glass-card {
        background: transparent !important;
        border: none !important;
        box-shadow: none !important;
        backdrop-filter: none !important;
        padding: 0 !important;
        margin-bottom: 2rem !important;
        page-break-inside: avoid;
      }
      table {
        border-collapse: collapse !important;
        width: 100% !important;
        margin-top: 1rem !important;
      }
      th, td {
        border: 1px solid #999999 !important;
        padding: 8px !important;
        text-align: left !important;
        font-size: 0.85rem !important;
      }
      th {
        background-color: #f3f4f6 !important;
        color: #000000 !important;
      }
      .metrics-grid {
        display: flex !important;
        flex-direction: row !important;
        justify-content: space-between !important;
        gap: 1rem !important;
        margin-bottom: 2rem !important;
      }
      .metric-card {
        border: 1px solid #999999 !important;
        flex: 1 !important;
        padding: 10px !important;
      }
    }
  `;

  return (
    <div className="animate-fade-in" style={styles.container}>
      <style>{printStyles}</style>

      {/* Header */}
      <header style={styles.header} className="no-print">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={styles.title}>Painel de Relatórios</h1>
            <p style={styles.subtitle}>Gere demonstrativos e consolidações por empresa, licenças, atividades e fluxo de caixa.</p>
          </div>
          {isReportGenerated && (
            <button onClick={handlePrint} className="glass-btn glass-btn-primary" style={styles.printBtn}>
              <Printer size={18} />
              <span>Imprimir / Salvar PDF</span>
            </button>
          )}
        </div>
      </header>

      {/* Título de Impressão */}
      <div className="only-print" style={{ display: 'none' }}>
        <h1 style={{ fontSize: '1.8rem', fontWeight: 'bold', marginBottom: '0.25rem' }}>
          Relatório de {activeCategory.toUpperCase()} - Claudio Compliance
        </h1>
        <p style={{ fontSize: '0.9rem', color: '#444', marginBottom: '1.5rem' }}>
          Gerado em {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR')}
        </p>
      </div>

      {/* HIERARQUIA SUPERIOR - ABAS DE TIPOS DE RELATÓRIO */}
      <div className="glass-card no-print" style={styles.categoryTabsContainer}>
        <button 
          onClick={() => setActiveCategory('empresas')}
          style={{ ...styles.categoryTabBtn, ...(activeCategory === 'empresas' ? styles.categoryTabBtnActive : {}) }}
        >
          <Building size={18} /> Relatório de Empresas
        </button>
        <button 
          onClick={() => setActiveCategory('documentos')}
          style={{ ...styles.categoryTabBtn, ...(activeCategory === 'documentos' ? styles.categoryTabBtnActive : {}) }}
        >
          <FileText size={18} /> Relatório de Licenças
        </button>
        <button 
          onClick={() => setActiveCategory('condicionantes')}
          style={{ ...styles.categoryTabBtn, ...(activeCategory === 'condicionantes' ? styles.categoryTabBtnActive : {}) }}
        >
          <Briefcase size={18} /> Relatório de Condicionantes
        </button>
        <button 
          onClick={() => setActiveCategory('financeiro')}
          style={{ ...styles.categoryTabBtn, ...(activeCategory === 'financeiro' ? styles.categoryTabBtnActive : {}) }}
        >
          <DollarSign size={18} /> Relatório Financeiro
        </button>
      </div>

      {/* CONTROLES E FILTROS DINÂMICOS CONFORME A ABA */}
      <div className="glass-panel no-print" style={styles.filterPanel}>
        <h3 style={styles.filterTitle}>
          <Sliders size={16} color="var(--primary)" />
          Parâmetros do Relatório
        </h3>
        
        <div style={styles.filterGrid}>
          
          {/* FILTROS: EMPRESAS */}
          {activeCategory === 'empresas' && (
            <>
              <div className="glass-input-group" style={{ margin: 0 }}>
                <label className="glass-label">Segmento</label>
                <input 
                  type="text" 
                  value={filtroEmpresaSegmento} 
                  onChange={e => setFiltroEmpresaSegmento(e.target.value)} 
                  className="glass-input" 
                  placeholder="Ex: Farmácia, Alimentos" 
                />
              </div>
              <div className="glass-input-group" style={{ margin: 0 }}>
                <label className="glass-label">Estado (UF)</label>
                <select value={filtroEmpresaUf} onChange={e => setFiltroEmpresaUf(e.target.value)} className="glass-input glass-select">
                  <option value="">Todos</option>
                  <option value="SP">São Paulo (SP)</option>
                  <option value="RJ">Rio de Janeiro (RJ)</option>
                  <option value="MG">Minas Gerais (MG)</option>
                  <option value="PR">Paraná (PR)</option>
                </select>
              </div>
              <div className="glass-input-group" style={{ margin: 0 }}>
                <label className="glass-label">Status da Unidade</label>
                <select value={filtroEmpresaStatus} onChange={e => setFiltroEmpresaStatus(e.target.value)} className="glass-input glass-select">
                  <option value="Todos">Todas</option>
                  <option value="Ativo">Ativas</option>
                  <option value="Inativo">Inativas</option>
                </select>
              </div>
            </>
          )}

          {/* FILTROS: DOCUMENTOS */}
          {activeCategory === 'documentos' && (
            <>
              {user.role !== 'cliente' && (
                <div className="glass-input-group" style={{ margin: 0 }}>
                  <label className="glass-label">Empresa</label>
                  <select value={filtroDocEmpresa} onChange={e => setFiltroDocEmpresa(e.target.value)} className="glass-input glass-select">
                    <option value="">Todas</option>
                    {empresasRef.map(e => (
                      <option key={e._id} value={e._id}>{e.nome_fantasia}</option>
                    ))}
                  </select>
                </div>
              )}
              <div className="glass-input-group" style={{ margin: 0 }}>
                <label className="glass-label">Status da Licença</label>
                <select value={filtroDocStatus} onChange={e => setFiltroDocStatus(e.target.value)} className="glass-input glass-select">
                  <option value="">Todos</option>
                  <option value="Ativo">Ativo (Válido)</option>
                  <option value="Vencido">Vencido</option>
                  <option value="Em Renovação">Em Renovação</option>
                </select>
              </div>
              <div className="glass-input-group" style={{ margin: 0 }}>
                <label className="glass-label">Órgão Regulador</label>
                <input 
                  type="text" 
                  value={filtroDocOrgao} 
                  onChange={e => setFiltroDocOrgao(e.target.value)} 
                  className="glass-input" 
                  placeholder="Ex: IBAMA, VISA" 
                />
              </div>
            </>
          )}

          {/* FILTROS: CONDICIONANTES */}
          {activeCategory === 'condicionantes' && (
            <>
              {user.role !== 'cliente' && (
                <div className="glass-input-group" style={{ margin: 0 }}>
                  <label className="glass-label">Empresa</label>
                  <select value={filtroCondEmpresa} onChange={e => setFiltroCondEmpresa(e.target.value)} className="glass-input glass-select">
                    <option value="">Todas</option>
                    {empresasRef.map(e => (
                      <option key={e._id} value={e._id}>{e.nome_fantasia}</option>
                    ))}
                  </select>
                </div>
              )}
              <div className="glass-input-group" style={{ margin: 0 }}>
                <label className="glass-label">Classe de Serviço</label>
                <select value={filtroCondClasse} onChange={e => setFiltroCondClasse(e.target.value)} className="glass-input glass-select">
                  <option value="">Todas</option>
                  {classeServicosRef.map(cs => (
                    <option key={cs._id} value={cs._id}>{cs.nome}</option>
                  ))}
                </select>
              </div>
              <div className="glass-input-group" style={{ margin: 0 }}>
                <label className="glass-label">Status da Atividade</label>
                <select value={filtroCondStatus} onChange={e => setFiltroCondStatus(e.target.value)} className="glass-input glass-select">
                  <option value="">Todos</option>
                  <option value="Pendente">Pendente</option>
                  <option value="Em Andamento">Em Andamento</option>
                  <option value="Aguardando Auditoria">Aguardando Auditoria</option>
                  <option value="Concluído">Concluídos</option>
                  <option value="Atrasado">Em Atraso</option>
                </select>
              </div>
              <div className="glass-input-group" style={{ margin: 0 }}>
                <label className="glass-label">Vencimento Inicial</label>
                <input type="date" value={filtroCondInicio} onChange={e => setFiltroCondInicio(e.target.value)} className="glass-input" />
              </div>
              <div className="glass-input-group" style={{ margin: 0 }}>
                <label className="glass-label">Vencimento Final</label>
                <input type="date" value={filtroCondFim} onChange={e => setFiltroCondFim(e.target.value)} className="glass-input" />
              </div>
              <div className="glass-input-group" style={{ margin: 0 }}>
                <label className="glass-label">Opção de Agrupamento</label>
                <select value={filtroCondAgrupamento} onChange={e => setFiltroCondAgrupamento(e.target.value)} className="glass-input glass-select">
                  <option value="prestador">Agrupar por Prestador de Serviço</option>
                  <option value="classe">Agrupar por Classe de Serviço</option>
                  <option value="nenhum">Sem Agrupamento (Listagem Plana)</option>
                </select>
              </div>
            </>
          )}

          {/* FILTROS: FINANCEIRO */}
          {activeCategory === 'financeiro' && (
            <>
              {user.role !== 'cliente' && (
                <div className="glass-input-group" style={{ margin: 0 }}>
                  <label className="glass-label">Empresa</label>
                  <select value={filtroFinEmpresa} onChange={e => setFiltroFinEmpresa(e.target.value)} className="glass-input glass-select">
                    <option value="">Todas</option>
                    {empresasRef.map(e => (
                      <option key={e._id} value={e._id}>{e.nome_fantasia}</option>
                    ))}
                  </select>
                </div>
              )}
              <div className="glass-input-group" style={{ margin: 0 }}>
                <label className="glass-label">Período Inicial</label>
                <input type="date" value={filtroFinInicio} onChange={e => setFiltroFinInicio(e.target.value)} className="glass-input" />
              </div>
              <div className="glass-input-group" style={{ margin: 0 }}>
                <label className="glass-label">Período Final</label>
                <input type="date" value={filtroFinFim} onChange={e => setFiltroFinFim(e.target.value)} className="glass-input" />
              </div>
            </>
          )}

        </div>

        {/* Botão de Ação para gerar o Relatório */}
        <button 
          onClick={handleGenerateReport} 
          disabled={loading} 
          className="glass-btn glass-btn-primary" 
          style={{ ...styles.generateBtn, alignSelf: 'flex-end' }}
        >
          <Play size={16} />
          <span>{loading ? 'Processando dados...' : 'Gerar Relatório'}</span>
        </button>
      </div>

      {/* Alertas de Erro */}
      {errorMessage && (
        <div className="glass-panel" style={styles.errorAlert}>
          <AlertCircle size={18} />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* PÁGINA LIMPA (Placeholder se o relatório não foi gerado) */}
      {!isReportGenerated && !loading && (
        <div className="glass-panel" style={styles.cleanStatePanel}>
          <BarChart3 size={48} color="var(--text-light)" style={{ marginBottom: '1rem', opacity: 0.6 }} />
          <h3 style={{ color: 'var(--text-main)', fontSize: '1.1rem', fontWeight: '600' }}>
            Nenhum relatório gerado
          </h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', maxWidth: '380px', margin: '0.5rem auto 0', lineHeight: '1.4' }}>
            Selecione os parâmetros e filtros desejados nos controles acima e clique no botão <strong>"Gerar Relatório"</strong> para visualizar as métricas e tabelas consolidadas.
          </p>
        </div>
      )}

      {/* CARREGADOR (Loader) */}
      {loading && (
        <div style={styles.loaderContainer}>
          <div className="animate-spin" style={styles.spinner}></div>
          <p style={{ marginTop: '1rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>Buscando e processando registros operacionais...</p>
        </div>
      )}

      {/* DADOS EXIBIDOS APÓS GERAÇÃO */}
      {isReportGenerated && !loading && (
        <div style={styles.reportResultsContainer}>
          
          {/* ==============================================
              DADOS RELATÓRIO: EMPRESAS
              ============================================== */}
          {activeCategory === 'empresas' && (
            <div>
              {/* Cards de Métricas */}
              <div style={styles.metricsGrid} className="metrics-grid">
                <div className="glass-card metric-card" style={styles.metricCard}>
                  <div style={styles.cardHeader}>
                    <Building size={20} color="var(--primary)" />
                    <span style={styles.cardLabel}>Unidades Filtradas</span>
                  </div>
                  <span style={styles.cardValue}>{mEmpTotal}</span>
                </div>
                <div className="glass-card metric-card" style={styles.metricCard}>
                  <div style={styles.cardHeader}>
                    <CheckCircle size={20} color="var(--success)" />
                    <span style={styles.cardLabel}>Unidades Ativas</span>
                  </div>
                  <span style={{ ...styles.cardValue, color: 'var(--success)' }}>{mEmpAtivas}</span>
                </div>
                <div className="glass-card metric-card" style={styles.metricCard}>
                  <div style={styles.cardHeader}>
                    <Activity size={20} color="var(--primary)" />
                    <span style={styles.cardLabel}>Em Total Conformidade</span>
                  </div>
                  <span style={styles.cardValue}>{mEmpConformes}</span>
                </div>
              </div>

              {/* Tabela de Resultados */}
              <div className="glass-panel" style={styles.tablePanel}>
                <h3 style={styles.tablePanelTitle}>Resultados do Relatório de Empresas</h3>
                {empresasRes.length === 0 ? (
                  <p style={styles.noDataText}>Nenhuma empresa corresponde aos filtros selecionados.</p>
                ) : (
                  <div className="responsive-table-container">
                    <table className="report-table" style={styles.table}>
                      <thead>
                        <tr>
                          <th>Nome Fantasia</th>
                          <th>Razão Social</th>
                          <th>CNPJ</th>
                          <th>Cidade/UF</th>
                          <th>Segmento</th>
                          <th>Licenças Ativas / Vencidas</th>
                          <th>Tarefas Pendentes</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {empresasRes.map(emp => (
                          <tr key={emp._id}>
                            <td style={{ fontWeight: '600' }}>{emp.nome_fantasia}</td>
                            <td>{emp.razao_social}</td>
                            <td>{emp.cnpj}</td>
                            <td>{emp.cidade} / {emp.uf}</td>
                            <td>{emp.segmento}</td>
                            <td>
                              <span style={{ color: 'var(--success)', fontWeight: '600' }}>{emp.docs_ativos} ativas</span> /{' '}
                              <span style={{ color: emp.docs_vencidos > 0 ? 'var(--danger)' : 'var(--text-muted)', fontWeight: '600' }}>
                                {emp.docs_vencidos} vencidas
                              </span>
                            </td>
                            <td style={{ fontWeight: '600', color: emp.tarefas_pendentes > 0 ? 'var(--warning)' : 'var(--success)' }}>
                              {emp.tarefas_pendentes} pendentes
                            </td>
                            <td>
                              <span style={{
                                padding: '2px 8px',
                                borderRadius: '6px',
                                fontSize: '0.75rem',
                                fontWeight: '700',
                                background: emp.ativo ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                                color: emp.ativo ? 'var(--success)' : 'var(--danger)'
                              }}>
                                {emp.ativo ? 'Ativa' : 'Inativa'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ==============================================
              DADOS RELATÓRIO: DOCUMENTOS / LICENÇAS
              ============================================== */}
          {activeCategory === 'documentos' && (
            <div>
              {/* Cards de Métricas */}
              <div style={styles.metricsGrid} className="metrics-grid">
                <div className="glass-card metric-card" style={styles.metricCard}>
                  <div style={styles.cardHeader}>
                    <FileText size={20} color="var(--primary)" />
                    <span style={styles.cardLabel}>Licenças Regulatórias</span>
                  </div>
                  <span style={styles.cardValue}>{mDocTotal}</span>
                </div>
                <div className="glass-card metric-card" style={styles.metricCard}>
                  <div style={styles.cardHeader}>
                    <CheckCircle size={20} color="var(--success)" />
                    <span style={styles.cardLabel}>Documentos Válidos</span>
                  </div>
                  <span style={{ ...styles.cardValue, color: 'var(--success)' }}>{mDocAtivos}</span>
                </div>
                <div className="glass-card metric-card" style={styles.metricCard}>
                  <div style={styles.cardHeader}>
                    <AlertCircle size={20} color="var(--danger)" />
                    <span style={styles.cardLabel}>Licenças Vencidas</span>
                  </div>
                  <span style={{ ...styles.cardValue, color: 'var(--danger)' }}>{mDocVencidos}</span>
                </div>
                <div className="glass-card metric-card" style={styles.metricCard}>
                  <div style={styles.cardHeader}>
                    <DollarSign size={20} color="var(--text-light)" />
                    <span style={styles.cardLabel}>Custo de Renovação</span>
                  </div>
                  <span style={styles.cardValue}>R$ {mDocValorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>

              {/* Tabela de Resultados */}
              <div className="glass-panel" style={styles.tablePanel}>
                <h3 style={styles.tablePanelTitle}>Resultados do Relatório de Licenças</h3>
                {documentosRes.length === 0 ? (
                  <p style={styles.noDataText}>Nenhum documento encontrado para os filtros selecionados.</p>
                ) : (
                  <div className="responsive-table-container">
                    <table className="report-table" style={styles.table}>
                      <thead>
                        <tr>
                          <th>Licença / Documento</th>
                          <th>Empresa</th>
                          <th>Órgão Emissor</th>
                          <th>Processo</th>
                          <th>Emissão</th>
                          <th>Vencimento</th>
                          <th style={{ textAlign: 'right' }}>Taxa Renovação</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {documentosRes.map(doc => (
                          <tr key={doc._id}>
                            <td style={{ fontWeight: '600' }}>{doc.tipo}</td>
                            <td>{getEmpresaNome(doc.empresa_id)}</td>
                            <td>{doc.orgao}</td>
                            <td>{doc.numero_processo || 'Não informado'}</td>
                            <td>{new Date(doc.data_emissao).toLocaleDateString('pt-BR')}</td>
                            <td style={{ 
                              fontWeight: '600', 
                              color: doc.status === 'Vencido' ? 'var(--danger)' : 'var(--text-main)' 
                            }}>
                              {new Date(doc.data_vencimento).toLocaleDateString('pt-BR')}
                            </td>
                            <td style={{ textAlign: 'right', fontWeight: '600' }}>
                              R$ {doc.valor_renovacao.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </td>
                            <td>
                              <span style={{
                                padding: '2px 8px',
                                borderRadius: '6px',
                                fontSize: '0.75rem',
                                fontWeight: '700',
                                background: doc.status === 'Ativo' ? 'rgba(16, 185, 129, 0.12)' : (doc.status === 'Vencido' ? 'rgba(239, 68, 68, 0.12)' : 'rgba(245, 158, 11, 0.12)'),
                                color: doc.status === 'Ativo' ? 'var(--success)' : (doc.status === 'Vencido' ? 'var(--danger)' : 'var(--warning)')
                              }}>
                                {doc.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ==============================================
              DADOS RELATÓRIO: CONDICIONANTES / ATIVIDADES
              ============================================== */}
          {activeCategory === 'condicionantes' && (
            <div>
              {/* Cards de Métricas */}
              <div style={styles.metricsGrid} className="metrics-grid">
                <div className="glass-card metric-card" style={styles.metricCard}>
                  <div style={styles.cardHeader}>
                    <Activity size={20} color="var(--primary)" />
                    <span style={styles.cardLabel}>Atividades Regulatórias</span>
                  </div>
                  <span style={styles.cardValue}>{mCondTotal}</span>
                </div>
                <div className="glass-card metric-card" style={styles.metricCard}>
                  <div style={styles.cardHeader}>
                    <CheckCircle size={20} color="var(--success)" />
                    <span style={styles.cardLabel}>Concluídas</span>
                  </div>
                  <span style={{ ...styles.cardValue, color: 'var(--success)' }}>{mCondConcluidas}</span>
                </div>
                <div className="glass-card metric-card" style={styles.metricCard}>
                  <div style={styles.cardHeader}>
                    <Clock size={20} color="var(--warning)" />
                    <span style={styles.cardLabel}>Pendentes / Em Andamento</span>
                  </div>
                  <span style={{ ...styles.cardValue, color: 'var(--warning)' }}>{mCondPendentes}</span>
                </div>
                <div className="glass-card metric-card" style={styles.metricCard}>
                  <div style={styles.cardHeader}>
                    <DollarSign size={20} color="var(--primary)" />
                    <span style={styles.cardLabel}>Faturamento Estimado</span>
                  </div>
                  <span style={{ ...styles.cardValue, color: 'var(--primary)' }}>R$ {mCondValorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="glass-card metric-card" style={styles.metricCard}>
                  <div style={styles.cardHeader}>
                    <DollarSign size={20} color="var(--warning)" />
                    <span style={styles.cardLabel}>Custo Projetado Total</span>
                  </div>
                  <span style={{ ...styles.cardValue, color: 'var(--warning)' }}>R$ {mCondCustoTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>

              {/* Listagem conforme Agrupamento Selecionado */}
              {tarefasRes.length === 0 ? (
                <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}>
                  <p style={{ color: 'var(--text-muted)' }}>Nenhuma condicionante encontrada para os filtros aplicados.</p>
                </div>
              ) : (
                <div>
                  
                  {/* Agrupado por Prestador ou Classe */}
                  {filtroCondAgrupamento !== 'nenhum' && (
                    getCondicionantesAgrupadas().map(g => (
                      <div key={g.label} className="glass-panel" style={styles.reportGroupPanel}>
                        <div style={styles.groupHeader}>
                          <h3 style={styles.groupTitle}>{g.label}</h3>
                          <span style={styles.groupSum}>
                            Faturamento: <strong>R$ {g.totalValor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong> | Custo: <strong style={{ color: 'var(--warning)' }}>R$ {g.totalCusto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
                          </span>
                        </div>

                        <div className="responsive-table-container">
                          <table className="report-table" style={styles.table}>
                            <thead>
                              <tr>
                                <th>Condicionante</th>
                                <th>Empresa</th>
                                <th>Data Vencimento</th>
                                <th>Status</th>
                                <th>Periodicidade</th>
                                <th style={{ textAlign: 'right' }}>Faturamento (Receita)</th>
                                <th style={{ textAlign: 'right' }}>Custo Projetado</th>
                              </tr>
                            </thead>
                            <tbody>
                              {g.tarefas.map(t => (
                                <tr key={t._id}>
                                  <td style={{ fontWeight: '600' }}>{t.titulo}</td>
                                  <td>{getEmpresaNome(t.empresa_id)}</td>
                                  <td>{new Date(t.data_vencimento).toLocaleDateString('pt-BR')}</td>
                                  <td>{t.status}</td>
                                  <td>{t.periodicidade}</td>
                                  <td style={{ textAlign: 'right', fontWeight: '600', color: 'var(--primary)' }}>
                                    R$ {t.valor_estimado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                  </td>
                                  <td style={{ textAlign: 'right', fontWeight: '600', color: 'var(--warning)' }}>
                                    R$ {(t.custo_projetado || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ))
                  )}

                  {/* Sem agrupamento (Tabela Plana) */}
                  {filtroCondAgrupamento === 'nenhum' && (
                    <div className="glass-panel" style={styles.tablePanel}>
                      <h3 style={styles.tablePanelTitle}>Lista Geral de Condicionantes</h3>
                      <div className="responsive-table-container">
                        <table className="report-table" style={styles.table}>
                          <thead>
                            <tr>
                              <th>Condicionante</th>
                              <th>Empresa</th>
                              <th>Vencimento</th>
                              <th>Status</th>
                              <th>Periodicidade</th>
                              <th style={{ textAlign: 'right' }}>Faturamento (Receita)</th>
                              <th style={{ textAlign: 'right' }}>Custo Projetado</th>
                            </tr>
                          </thead>
                          <tbody>
                            {tarefasRes.map(t => (
                              <tr key={t._id}>
                                <td style={{ fontWeight: '600' }}>{t.titulo}</td>
                                <td>{getEmpresaNome(t.empresa_id)}</td>
                                <td>{new Date(t.data_vencimento).toLocaleDateString('pt-BR')}</td>
                                <td>{t.status}</td>
                                <td>{t.periodicidade}</td>
                                <td style={{ textAlign: 'right', fontWeight: '600', color: 'var(--primary)' }}>
                                  R$ {t.valor_estimado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </td>
                                <td style={{ textAlign: 'right', fontWeight: '600', color: 'var(--warning)' }}>
                                  R$ {(t.custo_projetado || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                </div>
              )}
            </div>
          )}

          {/* ==============================================
              DADOS RELATÓRIO: FINANCEIRO (PREVISÃO E FLUXO)
              ============================================== */}
          {activeCategory === 'financeiro' && (
            <div>
              {/* Processa lançamentos ordenados cronologicamente */}
              {(() => {
                const sortedFinances = [
                  ...documentosRes.map(doc => ({
                    _id: doc._id,
                    tipo: 'doc',
                    data: new Date(doc.data_vencimento),
                    tipoLancamento: 'Taxa Renovação Licença',
                    empresaId: doc.empresa_id,
                    descricao: `Renovação de "${doc.tipo}" (${doc.orgao})`,
                    status: doc.status,
                    receita: 0,
                    custo: doc.valor_renovacao || 0,
                  })),
                  ...tarefasRes.map(t => ({
                    _id: t._id,
                    tipo: 'task',
                    data: new Date(t.data_vencimento),
                    tipoLancamento: 'Serviço Condicionante',
                    empresaId: t.empresa_id,
                    descricao: t.titulo,
                    status: t.status,
                    receita: t.valor_estimado || 0,
                    custo: t.custo_projetado || 0,
                  }))
                ].sort((a, b) => a.data - b.data);

                return (
                  <>
                    {/* Cards de Métricas */}
                    <div style={styles.metricsGrid} className="metrics-grid">
                      <div className="glass-card metric-card" style={styles.metricCard}>
                        <div style={styles.cardHeader}>
                          <TrendingUp size={20} color="var(--primary)" />
                          <span style={styles.cardLabel}>Previsão de Receita (Entradas)</span>
                        </div>
                        <span style={{ ...styles.cardValue, color: 'var(--success)' }}>
                          R$ {mFinReceitasTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          Concluído: R$ {mFinReceitasConcluidas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} | Pendente: R$ {mFinReceitasPendentes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      </div>

                      <div className="glass-card metric-card" style={styles.metricCard}>
                        <div style={styles.cardHeader}>
                          <DollarSign size={20} color="var(--warning)" />
                          <span style={styles.cardLabel}>Previsão de Custo (Saídas)</span>
                        </div>
                        <span style={{ ...styles.cardValue, color: 'var(--danger)' }}>
                          R$ {mFinCustosTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          Condicionantes: R$ {mFinCustosCondicionantes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} | Licenças: R$ {mFinCustosTaxasLicencas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      </div>

                      <div className="glass-card metric-card" style={styles.metricCard}>
                        <div style={styles.cardHeader}>
                          <Activity size={20} color={mFinSaldoProjetado >= 0 ? 'var(--success)' : 'var(--danger)'} />
                          <span style={styles.cardLabel}>Saldo Projetado</span>
                        </div>
                        <span style={{ 
                          ...styles.cardValue, 
                          color: mFinSaldoProjetado >= 0 ? 'var(--success)' : 'var(--danger)' 
                        }}>
                          R$ {mFinSaldoProjetado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          Resultado Líquido Estimado
                        </span>
                      </div>

                      <div className="glass-card metric-card" style={styles.metricCard}>
                        <div style={styles.cardHeader}>
                          <FileText size={20} color="var(--primary)" />
                          <span style={styles.cardLabel}>Volume Operacional</span>
                        </div>
                        <span style={styles.cardValue}>
                          {documentosRes.length + tarefasRes.length} Itens
                        </span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {documentosRes.length} Licenças / {tarefasRes.length} Atividades
                        </span>
                      </div>
                    </div>

                    {/* Detalhamento dos Lançamentos Financeiros */}
                    <div className="glass-panel" style={styles.tablePanel}>
                      <h3 style={styles.tablePanelTitle}>Fluxo de Caixa & Lançamentos Financeiros Projetados</h3>
                      
                      {sortedFinances.length === 0 ? (
                        <p style={styles.noDataText}>Não existem lançamentos financeiros para o período especificado.</p>
                      ) : (
                        <div className="responsive-table-container">
                          <table className="report-table" style={styles.table}>
                            <thead>
                              <tr>
                                <th>Vencimento</th>
                                <th>Tipo Lançamento</th>
                                <th>Empresa</th>
                                <th>Descrição / Título</th>
                                <th>Status de Execução</th>
                                <th style={{ textAlign: 'right' }}>Receita (Entrada)</th>
                                <th style={{ textAlign: 'right' }}>Custo (Saída)</th>
                                <th style={{ textAlign: 'right' }}>Saldo (Resultado)</th>
                              </tr>
                            </thead>
                            <tbody>
                              {sortedFinances.map(item => {
                                const saldo = item.receita - item.custo;
                                return (
                                  <tr key={`${item.tipo}-${item._id}`}>
                                    <td>{item.data.toLocaleDateString('pt-BR')}</td>
                                    <td style={{ fontWeight: '600', color: item.tipo === 'doc' ? 'var(--primary)' : 'var(--text-light)' }}>
                                      {item.tipoLancamento}
                                    </td>
                                    <td>{getEmpresaNome(item.empresaId)}</td>
                                    <td>{item.descricao}</td>
                                    <td>
                                      <span style={{
                                        padding: '2px 8px',
                                        borderRadius: '6px',
                                        fontSize: '0.75rem',
                                        fontWeight: '700',
                                        background: item.status === 'Ativo' || item.status === 'Concluído' ? 'rgba(16, 185, 129, 0.12)' : (item.status === 'Vencido' || item.status === 'Atrasado' ? 'rgba(239, 68, 68, 0.12)' : 'rgba(245, 158, 11, 0.12)'),
                                        color: item.status === 'Ativo' || item.status === 'Concluído' ? 'var(--success)' : (item.status === 'Vencido' || item.status === 'Atrasado' ? 'var(--danger)' : 'var(--warning)')
                                      }}>
                                        {item.status}
                                      </span>
                                    </td>
                                    <td style={{ textAlign: 'right', fontWeight: '600', color: 'var(--success)' }}>
                                      {item.receita > 0 ? `R$ ${item.receita.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '—'}
                                    </td>
                                    <td style={{ textAlign: 'right', fontWeight: '600', color: 'var(--danger)' }}>
                                      {item.custo > 0 ? `R$ ${item.custo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '—'}
                                    </td>
                                    <td style={{ 
                                      textAlign: 'right', 
                                      fontWeight: '700', 
                                      color: saldo > 0 ? 'var(--success)' : (saldo < 0 ? 'var(--danger)' : 'var(--text-main)') 
                                    }}>
                                      {saldo !== 0 ? (saldo > 0 ? '+' : '') + `R$ ${saldo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '—'}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </>
                );
              })()}
            </div>
          )}

        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
    textAlign: 'left',
    width: '100%',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  title: {
    fontSize: '1.75rem',
    fontWeight: '700',
    color: 'var(--text-main)',
    fontFamily: 'var(--font-heading)',
  },
  subtitle: {
    fontSize: '0.9rem',
    color: 'var(--text-muted)',
    marginTop: '0.2rem',
  },
  printBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.6rem 1.1rem',
    borderRadius: '10px',
    cursor: 'pointer',
    fontSize: '0.85rem',
  },
  categoryTabsContainer: {
    display: 'flex',
    gap: '0.5rem',
    padding: '0.4rem',
    width: '100%',
    overflowX: 'auto',
    borderRadius: '16px',
  },
  categoryTabBtn: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
    padding: '0.75rem 1rem',
    borderRadius: '10px',
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
    fontFamily: 'var(--font-heading)',
    fontSize: '0.85rem',
    fontWeight: '600',
    color: 'var(--text-muted)',
    whiteSpace: 'nowrap',
    transition: 'all 0.2s ease',
  },
  categoryTabBtnActive: {
    background: 'var(--glass-bg-solid)',
    boxShadow: 'var(--shadow-sm)',
    color: 'var(--primary)',
    transform: 'scale(1.02)',
  },
  filterPanel: {
    padding: '1.5rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '1.25rem',
  },
  filterTitle: {
    fontSize: '0.95rem',
    fontWeight: '600',
    color: 'var(--text-main)',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  filterGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '1rem',
    width: '100%',
  },
  generateBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
    padding: '0.65rem 1.5rem',
    borderRadius: '10px',
    fontSize: '0.875rem',
    fontWeight: '600',
    width: 'max-content',
    marginTop: '0.5rem',
  },
  cleanStatePanel: {
    padding: '4rem 2rem',
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '20px',
  },
  loaderContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '4rem',
  },
  spinner: {
    width: '32px',
    height: '32px',
    border: '3px solid rgba(15, 23, 42, 0.08)',
    borderTopColor: 'var(--primary)',
    borderRadius: '50%',
  },
  reportResultsContainer: {
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
  },
  metricsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '1rem',
    width: '100%',
  },
  metricCard: {
    padding: '1.25rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  cardLabel: {
    fontSize: '0.75rem',
    fontWeight: '600',
    color: 'var(--text-light)',
    textTransform: 'uppercase',
  },
  cardValue: {
    fontSize: '1.35rem',
    fontWeight: '800',
    color: 'var(--text-main)',
    fontFamily: 'var(--font-heading)',
  },
  tablePanel: {
    padding: '1.5rem',
  },
  tablePanelTitle: {
    fontSize: '1.1rem',
    fontWeight: '700',
    color: 'var(--text-main)',
    marginBottom: '1rem',
    textAlign: 'left',
  },
  noDataText: {
    color: 'var(--text-muted)',
    fontSize: '0.875rem',
    textAlign: 'center',
    padding: '1.5rem',
  },
  reportGroupPanel: {
    padding: '1.5rem',
    marginBottom: '1.5rem',
  },
  groupHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1px solid var(--glass-border)',
    paddingBottom: '0.6rem',
    marginBottom: '0.75rem',
    flexWrap: 'wrap',
    gap: '0.5rem',
  },
  groupTitle: {
    fontSize: '1rem',
    fontWeight: '700',
    color: 'var(--text-main)',
  },
  groupSum: {
    fontSize: '0.85rem',
    color: 'var(--text-muted)',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    textAlign: 'left',
  },
  errorAlert: {
    background: 'var(--danger-light)',
    border: '1px solid rgba(239, 68, 68, 0.2)',
    borderRadius: '12px',
    padding: '0.75rem 1rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    color: 'var(--danger)',
    fontSize: '0.875rem',
    fontWeight: '500',
  },
};
