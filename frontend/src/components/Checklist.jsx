import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { 
  CheckSquare, 
  UserPlus, 
  UploadCloud, 
  Check, 
  X, 
  User, 
  FileText, 
  Eye, 
  Clock, 
  AlertCircle,
  HelpCircle
} from 'lucide-react';

export default function Checklist({ user }) {
  const [tarefas, setTarefas] = useState([]);
  const [empresas, setEmpresas] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  
  // Filtros
  const [filtroEmpresa, setFiltroEmpresa] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('');
  const [filtroPeriodicidade, setFiltroPeriodicidade] = useState('');
  
  // Seleção e Ações
  const [selectedTask, setSelectedTask] = useState(null);
  const [uploadingFile, setUploadingFile] = useState(null);
  const [observacaoAuditoria, setObservacaoAuditoria] = useState('');
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  const fetchDados = async () => {
    try {
      const filters = {};
      if (filtroEmpresa) filters.empresa_id = filtroEmpresa;
      if (filtroStatus) filters.status = filtroStatus;

      const tList = await api.listTarefas(filters);
      setTarefas(tList);

      // Carrega empresas e usuários para filtros e nomes
      if (empresas.length === 0) {
        const empList = await api.listEmpresas();
        setEmpresas(empList);
      }
      if (usuarios.length === 0 && user.role !== 'cliente') {
        const uList = await api.listUsuarios();
        setUsuarios(uList);
      }
    } catch (err) {
      console.error("Erro ao carregar checklist:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDados();
  }, [filtroEmpresa, filtroStatus]);

  const handleClaimTask = async (task) => {
    try {
      setErrorMessage('');
      const updated = await api.updateTarefa(task._id, {
        responsavel_id: user._id,
        status: 'Em Andamento'
      });
      setSelectedTask(updated);
      fetchDados();
    } catch (err) {
      setErrorMessage(err.message || 'Falha ao assumir tarefa');
    }
  };

  const handleFileUpload = async (e, taskId) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setErrorMessage('');
    try {
      const updated = await api.uploadComprovante(taskId, file);
      setSelectedTask(updated);
      fetchDados();
    } catch (err) {
      setErrorMessage(err.message || 'Falha ao enviar comprovante');
    }
  };

  const handleApproveTask = async (task) => {
    try {
      setErrorMessage('');
      const updated = await api.updateTarefa(task._id, {
        status: 'Concluído'
      }, observacaoAuditoria || 'Tarefa aprovada na auditoria técnica.');
      
      setObservacaoAuditoria('');
      setSelectedTask(updated);
      fetchDados();
    } catch (err) {
      setErrorMessage(err.message || 'Falha ao aprovar tarefa');
    }
  };

  const handleRejectTask = async (task) => {
    if (!observacaoAuditoria) {
      setErrorMessage('Por favor, informe uma observação justificando a rejeição.');
      return;
    }
    
    try {
      setErrorMessage('');
      const updated = await api.updateTarefa(task._id, {
        status: 'Pendente'
      }, `Rejeitado na auditoria: ${observacaoAuditoria}`);
      
      setObservacaoAuditoria('');
      setSelectedTask(updated);
      fetchDados();
    } catch (err) {
      setErrorMessage(err.message || 'Falha ao rejeitar tarefa');
    }
  };

  const getUsuarioNome = (id) => {
    if (!id) return 'Sistema';
    if (id === user._id) return 'Você';
    const found = usuarios.find(u => u._id === id);
    return found ? found.nome : 'Consultor';
  };

  const getEmpresaNome = (id) => {
    const found = empresas.find(e => e._id === id);
    return found ? found.nome_fantasia : 'Empresa';
  };

  const getStatusStyle = (status) => {
    switch (status) {
      case 'Concluído': return { color: 'var(--success)', background: 'var(--success-light)' };
      case 'Aguardando Auditoria': return { color: 'var(--warning)', background: 'var(--warning-light)' };
      case 'Em Andamento': return { color: 'var(--primary)', background: 'var(--primary-light)' };
      case 'Atrasado': return { color: 'var(--danger)', background: 'var(--danger-light)' };
      default: return { color: 'var(--text-muted)', background: 'rgba(255,255,255,0.4)' };
    }
  };

  if (loading && tarefas.length === 0) {
    return (
      <div style={styles.loaderContainer}>
        <div className="animate-spin" style={styles.spinner}></div>
        <p style={{ marginTop: '1rem', color: 'var(--text-muted)' }}>Processando lista de condicionantes...</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in" style={styles.container}>
      <header style={styles.header}>
        <div style={styles.titleArea}>
          <CheckSquare size={28} color="var(--primary)" />
          <div>
            <h1 style={styles.title}>Checklist Operacional</h1>
            <p style={styles.subtitle}>Gerencie condicionantes, submeta evidências e audite tarefas.</p>
          </div>
        </div>

        {/* Barra de Filtros */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%' }}>
          <div style={styles.filterBar} className="glass-card">
            {user.role !== 'cliente' && (
              <select 
                value={filtroEmpresa} 
                onChange={e => setFiltroEmpresa(e.target.value)} 
                className="glass-input glass-select"
                style={styles.filterSelect}
              >
                <option value="">Todas as Empresas</option>
                {empresas.map(e => (
                  <option key={e._id} value={e._id}>{e.nome_fantasia}</option>
                ))}
              </select>
            )}

            <select 
              value={filtroStatus} 
              onChange={e => setFiltroStatus(e.target.value)} 
              className="glass-input glass-select"
              style={styles.filterSelect}
            >
              <option value="">Todos os Status</option>
              <option value="Pendente">Pendentes</option>
              <option value="Em Andamento">Em Andamento</option>
              <option value="Aguardando Auditoria">Aguardando Auditoria</option>
              <option value="Concluído">Concluídos</option>
            </select>
          </div>

          {/* Abas de Periodicidade */}
          <div style={styles.periodicityTabs}>
            {[
              { id: '', label: 'Todas as Atividades' },
              { id: 'Diária', label: 'Diárias' },
              { id: 'Semanal', label: 'Semanais' },
              { id: 'Mensal', label: 'Mensais' },
              { id: 'Outra', label: 'Outras/Únicas' }
            ].map(tab => {
              const isActive = filtroPeriodicidade === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setFiltroPeriodicidade(tab.id)}
                  style={{
                    ...styles.periodicityTab,
                    ...(isActive ? styles.periodicityTabActive : {})
                  }}
                  className="glass-btn"
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {errorMessage && (
        <div style={styles.errorAlert}>
          <AlertCircle size={18} />
          <p>{errorMessage}</p>
        </div>
      )}

      <div style={styles.mainLayout}>
        {/* Tabela de Tarefas */}
        <div className="glass-panel" style={styles.tablePanel}>
          <table style={styles.table}>
            <thead>
              <tr style={styles.theadRow}>
                <th style={styles.th}>Condicionante</th>
                {user.role === 'cliente' ? (
                  <th style={styles.th}>Periodicidade</th>
                ) : (
                  <th style={styles.th}>Empresa</th>
                )}
                <th style={styles.th}>Vencimento</th>
                <th style={styles.th}>Status</th>
                {user.role !== 'cliente' && <th style={styles.th}>Responsável</th>}
                <th style={styles.th}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {(() => {
                const tarefasExibidas = tarefas.filter(t => {
                  if (filtroPeriodicidade && t.periodicidade !== filtroPeriodicidade) return false;
                  return true;
                });

                if (tarefasExibidas.length === 0) {
                  return (
                    <tr>
                      <td colSpan={user.role === 'cliente' ? "5" : "6"} style={styles.emptyRow}>
                        Nenhuma tarefa encontrada para esta visualização.
                      </td>
                    </tr>
                  );
                }

                return tarefasExibidas.map(task => {
                  const isSelected = selectedTask?._id === task._id;
                  return (
                    <tr 
                      key={task._id} 
                      onClick={() => setSelectedTask(task)}
                      style={{
                        ...styles.tbodyRow,
                        ...(isSelected ? styles.selectedRow : {})
                      }}
                    >
                      <td style={styles.td}>
                        <div style={styles.taskCell}>
                          <span style={styles.taskTitle}>{task.titulo}</span>
                          <span style={styles.taskDesc}>{task.descricao?.slice(0, 70)}...</span>
                        </div>
                      </td>
                      {user.role === 'cliente' ? (
                        <td style={styles.td}>
                          <span style={{
                            ...styles.statusPill,
                            background: task.periodicidade === 'Diária' ? 'rgba(34, 197, 94, 0.1)' : 
                                        task.periodicidade === 'Semanal' ? 'rgba(59, 130, 246, 0.1)' : 
                                        task.periodicidade === 'Mensal' ? 'rgba(168, 85, 247, 0.1)' : 'rgba(255,255,255,0.4)',
                            color: task.periodicidade === 'Diária' ? 'rgb(34, 197, 94)' : 
                                   task.periodicidade === 'Semanal' ? 'rgb(59, 130, 246)' : 
                                   task.periodicidade === 'Mensal' ? 'rgb(168, 85, 247)' : 'var(--text-muted)'
                          }}>
                            {task.periodicidade || 'Mensal'}
                          </span>
                        </td>
                      ) : (
                        <td style={styles.td}>{getEmpresaNome(task.empresa_id)}</td>
                      )}
                      <td style={styles.td}>{new Date(task.data_vencimento).toLocaleDateString('pt-BR')}</td>
                      <td style={styles.td}>
                        <span style={{ ...styles.statusPill, ...getStatusStyle(task.status) }}>
                          {task.status}
                        </span>
                      </td>
                      {user.role !== 'cliente' && <td style={styles.td}>{getUsuarioNome(task.responsavel_id)}</td>}
                      <td style={styles.td}>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedTask(task);
                          }}
                          className="glass-btn"
                          style={styles.actionBtn}
                        >
                          <Eye size={14} /> Detalhes
                        </button>
                      </td>
                    </tr>
                  );
                });
              })()}
            </tbody>
          </table>
        </div>

        {/* Painel Lateral de Rastreabilidade e Auditoria */}
        {selectedTask && (
          <div className="glass-panel animate-fade-in" style={styles.drawer}>
            <div style={styles.drawerHeader}>
              <h3 style={styles.drawerTitle}>{selectedTask.titulo}</h3>
              <button onClick={() => setSelectedTask(null)} style={styles.closeBtn}>
                <X size={18} />
              </button>
            </div>
            
            <div style={styles.drawerBody}>
              <div style={styles.detailCard} className="glass-card">
                <p style={styles.detailText}><strong>Empresa:</strong> {getEmpresaNome(selectedTask.empresa_id)}</p>
                <p style={styles.detailText}><strong>Vencimento:</strong> {new Date(selectedTask.data_vencimento).toLocaleDateString('pt-BR')}</p>
                <p style={styles.detailText}><strong>Valor Estimado:</strong> R$ {selectedTask.valor_estimado}</p>
                <p style={styles.detailText}><strong>Status:</strong> {selectedTask.status}</p>
                <p style={styles.detailText}><strong>Responsável:</strong> {getUsuarioNome(selectedTask.responsavel_id)}</p>
                {selectedTask.comprovante_url && (
                  <a 
                    href={`http://localhost:8000${selectedTask.comprovante_url}`} 
                    target="_blank" 
                    rel="noreferrer"
                    className="glass-btn"
                    style={styles.downloadBtn}
                  >
                    <FileText size={16} /> Ver Comprovante Anexado
                  </a>
                )}
              </div>

              {/* Botões Operacionais baseados no Estado da Tarefa e na Role */}
              <div style={styles.actionBox}>
                {selectedTask.status === 'Pendente' && (
                  <button 
                    onClick={() => handleClaimTask(selectedTask)}
                    className="glass-btn glass-btn-primary"
                    style={styles.fullWidthBtn}
                  >
                    <UserPlus size={16} /> Assumir Esta Condicionante
                  </button>
                )}

                {(selectedTask.status === 'Pendente' || selectedTask.status === 'Em Andamento') && (
                  <div style={styles.uploadArea}>
                    <label style={styles.uploadLabel} className="glass-btn">
                      <UploadCloud size={18} />
                      Submeter Comprovante
                      <input 
                        type="file" 
                        onChange={(e) => handleFileUpload(e, selectedTask._id)} 
                        style={{ display: 'none' }}
                      />
                    </label>
                  </div>
                )}

                {selectedTask.status === 'Aguardando Auditoria' && user.role === 'admin' && (
                  <div style={styles.auditControls}>
                    <textarea
                      placeholder="Observação da auditoria (obrigatória para rejeição)..."
                      value={observacaoAuditoria}
                      onChange={e => setObservacaoAuditoria(e.target.value)}
                      className="glass-input"
                      rows={2}
                      style={styles.auditTextarea}
                    />
                    <div style={styles.auditBtns}>
                      <button 
                        onClick={() => handleApproveTask(selectedTask)} 
                        className="glass-btn" 
                        style={{ ...styles.auditBtn, background: 'var(--success)', color: 'white' }}
                      >
                        <Check size={16} /> Aprovar
                      </button>
                      <button 
                        onClick={() => handleRejectTask(selectedTask)} 
                        className="glass-btn" 
                        style={{ ...styles.auditBtn, background: 'var(--danger)', color: 'white' }}
                      >
                        <X size={16} /> Recusar
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Linha do tempo (Auditoria) */}
              <div style={styles.timelineContainer}>
                <h4 style={styles.timelineHeader}>Rastreabilidade & Histórico</h4>
                <div style={styles.timeline}>
                  {selectedTask.historico_observacoes && selectedTask.historico_observacoes.length === 0 ? (
                    <p style={styles.emptyTimeline}>Nenhum histórico registrado para esta tarefa.</p>
                  ) : (
                    selectedTask.historico_observacoes?.map((obs, idx) => (
                      <div key={idx} style={styles.timelineItem}>
                        <div style={styles.timelineDot}></div>
                        <div style={styles.timelineContent}>
                          <span style={styles.timelineTime}>
                            {new Date(obs.data).toLocaleString('pt-BR')}
                          </span>
                          <p style={styles.timelineText}>{obs.texto}</p>
                          <span style={styles.timelineUser}>
                            Realizado por: <strong>{getUsuarioNome(obs.usuario_id)}</strong>
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2rem',
    width: '100%',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    textAlign: 'left',
    flexWrap: 'wrap',
    gap: '1rem',
  },
  titleArea: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.85rem',
  },
  title: {
    fontSize: '2rem',
    fontWeight: '700',
    color: 'var(--text-main)',
  },
  subtitle: {
    fontSize: '0.95rem',
    color: 'var(--text-muted)',
  },
  filterBar: {
    display: 'flex',
    gap: '1rem',
    padding: '0.5rem 1rem',
  },
  filterSelect: {
    minWidth: '180px',
    padding: '0.5rem 1rem',
  },
  mainLayout: {
    display: 'flex',
    gap: '1.5rem',
    alignItems: 'flex-start',
    width: '100%',
    flexWrap: 'wrap',
  },
  tablePanel: {
    flex: 1,
    padding: '1.5rem',
    overflowX: 'auto',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    textAlign: 'left',
  },
  theadRow: {
    borderBottom: '2px solid var(--glass-border)',
  },
  th: {
    fontFamily: 'var(--font-heading)',
    fontSize: '0.85rem',
    fontWeight: '600',
    color: 'var(--text-light)',
    padding: '1rem',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  tbodyRow: {
    borderBottom: '1px solid var(--glass-border)',
    cursor: 'pointer',
  },
  tbodyRowHover: {
    background: 'var(--glass-bg-hover)',
  },
  selectedRow: {
    background: 'rgba(255,255,255,0.5)',
  },
  td: {
    padding: '1.15rem 1rem',
    fontSize: '0.925rem',
    color: 'var(--text-muted)',
  },
  taskCell: {
    display: 'flex',
    flexDirection: 'column',
    textAlign: 'left',
  },
  taskTitle: {
    fontSize: '0.95rem',
    fontWeight: '600',
    color: 'var(--text-main)',
  },
  taskDesc: {
    fontSize: '0.75rem',
    color: 'var(--text-light)',
    marginTop: '0.15rem',
  },
  statusPill: {
    fontSize: '0.75rem',
    fontWeight: '600',
    padding: '0.35rem 0.65rem',
    borderRadius: '8px',
    display: 'inline-block',
  },
  actionBtn: {
    padding: '0.45rem 0.85rem',
    fontSize: '0.8rem',
    background: 'rgba(255,255,255,0.4)',
  },
  drawer: {
    width: '100%',
    maxWidth: '380px',
    padding: '1.5rem',
    textAlign: 'left',
    display: 'flex',
    flexDirection: 'column',
    maxHeight: '80vh',
    overflowY: 'auto',
  },
  drawerHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1rem',
  },
  drawerTitle: {
    fontSize: '1.25rem',
    fontWeight: '700',
    lineHeight: 1.2,
  },
  closeBtn: {
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    color: 'var(--text-muted)',
  },
  drawerBody: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
  },
  detailCard: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
    padding: '1.25rem',
    background: 'rgba(255,255,255,0.3)',
  },
  detailText: {
    fontSize: '0.85rem',
    color: 'var(--text-muted)',
  },
  downloadBtn: {
    marginTop: '0.5rem',
    fontSize: '0.85rem',
    width: '100%',
    background: 'rgba(255, 255, 255, 0.6)',
  },
  actionBox: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
  },
  fullWidthBtn: {
    width: '100%',
    padding: '0.75rem',
  },
  uploadArea: {
    width: '100%',
  },
  uploadLabel: {
    width: '100%',
    padding: '0.75rem',
    borderStyle: 'dashed',
    borderWidth: '2px',
    borderColor: 'var(--primary)',
    background: 'var(--primary-light)',
    color: 'var(--primary)',
    fontWeight: '600',
  },
  auditControls: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
    background: 'rgba(255, 255, 255, 0.45)',
    padding: '1rem',
    borderRadius: '12px',
    border: '1px solid var(--glass-border)',
  },
  auditTextarea: {
    resize: 'none',
    fontSize: '0.85rem',
  },
  auditBtns: {
    display: 'flex',
    gap: '0.5rem',
  },
  auditBtn: {
    flex: 1,
    padding: '0.6rem',
    fontSize: '0.85rem',
    borderColor: 'transparent',
  },
  timelineContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
  },
  timelineHeader: {
    fontSize: '0.875rem',
    fontWeight: '600',
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.03em',
  },
  timeline: {
    display: 'flex',
    flexDirection: 'column',
    paddingLeft: '0.5rem',
    position: 'relative',
    borderLeft: '2px solid var(--glass-border)',
    marginLeft: '0.5rem',
    gap: '1.25rem',
  },
  timelineItem: {
    position: 'relative',
    paddingLeft: '1.25rem',
  },
  timelineDot: {
    position: 'absolute',
    left: '-5px',
    top: '4px',
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    background: 'var(--primary)',
    border: '2px solid white',
  },
  timelineContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.15rem',
  },
  timelineTime: {
    fontSize: '0.72rem',
    color: 'var(--text-light)',
    fontWeight: '500',
  },
  timelineText: {
    fontSize: '0.825rem',
    color: 'var(--text-muted)',
    lineHeight: 1.35,
  },
  timelineUser: {
    fontSize: '0.72rem',
    color: 'var(--text-light)',
    marginTop: '0.1rem',
  },
  emptyTimeline: {
    fontSize: '0.8rem',
    color: 'var(--text-light)',
    fontStyle: 'italic',
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
    textAlign: 'left',
  },
  emptyRow: {
    textAlign: 'center',
    padding: '2rem',
    color: 'var(--text-light)',
    fontStyle: 'italic',
  },
  loaderContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '60vh',
    width: '100%',
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '4px solid var(--glass-border)',
    borderTopColor: 'var(--primary)',
    borderRadius: '50%',
  },
  periodicityTabs: {
    display: 'flex',
    gap: '0.5rem',
    flexWrap: 'wrap',
    padding: '0.25rem 0.5rem',
  },
  periodicityTab: {
    padding: '0.45rem 1rem',
    fontSize: '0.85rem',
    borderRadius: '10px',
    background: 'rgba(255, 255, 255, 0.25)',
    border: '1px solid var(--glass-border)',
    color: 'var(--text-muted)',
    cursor: 'pointer',
    fontWeight: '500',
    transition: 'all 0.2s ease',
  },
  periodicityTabActive: {
    background: 'var(--primary)',
    color: 'white',
    borderColor: 'var(--primary)',
    boxShadow: 'var(--shadow-sm)',
  },
};
