import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { ChevronLeft, ChevronRight, X, Calendar as CalendarIcon, Clock, CheckCircle } from 'lucide-react';

export default function Calendario({ user }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [tarefas, setTarefas] = useState([]);
  const [documentos, setDocumentos] = useState([]);
  const [selectedDayEvents, setSelectedDayEvents] = useState(null);
  const [selectedDateLabel, setSelectedDateLabel] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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
    fetchData();
  }, []);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth(); // 0-indexed

  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  // Cálculos do calendário
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = new Date(year, month, 1).getDay(); // 0 = Domingo, 1 = Segunda...

  // Gera array dos dias do mês
  const calendarCells = [];
  
  // Placeholders para alinhar o primeiro dia do mês na semana correta
  for (let i = 0; i < firstDayIndex; i++) {
    calendarCells.push(null);
  }
  
  // Dias normais
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

  // Encontra eventos cadastrados para uma determinada data
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

  return (
    <div className="animate-fade-in" style={styles.container}>
      <header style={styles.header}>
        <div style={styles.titleArea}>
          <CalendarIcon size={28} color="var(--primary)" />
          <div>
            <h1 style={styles.title}>Calendário de Vencimentos</h1>
            <p style={styles.subtitle}>Acompanhe prazos e execute as auditorias dos processos.</p>
          </div>
        </div>

        {/* Controles de navegação de meses */}
        <div style={styles.controls} className="glass-card">
          <button onClick={handlePrevMonth} style={styles.arrowBtn}>
            <ChevronLeft size={20} />
          </button>
          <span style={styles.monthLabel}>{monthNames[month]} {year}</span>
          <button onClick={handleNextMonth} style={styles.arrowBtn}>
            <ChevronRight size={20} />
          </button>
        </div>
      </header>

      <div style={styles.mainLayout}>
        {/* Grade do Calendário */}
        <div className="glass-panel" style={styles.calendarPanel}>
          {/* Cabeçalho dos dias da semana */}
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

                  {/* Dot indicators para eventos na data */}
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
                    {selectedDayEvents.tasks.map(task => (
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
                      </div>
                    ))}
                  </div>
                </div>
              )}
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
    minWidth: '130px',
    textAlign: 'center',
  },
  mainLayout: {
    display: 'flex',
    gap: '1.5rem',
    alignItems: 'flex-start',
    width: '100%',
  },
  calendarPanel: {
    flex: 1,
    padding: '1.5rem',
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
  dayCellHover: {
    background: 'var(--glass-bg-hover)',
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
    width: '340px',
    padding: '1.5rem',
    textAlign: 'left',
    display: 'flex',
    flexDirection: 'column',
    maxHeight: '600px',
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
};
