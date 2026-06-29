import React, { useState, useEffect, useRef } from 'react';
import { api } from '../api';
import { 
  CheckCircle, 
  AlertCircle, 
  ArrowLeft, 
  ChevronRight, 
  Clock, 
  Calendar, 
  User, 
  FileText, 
  UploadCloud, 
  Bell, 
  Check, 
  X,
  MessageSquare,
  DollarSign,
  Activity,
  Download,
  Briefcase
} from 'lucide-react';

export default function CondicionanteDetail({ taskId, user, onBack, onGoToCompany, onGoToDocument }) {
  const [task, setTask] = useState(null);
  const [empresa, setEmpresa] = useState(null);
  const [documento, setDocumento] = useState(null);
  const [usuarios, setUsuarios] = useState([]);
  const [prestadores, setPrestadores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  
  // Ações
  const [textoProvidencia, setTextoProvidencia] = useState('');
  const [textoRejeicao, setTextoRejeicao] = useState('');
  const [uploading, setUploading] = useState(false);
  const [notifying, setNotifying] = useState(false);
  const fileInputRef = useRef(null);

  const loadDetails = async () => {
    try {
      setLoading(true);
      setErrorMessage('');
      const taskData = await api.getTarefa(taskId);
      setTask(taskData);

      const promises = [
        api.getEmpresa(taskData.empresa_id),
        user.role !== 'cliente' ? api.listUsuarios() : Promise.resolve([]),
        api.listPrestadores()
      ];
      if (taskData.documento_id) {
        promises.push(api.getDocumento(taskData.documento_id));
      }
      
      const results = await Promise.all(promises);
      setEmpresa(results[0]);
      setUsuarios(results[1]);
      setPrestadores(results[2]);
      if (taskData.documento_id) {
        setDocumento(results[3]);
      }
    } catch (err) {
      console.error("Erro ao carregar detalhes da condicionante:", err);
      setErrorMessage("Erro ao buscar dados desta condicionante.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (taskId) {
      loadDetails();
    }
  }, [taskId]);

  const showToast = (type, text) => {
    if (type === 'success') {
      setSuccessMessage(text);
      setTimeout(() => setSuccessMessage(''), 4000);
    } else {
      setErrorMessage(text);
      setTimeout(() => setErrorMessage(''), 4000);
    }
  };

  const handleClaim = async () => {
    try {
      const updated = await api.updateTarefa(task._id, {
        responsavel_id: user._id,
        status: 'Em Andamento'
      }, "Assumiu a responsabilidade pela condicionante.");
      setTask(updated);
      showToast('success', 'Você assumiu esta condicionante com sucesso!');
    } catch (err) {
      showToast('error', err.message || 'Erro ao assumir condicionante.');
    }
  };

  const handleUpdatePrestador = async (prestadorId) => {
    try {
      const updated = await api.updateTarefa(task._id, {
        prestador_id: prestadorId || null
      }, "Alterou o prestador de serviço da condicionante.");
      setTask(updated);
      showToast('success', 'Prestador de serviço atualizado com sucesso!');
    } catch (err) {
      showToast('error', err.message || 'Falha ao atualizar prestador de serviço.');
    }
  };

  const handleUpdateCustoProjetado = async (custo) => {
    try {
      const parsed = parseFloat(custo) || 0.0;
      const updated = await api.updateTarefa(task._id, {
        custo_projetado: parsed
      }, `Alterou o custo projetado para R$ ${parsed.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}.`);
      setTask(updated);
      showToast('success', 'Custo projetado atualizado com sucesso!');
    } catch (err) {
      showToast('error', err.message || 'Falha ao atualizar custo projetado.');
    }
  };

  const handleNotify = async () => {
    setNotifying(true);
    try {
      const updated = await api.notifyTarefa(task._id);
      setTask(updated);
      showToast('success', 'Cobrança enviada com sucesso ao responsável!');
    } catch (err) {
      showToast('error', err.message || 'Falha ao enviar notificação.');
    } finally {
      setNotifying(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      const updated = await api.uploadComprovante(task._id, file);
      setTask(updated);
      showToast('success', 'Evidência / Comprovante enviado com sucesso para auditoria!');
    } catch (err) {
      showToast('error', err.message || 'Falha ao realizar upload.');
    } finally {
      setUploading(false);
    }
  };

  const handleRegistrarProvidencia = async () => {
    if (!textoProvidencia.trim()) {
      showToast('error', 'Digite a mensagem antes de enviar.');
      return;
    }

    try {
      const updated = await api.addTarefaObservacao(task._id, textoProvidencia.trim());
      setTask(updated);
      setTextoProvidencia('');
      showToast('success', 'Mensagem enviada com sucesso!');
    } catch (err) {
      showToast('error', err.message || 'Falha ao enviar mensagem.');
    }
  };

  const handleAuditoria = async (status, obs) => {
    if (status === 'Em Andamento' && !obs.trim()) {
      showToast('error', 'Por favor, insira o motivo da rejeição.');
      return;
    }

    try {
      const updated = await api.updateTarefa(task._id, { status }, obs);
      setTask(updated);
      setTextoRejeicao('');
      showToast('success', `Auditoria concluída: Condicionante ${status === 'Concluído' ? 'Aprovada' : 'Rejeitada'}.`);
    } catch (err) {
      showToast('error', err.message || 'Erro ao processar auditoria.');
    }
  };

  const getUsuarioNome = (id) => {
    const found = usuarios.find(u => u._id === id);
    return found ? found.nome : 'Não atribuído';
  };

  if (loading) {
    return (
      <div style={styles.loaderContainer}>
        <div className="animate-spin" style={styles.spinner}></div>
        <p style={{ marginTop: '1rem', color: 'var(--text-muted)' }}>Processando dados da condicionante...</p>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}>
        <AlertCircle size={40} color="var(--danger)" style={{ margin: '0 auto 1rem' }} />
        <h3 style={{ color: 'var(--text-main)' }}>Condicionante não encontrada</h3>
        <button onClick={onBack} className="glass-btn" style={{ marginTop: '1rem' }}>
          Voltar
        </button>
      </div>
    );
  }

  const isOverdue = task.status === 'Atrasado' || (new Date(task.data_vencimento) < new Date() && task.status !== 'Concluído');

  return (
    <div className="animate-fade-in" style={styles.container}>
      {/* Alertas */}
      {successMessage && (
        <div className="animate-fade-in" style={styles.successAlert}>
          <CheckCircle size={18} />
          <span>{successMessage}</span>
        </div>
      )}
      {errorMessage && (
        <div className="animate-fade-in" style={styles.errorAlert}>
          <AlertCircle size={18} />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Breadcrumbs */}
      <div style={styles.breadcrumbRow}>
        <button onClick={onBack} className="glass-btn" style={styles.backBtn}>
          <ArrowLeft size={16} />
          <span>Voltar</span>
        </button>
        {empresa && (
          <>
            <span style={styles.breadcrumbLink} onClick={() => onGoToCompany(empresa._id)}>
              {empresa.nome_fantasia}
            </span>
            <ChevronRight size={14} color="var(--text-muted)" />
          </>
        )}
        {documento && (
          <>
            <span style={styles.breadcrumbLink} onClick={() => onGoToDocument(documento._id)}>
              {documento.tipo}
            </span>
            <ChevronRight size={14} color="var(--text-muted)" />
          </>
        )}
        <span style={styles.breadcrumbCurrent}>{task.titulo}</span>
      </div>

      {/* Main Grid Layout */}
      <div style={styles.mainGrid} className="condicionante-detail-grid">
        {/* Left Column: Ficha de Informações */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="glass-panel" style={styles.cardInfo}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.75rem' }}>
              <Activity size={20} color="var(--primary)" />
              <h3 style={styles.cardTitle}>Ficha Técnica</h3>
            </div>

            <div style={styles.infoFields}>
              <div style={styles.infoField}>
                <span style={styles.fieldLabel}>Status Atual</span>
                <span style={{ 
                  ...styles.statusBadge, 
                  background: task.status === 'Concluído' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                  color: task.status === 'Concluído' ? 'var(--success)' : 'var(--warning)'
                }}>{task.status}</span>
              </div>

              <div style={styles.infoField}>
                <span style={styles.fieldLabel}>Vencimento Regulatório</span>
                <span style={{ 
                  fontSize: '0.95rem',
                  fontWeight: '700', 
                  color: isOverdue ? 'var(--danger)' : 'var(--text-main)', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '0.25rem' 
                }}>
                  <Calendar size={14} />
                  {new Date(task.data_vencimento).toLocaleDateString('pt-BR')}
                  {isOverdue && ' (Em Atraso)'}
                </span>
              </div>

              <div style={styles.infoField}>
                <span style={styles.fieldLabel}>Valor Estimado (Receita)</span>
                <span style={{ fontSize: '1rem', fontWeight: '750', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                  <DollarSign size={16} />
                  R$ {task.valor_estimado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>

              <div style={styles.infoField}>
                <span style={styles.fieldLabel}>Custo Projetado</span>
                {user.role === 'admin' || user.role === 'consultor' ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.25rem' }}>
                    <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>R$</span>
                    <input 
                      type="number"
                      step="0.01"
                      key={task._id + '_' + (task.custo_projetado || 0)}
                      defaultValue={task.custo_projetado || 0}
                      onBlur={e => handleUpdateCustoProjetado(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          handleUpdateCustoProjetado(e.target.value);
                          e.target.blur();
                        }
                      }}
                      className="glass-input"
                      style={{ fontSize: '0.9rem', padding: '0.25rem 0.5rem', width: '100%' }}
                    />
                  </div>
                ) : (
                  <span style={{ fontSize: '1rem', fontWeight: '750', color: 'var(--warning)', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                    <DollarSign size={16} />
                    R$ {(task.custo_projetado || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                )}
              </div>

              <div style={styles.infoField}>
                <span style={styles.fieldLabel}>Frequência de Cobrança</span>
                <span style={styles.fieldValue}>{task.periodicidade}</span>
              </div>

              <div style={styles.infoField}>
                <span style={styles.fieldLabel}>Responsável Técnico</span>
                <span style={styles.fieldValue}>
                  <User size={14} style={{ marginRight: '0.25rem', display: 'inline-block' }} />
                  {task.responsavel_id ? getUsuarioNome(task.responsavel_id) : 'Nenhum responsável atribuído'}
                </span>
              </div>

              <div style={styles.infoField}>
                <span style={styles.fieldLabel}>Prestador de Serviço</span>
                {user.role === 'admin' || user.role === 'consultor' ? (
                  <select 
                    value={task.prestador_id || ''} 
                    onChange={e => handleUpdatePrestador(e.target.value)}
                    className="glass-input glass-select"
                    style={{ fontSize: '0.85rem', padding: '0.25rem 0.5rem', width: '100%', marginTop: '0.25rem' }}
                  >
                    <option value="">Não atribuído</option>
                    {prestadores.filter(p => p.ativo || p._id === task.prestador_id).map(p => (
                      <option key={p._id} value={p._id}>{p.nome}</option>
                    ))}
                  </select>
                ) : (
                  <span style={styles.fieldValue}>
                    <User size={14} style={{ marginRight: '0.25rem', display: 'inline-block' }} />
                    {task.prestador_id ? (prestadores.find(p => p._id === task.prestador_id)?.nome || 'Carregando...') : 'Não atribuído'}
                  </span>
                )}
              </div>

              {task.e_pre_requisito && (
                <div style={{ ...styles.infoField, background: 'rgba(37, 99, 235, 0.05)', padding: '0.5rem 0.75rem', borderRadius: '8px', borderLeft: '3px solid var(--primary)', marginTop: '0.25rem' }}>
                  <span style={{ fontSize: '0.65rem', fontWeight: '700', color: 'var(--primary)', textTransform: 'uppercase' }}>Condicionante Pré-requisito</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.15rem', lineHeight: '1.3' }}>
                    Esta atividade é pré-requisito obrigatório de renovação e permanecerá concluída no próximo ciclo de renovação.
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Seção de Comprovante / Evidência */}
          <div className="glass-panel" style={styles.cardInfo}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.75rem' }}>
              <FileText size={20} color="var(--primary)" />
              <h3 style={styles.cardTitle}>Evidência & Comprovante</h3>
            </div>

            {task.comprovante_url ? (
              <div style={styles.comprovanteContainer}>
                <div style={styles.comprovanteHeader}>
                  <FileText size={28} color="var(--primary)" />
                  <div>
                    <span style={styles.comprovanteLabel}>Arquivo Enviado</span>
                    <a 
                      href={`http://2.25.170.196/api/tarefas/${task._id}/download`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      style={styles.comprovanteLink}
                    >
                      <Download size={14} /> Download do Comprovante
                    </a>
                  </div>
                </div>
              </div>
            ) : (
              <div style={styles.emptyComprovante}>
                <AlertCircle size={28} color="var(--warning)" />
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Nenhum comprovante enviado para este ciclo.</span>
              </div>
            )}

            {/* Upload form for clients/responsible */}
            {task.status !== 'Concluído' && (
              <div style={{ marginTop: '1rem' }}>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileUpload} 
                  style={{ display: 'none' }} 
                />
                <button 
                  onClick={() => fileInputRef.current.click()} 
                  className="glass-btn glass-btn-primary"
                  style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                  disabled={uploading}
                >
                  <UploadCloud size={18} />
                  <span>{uploading ? 'Enviando Arquivo...' : 'Enviar Nova Evidência'}</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Auditoria, Providências e Histórico */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Painel Operacional / Ações */}
          <div className="glass-panel" style={styles.cardAction}>
            <h3 style={styles.actionHeaderTitle}>Painel de Ações & Auditoria</h3>

            <div style={styles.actionBody}>
              {/* Not Assigned Claim Button */}
              {!task.responsavel_id && (
                <div style={styles.actionBox} className="glass-card">
                  <span style={styles.actionBoxTitle}>Responsabilidade pendente</span>
                  <p style={styles.actionBoxDesc}>Ninguém está trabalhando nesta condicionante ainda.</p>
                  <button onClick={handleClaim} className="glass-btn glass-btn-primary" style={{ alignSelf: 'flex-start' }}>
                    Assumir Atividade
                  </button>
                </div>
              )}

              {/* Notificar / Cobrar (Para Admin/Consultor) */}
              {user.role !== 'cliente' && task.status !== 'Concluído' && (
                <div style={styles.actionBox} className="glass-card">
                  <span style={styles.actionBoxTitle}>Cobrança de Prazo</span>
                  <p style={styles.actionBoxDesc}>Envie uma notificação push para o browser do responsável técnico.</p>
                  <button 
                    onClick={handleNotify} 
                    className="glass-btn" 
                    style={{ alignSelf: 'flex-start', color: 'var(--primary)', borderColor: 'rgba(37,99,235,0.2)' }}
                    disabled={notifying}
                  >
                    <Bell size={14} style={{ marginRight: '0.3rem' }} />
                    <span>{notifying ? 'Enviando...' : 'Cobrar Atividade'}</span>
                  </button>
                </div>
              )}

              {/* Auditoria Direta de Evidências (Para Consultor/Admin) */}
              {user.role !== 'cliente' && task.status === 'Aguardando Auditoria' && (
                <div style={{ ...styles.actionBox, borderLeft: '4px solid var(--primary)' }} className="glass-card">
                  <span style={styles.actionBoxTitle}>Aprovação de Evidência (Auditoria)</span>
                  <p style={styles.actionBoxDesc}>Avalie o comprovante enviado pelo cliente.</p>
                  
                  <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                    <button 
                      onClick={() => handleAuditoria('Concluído', 'Evidência aprovada na auditoria.')} 
                      className="glass-btn glass-btn-primary"
                      style={{ background: 'var(--success)', borderColor: 'var(--success)', color: '#fff' }}
                    >
                      <Check size={14} style={{ marginRight: '0.3rem' }} /> Aprovar
                    </button>
                    <button 
                      onClick={() => handleAuditoria('Em Andamento', textoRejeicao)} 
                      className="glass-btn"
                      style={{ color: 'var(--danger)', borderColor: 'rgba(239,68,68,0.2)' }}
                    >
                      <X size={14} style={{ marginRight: '0.3rem' }} /> Rejeitar
                    </button>
                  </div>

                  <div style={{ marginTop: '0.75rem' }}>
                    <label style={styles.fieldLabel}>Motivo da Rejeição (Obrigatório se rejeitar)</label>
                    <input 
                      type="text" 
                      value={textoRejeicao} 
                      onChange={e => setTextoRejeicao(e.target.value)} 
                      placeholder="Ex: Documento borrado ou inválido..."
                      className="glass-input"
                    />
                  </div>
                </div>
              )}

              {/* Registro de Providências (Traceability) */}
              <div style={styles.actionBox} className="glass-card">
                <span style={styles.actionBoxTitle}>Enviar Mensagem / Solicitar Documento</span>
                <p style={styles.actionBoxDesc}>Utilize este canal para se comunicar diretamente com o prestador de serviço técnico ou registrar andamentos.</p>
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                  <input 
                    type="text" 
                    value={textoProvidencia} 
                    onChange={e => setTextoProvidencia(e.target.value)} 
                    placeholder="Digite sua mensagem ou solicitação..."
                    className="glass-input"
                  />
                  <button onClick={handleRegistrarProvidencia} className="glass-btn glass-btn-primary">
                    Enviar
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Histórico e Observações (Audit Trail) */}
          <div className="glass-panel" style={styles.cardAction}>
            <h3 style={styles.actionHeaderTitle}>Histórico de Auditoria & Rastreabilidade</h3>
            
            <div style={styles.timeline}>
              {task.historico && task.historico.length > 0 ? (
                task.historico.map((h, idx) => (
                  <div key={idx} style={styles.timelineItem}>
                    <div style={styles.timelineDot}></div>
                    <div style={styles.timelineContent}>
                      <span style={styles.timelineDate}>
                        {new Date(h.data).toLocaleDateString('pt-BR')} {new Date(h.data).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <p style={styles.timelineText}>{h.texto}</p>
                      <span style={styles.timelineAuthor}>Por: {h.autor || 'Sistema'}</span>
                    </div>
                  </div>
                ))
              ) : (
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                  Nenhum histórico registrado para esta condicionante.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
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
  breadcrumbRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.6rem',
    fontSize: '0.825rem',
    flexWrap: 'wrap',
  },
  backBtn: {
    padding: '0.35rem 0.75rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.3rem',
    fontSize: '0.75rem',
  },
  breadcrumbLink: {
    color: 'var(--text-muted)',
    cursor: 'pointer',
    fontWeight: '500',
    textDecoration: 'underline',
  },
  breadcrumbCurrent: {
    color: 'var(--text-main)',
    fontWeight: '600',
  },
  mainGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1.5fr',
    gap: '1.5rem',
  },
  cardInfo: {
    padding: '1.5rem',
  },
  cardTitle: {
    fontSize: '1rem',
    fontWeight: '700',
    color: 'var(--text-main)',
    margin: 0,
  },
  infoFields: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.25rem',
  },
  infoField: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem',
  },
  fieldLabel: {
    fontSize: '0.7rem',
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.02em',
  },
  fieldValue: {
    fontSize: '0.875rem',
    fontWeight: '600',
    color: 'var(--text-main)',
  },
  statusBadge: {
    fontSize: '0.75rem',
    fontWeight: '600',
    padding: '0.2rem 0.5rem',
    borderRadius: '6px',
    width: 'fit-content',
  },
  comprovanteContainer: {
    background: 'rgba(255, 255, 255, 0.4)',
    border: '1px solid var(--glass-border)',
    borderRadius: '10px',
    padding: '0.75rem 1rem',
    marginTop: '0.5rem',
  },
  comprovanteHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
  },
  comprovanteLabel: {
    display: 'block',
    fontSize: '0.75rem',
    color: 'var(--text-muted)',
  },
  comprovanteLink: {
    fontSize: '0.8rem',
    color: 'var(--primary)',
    fontWeight: '600',
    textDecoration: 'none',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.25rem',
    marginTop: '0.15rem',
  },
  emptyComprovante: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '1.5rem',
    background: 'rgba(255, 255, 255, 0.25)',
    border: '1px dotted var(--glass-border)',
    borderRadius: '10px',
    textAlign: 'center',
  },
  cardAction: {
    padding: '1.5rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '1.25rem',
  },
  actionHeaderTitle: {
    fontSize: '1rem',
    fontWeight: '700',
    color: 'var(--text-main)',
    borderBottom: '1px solid var(--glass-border)',
    paddingBottom: '0.75rem',
    margin: 0,
  },
  actionBody: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  actionBox: {
    padding: '1rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
    textAlign: 'left',
  },
  actionBoxTitle: {
    fontSize: '0.85rem',
    fontWeight: '700',
    color: 'var(--text-main)',
  },
  actionBoxDesc: {
    fontSize: '0.75rem',
    color: 'var(--text-muted)',
    lineHeight: '1.35',
  },
  timeline: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.25rem',
    position: 'relative',
    paddingLeft: '1rem',
    borderLeft: '2px solid var(--glass-border)',
    marginLeft: '0.5rem',
    marginTop: '0.5rem',
  },
  timelineItem: {
    position: 'relative',
  },
  timelineDot: {
    position: 'absolute',
    left: '-1.45rem',
    top: '0.25rem',
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    background: 'var(--primary)',
    border: '2px solid #fff',
  },
  timelineContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.15rem',
  },
  timelineDate: {
    fontSize: '0.7rem',
    color: 'var(--text-light)',
    fontWeight: '550',
  },
  timelineText: {
    fontSize: '0.8rem',
    color: 'var(--text-main)',
    lineHeight: '1.4',
    margin: 0,
  },
  timelineAuthor: {
    fontSize: '0.7rem',
    color: 'var(--text-muted)',
  },
  successAlert: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    background: 'rgba(16, 185, 129, 0.15)',
    color: 'var(--success)',
    border: '1px solid rgba(16, 185, 129, 0.25)',
    padding: '0.75rem 1rem',
    borderRadius: '10px',
    fontSize: '0.85rem',
    fontWeight: '550',
  },
  errorAlert: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    background: 'rgba(239, 68, 68, 0.15)',
    color: 'var(--danger)',
    border: '1px solid rgba(239, 68, 68, 0.25)',
    padding: '0.75rem 1rem',
    borderRadius: '10px',
    fontSize: '0.85rem',
    fontWeight: '550',
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
};
