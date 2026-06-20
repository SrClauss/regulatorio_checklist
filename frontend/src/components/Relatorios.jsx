import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { 
  BarChart3, 
  Printer, 
  Calendar, 
  Building, 
  DollarSign, 
  Briefcase, 
  User, 
  Activity, 
  TrendingUp, 
  CheckCircle, 
  Clock, 
  AlertCircle 
} from 'lucide-react';

export default function Relatorios({ user }) {
  const [tarefas, setTarefas] = useState([]);
  const [empresas, setEmpresas] = useState([]);
  const [classeServicos, setClasseServicos] = useState([]);
  const [prestadores, setPrestadores] = useState([]);
  
  // Filtros
  const [filtroEmpresa, setFiltroEmpresa] = useState('');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  
  // Visualização e Controle
  const [activeReportTab, setActiveReportTab] = useState('prestadores');
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      setErrorMessage('');

      // Prepara os filtros para buscar tarefas
      const filters = {};
      if (user.role === 'cliente') {
        filters.empresa_id = user.empresa_cliente_id;
      } else if (filtroEmpresa) {
        filters.empresa_id = filtroEmpresa;
      }
      
      if (dataInicio) filters.data_inicio = new Date(dataInicio).toISOString();
      if (dataFim) filters.data_fim = new Date(dataFim).toISOString();

      const [tList, eList, csList, pList] = await Promise.all([
        api.listTarefas(filters),
        user.role !== 'cliente' ? api.listEmpresas() : Promise.resolve([]),
        api.listClasseServicos(),
        api.listPrestadores()
      ]);

      setTarefas(tList);
      setEmpresas(eList);
      setClasseServicos(csList);
      setPrestadores(pList);
    } catch (err) {
      console.error("Erro ao carregar dados de relatórios:", err);
      setErrorMessage("Erro ao buscar dados para geração dos relatórios.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [filtroEmpresa, dataInicio, dataFim]);

  const handlePrint = () => {
    window.print();
  };

  // Helper para buscar nome de empresa
  const getEmpresaNome = (id) => {
    if (user.role === 'cliente' && user.empresa_cliente_id) {
      return user.nome_empresa || 'Minha Empresa';
    }
    const found = empresas.find(e => e._id === id);
    return found ? found.nome_fantasia : 'Outra';
  };

  // Cálculos Financeiros e Métricas
  const totalValue = tarefas.reduce((acc, curr) => acc + (curr.valor_estimado || 0), 0);
  const concludedValue = tarefas
    .filter(t => t.status === 'Concluído')
    .reduce((acc, curr) => acc + (curr.valor_estimado || 0), 0);
  const pendingValue = totalValue - concludedValue;
  const totalTasks = tarefas.length;

  // Agrupamentos
  // 1. Agrupado por Prestador (Tarefa -> ClasseServico -> Prestador)
  const getTarefasPorPrestador = () => {
    const groups = {};

    // Inicializa os grupos
    prestadores.forEach(p => {
      groups[p._id] = { prestador: p, tarefas: [], total: 0 };
    });
    groups['sem_prestador'] = { prestador: { nome: 'Sem Prestador Designado' }, tarefas: [], total: 0 };

    tarefas.forEach(t => {
      const cs = classeServicos.find(c => c._id === t.classe_servico_id);
      const prestadorId = cs?.prestador_id;

      if (prestadorId && groups[prestadorId]) {
        groups[prestadorId].tarefas.push(t);
        groups[prestadorId].total += t.valor_estimado || 0;
      } else {
        groups['sem_prestador'].tarefas.push(t);
        groups['sem_prestador'].total += t.valor_estimado || 0;
      }
    });

    // Remove grupos vazios para exibição mais limpa
    return Object.values(groups).filter(g => g.tarefas.length > 0);
  };

  // 2. Agrupado por Classe de Serviço
  const getTarefasPorClasse = () => {
    const groups = {};

    classeServicos.forEach(cs => {
      groups[cs._id] = { classe: cs, tarefas: [], total: 0 };
    });
    groups['sem_classe'] = { classe: { nome: 'Sem Classe de Serviço' }, tarefas: [], total: 0 };

    tarefas.forEach(t => {
      if (t.classe_servico_id && groups[t.classe_servico_id]) {
        groups[t.classe_servico_id].tarefas.push(t);
        groups[t.classe_servico_id].total += t.valor_estimado || 0;
      } else {
        groups['sem_classe'].tarefas.push(t);
        groups['sem_classe'].total += t.valor_estimado || 0;
      }
    });

    return Object.values(groups).filter(g => g.tarefas.length > 0);
  };

  // 3. Agrupado por Empresa (Somente Staff)
  const getTarefasPorEmpresa = () => {
    const groups = {};

    tarefas.forEach(t => {
      const empId = t.empresa_id;
      if (!groups[empId]) {
        groups[empId] = { empresaNome: getEmpresaNome(empId), tarefas: [], total: 0 };
      }
      groups[empId].tarefas.push(t);
      groups[empId].total += t.valor_estimado || 0;
    });

    return Object.values(groups);
  };

  const prestadorGroups = getTarefasPorPrestador();
  const classeGroups = getTarefasPorClasse();
  const empresaGroups = getTarefasPorEmpresa();

  const printStyles = `
    @media print {
      body {
        background: #ffffff !important;
        color: #000000 !important;
      }
      .app-container {
        display: block !important;
      }
      .sidebar-container, .mobile-top-header, .no-print, button, select, input {
        display: none !important;
      }
      .main-content {
        margin: 0 !important;
        padding: 0 !important;
        max-width: 100% !important;
        overflow: visible !important;
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
            <h1 style={styles.title}>Relatórios e Indicadores</h1>
            <p style={styles.subtitle}>Consolidação financeira, agrupamento por prestador para otimização de custos e controle de atividades.</p>
          </div>
          <button onClick={handlePrint} className="glass-btn glass-btn-primary" style={styles.printBtn}>
            <Printer size={18} />
            <span>Imprimir Relatório</span>
          </button>
        </div>
      </header>

      {/* Título de Impressão */}
      <div className="only-print" style={{ display: 'none' }}>
        <h1 style={{ fontSize: '1.8rem', fontWeight: 'bold', marginBottom: '0.25rem' }}>Relatório Regulatório e Financeiro</h1>
        <p style={{ fontSize: '0.9rem', color: '#444', marginBottom: '1.5rem' }}>
          Gerado em {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR')}
        </p>
      </div>

      {/* Filtros */}
      <div className="glass-panel no-print" style={styles.filterPanel}>
        <h3 style={styles.filterTitle}>
          <Activity size={18} color="var(--primary)" />
          Filtros de Busca
        </h3>
        
        <div style={styles.filterGrid}>
          {user.role !== 'cliente' && (
            <div className="glass-input-group" style={{ margin: 0 }}>
              <label className="glass-label">Empresa Cliente</label>
              <select 
                value={filtroEmpresa} 
                onChange={e => setFiltroEmpresa(e.target.value)} 
                className="glass-input glass-select"
              >
                <option value="">Todas as empresas</option>
                {empresas.map(e => (
                  <option key={e._id} value={e._id}>{e.nome_fantasia}</option>
                ))}
              </select>
            </div>
          )}

          <div className="glass-input-group" style={{ margin: 0 }}>
            <label className="glass-label">Vencimento a partir de</label>
            <input 
              type="date" 
              value={dataInicio} 
              onChange={e => setDataInicio(e.target.value)} 
              className="glass-input" 
            />
          </div>

          <div className="glass-input-group" style={{ margin: 0 }}>
            <label className="glass-label">Vencimento até</label>
            <input 
              type="date" 
              value={dataFim} 
              onChange={e => setDataFim(e.target.value)} 
              className="glass-input" 
            />
          </div>
        </div>
      </div>

      {/* Alertas */}
      {errorMessage && (
        <div className="glass-panel" style={styles.errorAlert}>
          <AlertCircle size={18} />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Metrics Grid */}
      <div style={styles.metricsGrid} className="metrics-grid">
        <div className="glass-card metric-card" style={styles.metricCard}>
          <div style={styles.cardHeader}>
            <DollarSign size={20} color="var(--primary)" />
            <span style={styles.cardLabel}>Custo Estimado Total</span>
          </div>
          <span style={styles.cardValue}>
            R$ {totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </span>
        </div>

        <div className="glass-card metric-card" style={styles.metricCard}>
          <div style={styles.cardHeader}>
            <CheckCircle size={20} color="var(--success)" />
            <span style={styles.cardLabel}>Concluído / Executado</span>
          </div>
          <span style={{ ...styles.cardValue, color: 'var(--success)' }}>
            R$ {concludedValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </span>
        </div>

        <div className="glass-card metric-card" style={styles.metricCard}>
          <div style={styles.cardHeader}>
            <Clock size={20} color="var(--warning)" />
            <span style={styles.cardLabel}>Custo Pendente</span>
          </div>
          <span style={{ ...styles.cardValue, color: 'var(--warning)' }}>
            R$ {pendingValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </span>
        </div>

        <div className="glass-card metric-card" style={styles.metricCard}>
          <div style={styles.cardHeader}>
            <TrendingUp size={20} color="var(--text-light)" />
            <span style={styles.cardLabel}>Condicionantes no Filtro</span>
          </div>
          <span style={styles.cardValue}>{totalTasks}</span>
        </div>
      </div>

      {/* Relatório Seleção de Abas */}
      <div className="glass-card no-print" style={styles.tabsContainer}>
        <button 
          onClick={() => setActiveReportTab('prestadores')}
          style={{ ...styles.tabBtn, ...(activeReportTab === 'prestadores' ? styles.tabBtnActive : {}) }}
        >
          <User size={16} /> Por Prestador
        </button>
        <button 
          onClick={() => setActiveReportTab('classes')}
          style={{ ...styles.tabBtn, ...(activeReportTab === 'classes' ? styles.tabBtnActive : {}) }}
        >
          <Briefcase size={16} /> Por Classe de Serviço
        </button>
        {user.role !== 'cliente' && (
          <button 
            onClick={() => setActiveReportTab('empresas')}
            style={{ ...styles.tabBtn, ...(activeReportTab === 'empresas' ? styles.tabBtnActive : {}) }}
          >
            <Building size={16} /> Por Empresa
          </button>
        )}
        <button 
          onClick={() => setActiveReportTab('financeiro')}
          style={{ ...styles.tabBtn, ...(activeReportTab === 'financeiro' ? styles.tabBtnActive : {}) }}
        >
          <DollarSign size={16} /> Resumo Geral
        </button>
      </div>

      {/* Renderização do Relatório */}
      {loading ? (
        <div style={styles.loaderContainer}>
          <div className="animate-spin" style={styles.spinner}></div>
          <p style={{ marginTop: '1rem', color: 'var(--text-muted)' }}>Processando dados e montando agregados...</p>
        </div>
      ) : (
        <div style={styles.reportContent}>
          
          {/* ABA 1: AGRUPADO POR PRESTADOR */}
          {activeReportTab === 'prestadores' && (
            <div>
              <h2 style={styles.sectionTitle}>Condicionantes Agrupadas por Prestador de Serviço</h2>
              <p style={styles.sectionSubtitle} className="no-print">
                Ideal para agrupar e realizar contratações conjuntas de serviços (ex: dedetização em múltiplas sedes), economizando com logística e transporte.
              </p>
              
              {prestadorGroups.length === 0 ? (
                <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}>
                  <p style={{ color: 'var(--text-muted)' }}>Nenhum dado encontrado para os filtros selecionados.</p>
                </div>
              ) : (
                prestadorGroups.map(g => (
                  <div key={g.prestador._id || 'sem_prestador'} className="glass-panel" style={styles.reportGroupPanel}>
                    <div style={styles.groupHeader}>
                      <h3 style={styles.groupTitle}>{g.prestador.nome}</h3>
                      <span style={styles.groupSum}>
                        Subtotal: <strong>R$ {g.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
                      </span>
                    </div>

                    <div className="responsive-table-container">
                      <table style={styles.table}>
                        <thead>
                          <tr>
                            <th>Condicionante</th>
                            <th>Unidade / Empresa</th>
                            <th>Data Vencimento</th>
                            <th>Status</th>
                            <th>Frequência</th>
                            <th style={{ textAlign: 'right' }}>Valor Estimado</th>
                          </tr>
                        </thead>
                        <tbody>
                          {g.tarefas.map(t => (
                            <tr key={t._id}>
                              <td style={{ fontWeight: '500' }}>{t.titulo}</td>
                              <td>{getEmpresaNome(t.empresa_id)}</td>
                              <td>{new Date(t.data_vencimento).toLocaleDateString('pt-BR')}</td>
                              <td>
                                <span style={{
                                  padding: '2px 8px',
                                  borderRadius: '6px',
                                  fontSize: '0.75rem',
                                  fontWeight: '600',
                                  background: t.status === 'Concluído' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(245, 158, 11, 0.12)',
                                  color: t.status === 'Concluído' ? 'var(--success)' : 'var(--warning)'
                                }}>
                                  {t.status}
                                </span>
                              </td>
                              <td>{t.periodicidade}</td>
                              <td style={{ textAlign: 'right', fontWeight: '600' }}>
                                R$ {t.valor_estimado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* ABA 2: AGRUPADO POR CLASSE DE SERVIÇO */}
          {activeReportTab === 'classes' && (
            <div>
              <h2 style={styles.sectionTitle}>Condicionantes por Tipo/Classe de Serviço</h2>
              <p style={styles.sectionSubtitle} className="no-print">Consolidação e volumetria das atividades divididas por classes operacionais.</p>

              {classeGroups.length === 0 ? (
                <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}>
                  <p style={{ color: 'var(--text-muted)' }}>Nenhum dado encontrado para os filtros selecionados.</p>
                </div>
              ) : (
                classeGroups.map(g => (
                  <div key={g.classe._id || 'sem_classe'} className="glass-panel" style={styles.reportGroupPanel}>
                    <div style={styles.groupHeader}>
                      <h3 style={styles.groupTitle}>{g.classe.nome}</h3>
                      <span style={styles.groupSum}>
                        Subtotal: <strong>R$ {g.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
                      </span>
                    </div>

                    <div className="responsive-table-container">
                      <table style={styles.table}>
                        <thead>
                          <tr>
                            <th>Condicionante</th>
                            <th>Unidade / Empresa</th>
                            <th>Vencimento</th>
                            <th>Status</th>
                            <th style={{ textAlign: 'right' }}>Valor Estimado</th>
                          </tr>
                        </thead>
                        <tbody>
                          {g.tarefas.map(t => (
                            <tr key={t._id}>
                              <td style={{ fontWeight: '500' }}>{t.titulo}</td>
                              <td>{getEmpresaNome(t.empresa_id)}</td>
                              <td>{new Date(t.data_vencimento).toLocaleDateString('pt-BR')}</td>
                              <td>{t.status}</td>
                              <td style={{ textAlign: 'right', fontWeight: '600' }}>
                                R$ {t.valor_estimado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* ABA 3: AGRUPADO POR EMPRESA (STAFF ONLY) */}
          {activeReportTab === 'empresas' && user.role !== 'cliente' && (
            <div>
              <h2 style={styles.sectionTitle}>Atividades por Empresa Cliente</h2>
              <p style={styles.sectionSubtitle} className="no-print">Consolidação das demandas contratuais e regulatórias por unidade de negócio.</p>

              {empresaGroups.length === 0 ? (
                <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}>
                  <p style={{ color: 'var(--text-muted)' }}>Nenhum dado cadastrado.</p>
                </div>
              ) : (
                empresaGroups.map(g => (
                  <div key={g.empresaNome} className="glass-panel" style={styles.reportGroupPanel}>
                    <div style={styles.groupHeader}>
                      <h3 style={styles.groupTitle}>{g.empresaNome}</h3>
                      <span style={styles.groupSum}>
                        Subtotal: <strong>R$ {g.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
                      </span>
                    </div>

                    <div className="responsive-table-container">
                      <table style={styles.table}>
                        <thead>
                          <tr>
                            <th>Condicionante</th>
                            <th>Vencimento</th>
                            <th>Status</th>
                            <th style={{ textAlign: 'right' }}>Valor Estimado</th>
                          </tr>
                        </thead>
                        <tbody>
                          {g.tarefas.map(t => (
                            <tr key={t._id}>
                              <td style={{ fontWeight: '500' }}>{t.titulo}</td>
                              <td>{new Date(t.data_vencimento).toLocaleDateString('pt-BR')}</td>
                              <td>{t.status}</td>
                              <td style={{ textAlign: 'right', fontWeight: '600' }}>
                                R$ {t.valor_estimado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* ABA 4: RESUMO GERAL */}
          {activeReportTab === 'financeiro' && (
            <div className="glass-panel" style={{ padding: '2rem' }}>
              <h2 style={styles.sectionTitle}>Resumo Geral das Condicionantes</h2>
              <p style={styles.sectionSubtitle} className="no-print">Dados compilados e consolidados do período selecionado.</p>
              
              <div className="responsive-table-container">
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th>Status da Condicionante</th>
                      <th>Quantidade</th>
                      <th style={{ textAlign: 'right' }}>Valor Estimado Total</th>
                      <th style={{ textAlign: 'right' }}>Percentual</th>
                    </tr>
                  </thead>
                  <tbody>
                    {['Pendente', 'Em Andamento', 'Aguardando Auditoria', 'Concluído', 'Atrasado'].map(st => {
                      const stTasks = tarefas.filter(t => t.status === st);
                      const stVal = stTasks.reduce((acc, curr) => acc + (curr.valor_estimado || 0), 0);
                      const stPercent = totalTasks > 0 ? (stTasks.length / totalTasks) * 100 : 0;
                      
                      return (
                        <tr key={st}>
                          <td style={{ fontWeight: '600' }}>{st}</td>
                          <td>{stTasks.length}</td>
                          <td style={{ textAlign: 'right', fontWeight: '600' }}>
                            R$ {stVal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </td>
                          <td style={{ textAlign: 'right' }}>{stPercent.toFixed(1)}%</td>
                        </tr>
                      );
                    })}
                    <tr style={{ borderTop: '2px solid var(--text-main)', fontWeight: '700' }}>
                      <td>Total Consolidado</td>
                      <td>{totalTasks}</td>
                      <td style={{ textAlign: 'right' }}>
                        R$ {totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td style={{ textAlign: 'right' }}>100.0%</td>
                    </tr>
                  </tbody>
                </table>
              </div>
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
    gap: '2rem',
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
    fontSize: '2rem',
    fontWeight: '700',
    color: 'var(--text-main)',
    fontFamily: 'var(--font-heading)',
  },
  subtitle: {
    fontSize: '0.95rem',
    color: 'var(--text-muted)',
    marginTop: '0.25rem',
  },
  printBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.65rem 1.25rem',
    borderRadius: '12px',
    cursor: 'pointer',
    fontSize: '0.9rem',
  },
  filterPanel: {
    padding: '1.5rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  filterTitle: {
    fontSize: '1rem',
    fontWeight: '600',
    color: 'var(--text-main)',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  filterGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '1rem',
    width: '100%',
  },
  metricsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '1.25rem',
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
    fontSize: '0.8rem',
    fontWeight: '600',
    color: 'var(--text-light)',
    textTransform: 'uppercase',
  },
  cardValue: {
    fontSize: '1.4rem',
    fontWeight: '800',
    color: 'var(--text-main)',
    fontFamily: 'var(--font-heading)',
  },
  tabsContainer: {
    display: 'flex',
    gap: '0.5rem',
    padding: '0.4rem',
    width: 'max-content',
    overflowX: 'auto',
    maxWidth: '100%',
  },
  tabBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.5rem 1rem',
    borderRadius: '8px',
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
    fontFamily: 'var(--font-heading)',
    fontSize: '0.85rem',
    fontWeight: '600',
    color: 'var(--text-muted)',
    whiteSpace: 'nowrap',
  },
  tabBtnActive: {
    background: 'rgba(255, 255, 255, 0.65)',
    boxShadow: 'var(--shadow-sm)',
    color: 'var(--primary)',
  },
  loaderContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '3rem',
  },
  spinner: {
    width: '32px',
    height: '32px',
    border: '3px solid rgba(15, 23, 42, 0.08)',
    borderTopColor: 'var(--primary)',
    borderRadius: '50%',
  },
  reportContent: {
    width: '100%',
  },
  sectionTitle: {
    fontSize: '1.3rem',
    fontWeight: '700',
    color: 'var(--text-main)',
    fontFamily: 'var(--font-heading)',
    textAlign: 'left',
  },
  sectionSubtitle: {
    fontSize: '0.85rem',
    color: 'var(--text-muted)',
    marginBottom: '1.5rem',
    textAlign: 'left',
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
    paddingBottom: '0.75rem',
    marginBottom: '1rem',
    flexWrap: 'wrap',
    gap: '0.5rem',
  },
  groupTitle: {
    fontSize: '1.1rem',
    fontWeight: '700',
    color: 'var(--text-main)',
  },
  groupSum: {
    fontSize: '0.9rem',
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
