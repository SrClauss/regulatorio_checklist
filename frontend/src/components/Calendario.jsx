import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { ChevronLeft, ChevronRight, X, Calendar as CalendarIcon, Clock, CheckCircle, ArrowLeft, Bell, ExternalLink, RefreshCw } from 'lucide-react';

export default function Calendario({ user, onViewTask }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState('annual'); // 'annual' ou 'monthly'
  const [tarefas, setTarefas] = useState([]);
  const [documentos, setDocumentos] = useState([]);
  const [selectedDayEvents, setSelectedDayEvents] = useState(null);
  const [selectedDateLabel, setSelectedDateLabel] = useState('');
  const [loading, setLoading] = useState(true);
  const [notifyingTaskId, setNotifyingTaskId] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  // Estados de Renovação de Documento
  const [renewingDoc, setRenewingDoc] = useState(null);
  const [renewalForm, setRenewalForm] = useState({
    data_emissao: '',
    data_vencimento: '',
    valor_renovacao: 0,
    regerar_condicionantes: true
  });
  const [submittingRenewal, setSubmittingRenewal] = useState(false);

  const startRenewal = (doc) => {
    const todayStr = new Date().toISOString().split('T')[0];
    const nextYear = new Date();
    nextYear.setFullYear(nextYear.getFullYear() + 1);
    const nextYearStr = nextYear.toISOString().split('T')[0];
    
    setRenewalForm({
      data_emissao: todayStr,
      data_vencimento: nextYearStr,
      valor_renovacao: doc.valor_renovacao || 0,
      regerar_condicionantes: true
    });
    setRenewingDoc(doc);
  };

  const handleRenewSubmit = async () => {
    if (!renewingDoc) return;
    setSubmittingRenewal(true);
    try {
      const payload = {
        data_emissao: new Date(renewalForm.data_emissao).toISOString(),
        data_vencimento: new Date(renewalForm.data_vencimento).toISOString(),
        valor_renovacao: parseFloat(renewalForm.valor_renovacao) || 0,
        regerar_condicionantes: renewalForm.regerar_condicionantes
      };
      
      await api.renewDocumento(renewingDoc._id, payload);
      setToastMessage({ type: 'success', text: 'Documento renovado com sucesso! As novas condicionantes foram geradas.' });
      setRenewingDoc(null);
      await fetchData();
      setSelectedDayEvents(null); // Fecha o drawer lateral
    } catch (err) {
      setToastMessage({ type: 'error', text: err.message || 'Falha ao renovar documento.' });
    } finally {
      setSubmittingRenewal(false);
      setTimeout(() => setToastMessage(null), 4000);
    }
  };

  const handleNotify = async (taskId) => {
    setNotifyingTaskId(taskId);
    setToastMessage(null);
    try {
      const updatedTask = await api.notifyTarefa(taskId);
      setToastMessage({ type: 'success', text: 'Notificação push enviada e registrada com sucesso!' });
      setTarefas(prev => prev.map(t => t._id === taskId ? updatedTask : t));
      if (selectedDayEvents) {
        setSelectedDayEvents(prev => ({
          ...prev,
          tasks: prev.tasks.map(t => t._id === taskId ? updatedTask : t)
        }));
      }
    } catch (err) {
      setToastMessage({ type: 'error', text: err.message || 'Falha ao notificar responsável.' });
    } finally {
      setNotifyingTaskId(null);
      setTimeout(() => setToastMessage(null), 4000);
    }
  };

  const fetchData = async () => {
    try {
      const tList = await api.listTarefas();
      const dList = await api.listDocumentos();
      setTarefas(tList);
      setDocumentos(dList);
    } catch (err) {
      console.error("Erro ao obter dados para o calendário:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth(); // 0-indexed

  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  // Agrupa eventos por mês do ano selecionado
  const getEventsByMonth = (targetYear) => {
    const monthsData = Array.from({ length: 12 }, (_, i) => ({
      monthIndex: i,
      monthName: monthNames[i],
      tasks: [],
      docs: [],
    }));

    tarefas.forEach(t => {
      const d = new Date(t.data_vencimento);
      if (d.getFullYear() === targetYear) {
        monthsData[d.getMonth()].tasks.push(t);
      }
    });

    documentos.forEach(doc => {
      const d = new Date(doc.data_vencimento);
      if (d.getFullYear() === targetYear) {
        monthsData[d.getMonth()].docs.push(doc);
      }
    });

    // Ordena por data
    monthsData.forEach(m => {
      m.tasks.sort((a, b) => new Date(a.data_vencimento) - new Date(b.data_vencimento));
      m.docs.sort((a, b) => new Date(a.data_vencimento) - new Date(b.data_vencimento));
    });

    return monthsData;
  };

  // Cálculos do calendário mensal
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = new Date(year, month, 1).getDay();

  const calendarCells = [];
  for (let i = 0; i < firstDayIndex; i++) {
    calendarCells.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    calendarCells.push(new Date(year, month, d));
  }

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
    setSelectedDayEvents(null);
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
    setSelectedDayEvents(null);
  };

  const getEventsForDate = (date) => {
    if (!date) return { tasks: [], docs: [] };
    const targetStr = date.toDateString();
    const dayTasks = tarefas.filter(t => new Date(t.data_vencimento).toDateString() === targetStr);
    const dayDocs = documentos.filter(d => new Date(d.data_vencimento).toDateString() === targetStr);
    return { tasks: dayTasks, docs: dayDocs };
  };

  const handleDayClick = (date) => {
    if (!date) return;
    const { tasks, docs } = getEventsForDate(date);
    if (tasks.length > 0 || docs.length > 0) {
      setSelectedDayEvents({ tasks, docs });
      setSelectedDateLabel(date.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }));
    } else {
      setSelectedDayEvents(null);
    }
  };

  if (loading) {
    return (
      <div style={styles.loaderContainer}>
        <div className="animate-spin" style={styles.spinner}></div>
        <p style={{ marginTop: '1rem', color: 'var(--text-muted)' }}>Construindo o calendário operacional...</p>
      </div>
    );
  }

  const groupedEvents = getEventsByMonth(year);

  return (
    <div className="animate-fade-in" style={styles.container}>
      <header style={styles.header}>
        <div style={styles.titleArea}>
          <CalendarIcon size={28} color="var(--primary)" />
          <div>
            <h1 style={styles.title}>
              {viewMode === 'annual' ? `Cronograma Anual - ${year}` : 'Calendário de Vencimentos'}
            </h1>
            <p style={styles.subtitle}>
              {viewMode === 'annual' 
                ? 'Acompanhe a linha de tempo anual dos seus alvarás e condicionantes.' 
                : 'Acompanhe prazos e execute as auditorias dos processos.'}
            </p>
          </div>
        </div>

        {/* Controles de Navegação */}
        {viewMode === 'annual' ? (
          <div style={styles.controls} className="glass-card">
            <button onClick={() => setCurrentDate(new Date(year - 1, month, 1))} style={styles.arrowBtn}>
              <ChevronLeft size={20} />
            </button>
            <span style={styles.monthLabel}>{year}</span>
            <button onClick={() => setCurrentDate(new Date(year + 1, month, 1))} style={styles.arrowBtn}>
              <ChevronRight size={20} />
            </button>
          </div>
        ) : (
          <div style={styles.controls} className="glass-card">
            <button 
              onClick={() => { setViewMode('annual'); setSelectedDayEvents(null); }} 
              style={{ ...styles.arrowBtn, marginRight: '0.5rem', display: 'flex', gap: '0.25rem', alignItems: 'center' }} 
              title="Voltar ao Cronograma"
            >
              <ArrowLeft size={16} /> <span style={{ fontSize: '0.85rem', fontWeight: '600' }}>Cronograma</span>
            </button>
            <div style={{ height: '20px', width: '1px', background: 'var(--glass-border)', marginRight: '0.5rem' }}></div>
            <button onClick={handlePrevMonth} style={styles.arrowBtn}>
              <ChevronLeft size={20} />
            </button>
            <span style={styles.monthLabel}>{monthNames[month]}</span>
            <button onClick={handleNextMonth} style={styles.arrowBtn}>
              <ChevronRight size={20} />
            </button>
          </div>
        )}
      </header>

      {/* Renderização condicional de visualização */}
      {viewMode === 'annual' ? (
        <div style={styles.timelineContainer}>
          {groupedEvents.map((monthData) => {
            const totalEvents = monthData.tasks.length + monthData.docs.length;
            return (
              <div 
                key={monthData.monthIndex} 
                className="glass-card timeline-month-card" 
                style={styles.timelineMonthCard}
                onClick={() => {
                  setCurrentDate(new Date(year, monthData.monthIndex, 1));
                  setViewMode('monthly');
                }}
              >
                <div style={styles.timelineMonthHeader}>
                  <h3 style={styles.timelineMonthName}>{monthData.monthName}</h3>
                  <span style={{
                    ...styles.eventBadge,
                    background: totalEvents > 0 ? 'var(--primary-light)' : 'rgba(255,255,255,0.3)',
                    color: totalEvents > 0 ? 'var(--primary)' : 'var(--text-muted)'
                  }}>
                    {totalEvents} {totalEvents === 1 ? 'prazo' : 'prazos'}
                  </span>
                </div>
                
                <div style={styles.timelineMonthEvents}>
                  {totalEvents === 0 ? (
                    <span style={styles.noEventsText}>Nenhum vencimento agendado</span>
                  ) : (
                    <div style={styles.miniEventList}>
                      {monthData.docs.slice(0, 2).map((doc, idx) => (
                        <div key={`doc-${idx}`} style={styles.miniEventItem}>
                          <span style={{ ...styles.miniEventDot, background: 'var(--danger)' }}></span>
                          <span style={styles.miniEventTitle} title={doc.tipo}>Licença: {doc.tipo}</span>
                          <span style={styles.miniEventDate}>{new Date(doc.data_vencimento).getDate()}</span>
                        </div>
                      ))}
                      {monthData.tasks.slice(0, 2).map((task, idx) => (
                        <div key={`task-${idx}`} style={styles.miniEventItem}>
                          <span style={{ 
                            ...styles.miniEventDot, 
                            background: task.status === 'Concluído' ? 'var(--success)' : 'var(--warning)' 
                          }}></span>
                          <span style={styles.miniEventTitle} title={task.titulo}>Condic: {task.titulo}</span>
                          <span style={styles.miniEventDate}>{new Date(task.data_vencimento).getDate()}</span>
                        </div>
                      ))}
                      {totalEvents > 4 && (
                        <span style={styles.moreEventsText}>+ {totalEvents - 4} outros prazos...</span>
                      )}
                    </div>
                  )}
                </div>
                <div style={styles.clickToExpand}>Ver detalhes no calendário</div>
              </div>
            );
          })}
        </div>
      ) : (
        <div style={styles.mainLayout}>
          {/* Grade do Calendário Mensal */}
          <div className="glass-panel" style={styles.calendarPanel}>
            <div style={styles.weekHeader}>
              <span>Dom</span><span>Seg</span><span>Ter</span><span>Qua</span><span>Qui</span><span>Sex</span><span>Sáb</span>
            </div>

            <div style={styles.grid}>
              {calendarCells.map((cell, index) => {
                if (cell === null) {
                  return <div key={`empty-${index}`} style={styles.emptyCell}></div>;
                }

                const { tasks, docs } = getEventsForDate(cell);
                const hasEvents = tasks.length > 0 || docs.length > 0;
                const isToday = cell.toDateString() === new Date().toDateString();

                return (
                  <button
                    key={`day-${cell.getDate()}`}
                    onClick={() => handleDayClick(cell)}
                    style={{
                      ...styles.dayCell,
                      ...(isToday ? styles.todayCell : {}),
                      ...(hasEvents ? styles.eventfulCell : {})
                    }}
                  >
                    <span style={{
                      ...styles.dayNumber,
                      ...(isToday ? styles.todayNumber : {})
                    }}>
                      {cell.getDate()}
                    </span>

                    <div style={styles.dotContainer}>
                      {docs.map((d, i) => (
                        <div key={`d-dot-${i}`} style={{ ...styles.dot, background: 'var(--danger)' }} title="Documento a vencer"></div>
                      ))}
                      {tasks.map((t, i) => (
                        <div 
                          key={`t-dot-${i}`} 
                          style={{ 
                            ...styles.dot, 
                            background: t.status === 'Concluído' ? 'var(--success)' : 'var(--warning)' 
                          }} 
                          title="Condicionante"
                        ></div>
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Drawer lateral de eventos selecionados */}
          {selectedDayEvents && (
            <div className="glass-panel animate-fade-in" style={styles.drawer}>
              <div style={styles.drawerHeader}>
                <h3 style={styles.drawerTitle}>Prazos do Dia</h3>
                <button onClick={() => setSelectedDayEvents(null)} style={styles.closeBtn}>
                  <X size={18} />
                </button>
              </div>
              <span style={styles.drawerDate}>{selectedDateLabel}</span>

              {toastMessage && (
                <div style={{
                  ...styles.toast,
                  background: toastMessage.type === 'success' ? 'var(--success-light)' : 'var(--danger-light)',
                  color: toastMessage.type === 'success' ? 'var(--success)' : 'var(--danger)',
                  borderColor: toastMessage.type === 'success' ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'
                }}>
                  {toastMessage.text}
                </div>
              )}

              <div style={styles.drawerContent}>
                {/* Documentos */}
                {selectedDayEvents.docs.length > 0 && (
                  <div style={styles.eventSection}>
                    <h4 style={styles.sectionTitle}>Licenças & Documentos ({selectedDayEvents.docs.length})</h4>
                    <div style={styles.eventList}>
                      {selectedDayEvents.docs.map(doc => (
                        <div key={doc._id} style={{ ...styles.eventCard, borderLeft: '4px solid var(--danger)' }}>
                          <span style={styles.eventCardTitle}>{doc.tipo}</span>
                          <span style={styles.eventCardSub}>Órgão: {doc.orgao}</span>
                          <span style={styles.eventCardSub}>Processo: {doc.numero_processo || 'Não informado'}</span>
                          <span style={styles.eventCardSub}>Status: {doc.status}</span>
                          {user.role !== 'cliente' && (
                            <div style={{ display: 'flex', marginTop: '0.5rem' }}>
                              <button 
                                onClick={() => startRenewal(doc)}
                                className="glass-btn"
                                style={{
                                  ...styles.calendarActionBtn,
                                  color: 'var(--success)',
                                  borderColor: 'rgba(16, 185, 129, 0.2)',
                                }}
                                title="Registrar renovação do documento"
                              >
                                <RefreshCw size={12} />
                                <span>Renovar Licença</span>
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tarefas */}
                {selectedDayEvents.tasks.length > 0 && (
                  <div style={styles.eventSection}>
                    <h4 style={styles.sectionTitle}>Condicionantes ({selectedDayEvents.tasks.length})</h4>
                    <div style={styles.eventList}>
                      {selectedDayEvents.tasks.map(task => {
                        const isPending = task.status !== 'Concluído';
                        return (
                          <div 
                            key={task._id} 
                            style={{ 
                              ...styles.eventCard, 
                              borderLeft: `4px solid ${task.status === 'Concluído' ? 'var(--success)' : 'var(--warning)'}` 
                            }}
                          >
                            <span style={styles.eventCardTitle}>{task.titulo}</span>
                            <p style={styles.eventCardDesc}>{task.descricao}</p>
                            <div style={styles.eventCardFooter}>
                              <span style={styles.eventCardSub}>
                                {task.status === 'Concluído' ? (
                                  <span style={{ color: 'var(--success)', display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>
                                    <CheckCircle size={12} /> Concluído
                                  </span>
                                ) : (
                                  <span style={{ color: 'var(--warning)', display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>
                                    <Clock size={12} /> {task.status}
                                  </span>
                                )}
                              </span>
                              <span style={styles.eventCardPrice}>R$ {task.valor_estimado}</span>
                            </div>

                            <div style={styles.calendarTaskActions}>
                              <button 
                                onClick={() => onViewTask(task._id)}
                                className="glass-btn"
                                style={styles.calendarActionBtn}
                                title="Ver detalhes no Checklist"
                              >
                                <ExternalLink size={12} />
                                <span>Ver Checklist</span>
                              </button>

                              {isPending && (
                                <button 
                                  onClick={() => handleNotify(task._id)}
                                  disabled={notifyingTaskId === task._id}
                                  className="glass-btn"
                                  style={{
                                    ...styles.calendarActionBtn,
                                    color: 'var(--primary)',
                                    borderColor: 'rgba(37, 99, 235, 0.2)',
                                  }}
                                  title="Notificar responsável no browser"
                                >
                                  <Bell size={12} />
                                  <span>{notifyingTaskId === task._id ? 'Enviando...' : 'Cobrar'}</span>
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
      {/* MODAL DE RENOVAÇÃO */}
      {renewingDoc && (
        <div style={styles.modalOverlay} onClick={() => setRenewingDoc(null)}>
          <div className="glass-panel animate-fade-in" style={styles.modalCard} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>Renovar Documento / Licença</h3>
              <button onClick={() => setRenewingDoc(null)} style={styles.closeBtn}>
                <X size={18} />
              </button>
            </div>
            <div style={styles.modalBody}>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.25rem', lineHeight: '1.4' }}>
                Você está registrando a renovação de: <strong style={{ color: 'var(--text-main)' }}>{renewingDoc.tipo}</strong>.<br />
                Insira as datas do novo ciclo. O sistema prorrogará o status da licença para <strong>Ativo</strong>.
              </p>

              <div className="glass-input-group" style={{ marginBottom: '1rem' }}>
                <label className="glass-label">Nova Data de Emissão</label>
                <input 
                  type="date" 
                  value={renewalForm.data_emissao} 
                  onChange={e => setRenewalForm({ ...renewalForm, data_emissao: e.target.value })}
                  className="glass-input" 
                />
              </div>

              <div className="glass-input-group" style={{ marginBottom: '1rem' }}>
                <label className="glass-label">Nova Data de Vencimento</label>
                <input 
                  type="date" 
                  value={renewalForm.data_vencimento} 
                  onChange={e => setRenewalForm({ ...renewalForm, data_vencimento: e.target.value })}
                  className="glass-input" 
                />
              </div>

              <div className="glass-input-group" style={{ marginBottom: '1.25rem' }}>
                <label className="glass-label">Valor de Renovação Técnico (R$)</label>
                <input 
                  type="number" 
                  step="0.01"
                  value={renewalForm.valor_renovacao} 
                  onChange={e => setRenewalForm({ ...renewalForm, valor_renovacao: parseFloat(e.target.value) || 0 })}
                  className="glass-input" 
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginTop: '0.5rem' }}>
                <input 
                  type="checkbox" 
                  id="regerar_cond"
                  checked={renewalForm.regerar_condicionantes} 
                  onChange={e => setRenewalForm({ ...renewalForm, regerar_condicionantes: e.target.checked })}
                  style={{ width: '17px', height: '17px', cursor: 'pointer' }}
                />
                <label htmlFor="regerar_cond" style={{ fontSize: '0.85rem', color: 'var(--text-main)', cursor: 'pointer', fontWeight: '500' }}>
                  Regerar condicionantes para o novo ciclo
                </label>
              </div>
            </div>
            <div style={styles.modalFooter}>
              <button 
                onClick={() => setRenewingDoc(null)} 
                className="glass-btn"
                style={{ padding: '0.5rem 1.25rem' }}
              >
                Cancelar
              </button>
              <button 
                onClick={handleRenewSubmit} 
                className="glass-btn glass-btn-primary"
                style={{ padding: '0.5rem 1.25rem' }}
                disabled={submittingRenewal}
              >
                {submittingRenewal ? 'Processando...' : 'Confirmar Renovação'}
              </button>
            </div>
          </div>
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
  controls: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    padding: '0.5rem 1rem',
  },
  arrowBtn: {
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    color: 'var(--text-main)',
    display: 'flex',
    alignItems: 'center',
  },
  monthLabel: {
    fontFamily: 'var(--font-heading)',
    fontSize: '1rem',
    fontWeight: '600',
    minWidth: '100px',
    textAlign: 'center',
  },
  timelineContainer: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '1.25rem',
    width: '100%',
  },
  timelineMonthCard: {
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    padding: '1.25rem',
    minHeight: '185px',
    textAlign: 'left',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
  },
  timelineMonthHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1rem',
  },
  timelineMonthName: {
    fontSize: '1.1rem',
    fontWeight: '700',
    color: 'var(--text-main)',
  },
  eventBadge: {
    fontSize: '0.75rem',
    fontWeight: '600',
    padding: '0.25rem 0.5rem',
    borderRadius: '6px',
  },
  timelineMonthEvents: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  noEventsText: {
    fontSize: '0.8rem',
    color: 'var(--text-light)',
    fontStyle: 'italic',
  },
  miniEventList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.4rem',
  },
  miniEventItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    fontSize: '0.8rem',
    color: 'var(--text-muted)',
  },
  miniEventDot: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    flexShrink: 0,
  },
  miniEventTitle: {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    flex: 1,
    textAlign: 'left',
  },
  miniEventDate: {
    fontSize: '0.75rem',
    color: 'var(--text-light)',
    flexShrink: 0,
  },
  moreEventsText: {
    fontSize: '0.75rem',
    color: 'var(--primary)',
    fontWeight: '500',
    textAlign: 'left',
  },
  clickToExpand: {
    fontSize: '0.7rem',
    color: 'var(--text-light)',
    textAlign: 'right',
    marginTop: '0.75rem',
    borderTop: '1px solid var(--glass-border)',
    paddingTop: '0.5rem',
  },
  mainLayout: {
    display: 'flex',
    gap: '1.5rem',
    alignItems: 'flex-start',
    width: '100%',
    flexWrap: 'wrap',
  },
  calendarPanel: {
    flex: 1,
    padding: '1.5rem',
    minWidth: '280px',
  },
  weekHeader: {
    display: 'grid',
    gridTemplateColumns: 'repeat(7, 1fr)',
    textAlign: 'center',
    fontFamily: 'var(--font-heading)',
    fontSize: '0.9rem',
    fontWeight: '600',
    color: 'var(--text-light)',
    marginBottom: '1rem',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(7, 1fr)',
    gap: '0.5rem',
  },
  emptyCell: {
    aspectRatio: '1.2',
    background: 'rgba(255, 255, 255, 0.05)',
    borderRadius: '10px',
  },
  dayCell: {
    aspectRatio: '1.2',
    background: 'rgba(255, 255, 255, 0.25)',
    border: '1px solid var(--glass-border)',
    borderRadius: '12px',
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0.5rem',
  },
  todayCell: {
    background: 'rgba(37, 99, 235, 0.06)',
    borderColor: 'var(--primary)',
  },
  eventfulCell: {
    borderColor: 'rgba(245, 158, 11, 0.35)',
  },
  dayNumber: {
    fontSize: '0.95rem',
    fontWeight: '500',
    color: 'var(--text-muted)',
  },
  todayNumber: {
    color: 'var(--primary)',
    fontWeight: '700',
  },
  dotContainer: {
    display: 'flex',
    gap: '3px',
    justifyContent: 'center',
    flexWrap: 'wrap',
    maxWidth: '100%',
    height: '8px',
  },
  dot: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
  },
  drawer: {
    width: '100%',
    maxWidth: '340px',
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
  },
  drawerTitle: {
    fontSize: '1.1rem',
    fontWeight: '600',
  },
  closeBtn: {
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    color: 'var(--text-muted)',
  },
  drawerDate: {
    fontSize: '0.8rem',
    color: 'var(--text-light)',
    marginTop: '0.25rem',
    marginBottom: '1.25rem',
    textTransform: 'capitalize',
  },
  drawerContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
  },
  eventSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
  },
  sectionTitle: {
    fontSize: '0.85rem',
    fontWeight: '600',
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.03em',
  },
  eventList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  eventCard: {
    background: 'rgba(255, 255, 255, 0.45)',
    border: '1px solid var(--glass-border)',
    borderRadius: '8px',
    padding: '0.75rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem',
  },
  eventCardTitle: {
    fontSize: '0.875rem',
    fontWeight: '600',
    color: 'var(--text-main)',
  },
  eventCardDesc: {
    fontSize: '0.75rem',
    color: 'var(--text-muted)',
    lineHeight: 1.3,
  },
  eventCardSub: {
    fontSize: '0.75rem',
    color: 'var(--text-light)',
  },
  eventCardFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: '0.25rem',
  },
  eventCardPrice: {
    fontSize: '0.8rem',
    fontWeight: '600',
    color: 'var(--primary)',
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
  toast: {
    padding: '0.75rem 1rem',
    borderRadius: '10px',
    border: '1px solid',
    fontSize: '0.85rem',
    fontWeight: '550',
    marginBottom: '1rem',
    textAlign: 'left',
  },
  calendarTaskActions: {
    display: 'flex',
    gap: '0.5rem',
    marginTop: '0.75rem',
    paddingTop: '0.75rem',
    borderTop: '1px solid var(--glass-border)',
  },
  calendarActionBtn: {
    flex: 1,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.3rem',
    padding: '0.35rem 0.5rem',
    fontSize: '0.75rem',
    background: 'rgba(255, 255, 255, 0.4)',
    border: '1px solid var(--glass-border)',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: '550',
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(15, 23, 42, 0.35)',
    backdropFilter: 'blur(6px)',
    zIndex: 1000,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCard: {
    width: '90%',
    maxWidth: '420px',
    padding: '1.5rem',
    borderRadius: '16px',
    boxShadow: 'var(--shadow-lg)',
    textAlign: 'left',
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1rem',
    borderBottom: '1px solid var(--glass-border)',
    paddingBottom: '0.75rem',
  },
  modalTitle: {
    fontSize: '1.1rem',
    fontWeight: '700',
    color: 'var(--text-main)',
  },
  modalBody: {
    display: 'flex',
    flexDirection: 'column',
  },
  modalFooter: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '0.75rem',
    marginTop: '1.5rem',
    borderTop: '1px solid var(--glass-border)',
    paddingTop: '1rem',
  },
  closeBtn: {
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    color: 'var(--text-muted)',
    display: 'flex',
    alignItems: 'center',
    padding: '0.2rem',
  },
};
