import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { 
  Briefcase, 
  Search, 
  Phone, 
  CheckCircle, 
  AlertCircle, 
  Plus, 
  Edit, 
  Trash2, 
  TrendingUp, 
  FileText, 
  Building, 
  DollarSign, 
  Clock, 
  UserCheck, 
  ListFilter,
  ArrowRight,
  Sparkles
} from 'lucide-react';

export default function Prestadores({ user, selectedProviderId }) {
  const [prestadores, setPrestadores] = useState([]);
  const [classeServicos, setClasseServicos] = useState([]);
  const [tarefas, setTarefas] = useState([]);
  const [empresas, setEmpresas] = useState([]);
  const [loading, setLoading] = useState(true);

  // States para Formulários e Edições
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingProviderId, setEditingProviderId] = useState(null);
  const [providerForm, setProviderForm] = useState({
    nome: '',
    cnpj: '',
    contato: '',
    ativo: true
  });

  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ativos'); // 'todos', 'ativos', 'inativos'

  const isStaff = user.role === 'admin' || user.role === 'consultor';

  const fetchData = async () => {
    try {
      setLoading(true);
      const [prList, csList, tList, empList] = await Promise.all([
        api.listPrestadores(),
        api.listClasseServicos(),
        api.listTarefas(),
        api.listEmpresas()
      ]);
      setPrestadores(prList);
      setClasseServicos(csList);
      setTarefas(tList);
      setEmpresas(empList);

      // Se houver um ID selecionado na URL/hash, define o prestador selecionado
      if (selectedProviderId) {
        const found = prList.find(p => p._id === selectedProviderId);
        if (found) {
          setSelectedProvider(found);
        }
      }
    } catch (err) {
      console.error("Erro ao buscar dados de prestadores:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedProviderId]);

  // Filtragem dos Prestadores
  const filteredPrestadores = prestadores.filter(p => {
    const matchSearch = 
      p.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.cnpj && p.cnpj.includes(searchTerm)) ||
      (p.contato && p.contato.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchStatus = 
      statusFilter === 'todos' ? true :
      statusFilter === 'ativos' ? p.ativo === true :
      p.ativo === false;

    return matchSearch && matchStatus;
  });

  // Métricas de cada prestador
  const getProviderMetrics = (providerId) => {
    // Acha as classes de serviço do prestador
    const classes = classeServicos.filter(cs => cs.prestador_id === providerId);
    const classIds = classes.map(c => c._id);
    
    // Filtra tarefas vinculadas a estas classes de serviço
    const providerTasks = tarefas.filter(t => t.classe_servico_id && classIds.includes(t.classe_servico_id));
    
    const total = providerTasks.length;
    const completed = providerTasks.filter(t => t.status === 'Concluído').length;
    const pending = providerTasks.filter(t => t.status === 'Pendente' || t.status === 'Em Andamento').length;
    const overdue = providerTasks.filter(t => t.status === 'Atrasado' || (t.status !== 'Concluído' && new Date(t.data_vencimento) < new Date())).length;
    
    const totalCost = providerTasks.reduce((sum, t) => sum + (t.custo_projetado || 0), 0);
    const sla = total > 0 ? Math.round((completed / total) * 100) : 100;

    return {
      classes,
      tasks: providerTasks,
      total,
      completed,
      pending,
      overdue,
      totalCost,
      sla
    };
  };

  // Estatísticas gerais
  const generalStats = () => {
    const activePrs = prestadores.filter(p => p.ativo).length;
    
    // Tarefas com prestador associado via classe de serviço
    const classIdsWithProvider = classeServicos.filter(cs => cs.prestador_id).map(cs => cs._id);
    const tasksWithProvider = tarefas.filter(t => t.classe_servico_id && classIdsWithProvider.includes(t.classe_servico_id));
    
    const totalServices = tasksWithProvider.filter(t => t.status === 'Concluído').length;
    const totalProjectedCost = tasksWithProvider.reduce((sum, t) => sum + (t.custo_projetado || 0), 0);

    return {
      totalProviders: prestadores.length,
      activeProviders: activePrs,
      totalClasses: classeServicos.length,
      totalServices,
      totalProjectedCost
    };
  };

  const stats = generalStats();

  const handleProviderSubmit = async (e) => {
    e.preventDefault();
    if (!isStaff) return;

    try {
      if (editingProviderId) {
        await api.updatePrestador(editingProviderId, providerForm);
      } else {
        await api.createPrestador(providerForm);
      }
      setProviderForm({ nome: '', cnpj: '', contato: '', ativo: true });
      setEditingProviderId(null);
      setShowAddForm(false);
      await fetchData();
    } catch (err) {
      alert(err.message || 'Erro ao salvar prestador');
    }
  };

  const handleEdit = (p) => {
    setProviderForm({
      nome: p.nome,
      cnpj: p.cnpj || '',
      contato: p.contato || '',
      ativo: p.ativo
    });
    setEditingProviderId(p._id);
    setShowAddForm(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Deseja realmente inativar este prestador?')) return;
    try {
      await api.deletePrestador(id);
      await fetchData();
      if (selectedProvider && selectedProvider._id === id) {
        setSelectedProvider(null);
      }
    } catch (err) {
      alert(err.message || 'Erro ao inativar prestador');
    }
  };

  const getEmpresaNome = (empresaId) => {
    const found = empresas.find(e => e._id === empresaId);
    return found ? found.nome_fantasia : 'Cliente';
  };

  return (
    <div className="animate-fade-in" style={styles.container}>
      <header style={styles.header}>
        <div>
          <h1 style={styles.title}>Prestadores de Serviço</h1>
          <p style={styles.subtitle}>Gerenciamento de prestadores técnicos terceirizados, classes de serviço e histórico de atividades.</p>
        </div>
        {isStaff && !showAddForm && (
          <button 
            onClick={() => { setShowAddForm(true); setEditingProviderId(null); setProviderForm({ nome: '', cnpj: '', contato: '', ativo: true }); }}
            className="glass-btn glass-btn-primary"
            style={styles.addBtn}
          >
            <Plus size={16} style={{ marginRight: '0.25rem' }} /> Novo Prestador
          </button>
        )}
      </header>

      {/* Cards de Métricas Gerais */}
      <div style={styles.statsGrid}>
        <div className="glass-panel" style={styles.statCard}>
          <div style={styles.statIconContainer}>
            <Briefcase size={20} color="var(--primary)" />
          </div>
          <div>
            <h3 style={styles.statVal}>{stats.activeProviders} / {stats.totalProviders}</h3>
            <span style={styles.statLabel}>Prestadores Ativos</span>
          </div>
        </div>

        <div className="glass-panel" style={styles.statCard}>
          <div style={styles.statIconContainer}>
            <ListFilter size={20} color="#8b5cf6" />
          </div>
          <div>
            <h3 style={styles.statVal}>{stats.totalClasses}</h3>
            <span style={styles.statLabel}>Categorias de Serviço</span>
          </div>
        </div>

        <div className="glass-panel" style={styles.statCard}>
          <div style={styles.statIconContainer}>
            <CheckCircle size={20} color="var(--success)" />
          </div>
          <div>
            <h3 style={styles.statVal}>{stats.totalServices}</h3>
            <span style={styles.statLabel}>Serviços Executados (Histórico)</span>
          </div>
        </div>

        <div className="glass-panel" style={styles.statCard}>
          <div style={styles.statIconContainer}>
            <DollarSign size={20} color="#ea580c" />
          </div>
          <div>
            <h3 style={styles.statVal}>R$ {stats.totalProjectedCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
            <span style={styles.statLabel}>Custo Acumulado Projetado</span>
          </div>
        </div>
      </div>

      <div style={styles.layoutSplit}>
        {/* Painel Esquerdo: Lista de Prestadores */}
        <div style={{ flex: 1.3, display: 'flex', flexDirection: 'column', gap: '1rem', minWidth: 0 }}>
          
          {/* Controles de Filtro */}
          <div style={styles.filtersRow} className="glass-card">
            <div style={styles.searchContainer}>
              <Search size={18} style={styles.searchIcon} />
              <input 
                type="text"
                placeholder="Pesquisar prestador por nome, CNPJ ou contato..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                style={styles.searchInput}
              />
            </div>

            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="glass-input glass-select"
              style={styles.selectInput}
            >
              <option value="todos">Todos Status</option>
              <option value="ativos">Apenas Ativos</option>
              <option value="inativos">Apenas Inativos</option>
            </select>
          </div>

          {/* Form de Cadastro/Edição */}
          {showAddForm && isStaff && (
            <div className="glass-panel animate-fade-in" style={styles.formContainer}>
              <div style={styles.formHeader}>
                <h3 style={styles.panelTitle}>{editingProviderId ? 'Editar Cadastro de Prestador' : 'Adicionar Novo Prestador de Serviço'}</h3>
                <button onClick={() => setShowAddForm(false)} className="glass-btn" style={{ padding: '0.2rem 0.5rem', fontSize: '0.8rem' }}>Fechar</button>
              </div>
              <form onSubmit={handleProviderSubmit} style={styles.form}>
                <div style={styles.formGrid}>
                  <div className="glass-input-group">
                    <label className="glass-label">Nome / Razão Social</label>
                    <input 
                      type="text" 
                      required 
                      value={providerForm.nome} 
                      onChange={e => setProviderForm({...providerForm, nome: e.target.value})} 
                      className="glass-input" 
                      placeholder="Ex: Dedetizadora Control-X Ltda" 
                    />
                  </div>

                  <div className="glass-input-group">
                    <label className="glass-label">CNPJ (Opcional)</label>
                    <input 
                      type="text" 
                      value={providerForm.cnpj} 
                      onChange={e => setProviderForm({...providerForm, cnpj: e.target.value})} 
                      className="glass-input" 
                      placeholder="00.000.000/0001-00" 
                    />
                  </div>

                  <div className="glass-input-group" style={{ gridColumn: 'span 2' }}>
                    <label className="glass-label">Contato (Telefone ou Email)</label>
                    <input 
                      type="text" 
                      value={providerForm.contato} 
                      onChange={e => setProviderForm({...providerForm, contato: e.target.value})} 
                      className="glass-input" 
                      placeholder="Ex: contato@empresa.com.br / (11) 99999-8888" 
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0.75rem 0' }}>
                  <input 
                    type="checkbox" 
                    id="ativo" 
                    checked={providerForm.ativo} 
                    onChange={e => setProviderForm({...providerForm, ativo: e.target.checked})} 
                  />
                  <label htmlFor="ativo" className="glass-label" style={{ margin: 0, cursor: 'pointer' }}>Prestador ativo para novas designações</label>
                </div>

                <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                  <button type="submit" className="glass-btn glass-btn-primary" style={{ padding: '0.6rem 1.5rem' }}>
                    {editingProviderId ? 'Salvar Alterações' : 'Salvar Prestador'}
                  </button>
                  <button 
                    type="button" 
                    onClick={() => { setShowAddForm(false); setEditingProviderId(null); }} 
                    className="glass-btn" 
                    style={{ padding: '0.6rem 1rem' }}
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Listagem */}
          <div style={styles.listContainer}>
            {filteredPrestadores.length === 0 ? (
              <div className="glass-panel" style={styles.emptyContainer}>
                <AlertCircle size={32} color="var(--text-muted)" />
                <p style={{ marginTop: '0.5rem', color: 'var(--text-muted)' }}>Nenhum prestador encontrado para os filtros selecionados.</p>
              </div>
            ) : (
              filteredPrestadores.map(p => {
                const metrics = getProviderMetrics(p._id);
                const isSelected = selectedProvider && selectedProvider._id === p._id;
                
                return (
                  <div 
                    key={p._id} 
                    className={`glass-panel card-hover ${isSelected ? 'active-provider-card' : ''}`}
                    style={{ 
                      ...styles.providerCard, 
                      borderLeft: isSelected ? '4px solid var(--primary)' : '1px solid var(--glass-border)',
                      background: isSelected ? 'rgba(37, 99, 235, 0.04)' : 'var(--glass-bg)'
                    }}
                    onClick={() => setSelectedProvider(p)}
                  >
                    <div style={styles.cardMain}>
                      <div style={{ display: 'flex', justifyContent: 'between', alignItems: 'start', width: '100%' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <h3 style={styles.providerName}>{p.nome}</h3>
                            <span style={{ 
                              ...styles.statusBadge, 
                              backgroundColor: p.ativo ? 'rgba(34, 197, 94, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                              color: p.ativo ? 'var(--success)' : 'var(--danger)'
                            }}>
                              {p.ativo ? 'Ativo' : 'Inativo'}
                            </span>
                          </div>
                          {p.cnpj && <p style={styles.providerCnpj}>CNPJ: {p.cnpj}</p>}
                          {p.contato && (
                            <p style={styles.providerContact}>
                              <Phone size={11} style={{ marginRight: '4px' }} /> {p.contato}
                            </p>
                          )}
                        </div>

                        {/* Metricas Rapidas */}
                        <div style={styles.cardMetrics}>
                          <div style={styles.metricItem}>
                            <span style={styles.metricVal}>{metrics.sla}%</span>
                            <span style={styles.metricLabel}>SLA</span>
                          </div>
                          <div style={styles.metricItem}>
                            <span style={styles.metricVal}>{metrics.completed}</span>
                            <span style={styles.metricLabel}>Concluídos</span>
                          </div>
                          <div style={styles.metricItem}>
                            <span style={styles.metricVal}>{metrics.pending}</span>
                            <span style={styles.metricLabel}>Pendentes</span>
                          </div>
                        </div>
                      </div>

                      {/* Lista de Classes atreladas */}
                      <div style={styles.classesList}>
                        {metrics.classes.length === 0 ? (
                          <span style={styles.noClasses}>Sem categoria de serviço vinculada</span>
                        ) : (
                          metrics.classes.map(c => (
                            <span key={c._id} style={styles.classTag}>
                              {c.nome}
                            </span>
                          ))
                        )}
                      </div>
                    </div>

                    <div style={styles.cardActions} onClick={e => e.stopPropagation()}>
                      {isStaff && (
                        <>
                          <button onClick={() => handleEdit(p)} className="glass-btn" style={styles.editBtn} title="Editar cadastro">
                            <Edit size={14} />
                          </button>
                          <button onClick={() => handleDelete(p._id)} className="glass-btn" style={styles.deleteBtn} title="Inativar prestador">
                            <Trash2 size={14} />
                          </button>
                        </>
                      )}
                      <button onClick={() => setSelectedProvider(p)} className="glass-btn" style={styles.detailsBtn}>
                        Ver Histórico <ArrowRight size={12} style={{ marginLeft: '4px' }} />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Painel Direito: Detalhes, Mocks e Histórico de Atividades */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {selectedProvider ? (
            <div className="glass-panel" style={styles.detailContainer}>
              <div style={styles.detailHeader}>
                <div>
                  <span style={styles.detailPreTitle}>Histórico Técnico & Conformidade</span>
                  <h2 style={styles.detailTitle}>{selectedProvider.nome}</h2>
                  {selectedProvider.cnpj && <span style={styles.detailSubtitle}>CNPJ: {selectedProvider.cnpj}</span>}
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ ...styles.slaCircle, borderColor: getProviderMetrics(selectedProvider._id).sla >= 80 ? 'var(--success)' : 'var(--warning)' }}>
                    <span style={styles.slaPercent}>{getProviderMetrics(selectedProvider._id).sla}%</span>
                    <span style={styles.slaLabel}>Conformidade</span>
                  </div>
                </div>
              </div>

              {/* Informações detalhadas */}
              <div style={styles.detailInfoGrid}>
                <div style={styles.detailInfoItem}>
                  <Clock size={16} color="var(--text-muted)" />
                  <div>
                    <strong>Serviços no Cronograma:</strong>
                    <span>{getProviderMetrics(selectedProvider._id).total} obrigações associadas</span>
                  </div>
                </div>
                <div style={styles.detailInfoItem}>
                  <UserCheck size={16} color="var(--text-muted)" />
                  <div>
                    <strong>Categorias sob Gestão:</strong>
                    <span>{getProviderMetrics(selectedProvider._id).classes.length} especialidades</span>
                  </div>
                </div>
                <div style={styles.detailInfoItem}>
                  <DollarSign size={16} color="var(--text-muted)" />
                  <div>
                    <strong>Faturamento Terceirizado:</strong>
                    <span>R$ {getProviderMetrics(selectedProvider._id).totalCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </div>

              <div style={styles.divider}></div>

              {/* Lista de Atividades do Prestador (Mocks / Serviços já realizados) */}
              <h3 style={styles.sectionTitle}>Histórico de Serviços Prestados</h3>
              <div style={styles.tasksList}>
                {getProviderMetrics(selectedProvider._id).tasks.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', textAlign: 'center', padding: '2rem 0' }}>
                    Nenhum serviço registrado para este prestador de serviço.
                  </p>
                ) : (
                  getProviderMetrics(selectedProvider._id).tasks
                    .sort((a, b) => new Date(b.data_vencimento) - new Date(a.data_vencimento)) // Ordena por data (mais recentes primeiro)
                    .map(t => {
                      const isOverdue = t.status !== 'Concluído' && new Date(t.data_vencimento) < new Date();
                      return (
                        <div key={t._id} style={styles.taskItem} className="glass-card">
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                            <div>
                              <h4 style={styles.taskTitle}>{t.titulo}</h4>
                              <p style={styles.taskCompany}>
                                <Building size={11} style={{ marginRight: '4px', display: 'inline-block' }} /> 
                                {getEmpresaNome(t.empresa_id)}
                              </p>
                            </div>
                            <span style={{ 
                              ...styles.statusBadge, 
                              backgroundColor: t.status === 'Concluído' ? 'rgba(34, 197, 94, 0.12)' : 
                                               isOverdue ? 'rgba(239, 68, 68, 0.12)' : 'rgba(234, 88, 12, 0.12)',
                              color: t.status === 'Concluído' ? 'var(--success)' : 
                                     isOverdue ? 'var(--danger)' : '#ea580c'
                            }}>
                              {isOverdue ? 'Atrasado' : t.status}
                            </span>
                          </div>
                          
                          <div style={styles.taskMeta}>
                            <span>
                              <strong>Vencimento/Execução:</strong> {new Date(t.data_vencimento).toLocaleDateString('pt-BR')}
                            </span>
                            {t.custo_projetado > 0 && (
                              <span>
                                <strong>Custo:</strong> R$ {t.custo_projetado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </span>
                            )}
                          </div>

                          <div style={styles.taskFooter}>
                            <a href={`#/condicionantes/${t._id}`} style={styles.linkTask}>
                              Acessar Condicionante <Sparkles size={11} style={{ marginLeft: '4px' }} />
                            </a>
                          </div>
                        </div>
                      );
                    })
                )}
              </div>
            </div>
          ) : (
            <div className="glass-panel" style={styles.noSelected}>
              <Briefcase size={44} color="var(--text-muted)" style={{ opacity: 0.5, marginBottom: '1rem' }} />
              <h3>Selecione um Prestador</h3>
              <p style={{ maxWidth: '320px', marginTop: '0.5rem' }}>
                Clique em "Ver Histórico" ou selecione um prestador ao lado para auditar sua performance, serviços já realizados e faturamento.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    padding: '0.5rem',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '2rem',
  },
  title: {
    fontSize: '1.75rem',
    fontWeight: 800,
    color: 'var(--text-main)',
    lineHeight: '1.2',
  },
  subtitle: {
    fontSize: '0.9rem',
    color: 'var(--text-muted)',
    marginTop: '0.25rem',
  },
  addBtn: {
    display: 'flex',
    alignItems: 'center',
    padding: '0.6rem 1.25rem',
    fontSize: '0.85rem',
    fontWeight: '600',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '1.25rem',
    marginBottom: '2rem',
  },
  statCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '1.25rem',
    padding: '1.25rem',
  },
  statIconContainer: {
    width: '44px',
    height: '44px',
    borderRadius: '12px',
    background: 'rgba(255, 255, 255, 0.4)',
    border: '1px solid var(--glass-border)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statVal: {
    fontSize: '1.4rem',
    fontWeight: 750,
    color: 'var(--text-main)',
  },
  statLabel: {
    fontSize: '0.75rem',
    color: 'var(--text-muted)',
    fontWeight: 500,
  },
  layoutSplit: {
    display: 'flex',
    gap: '1.5rem',
    flexWrap: 'wrap',
  },
  filtersRow: {
    display: 'flex',
    gap: '1rem',
    padding: '1rem',
    alignItems: 'center',
  },
  searchContainer: {
    position: 'relative',
    flex: 1,
  },
  searchIcon: {
    position: 'absolute',
    left: '12px',
    top: '50%',
    transform: 'translateY(-50%)',
    color: 'var(--text-muted)',
  },
  searchInput: {
    width: '100%',
    padding: '0.65rem 1rem 0.65rem 2.25rem',
    borderRadius: '12px',
    border: '1px solid var(--glass-border)',
    background: 'rgba(255,255,255,0.4)',
    fontSize: '0.875rem',
    color: 'var(--text-main)',
    outline: 'none',
  },
  selectInput: {
    width: '200px',
    padding: '0.65rem',
    fontSize: '0.85rem',
  },
  formContainer: {
    padding: '1.25rem',
  },
  formHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1rem',
  },
  panelTitle: {
    fontSize: '1.1rem',
    fontWeight: 700,
    color: 'var(--text-main)',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '1rem',
  },
  listContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  emptyContainer: {
    padding: '3rem',
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
  },
  providerCard: {
    padding: '1.25rem',
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    gap: '1rem',
    transition: 'all 0.2s ease-in-out',
  },
  cardMain: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
  },
  providerName: {
    fontSize: '1.1rem',
    fontWeight: 700,
    color: 'var(--text-main)',
  },
  statusBadge: {
    padding: '0.15rem 0.5rem',
    borderRadius: '6px',
    fontSize: '0.7rem',
    fontWeight: 600,
  },
  providerCnpj: {
    fontSize: '0.75rem',
    color: 'var(--text-muted)',
    marginTop: '0.15rem',
  },
  providerContact: {
    fontSize: '0.75rem',
    color: 'var(--text-muted)',
    display: 'flex',
    alignItems: 'center',
    marginTop: '0.15rem',
  },
  cardMetrics: {
    display: 'flex',
    gap: '1rem',
    textAlign: 'right',
  },
  metricItem: {
    display: 'flex',
    flexDirection: 'column',
  },
  metricVal: {
    fontSize: '1rem',
    fontWeight: 700,
    color: 'var(--text-main)',
  },
  metricLabel: {
    fontSize: '0.65rem',
    color: 'var(--text-light)',
  },
  classesList: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '0.4rem',
  },
  classTag: {
    background: 'rgba(37, 99, 235, 0.08)',
    color: 'var(--primary)',
    padding: '0.2rem 0.5rem',
    borderRadius: '6px',
    fontSize: '0.65rem',
    fontWeight: 600,
  },
  noClasses: {
    fontSize: '0.7rem',
    color: 'var(--text-light)',
    fontStyle: 'italic',
  },
  cardActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '0.5rem',
    borderTop: '1px solid var(--glass-border)',
    paddingTop: '0.75rem',
  },
  editBtn: {
    padding: '0.4rem',
  },
  deleteBtn: {
    padding: '0.4rem',
    color: 'var(--danger)',
  },
  detailsBtn: {
    padding: '0.4rem 0.75rem',
    fontSize: '0.75rem',
    fontWeight: 600,
    display: 'flex',
    alignItems: 'center',
    background: 'rgba(255,255,255,0.4)',
  },
  detailContainer: {
    padding: '1.5rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '1.25rem',
  },
  detailHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'start',
  },
  detailPreTitle: {
    fontSize: '0.65rem',
    fontWeight: 700,
    color: 'var(--primary)',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  detailTitle: {
    fontSize: '1.35rem',
    fontWeight: 800,
    color: 'var(--text-main)',
    marginTop: '0.15rem',
  },
  detailSubtitle: {
    fontSize: '0.8rem',
    color: 'var(--text-muted)',
    marginTop: '0.15rem',
    display: 'block',
  },
  slaCircle: {
    width: '60px',
    height: '60px',
    borderRadius: '50%',
    border: '3.5px solid',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(255,255,255,0.5)',
  },
  slaPercent: {
    fontSize: '1rem',
    fontWeight: 750,
    color: 'var(--text-main)',
    lineHeight: '1',
  },
  slaLabel: {
    fontSize: '0.5rem',
    color: 'var(--text-muted)',
    fontWeight: 500,
    marginTop: '2px',
  },
  detailInfoGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '1rem',
  },
  detailInfoItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '0.75rem',
    borderRadius: '10px',
    background: 'rgba(255,255,255,0.3)',
    border: '1px solid var(--glass-border)',
    fontSize: '0.75rem',
    color: 'var(--text-main)',
  },
  divider: {
    height: '1px',
    background: 'var(--glass-border)',
  },
  sectionTitle: {
    fontSize: '0.95rem',
    fontWeight: 750,
    color: 'var(--text-main)',
  },
  tasksList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
    maxHeight: '450px',
    overflowY: 'auto',
    paddingRight: '0.25rem',
  },
  taskItem: {
    padding: '1rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  taskTitle: {
    fontSize: '0.85rem',
    fontWeight: 700,
    color: 'var(--text-main)',
  },
  taskCompany: {
    fontSize: '0.75rem',
    color: 'var(--text-muted)',
    marginTop: '0.1rem',
  },
  taskMeta: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '0.7rem',
    color: 'var(--text-light)',
    marginTop: '0.25rem',
  },
  taskFooter: {
    display: 'flex',
    justifyContent: 'flex-end',
    borderTop: '1px solid var(--glass-border)',
    paddingTop: '0.5rem',
    marginTop: '0.25rem',
  },
  linkTask: {
    fontSize: '0.725rem',
    fontWeight: 600,
    color: 'var(--primary)',
    textDecoration: 'none',
    display: 'flex',
    alignItems: 'center',
  },
  noSelected: {
    padding: '4rem 2rem',
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'var(--text-muted)',
  },
};
