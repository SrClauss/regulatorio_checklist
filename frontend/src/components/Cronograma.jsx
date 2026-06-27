import React, { useState, useEffect, useRef, useLayoutEffect, useMemo } from 'react';
import { api } from '../api';
import { 
  CalendarDays, 
  Bell,
  LayoutList,
  ChevronLeft,
  ChevronRight,
  Filter,
  Activity,
  AlertTriangle,
  Briefcase,
  X,
  CheckCircle2,
  Clock,
  Archive,
  Search,
  SlidersHorizontal,
  TrendingUp,
  ChevronDown
} from 'lucide-react';

export default function Cronograma({ user, onViewTask, onViewDocument, onNavigateTab }) {
  const [activeTab, setActiveTab] = useState('timeline'); // 'timeline', 'kanban', 'gantt', 'radar', 'lista'
  
  const [todasTarefas, setTodasTarefas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [timelineScrollTop, setTimelineScrollTop] = useState(0);

  // Estado do mês central da Linha do Tempo (Mantém sempre 3 meses carregados)
  const [centerMonthDate, setCenterMonthDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  // Refs de controle de scroll e compensação
  const lastScrollHeightRef = useRef(0);
  const lastScrollTopRef = useRef(0);
  const shouldCompensateScrollRef = useRef(false);
  const shiftDirectionRef = useRef(null);

  // Entidades auxiliares para mapear IDs para nomes
  const [empresas, setEmpresas] = useState([]);
  const [documentos, setDocumentos] = useState([]);
  const [classeServicos, setClasseServicos] = useState([]);
  const [prestadores, setPrestadores] = useState([]);

  const [selectedClasseServicoId, setSelectedClasseServicoId] = useState(null);
  const [selectedCompanyId, setSelectedCompanyId] = useState('');
  const [zoomedMonth, setZoomedMonth] = useState(null); // null ou { month: number, year: number, label: string, key: string }

  // Estado de Busca e Filtro da Aba Lista Analítica (Filtro Inteligente)
  const [searchTerm, setSearchTerm] = useState('');
  const [listCompanyFilter, setListCompanyFilter] = useState('');
  const [listStatusFilter, setListStatusFilter] = useState('');
  const [listCurrentPage, setListCurrentPage] = useState(1);
  const [gridYear, setGridYear] = useState(2026);
  const [gridStartMonth, setGridStartMonth] = useState(6); // Default: Julho (index 6)

  useEffect(() => {
    setListCurrentPage(1);
  }, [searchTerm, listCompanyFilter, listStatusFilter, gridYear, gridStartMonth]);

  // Estados de Hover
  const [hoveredTaskId, setHoveredTaskId] = useState(null);
  const hoverTimeoutRef = useRef(null);

  const handleMouseEnterTask = (id) => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    setHoveredTaskId(id);
  };

  const handleMouseLeaveTask = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    hoverTimeoutRef.current = setTimeout(() => {
      setHoveredTaskId(null);
    }, 150); // 150ms delay para evitar flickering
  };

  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

  const [hoveredRadarTask, setHoveredRadarTask] = useState(null);
  const [radarTooltipPos, setRadarTooltipPos] = useState({ x: 0, y: 0 });

  // Responsividade
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (isMobile) return;
    const mainContent = document.querySelector('.main-content');
    if (mainContent) {
      const originalOverflow = mainContent.style.overflow;
      const originalHeight = mainContent.style.height;
      const originalMaxHeight = mainContent.style.maxHeight;
      const originalDisplay = mainContent.style.display;
      const originalFlexDirection = mainContent.style.flexDirection;

      mainContent.style.overflow = 'hidden';
      mainContent.style.display = 'flex';
      mainContent.style.flexDirection = 'column';
      mainContent.style.height = '100vh';
      mainContent.style.maxHeight = '100vh';

      return () => {
        mainContent.style.overflow = originalOverflow;
        mainContent.style.display = originalDisplay;
        mainContent.style.flexDirection = originalFlexDirection;
        mainContent.style.height = originalHeight;
        mainContent.style.maxHeight = originalMaxHeight;
      };
    }
  }, [isMobile]);

  const [selectedMobileMonthKey, setSelectedMobileMonthKey] = useState(`${new Date().getFullYear()}-${new Date().getMonth()}`);
  const [expandedMobileTaskIds, setExpandedMobileTaskIds] = useState([]);

  const toggleMobileTaskExpansion = (taskId) => {
    setExpandedMobileTaskIds(prev => 
      prev.includes(taskId) 
        ? prev.filter(id => id !== taskId) 
        : [...prev, taskId]
    );
  };

  // Refs para física de inércia do timeline
  const containerRef = useRef(null);
  const isDownRef = useRef(false);
  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const scrollLeftRef = useRef(0);
  const scrollTopRef = useRef(0);
  const velocityXRef = useRef(0);
  const lastXRef = useRef(0);
  const lastTimeRef = useRef(0);
  const animationFrameIdRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);

  const fetchTasks = async (companyId, csId, dateOrStartOffset = centerMonthDate, endOffset) => {
    try {
      setLoadingTasks(true);
      let dateStart, dateEnd;

      if (dateOrStartOffset instanceof Date) {
        const centerDate = dateOrStartOffset;
        dateStart = new Date(centerDate.getFullYear(), centerDate.getMonth() - 1, 1).toISOString();
        dateEnd = new Date(centerDate.getFullYear(), centerDate.getMonth() + 2, 1).toISOString();
      } else {
        const startOffset = typeof dateOrStartOffset === 'number' ? dateOrStartOffset : 1;
        const endOffsetVal = typeof endOffset === 'number' ? endOffset : 1;
        const now = new Date();
        dateStart = new Date(now.getFullYear(), now.getMonth() - startOffset, 1).toISOString();
        dateEnd = new Date(now.getFullYear(), now.getMonth() + endOffsetVal + 1, 1).toISOString();
      }
      
      const filters = {};
      if (companyId) filters.empresa_id = companyId;
      if (csId) filters.classe_servico_id = csId;
      
      const [timelineTasks, overdueTasks] = await Promise.all([
        api.listTarefas({
          ...filters,
          data_inicio: dateStart,
          data_fim: dateEnd
        }),
        api.listTarefas({
          ...filters,
          status: 'Atrasado'
        })
      ]);
      
      const mergedMap = {};
      timelineTasks.forEach(t => mergedMap[t._id] = t);
      overdueTasks.forEach(t => mergedMap[t._id] = t);
      
      setTodasTarefas(Object.values(mergedMap));
    } catch (error) {
      console.error("Erro ao carregar tarefas do cronograma:", error);
    } finally {
      setLoadingTasks(false);
    }
  };

  const fetchCronogramaData = async () => {
    try {
      setLoading(true);
      const [empList, docList, csList, prList] = await Promise.all([
        api.listEmpresas(),
        api.listDocumentos(),
        api.listClasseServicos(),
        api.listPrestadores()
      ]);

      setEmpresas(empList);
      setDocumentos(docList);
      setClasseServicos(csList);
      setPrestadores(prList);
      
      await fetchTasks(selectedCompanyId, selectedClasseServicoId, centerMonthDate);
    } catch (error) {
      console.error("Erro ao carregar dados do cronograma completo:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCronogramaData();
  }, [user]);

  useEffect(() => {
    if (!loading) {
      if (activeTab === 'lista') {
        const now = new Date();
        const startOfGrid = new Date(gridYear, gridStartMonth, 1);
        const endOfGrid = new Date(gridYear, gridStartMonth + 6, 0);
        
        // Calcular a quantidade de meses de distância a partir do mês atual
        const monthsDiffStart = (now.getFullYear() - startOfGrid.getFullYear()) * 12 + (now.getMonth() - startOfGrid.getMonth());
        const monthsDiffEnd = (endOfGrid.getFullYear() - now.getFullYear()) * 12 + (endOfGrid.getMonth() - now.getMonth());
        
        const start = Math.max(monthsDiffStart, 1);
        const end = Math.max(monthsDiffEnd, 6);
        fetchTasks(selectedCompanyId, selectedClasseServicoId, start, end);
      } else {
        fetchTasks(selectedCompanyId, selectedClasseServicoId, centerMonthDate);
      }
    }
  }, [selectedCompanyId, selectedClasseServicoId, centerMonthDate, activeTab, gridYear, gridStartMonth, loading]);

  const handleScroll = (e) => {
    const container = e.currentTarget;
    if (!container) return;
    setTimelineScrollTop(container.scrollTop);

    if (loadingTasks || zoomedMonth) return;
    const { scrollTop, clientHeight, scrollHeight } = container;

    // Use boundary-based detection instead of center-index to prevent unstable shifting
    const TRIGGER_THRESHOLD = 30; // px near top/bottom to shift

    if (scrollTop < TRIGGER_THRESHOLD && !shouldCompensateScrollRef.current) {
      lastScrollTopRef.current = scrollTop;
      shiftDirectionRef.current = 'up';
      shouldCompensateScrollRef.current = true;
      setCenterMonthDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
    } else if (scrollTop + clientHeight > scrollHeight - TRIGGER_THRESHOLD && !shouldCompensateScrollRef.current) {
      lastScrollTopRef.current = scrollTop;
      shiftDirectionRef.current = 'down';
      shouldCompensateScrollRef.current = true;
      setCenterMonthDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
    }
  };

  const handleWheel = (e) => {
    // Shifting is automatically handled by the scroll event.
  };

  useLayoutEffect(() => {
    if (shouldCompensateScrollRef.current && containerRef.current) {
      const container = containerRef.current;
      const ROW_HEIGHT = 230;
      if (shiftDirectionRef.current === 'up') {
        container.scrollTop = lastScrollTopRef.current + ROW_HEIGHT;
      } else if (shiftDirectionRef.current === 'down') {
        container.scrollTop = lastScrollTopRef.current - ROW_HEIGHT;
      }
      shouldCompensateScrollRef.current = false;
      shiftDirectionRef.current = null;
    }
  }, [centerMonthDate]);

  // Centraliza o scroll no mês atual ao entrar na linha do tempo
  useEffect(() => {
    if (!loading && activeTab === 'timeline' && containerRef.current) {
      setTimeout(() => {
        containerRef.current.scrollLeft = 150;
        const currentMonthEl = document.getElementById('current-month-row');
        if (currentMonthEl) {
          const containerHeight = containerRef.current.clientHeight || 520;
          containerRef.current.scrollTop = currentMonthEl.offsetTop - (containerHeight - 230) / 2;
        }
      }, 300);
    }
  }, [loading, activeTab]);

  // Ação de Concluir Tarefa com um clique
  const handleConcludeTask = async (taskId) => {
    try {
      await api.updateTarefa(taskId, { status: 'Concluído' });
      // Atualiza estado local
      setTodasTarefas(prev => prev.map(t => 
        t._id === taskId 
          ? { ...t, status: 'Concluído', data_conclusao: new Date().toISOString() } 
          : t
      ));
    } catch (error) {
      console.error("Erro ao concluir condicionante:", error);
      alert("Não foi possível concluir a tarefa.");
    }
  };

  const handleMonthClick = (m) => {
    if (zoomedMonth && zoomedMonth.key === m.key) {
      setZoomedMonth(null);
    } else {
      setZoomedMonth(m);
    }
  };

  const getDayXPercent = (day, daysInMonth, isZoomed) => {
    if (!isZoomed) {
      return 10 + ((day - 1) / 30) * 80;
    }
    
    // Zoomed: divide into weeks (5 weeks if > 28 days, else 4 weeks)
    const numWeeks = daysInMonth > 28 ? 5 : 4;
    const weekWidth = 80 / numWeeks;
    
    if (day <= 28) {
      const weekIdx = Math.floor((day - 1) / 7); // 0 to 3
      const dayInWeek = (day - 1) % 7; // 0 to 6
      const percentInWeek = (dayInWeek + 0.5) / 7;
      return 10 + (weekIdx + percentInWeek) * weekWidth;
    } else {
      const daysInWeek5 = daysInMonth - 28;
      const dayInWeek5 = day - 29; // 0 to 2
      const percentInWeek = (dayInWeek5 + 0.5) / daysInWeek5;
      return 10 + (4 + percentInWeek) * weekWidth;
    }
  };

  // Funções Auxiliares de Nomes e Mapeamentos
  const getEmpresaNome = (id) => {
    const found = empresas.find(e => e._id === id);
    return found ? found.nome_fantasia : 'Empresa';
  };

  const getDocumentoInfo = (id) => {
    if (!id) return 'Sem documento atrelado';
    const found = documentos.find(d => d._id === id);
    return found ? `${found.tipo} (${found.numero || 'Sem número'})` : 'Documento';
  };

  const getClasseServicoNome = (id) => {
    if (!id) return 'Sem classe';
    const found = classeServicos.find(cs => cs._id === id);
    return found ? found.nome : 'Classe de Serviço';
  };

  const getPrestadorNome = (classeServicoId) => {
    if (!classeServicoId) return null;
    const cs = classeServicos.find(c => c._id === classeServicoId);
    if (!cs || !cs.prestador_id) return null;
    const pr = prestadores.find(p => p._id === cs.prestador_id);
    return pr ? pr.nome : null;
  };

  const getPrestadorId = (classeServicoId) => {
    if (!classeServicoId) return null;
    const cs = classeServicos.find(c => c._id === classeServicoId);
    return cs ? cs.prestador_id : null;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('pt-BR');
  };

  const isTaskOverdue = (t) => {
    if (t.status === 'Concluído') return false;
    return new Date(t.data_vencimento) < new Date();
  };

  const getTaskStatusColor = (t) => {
    if (t.status === 'Concluído') return 'var(--success)';
    if (isTaskOverdue(t)) return 'var(--danger)';
    if (t.status === 'Em Andamento' || t.status === 'Aguardando Auditoria') return '#eab308'; // Amarelo
    return 'var(--primary)';
  };

  const getTaskStatusBadgeStyle = (t) => {
    if (t.status === 'Concluído') return { background: 'var(--success-light)', color: 'var(--success)' };
    if (isTaskOverdue(t)) return { background: 'var(--danger-light)', color: 'var(--danger)' };
    if (t.status === 'Em Andamento' || t.status === 'Aguardando Auditoria') return { background: '#fef9c3', color: '#854d0e' };
    return { background: 'var(--primary-light)', color: 'var(--primary)' };
  };

  // --- Handlers de Drag and Scroll ---
  const handleMouseDown = (e) => {
    if (e.target.closest('button') || e.target.closest('.interactive-card')) return;
    isDownRef.current = true;
    setIsDragging(true);
    startXRef.current = e.pageX - containerRef.current.offsetLeft;
    startYRef.current = e.pageY - containerRef.current.offsetTop;
    scrollLeftRef.current = containerRef.current.scrollLeft;
    scrollTopRef.current = containerRef.current.scrollTop;
    lastXRef.current = e.pageX;
    lastTimeRef.current = Date.now();
    velocityXRef.current = 0;
    if (animationFrameIdRef.current) cancelAnimationFrame(animationFrameIdRef.current);
  };

  const handleMouseMove = (e) => {
    if (!isDownRef.current) return;
    e.preventDefault();
    const x = e.pageX - containerRef.current.offsetLeft;
    const y = e.pageY - containerRef.current.offsetTop;
    const walkX = (x - startXRef.current) * 1.5;
    const walkY = (y - startYRef.current) * 1.5;
    containerRef.current.scrollLeft = scrollLeftRef.current - walkX;
    containerRef.current.scrollTop = scrollTopRef.current - walkY;
    
    const now = Date.now();
    const timeElapsed = now - lastTimeRef.current;
    if (timeElapsed > 0) {
      velocityXRef.current = (e.pageX - lastXRef.current) / timeElapsed;
    }
    lastXRef.current = e.pageX;
    lastTimeRef.current = now;
  };

  const handleMouseUpOrLeave = () => {
    if (!isDownRef.current) return;
    isDownRef.current = false;
    setIsDragging(false);
    let velocityX = velocityXRef.current * 16;
    const decay = 0.95;
    const step = () => {
      if (Math.abs(velocityX) < 0.15) return;
      if (containerRef.current) {
        containerRef.current.scrollLeft -= velocityX;
        velocityX *= decay;
        animationFrameIdRef.current = requestAnimationFrame(step);
      }
    };
    animationFrameIdRef.current = requestAnimationFrame(step);
  };

  const handleScrollLeft = () => {
    if (containerRef.current) containerRef.current.scrollBy({ left: -300, behavior: 'smooth' });
  };

  const handleScrollRight = () => {
    if (containerRef.current) containerRef.current.scrollBy({ left: 300, behavior: 'smooth' });
  };

  const handleResetCenter = () => {
    const now = new Date();
    const currentMonthDate = new Date(now.getFullYear(), now.getMonth(), 1);
    setCenterMonthDate(currentMonthDate);
    
    if (containerRef.current) {
      containerRef.current.scrollTo({
        left: 150,
        top: 230 - 45,
        behavior: 'smooth'
      });
    }
  };

  // --- FILTROS GLOBAIS DO CRONOGRAMA ---
  const tasksFiltered = useMemo(() => {
    return todasTarefas.filter(t => {
      if (selectedClasseServicoId && t.classe_servico_id !== selectedClasseServicoId) return false;
      if (selectedCompanyId && t.empresa_id !== selectedCompanyId) return false;
      return true;
    });
  }, [todasTarefas, selectedClasseServicoId, selectedCompanyId]);

  const tasksByMonthKey = useMemo(() => {
    const groups = {};
    tasksFiltered.forEach(t => {
      if (!t.data_vencimento) return;
      const d = new Date(t.data_vencimento);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(t);
    });
    return groups;
  }, [tasksFiltered]);

  const getFilteredTasks = () => {
    return tasksFiltered;
  };

  const renderVerticalTimeline = (months, tasksToRender) => {
    const activeMonthKey = selectedMobileMonthKey || `${new Date().getFullYear()}-${new Date().getMonth()}`;
    const mTasks = tasksByMonthKey[activeMonthKey] || [];

    return (
      <div style={styles.verticalTimelineContainer}>
        {/* Seletor Horizontal de Meses */}
        <div style={styles.mobileMonthSelectorContainer}>
          <div style={styles.mobileMonthSelectorScroll}>
            {months.map((m) => {
              const isActive = m.key === activeMonthKey;
              const hasTasks = tasksToRender.some(t => {
                if (!t.data_vencimento) return false;
                const d = new Date(t.data_vencimento);
                return `${d.getFullYear()}-${d.getMonth()}` === m.key;
              });

              return (
                <button
                  key={m.key}
                  onClick={() => setSelectedMobileMonthKey(m.key)}
                  style={{
                    ...styles.mobileMonthTab,
                    ...(isActive ? styles.mobileMonthTabActive : {}),
                  }}
                >
                  <span style={styles.mobileMonthTabLabel}>{m.label}</span>
                  {hasTasks && <span style={{
                    ...styles.mobileMonthDot,
                    background: isActive ? '#ffffff' : 'var(--primary)'
                  }}></span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* Lista de tarefas do mês ativo */}
        <div style={styles.verticalTasksList}>
          {mTasks.length === 0 ? (
            <div style={styles.emptyTasksMobile}>
              Nenhuma tarefa neste mês.
            </div>
          ) : (
            mTasks.map((t) => {
              const day = new Date(t.data_vencimento).getDate();
              const color = getTaskStatusColor(t);
              const csNome = getClasseServicoNome(t.classe_servico_id);
              const empresaNome = getEmpresaNome(t.empresa_id);
              const isExpanded = expandedMobileTaskIds.includes(t._id);
              const displayTitle = t.titulo;
              
              return (
                <div key={t._id} style={styles.verticalTaskRow}>
                  <div style={styles.verticalTimelineAxis}>
                    <div style={{ ...styles.verticalTimelineDot, background: color }}></div>
                    <div style={styles.verticalTimelineLine}></div>
                  </div>
                  
                  <div 
                    style={{
                      ...styles.verticalTaskCard,
                      borderLeftColor: color,
                    }}
                    onClick={() => toggleMobileTaskExpansion(t._id)}
                  >
                    <div style={styles.verticalCardHeader}>
                      <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                        <span style={{ ...styles.tagMini, ...getTaskStatusBadgeStyle(t) }}>
                          Dia {day}
                        </span>
                        <span style={styles.verticalCardCompany} title={empresaNome}>
                          {empresaNome}
                        </span>
                      </div>
                      
                      <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }} onClick={(e) => e.stopPropagation()}>
                        {t.status !== 'Concluído' && (
                          <button 
                            style={styles.actionMicroBtn} 
                            onClick={() => handleConcludeTask(t._id)}
                            title="Concluir"
                          >
                            <CheckCircle2 size={12} color="var(--success)" />
                          </button>
                        )}
                      </div>
                    </div>
                    
                    <h5 style={styles.verticalCardTitle}>{displayTitle}</h5>
                    
                    {/* Área que expande/encolhe */}
                    {isExpanded && (
                      <div style={styles.verticalCardExpandedContent} className="animate-fade-in">
                        <div style={styles.expandedField}>
                          <strong>Vencimento:</strong> {new Date(t.data_vencimento).toLocaleDateString('pt-BR')}
                        </div>
                        <div style={styles.expandedField}>
                          <strong>Documento:</strong> {getDocumentoInfo(t.documento_id)}
                        </div>
                        <div style={styles.expandedField}>
                          <strong>Classe:</strong> {csNome}
                        </div>
                        {getPrestadorNome(t.classe_servico_id) && (
                          <div style={styles.expandedField}>
                            <strong>Prestador:</strong>{' '}
                            <a 
                              href={`#/prestadores/${getPrestadorId(t.classe_servico_id)}`} 
                              style={{ color: 'var(--primary)', textDecoration: 'underline' }}
                            >
                              {getPrestadorNome(t.classe_servico_id)}
                            </a>
                          </div>
                        )}
                      </div>
                    )}
                    
                    <div style={styles.verticalCardFooter}>
                      <span style={styles.verticalCardVal}>R$ {t.valor_estimado || 0}</span>
                      
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }} onClick={(e) => e.stopPropagation()}>
                        <button 
                          style={styles.verticalCardExpandBtn}
                          onClick={() => toggleMobileTaskExpansion(t._id)}
                        >
                          {isExpanded ? 'Ver menos' : 'Ver mais'}
                        </button>
                        
                        <button 
                          style={styles.verticalCardDetailsBtn}
                          onClick={() => onViewTask && onViewTask(t._id)}
                        >
                          Acessar <TrendingUp size={12} style={{ marginLeft: '2px' }} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  };

  // ==========================================
  // VIEW 1: LINHA DO TEMPO STACKED (TIMELINE)
  // ==========================================
  const renderTimelineView = () => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const allMonths = [];
    const startDate = new Date(centerMonthDate.getFullYear(), centerMonthDate.getMonth() - 1, 1);
    for (let i = 0; i < 3; i++) {
      const d = new Date(startDate.getFullYear(), startDate.getMonth() + i, 1);
      const monthStr = d.toLocaleDateString('pt-BR', { month: 'long' });
      const capMonth = monthStr.charAt(0).toUpperCase() + monthStr.slice(1);
      allMonths.push({
        label: `${capMonth} de ${d.getFullYear()}`,
        month: d.getMonth(),
        year: d.getFullYear(),
        key: `${d.getFullYear()}-${d.getMonth()}`
      });
    }

    const months = zoomedMonth ? allMonths.filter(m => m.key === zoomedMonth.key) : allMonths;

    const tasksToRender = getFilteredTasks();

    const wrapperStyle = {
      ...styles.timelineWrapper,
      padding: isMobile ? '0.75rem' : '1.5rem',
      borderRadius: isMobile ? '16px' : '24px',
      display: isMobile ? 'block' : 'flex',
      flexDirection: isMobile ? 'row' : 'column',
      flex: isMobile ? 'none' : 1,
      minHeight: isMobile ? 'none' : 0,
      overflow: isMobile ? 'visible' : 'hidden',
    };

    const containerStyle = {
      ...styles.timelineContainer,
      flex: isMobile ? 'none' : 1,
      minHeight: isMobile ? 'none' : 0,
      maxHeight: isMobile ? 'none' : 'none',
    };

    return (
      <div style={wrapperStyle}>
        <div style={styles.timelineControlBar}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            {zoomedMonth && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <button 
                  onClick={() => setZoomedMonth(null)}
                  style={styles.backToAnnualBtn}
                  title="Voltar para visualização anual"
                >
                  <ChevronLeft size={16} style={{ marginRight: '4px' }} />
                  <span>Ver Todos os Meses</span>
                </button>
                <span style={{
                  fontSize: '0.9rem',
                  fontWeight: '600',
                  color: 'var(--primary)',
                  background: 'rgba(37, 99, 235, 0.08)',
                  padding: '4px 12px',
                  borderRadius: '20px',
                  border: '1px solid rgba(37, 99, 235, 0.2)',
                }}>
                  {zoomedMonth.label}
                </span>
              </div>
            )}
            {/* Filtro de Empresa no Cabeçalho */}
            {user.role !== 'cliente' && (
              <div style={styles.filterGroup}>
                <label style={styles.filterLabel}>Empresa:</label>
                <select
                  value={selectedCompanyId || ''}
                  onChange={(e) => setSelectedCompanyId(e.target.value || '')}
                  className="glass-input glass-select"
                  style={styles.headerSelect}
                >
                  <option value="">Todas as Empresas</option>
                  {empresas.map(emp => (
                    <option key={emp._id} value={emp._id}>{emp.nome_fantasia}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Filtro de Classe de Serviço no Cabeçalho */}
            <div style={styles.filterGroup}>
              <label style={styles.filterLabel}>Classe:</label>
              <select
                value={selectedClasseServicoId || ''}
                onChange={(e) => setSelectedClasseServicoId(e.target.value || null)}
                className="glass-input glass-select"
                style={styles.headerSelect}
              >
                <option value="">Todas as Classes</option>
                {classeServicos.map(cs => (
                  <option key={cs._id} value={cs._id}>{cs.nome}</option>
                ))}
              </select>
            </div>

            {(selectedClasseServicoId || selectedCompanyId) && (
              <button 
                style={styles.clearFilterHeaderBtn} 
                onClick={() => {
                  setSelectedClasseServicoId(null);
                  setSelectedCompanyId('');
                }}
              >
                <X size={12} />
                <span>Limpar Filtros</span>
              </button>
            )}
          </div>

          {!isMobile && (
            <div style={styles.horizontalNavBtns}>
              <button style={styles.todayBtn} onClick={handleResetCenter}>Hoje</button>
              <button style={styles.navCircleBtn} onClick={handleScrollLeft}><ChevronLeft size={18} /></button>
              <button style={styles.navCircleBtn} onClick={handleScrollRight}><ChevronRight size={18} /></button>
            </div>
          )}
        </div>

        {isMobile ? (
          renderVerticalTimeline(months, tasksToRender)
        ) : (
          <div 
            ref={containerRef}
            style={{ ...containerStyle, cursor: isDragging ? 'grabbing' : 'grab' }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUpOrLeave}
            onMouseLeave={handleMouseUpOrLeave}
            onScroll={handleScroll}
            onWheel={handleWheel}
          >
          <div style={styles.timelineGrid}>
            <div style={styles.rulerRow}>
              <div style={{
                ...styles.rulerMonthPlaceholder,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0 0.75rem',
              }}>
                {zoomedMonth ? (
                  <button 
                    onClick={() => setZoomedMonth(null)}
                    style={styles.rulerBackBtn}
                    title="Voltar para visualização anual"
                  >
                    <ChevronLeft size={14} style={{ marginRight: '4px' }} />
                    <span>Voltar</span>
                  </button>
                ) : null}
              </div>
              <div style={styles.rulerDaysTrack}>
                {zoomedMonth ? (
                  (() => {
                    const targetMonth = months[0];
                    if (!targetMonth) return null;
                    
                    const firstDayDate = new Date(targetMonth.year, targetMonth.month, 1);
                    const firstWeekday = firstDayDate.getDay(); // 0 = Sunday, 1 = Monday, etc.
                    const weekdayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
                    
                    return Array.from({ length: 7 }).map((_, colIdx) => {
                      const weekdayIdx = (firstWeekday + colIdx) % 7;
                      const weekdayName = weekdayNames[weekdayIdx];
                      const leftPercent = 10 + (colIdx / 6) * 80;
                      
                      return (
                        <div 
                          key={colIdx} 
                          style={{ 
                            ...styles.rulerWeekMark, 
                            left: `${leftPercent}%`, 
                            transform: 'translate(-50%, -50%)',
                            width: '80px',
                            textAlign: 'center',
                          }}
                        >
                          <span style={styles.weekLabel}>{weekdayName}</span>
                          <span style={styles.weekRange}>{colIdx + 1}º dia</span>
                        </div>
                      );
                    });
                  })()
                ) : (
                  [1, 5, 10, 15, 20, 25, 30].map(day => (
                    <div key={day} style={{ ...styles.rulerDayMark, left: `${10 + ((day - 1) / 30) * 80}%` }}>
                      <span>Dia {day}</span>
                    </div>
                  ))
                )}
              </div>
            </div>



            {(() => {
              const ROW_HEIGHT = 230;
              const OVERSCAN = 1;
              let startIndex = 0;
              let endIndex = months.length - 1;

              if (!zoomedMonth && containerRef.current) {
                const containerHeight = containerRef.current.clientHeight || 800;
                startIndex = Math.max(0, Math.floor(timelineScrollTop / ROW_HEIGHT) - OVERSCAN);
                endIndex = Math.min(
                  months.length - 1,
                  Math.ceil((timelineScrollTop + containerHeight) / ROW_HEIGHT) + OVERSCAN
                );
              }

              const visibleMonths = months.slice(startIndex, endIndex + 1);
              const paddingTop = startIndex * ROW_HEIGHT;
              const paddingBottom = Math.max(0, (months.length - 1 - endIndex) * ROW_HEIGHT);

              return (
                <>
                  {paddingTop > 0 && !zoomedMonth && <div style={{ height: `${paddingTop}px`, width: '100%' }} />}
                  {visibleMonths.map((m) => {
              const isZoomed = zoomedMonth && zoomedMonth.key === m.key;

              let mTasks = tasksByMonthKey[m.key] || [];

              const isCurrentMonth = m.month === currentMonth && m.year === currentYear;

              if (isZoomed) {
                const daysInMonth = new Date(m.year, m.month + 1, 0).getDate();
                const numWeeks = daysInMonth > 28 ? 5 : 4;
                
                return Array.from({ length: numWeeks }).map((_, wIdx) => {
                  const startDay = wIdx * 7 + 1;
                  let endDay = (wIdx + 1) * 7;
                  if (endDay > daysInMonth) endDay = daysInMonth;
                  
                  // Tasks that fall into this specific week
                  const wTasks = mTasks.filter(t => {
                    const d = new Date(t.data_vencimento).getDate();
                    return d >= startDay && d <= endDay;
                  });
                  
                  const hasHoveredTask = wTasks.some(t => t._id === hoveredTaskId);
                  
                  return (
                    <div 
                      key={`${m.key}-week-${wIdx}`} 
                      style={{
                        ...styles.monthRow,
                        height: '230px',
                        background: isCurrentMonth ? 'rgba(37, 99, 235, 0.02)' : 'transparent',
                        zIndex: hasHoveredTask ? 999 : 1,
                        borderBottom: '1px solid rgba(0, 0, 0, 0.06)',
                        overflow: 'hidden'
                      }}
                    >
                      {/* Sticky Header for the week */}
                      <div 
                        style={{
                          ...styles.monthStickyHeader,
                          borderLeftColor: isCurrentMonth ? 'var(--primary)' : 'var(--glass-border)',
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'center',
                          userSelect: 'none'
                        }}
                        onClick={() => setZoomedMonth(null)}
                        title="Clique para voltar para visão anual"
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '2px' }}>
                          <ChevronLeft size={14} style={{ color: 'var(--primary)' }} />
                          <span style={{
                            ...styles.monthLabelText,
                            fontWeight: '700',
                            color: 'var(--primary)',
                            margin: 0
                          }}>
                            Semana {wIdx + 1}
                          </span>
                        </div>
                        <span style={{ ...styles.monthTaskCount, fontWeight: '600', color: 'var(--text-main)' }}>
                          {m.label}
                        </span>
                        <span style={styles.monthTaskCount}>
                          Dias {startDay} - {endDay}
                        </span>
                        <span style={{ ...styles.monthTaskCount, fontSize: '0.62rem', opacity: 0.8 }}>
                          {wTasks.length} {wTasks.length === 1 ? 'tarefa' : 'tarefas'}
                        </span>
                      </div>

                      {/* Timeline track for the week */}
                      <div style={styles.monthTimelineTrack}>
                        <div style={styles.horizontalLine}></div>
                        
                        {/* Visual day ticks and vertical grid lines inside the week track */}
                        {Array.from({ length: 7 }).map((_, dIdx) => {
                          const dayOffset = dIdx;
                          const currentDay = startDay + dayOffset;
                          if (currentDay > endDay) return null;
                          
                          const tickPercent = 10 + (dIdx / 6) * 80;
                          return (
                            <div key={dIdx}>
                              {/* Vertical line for the day column */}
                              <div style={{
                                position: 'absolute',
                                left: `${tickPercent}%`,
                                top: 0,
                                bottom: 0,
                                width: '1px',
                                borderLeft: '1px dashed rgba(0, 0, 0, 0.05)',
                                zIndex: 2,
                                pointerEvents: 'none'
                              }}></div>
                              
                              {/* Day number label */}
                              <span style={{
                                position: 'absolute',
                                left: `${tickPercent}%`,
                                bottom: '4px',
                                transform: 'translateX(-50%)',
                                fontSize: '0.62rem',
                                fontWeight: '700',
                                color: 'var(--text-muted)',
                                opacity: 0.7,
                                zIndex: 3,
                                pointerEvents: 'none'
                              }}>
                                {currentDay}
                              </span>

                              {/* Day number/tick marking */}
                              <div 
                                style={{
                                  ...styles.dayTick,
                                  left: `${tickPercent}%`,
                                  height: '10px',
                                  opacity: 0.5,
                                  background: 'var(--text-main)'
                                }}
                                title={`Dia ${currentDay}`}
                              ></div>
                            </div>
                          );
                        })}

                        {/* Render tasks for this week */}
                        {wTasks.map((t, tIdx) => {
                          const tDate = new Date(t.data_vencimento);
                          const day = tDate.getDate();
                          const dayOffset = day - startDay;
                          const leftPercent = 10 + (dayOffset / 6) * 80;
                          const isEven = tIdx % 2 === 0;
                          const isHovered = hoveredTaskId === t._id;

                          const empresaNome = getEmpresaNome(t.empresa_id);
                          const csNome = getClasseServicoNome(t.classe_servico_id);
                          const color = getTaskStatusColor(t);

                          const displayTitle = t.titulo;

                          return (
                            <div 
                              key={t._id} 
                              style={{
                                ...styles.nodeWrapper,
                                left: `${leftPercent}%`,
                                zIndex: isHovered ? 1000 : 5
                              }}
                            >
                              <div 
                                style={{
                                  ...styles.nodeDot,
                                  background: color,
                                  boxShadow: isHovered ? `0 0 14px 4px ${color}` : `0 0 8px ${color}`,
                                  transform: isHovered ? 'scale(1.4)' : 'scale(1)'
                                }}
                                onClick={() => onViewTask && onViewTask(t._id)}
                                onMouseEnter={() => handleMouseEnterTask(t._id)}
                                onMouseLeave={handleMouseLeaveTask}
                              ></div>

                              <div style={{
                                ...styles.verticalConnector,
                                ...(isEven ? styles.connectorEven : styles.connectorOdd),
                                borderColor: color,
                                borderLeftWidth: isHovered ? '3px' : '1px',
                                borderStyle: isHovered ? 'solid' : 'dashed',
                                opacity: isHovered ? 1 : 0.4
                              }}></div>
                              
                              <div 
                                className="interactive-card"
                                style={{
                                  ...styles.timelineCompactCard,
                                  ...(isEven ? styles.cardEven : styles.cardOdd),
                                  ...(isHovered && {
                                    transform: 'translateX(-50%) scale(1.08)',
                                    background: '#ffffff',
                                    zIndex: 1000,
                                    boxShadow: '0 12px 36px rgba(0, 0, 0, 0.18)'
                                  }),
                                  borderLeftColor: color
                                }}
                                onClick={() => onViewTask && onViewTask(t._id)}
                                onMouseEnter={() => handleMouseEnterTask(t._id)}
                                onMouseLeave={handleMouseLeaveTask}
                              >
                                <div style={styles.cardHeaderMini}>
                                  <span style={{
                                    ...styles.tagMini,
                                    ...getTaskStatusBadgeStyle(t)
                                  }}>
                                    Dia {day}
                                  </span>
                                  <span style={styles.cardCompanyMini} title={empresaNome}>
                                    {empresaNome}
                                  </span>
                                </div>

                                <h6 style={styles.cardTitleMini} title={isHovered ? t.titulo : displayTitle}>
                                  {isHovered ? t.titulo : displayTitle}
                                </h6>
                                
                                <div style={styles.cardFooterMini}>
                                  <span style={styles.cardValMini}>R$ {t.valor_estimado || 0}</span>
                                  
                                  <div style={{ display: 'flex', gap: '4px' }}>
                                    {t.status !== 'Concluído' && (
                                      <button 
                                        style={{ ...styles.actionMicroBtn, color: 'var(--success)' }} 
                                        onClick={(e) => { e.stopPropagation(); handleConcludeTask(t._id); }}
                                        title="Concluir condicionante"
                                      >
                                        <CheckCircle2 size={12} />
                                      </button>
                                    )}
                                  </div>
                                </div>

                                {isHovered && (
                                  <div style={styles.expandedDetails} className="animate-fade-in">
                                    <div style={styles.detailDivider}></div>
                                    <div style={styles.expandedField}>
                                      <strong>Vencimento:</strong> {new Date(t.data_vencimento).toLocaleDateString('pt-BR')}
                                    </div>
                                    <div style={styles.expandedField}>
                                      <strong>Documento:</strong> {getDocumentoInfo(t.documento_id)}
                                    </div>
                                    <div style={styles.expandedField}>
                                      <strong>Classe:</strong> {csNome}
                                    </div>
                                    {getPrestadorNome(t.classe_servico_id) && (
                                      <div style={styles.expandedField}>
                                        <strong>Prestador:</strong>{' '}
                                        <a 
                                          href={`#/prestadores/${getPrestadorId(t.classe_servico_id)}`} 
                                          style={{ color: 'var(--primary)', textDecoration: 'underline' }}
                                        >
                                          {getPrestadorNome(t.classe_servico_id)}
                                        </a>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                });
              }

              // Standard View (All months)
              const hasHoveredTask = mTasks.some(t => t._id === hoveredTaskId);
              return (
                <div 
                  key={m.key} 
                  id={isCurrentMonth ? 'current-month-row' : undefined}
                  style={{
                    ...styles.monthRow,
                    height: '230px',
                    background: isCurrentMonth ? 'rgba(37, 99, 235, 0.02)' : 'transparent',
                    zIndex: hasHoveredTask ? 999 : 1,
                    transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                    overflow: 'hidden'
                  }}
                >
                  <div 
                    style={{
                      ...styles.monthStickyHeader,
                      borderLeftColor: isCurrentMonth ? 'var(--primary)' : 'var(--glass-border)',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center',
                      userSelect: 'none'
                    }}
                    onClick={() => handleMonthClick(m)}
                    title="Clique para focar neste mês em semanas"
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '2px' }}>
                      <ChevronRight size={14} style={{ color: 'var(--text-muted)' }} />
                      <span style={{
                        ...styles.monthLabelText,
                        fontWeight: isCurrentMonth ? '700' : '500',
                        color: isCurrentMonth ? 'var(--primary)' : 'var(--text-main)',
                        margin: 0
                      }}>
                        {m.label}
                      </span>
                    </div>
                    <span style={styles.monthTaskCount}>
                      {mTasks.length} {mTasks.length === 1 ? 'tarefa' : 'tarefas'}
                    </span>
                  </div>

                  <div style={styles.monthTimelineTrack}>
                    <div style={styles.horizontalLine}></div>

                    {Array.from({ length: 30 }).map((_, dIdx) => {
                      const dayNum = dIdx + 1;
                      const tickPercent = 10 + (dIdx / 29) * 80;
                      const isMajor = dayNum === 1 || dayNum % 5 === 0;
                      return (
                        <div 
                          key={dIdx} 
                          style={{
                            ...styles.dayTick,
                            left: `${tickPercent}%`,
                            height: isMajor ? '12px' : '6px',
                            opacity: isMajor ? 0.6 : 0.25,
                            background: isMajor ? 'var(--text-main)' : 'var(--text-light)'
                          }}
                        ></div>
                      );
                    })}

                    {mTasks.map((t, tIdx) => {
                      const tDate = new Date(t.data_vencimento);
                      const day = tDate.getDate();
                      const leftPercent = 10 + ((day - 1) / 30) * 80;
                      const isEven = tIdx % 2 === 0;
                      const isHovered = hoveredTaskId === t._id;

                      const empresaNome = getEmpresaNome(t.empresa_id);
                      const csNome = getClasseServicoNome(t.classe_servico_id);
                      const color = getTaskStatusColor(t);

                      const displayTitle = t.titulo;

                      return (
                        <div 
                          key={t._id} 
                          style={{
                            ...styles.nodeWrapper,
                            left: `${leftPercent}%`,
                            zIndex: isHovered ? 1000 : 5
                          }}
                        >
                          <div 
                            style={{
                              ...styles.nodeDot,
                              background: color,
                              boxShadow: isHovered ? `0 0 14px 4px ${color}` : `0 0 8px ${color}`,
                              transform: isHovered ? 'scale(1.4)' : 'scale(1)'
                            }}
                            onClick={() => onViewTask && onViewTask(t._id)}
                            onMouseEnter={() => handleMouseEnterTask(t._id)}
                            onMouseLeave={handleMouseLeaveTask}
                          ></div>

                          <div style={{
                            ...styles.verticalConnector,
                            ...(isEven ? styles.connectorEven : styles.connectorOdd),
                            borderColor: color,
                            borderLeftWidth: isHovered ? '3px' : '1px',
                            borderStyle: isHovered ? 'solid' : 'dashed',
                            opacity: isHovered ? 1 : 0.4
                          }}></div>
                          
                          <div 
                            className="interactive-card"
                            style={{
                              ...styles.timelineCompactCard,
                              ...(isEven ? styles.cardEven : styles.cardOdd),
                              ...(isHovered && {
                                transform: 'translateX(-50%) scale(1.08)',
                                background: '#ffffff',
                                zIndex: 1000,
                                boxShadow: '0 12px 36px rgba(0, 0, 0, 0.18)'
                              }),
                              borderLeftColor: color
                            }}
                            onClick={() => onViewTask && onViewTask(t._id)}
                            onMouseEnter={() => handleMouseEnterTask(t._id)}
                            onMouseLeave={handleMouseLeaveTask}
                          >
                            <div style={styles.cardHeaderMini}>
                              <span style={{
                                ...styles.tagMini,
                                ...getTaskStatusBadgeStyle(t)
                              }}>
                                Dia {day}
                              </span>
                              <span style={styles.cardCompanyMini} title={empresaNome}>
                                {empresaNome}
                              </span>
                            </div>

                            <h6 style={styles.cardTitleMini} title={isHovered ? t.titulo : displayTitle}>
                              {isHovered ? t.titulo : displayTitle}
                            </h6>
                            
                            <div style={styles.cardFooterMini}>
                              <span style={styles.cardValMini}>R$ {t.valor_estimado || 0}</span>
                              
                              <div style={{ display: 'flex', gap: '4px' }}>
                                {t.status !== 'Concluído' && (
                                  <button 
                                    style={{ ...styles.actionMicroBtn, color: 'var(--success)' }} 
                                    onClick={(e) => { e.stopPropagation(); handleConcludeTask(t._id); }}
                                    title="Concluir condicionante"
                                  >
                                    <CheckCircle2 size={12} />
                                  </button>
                                )}
                              </div>
                            </div>

                            {isHovered && (
                              <div style={styles.expandedDetails} className="animate-fade-in">
                                <div style={styles.detailDivider}></div>
                                <div style={styles.expandedField}>
                                  <strong>Vencimento:</strong> {new Date(t.data_vencimento).toLocaleDateString('pt-BR')}
                                </div>
                                <div style={styles.expandedField}>
                                  <strong>Documento:</strong> {getDocumentoInfo(t.documento_id)}
                                </div>
                                <div style={styles.expandedField}>
                                  <strong>Classe:</strong> {csNome}
                                </div>
                                {getPrestadorNome(t.classe_servico_id) && (
                                  <div style={styles.expandedField}>
                                    <strong>Prestador:</strong>{' '}
                                    <a 
                                      href={`#/prestadores/${getPrestadorId(t.classe_servico_id)}`} 
                                      style={{ color: 'var(--primary)', textDecoration: 'underline' }}
                                    >
                                      {getPrestadorNome(t.classe_servico_id)}
                                    </a>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}

                    {mTasks.length === 0 && (
                      <div 
                        style={styles.emptyTrackLoadButton}
                      >
                        <span style={styles.emptyTrackText}>Sem tarefas neste mês.</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            {paddingBottom > 0 && !zoomedMonth && <div style={{ height: `${paddingBottom}px`, width: '100%' }} />}
          </>
        );
      })()}
            

          </div>
        </div>
        )}
      </div>
    );
  };

  // ==========================================
  // VIEW 2: QUADRO KANBAN
  // ==========================================
  const renderKanbanView = () => {
    const tasks = getFilteredTasks();
    
    // Categorização dos cards
    const columns = {
      aVencer: {
        title: 'A Vencer',
        color: 'var(--primary)',
        tasks: tasks.filter(t => t.status === 'Pendente' && !isTaskOverdue(t))
      },
      emAndamento: {
        title: 'Em Andamento',
        color: '#eab308',
        tasks: tasks.filter(t => t.status === 'Em Andamento' || t.status === 'Aguardando Auditoria')
      },
      atrasadas: {
        title: 'Atrasadas',
        color: 'var(--danger)',
        tasks: tasks.filter(isTaskOverdue)
      },
      concluidas: {
        title: 'Concluídas',
        color: 'var(--success)',
        tasks: tasks.filter(t => t.status === 'Concluído')
                     .sort((a, b) => new Date(b.data_conclusao || b.data_vencimento) - new Date(a.data_conclusao || a.data_vencimento))
                     .slice(0, 30),
        subtitle: 'Últimas 30 concluídas'
      }
    };

    return (
      <div style={{
        ...styles.kanbanContainer,
        flex: isMobile ? 'none' : 1,
        minHeight: isMobile ? 'none' : 0,
        overflow: isMobile ? 'visible' : 'hidden'
      }} className="animate-fade-in">
        {Object.entries(columns).map(([key, col]) => (
          <div key={key} className="glass-panel" style={{
            ...styles.kanbanColumn,
            height: isMobile ? 'auto' : '100%',
            maxHeight: isMobile ? 'none' : 'none'
          }}>
            <div style={{ ...styles.kanbanColumnHeader, borderBottom: `3px solid ${col.color}`, flexDirection: 'column', alignItems: 'flex-start', gap: '4px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                <h4 style={styles.kanbanColumnTitle}>{col.title}</h4>
                <span style={styles.kanbanCountPill}>
                  {key === 'concluidas' && col.tasks.length === 30 ? '30+' : col.tasks.length}
                </span>
              </div>
              {col.subtitle && (
                <span style={{ fontSize: '0.7rem', color: 'var(--text-light)', fontStyle: 'italic' }}>
                  {col.subtitle}
                </span>
              )}
            </div>
            
            <div style={styles.kanbanCardsList}>
              {col.tasks.length === 0 ? (
                <div style={styles.kanbanEmptyState}>Nenhuma condicionante</div>
              ) : (
                col.tasks.map(t => (
                  <div 
                    key={t._id} 
                    className="glass-card card-hover" 
                    style={styles.kanbanCard}
                    onClick={() => onViewTask(t._id)}
                  >
                    <div style={styles.kanbanCardHeader}>
                      <span style={styles.kanbanCardCompany}>{getEmpresaNome(t.empresa_id)}</span>
                      <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: col.color }}>
                        Dia {new Date(t.data_vencimento).getDate()}
                      </span>
                    </div>
                    <h5 style={styles.kanbanCardTitle}>{t.titulo}</h5>
                    <span style={styles.kanbanCardClass}>{getClasseServicoNome(t.classe_servico_id)}</span>
                    
                    <div style={styles.kanbanCardFooter}>
                      <span style={styles.kanbanCardPrice}>R$ {t.valor_estimado || 0}</span>
                      
                      <div style={{ display: 'flex', gap: '4px' }}>
                        {t.status !== 'Concluído' && (
                          <button 
                            style={styles.kanbanConcludeBtn}
                            onClick={(e) => { e.stopPropagation(); handleConcludeTask(t._id); }}
                            title="Marcar como Concluído"
                          >
                            <CheckCircle2 size={14} />
                          </button>
                        )}
                        {t.classe_servico_id && (
                          <button
                            style={{
                              ...styles.isolateBtn,
                              background: selectedClasseServicoId === t.classe_servico_id ? 'var(--primary)' : 'rgba(0,0,0,0.04)',
                              color: selectedClasseServicoId === t.classe_servico_id ? 'white' : 'var(--text-muted)'
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedClasseServicoId(selectedClasseServicoId === t.classe_servico_id ? null : t.classe_servico_id);
                            }}
                            title="Isolar esta classe"
                          >
                            <Filter size={10} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };



  // ==========================================
  // VIEW 5: LISTA ANALÍTICA (CHECKLIST GRID)
  // ==========================================
  const renderListaView = () => {
    // 1. Calcular as 6 colunas mensais com base no mês e ano selecionados
    const columns = [];
    const monthNamesPt = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    const monthAbbrs = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

    for (let i = 0; i < 6; i++) {
      const d = new Date(gridYear, gridStartMonth + i, 1);
      const m = monthAbbrs[d.getMonth()];
      const y = d.getFullYear().toString().slice(-2);
      columns.push({
        label: `${m}/${y}`,
        month: d.getMonth(),
        year: d.getFullYear(),
        key: `${d.getFullYear()}-${d.getMonth()}`
      });
    }

    // 2. Filtrar tarefas com base na busca por texto e nos filtros de status/empresa/data
    const filteredTasks = getFilteredTasks().filter(t => {
      if (!t.data_vencimento) return false;

      // Busca por título ou classe de serviço
      const matchesSearch = searchTerm ? (
        t.titulo.toLowerCase().includes(searchTerm.toLowerCase()) || 
        getClasseServicoNome(t.classe_servico_id).toLowerCase().includes(searchTerm.toLowerCase())
      ) : true;
      
      // Filtro de empresa
      const matchesCompany = listCompanyFilter ? t.empresa_id === listCompanyFilter : true;
      
      // Filtro de status
      const matchesStatus = listStatusFilter ? t.status === listStatusFilter : true;
      
      return matchesSearch && matchesCompany && matchesStatus;
    });

    // 3. Agrupar tarefas por Cliente (Empresa)
    const companyTasksMap = {};
    
    // Inicializar o mapa para as empresas com base nos filtros
    filteredTasks.forEach(t => {
      const taskDate = new Date(t.data_vencimento);
      const taskMonth = taskDate.getMonth();
      const taskYear = taskDate.getFullYear();
      
      // Verifica se a tarefa cai em alguma das 6 colunas visíveis
      const colIndex = columns.findIndex(col => col.month === taskMonth && col.year === taskYear);
      if (colIndex !== -1) {
        if (!companyTasksMap[t.empresa_id]) {
          companyTasksMap[t.empresa_id] = {};
          columns.forEach(col => {
            companyTasksMap[t.empresa_id][col.key] = [];
          });
        }
        companyTasksMap[t.empresa_id][columns[colIndex].key].push(t);
      }
    });

    // Se o usuário selecionou uma empresa específica e ela não tem tarefas no período, vamos incluí-la vazia
    if (listCompanyFilter && !companyTasksMap[listCompanyFilter]) {
      companyTasksMap[listCompanyFilter] = {};
      columns.forEach(col => {
        companyTasksMap[listCompanyFilter][col.key] = [];
      });
    }

    // 4. Transformar em linhas do grid
    const companyRows = [];
    Object.keys(companyTasksMap).forEach(companyId => {
      const monthTasks = companyTasksMap[companyId];
      
      // Achar a quantidade máxima de tarefas em qualquer um dos 6 meses para este cliente
      let maxTasks = 0;
      columns.forEach(col => {
        if (monthTasks[col.key].length > maxTasks) {
          maxTasks = monthTasks[col.key].length;
        }
      });
      
      // Precisamos de pelo menos 1 linha para representar o cliente se houver filtro
      const rowsCount = maxTasks > 0 ? maxTasks : (listCompanyFilter ? 1 : 0);
      
      if (rowsCount > 0) {
        companyRows.push({
          companyId,
          companyName: getEmpresaNome(companyId),
          rowsCount,
          monthTasks
        });
      }
    });

    // Ordenar empresas em ordem alfabética
    companyRows.sort((a, b) => a.companyName.localeCompare(b.companyName));

    // Obter lista dinâmica de anos disponíveis nas tarefas
    const getYearsOptions = () => {
      const years = new Set([2026, new Date().getFullYear()]);
      todasTarefas.forEach(t => {
        if (t.data_vencimento) {
          const y = new Date(t.data_vencimento).getFullYear();
          if (y) years.add(y);
        }
      });
      return Array.from(years).sort((a, b) => a - b);
    };

    return (
      <div className="glass-panel animate-fade-in" style={{
        ...styles.gridContainer,
        flex: isMobile ? 'none' : 1,
        minHeight: isMobile ? 'none' : 0,
        overflow: isMobile ? 'visible' : 'hidden'
      }}>
        {/* Barra superior de título do Filtro Inteligente */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--text-main)' }}>Filtro Inteligente por Período</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Visualize e planeje as demandas agrupadas por clientes em 6 meses consecutivos.</p>
          </div>
          
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {(searchTerm || listCompanyFilter || listStatusFilter) && (
              <button 
                style={styles.clearFilterHeaderBtn} 
                onClick={() => {
                  setSearchTerm('');
                  setListCompanyFilter('');
                  setListStatusFilter('');
                }}
              >
                <X size={12} />
                <span>Limpar Filtros</span>
              </button>
            )}
          </div>
        </div>

        {/* Barra de Filtros Inteligentes (Cliente - Mês - Ano) */}
        <div style={styles.gridFilterBar}>
          {/* Caixa de Busca */}
          <div style={styles.searchWrapper}>
            <Search size={18} color="var(--text-light)" />
            <input 
              type="text" 
              placeholder="Buscar serviço ou classe..."
              style={styles.searchInput}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Filtros Dropdown */}
          <div style={styles.gridFiltersRight}>
            {/* Cliente */}
            <div style={styles.filterGroup}>
              <label style={styles.filterLabel}>Cliente:</label>
              <select 
                style={styles.listSelect}
                value={listCompanyFilter}
                onChange={(e) => setListCompanyFilter(e.target.value)}
              >
                <option value="">Todos os Clientes</option>
                {empresas.map(e => (
                  <option key={e._id} value={e._id}>{e.nome_fantasia}</option>
                ))}
              </select>
            </div>

            {/* Status */}
            <div style={styles.filterGroup}>
              <label style={styles.filterLabel}>Status:</label>
              <select 
                style={styles.listSelect}
                value={listStatusFilter}
                onChange={(e) => setListStatusFilter(e.target.value)}
              >
                <option value="">Todos Status</option>
                <option value="Pendente">Pendentes</option>
                <option value="Em Andamento">Em Andamento</option>
                <option value="Concluído">Concluídos</option>
                <option value="Atrasado">Atrasados</option>
              </select>
            </div>

            {/* Mês de Início */}
            <div style={styles.filterGroup}>
              <label style={styles.filterLabel}>Início:</label>
              <select 
                style={styles.listSelect}
                value={gridStartMonth}
                onChange={(e) => setGridStartMonth(Number(e.target.value))}
              >
                {monthNamesPt.map((name, idx) => (
                  <option key={idx} value={idx}>{name}</option>
                ))}
              </select>
            </div>

            {/* Ano */}
            <div style={styles.filterGroup}>
              <label style={styles.filterLabel}>Ano:</label>
              <select 
                style={styles.listSelect}
                value={gridYear}
                onChange={(e) => setGridYear(Number(e.target.value))}
              >
                {getYearsOptions().map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Tabela de Dados Matricial */}
        <div style={{
          ...styles.gridTableWrapper,
          flex: isMobile ? 'none' : 1,
          minHeight: isMobile ? 'none' : 0,
          overflowY: isMobile ? 'visible' : 'auto'
        }}>
          <table style={styles.gridTable}>
            <thead>
              <tr style={styles.gridTableHeaderRow}>
                <th style={{ ...styles.gridTh, width: '50px', textAlign: 'center' }}>Nº</th>
                <th style={{ ...styles.gridTh, width: '220px' }}>Nome do Cliente</th>
                {columns.map(col => (
                  <th key={col.key} style={styles.gridThMonth}>
                    {col.label.toUpperCase()}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {companyRows.length === 0 ? (
                <tr>
                  <td colSpan={columns.length + 2} style={styles.tdEmpty}>
                    Nenhuma obrigação encontrada para os filtros e período selecionados.
                  </td>
                </tr>
              ) : (
                (() => {
                  let globalRowIndex = 0;
                  return companyRows.flatMap(comp => {
                    const rows = [];
                    for (let i = 0; i < comp.rowsCount; i++) {
                      globalRowIndex++;
                      const isFirstRow = i === 0;
                      
                      rows.push(
                        <tr key={`${comp.companyId}-row-${i}`} style={styles.gridTableRow}>
                          {/* Número da Linha */}
                          <td style={styles.gridTdIndex}>
                            {globalRowIndex}
                          </td>
                          
                          {/* Nome do Cliente (repetido em cada linha para manter a conformidade com a planilha) */}
                          <td style={{ 
                            ...styles.gridTdClient, 
                            fontWeight: isFirstRow ? '700' : '400',
                            color: isFirstRow ? 'var(--text-main)' : 'var(--text-light)',
                            borderTop: isFirstRow && globalRowIndex > 1 ? '1px solid rgba(0,0,0,0.08)' : 'none'
                          }}>
                            {comp.companyName}
                          </td>
                          
                          {/* Meses do Grid */}
                          {columns.map(col => {
                            const tasksInCol = comp.monthTasks[col.key] || [];
                            const task = tasksInCol[i];
                            
                            return (
                              <td key={col.key} style={{
                                ...styles.gridTdCell,
                                borderTop: isFirstRow && globalRowIndex > 1 ? '1px solid rgba(0,0,0,0.08)' : 'none'
                              }}>
                                {task ? (
                                  <div 
                                    style={{
                                      ...styles.gridTaskCard,
                                      borderLeft: `4px solid ${getTaskStatusColor(task)}`,
                                    }}
                                    onClick={() => onViewTask && onViewTask(task._id)}
                                    title={`Vence em: ${formatDate(task.data_vencimento)}`}
                                  >
                                    <div style={styles.gridTaskCardHeader}>
                                      <span style={styles.gridTaskCardTitle} title={task.titulo}>
                                        {task.titulo}
                                      </span>
                                      <span style={{
                                        ...styles.gridStatusDot,
                                        background: getTaskStatusColor(task)
                                      }} title={task.status} />
                                    </div>
                                    
                                    <div style={styles.gridTaskCardBody}>
                                      <span style={styles.gridTaskCardClass} title={getClasseServicoNome(task.classe_servico_id)}>
                                        {getClasseServicoNome(task.classe_servico_id)}
                                      </span>
                                      <span style={styles.gridTaskCardVal}>
                                        R$ {task.valor_estimado ? Number(task.valor_estimado).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0,00'}
                                      </span>
                                    </div>
                                    
                                    {/* Botão flutuante de ação rápida para concluir */}
                                    {task.status !== 'Concluído' && (
                                      <div style={styles.gridTaskCardActions} onClick={(e) => e.stopPropagation()}>
                                        <button 
                                          style={styles.gridActionBtn} 
                                          onClick={() => handleConcludeTask(task._id)}
                                          title="Concluir serviço"
                                        >
                                          <CheckCircle2 size={12} color="var(--success)" />
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <div style={styles.gridEmptyCell}>-</div>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    }
                    return rows;
                  });
                })()
              )}
            </tbody>
            <tfoot>
              {/* Linha de Total Geral */}
              <tr style={styles.gridTotalRow}>
                <td colSpan={2} style={styles.gridTotalLabel}>
                  R$ TOTAL MENSAL
                </td>
                {columns.map(col => {
                  let colTotal = 0;
                  companyRows.forEach(comp => {
                    const tasksInCol = comp.monthTasks[col.key] || [];
                    tasksInCol.forEach(t => {
                      colTotal += Number(t.valor_estimado) || 0;
                    });
                  });
                  
                  return (
                    <td key={col.key} style={styles.gridTotalVal}>
                      R$ {colTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  );
                })}
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    );
  };

  // --- Render Geral da Tela ---
  if (loading) {
    return (
      <div style={styles.loaderContainer}>
        <div className="animate-spin" style={styles.spinner}></div>
        <p style={{ marginTop: '1rem', color: 'var(--text-muted)' }}>Carregando cronograma...</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in" style={{ 
      ...styles.container, 
      position: 'relative',
      height: isMobile ? 'auto' : '100%',
      overflow: isMobile ? 'visible' : 'hidden'
    }}>
      {loadingTasks && (
        <div style={styles.tasksLoadingIndicator}>
          <div className="animate-spin" style={styles.microSpinner}></div>
          <span>Carregando...</span>
        </div>
      )}
      {/* Header */}
      <header style={styles.header}>
        <div>
          <h1 style={styles.title}>Cronograma Operacional</h1>
          <p style={styles.subtitle}>Visões integradas de compliance, obrigações e prazos.</p>
        </div>
        <div style={styles.topRightControls}>
          <div style={styles.iconButton} title="Notificações">
            <Bell size={22} color="var(--text-main)" />
            {todasTarefas.filter(isTaskOverdue).length > 0 && (
              <span style={styles.notificationBadge}></span>
            )}
          </div>
          <div 
            style={styles.iconButton} 
            title="Ver Calendário"
            onClick={() => onNavigateTab && onNavigateTab('calendario')}
          >
            <CalendarDays size={22} color="var(--text-main)" />
          </div>
        </div>
      </header>

      {/* Tabs Principais de Visualizações */}
      <div style={styles.tabsContainer}>
        <button 
          style={activeTab === 'timeline' ? styles.activeTab : styles.tab} 
          onClick={() => setActiveTab('timeline')}
        >
          <Activity size={18} /> Linha do Tempo Stacked
        </button>
        <button 
          style={activeTab === 'kanban' ? styles.activeTab : styles.tab} 
          onClick={() => setActiveTab('kanban')}
        >
          <LayoutList size={18} /> Quadro Kanban
        </button>
        <button 
          style={activeTab === 'lista' ? styles.activeTab : styles.tab} 
          onClick={() => setActiveTab('lista')}
        >
          <SlidersHorizontal size={18} /> Filtro Inteligente
        </button>
      </div>

      {/* Legenda de Status */}
      <div style={styles.legendBar}>
        <span style={styles.legendTitle}>Legenda:</span>
        <div style={styles.legendItem}>
          <span style={{ ...styles.legendDot, background: 'var(--success)' }}></span>
          <span>Concluído</span>
        </div>
        <div style={styles.legendItem}>
          <span style={{ ...styles.legendDot, background: '#eab308' }}></span>
          <span>Em Andamento / Auditoria</span>
        </div>
        <div style={styles.legendItem}>
          <span style={{ ...styles.legendDot, background: 'var(--primary)' }}></span>
          <span>Pendente</span>
        </div>
        <div style={styles.legendItem}>
          <span style={{ ...styles.legendDot, background: 'var(--danger)' }}></span>
          <span>Atrasado</span>
        </div>
      </div>

      {/* Conteúdo Dinâmico conforme Tab Ativa */}
      <div style={{
        ...styles.tabContent,
        flex: isMobile ? 'none' : 1,
        minHeight: isMobile ? 'none' : 0,
        display: isMobile ? 'block' : 'flex',
        flexDirection: isMobile ? 'row' : 'column',
        overflow: isMobile ? 'visible' : 'hidden'
      }}>
        {activeTab === 'timeline' && renderTimelineView()}
        {activeTab === 'kanban' && renderKanbanView()}
        {activeTab === 'lista' && renderListaView()}
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
    height: '100%',
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '1rem',
    textAlign: 'left',
  },
  title: {
    fontSize: '2rem',
    fontWeight: '700',
    color: 'var(--text-main)',
  },
  subtitle: {
    fontSize: '0.95rem',
    color: 'var(--text-muted)',
    marginTop: '0.25rem',
  },
  topRightControls: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
  },
  iconButton: {
    width: '42px',
    height: '42px',
    borderRadius: '50%',
    background: 'var(--glass-bg)',
    border: '1px solid var(--glass-border)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    position: 'relative',
    transition: 'all 0.2s',
  },
  notificationBadge: {
    position: 'absolute',
    top: '10px',
    right: '10px',
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    background: 'var(--danger)',
    border: '2px solid var(--bg-main)',
  },
  tabsContainer: {
    display: 'flex',
    gap: '0.5rem',
    background: 'rgba(255, 255, 255, 0.1)',
    padding: '0.5rem',
    borderRadius: '16px',
    border: '1px solid var(--glass-border)',
    overflowX: 'auto',
  },
  tab: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.75rem 1.25rem',
    borderRadius: '12px',
    border: 'none',
    background: 'transparent',
    color: 'var(--text-muted)',
    fontWeight: '600',
    fontSize: '0.9rem',
    cursor: 'pointer',
    transition: 'all 0.2s',
    whiteSpace: 'nowrap',
  },
  activeTab: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.75rem 1.25rem',
    borderRadius: '12px',
    border: 'none',
    background: 'var(--primary)',
    color: 'white',
    fontWeight: '600',
    fontSize: '0.9rem',
    cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
    whiteSpace: 'nowrap',
  },
  tabContent: {
    marginTop: '0.5rem',
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
    minHeight: 0,
    overflow: 'hidden',
  },
  legendBar: {
    display: 'flex',
    alignItems: 'center',
    gap: '1.25rem',
    flexWrap: 'wrap',
    background: 'var(--glass-bg)',
    border: '1px solid var(--glass-border)',
    borderRadius: '12px',
    padding: '0.5rem 1.0rem',
    marginTop: '-0.5rem',
  },
  legendTitle: {
    fontSize: '0.75rem',
    fontWeight: '700',
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  legendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.4rem',
    fontSize: '0.8rem',
    fontWeight: '600',
    color: 'var(--text-main)',
  },
  legendDot: {
    width: '10px',
    height: '10px',
    borderRadius: '50%',
  },

  // STYLES: Timeline Stacked
  timelineWrapper: {
    background: 'var(--glass-bg)',
    border: '1px solid var(--glass-border)',
    borderRadius: '24px',
    padding: '1.5rem',
    boxShadow: '0 10px 40px rgba(0,0,0,0.03)',
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
    minHeight: 0,
    overflow: 'hidden',
  },
  timelineControlBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1.5rem',
    flexWrap: 'wrap',
    gap: '1rem',
  },
  toggleContainer: {
    display: 'flex',
    gap: '6px',
    background: 'rgba(0,0,0,0.03)',
    padding: '4px',
    borderRadius: '12px',
    border: '1px solid var(--glass-border)',
  },
  toggleBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '0.5rem 1.25rem',
    borderRadius: '8px',
    border: 'none',
    background: 'transparent',
    color: 'var(--text-muted)',
    fontSize: '0.825rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  activeToggleBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '0.5rem 1.25rem',
    borderRadius: '8px',
    border: 'none',
    background: 'var(--bg-main, #ffffff)',
    color: 'var(--primary)',
    fontSize: '0.825rem',
    fontWeight: '700',
    cursor: 'pointer',
    boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
  },
  filterGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  filterLabel: {
    fontSize: '0.8rem',
    fontWeight: '600',
    color: 'var(--text-muted)',
  },
  headerSelect: {
    fontSize: '0.825rem',
    padding: '0.5rem 2rem 0.5rem 0.75rem',
    borderRadius: '10px',
    border: '1px solid var(--glass-border)',
    background: 'rgba(255, 255, 255, 0.6)',
    color: 'var(--text-main)',
    width: '230px',
    cursor: 'pointer',
    outline: 'none',
  },
  toggleButtonGroup: {
    display: 'flex',
    background: 'rgba(0, 0, 0, 0.03)',
    padding: '3px',
    borderRadius: '10px',
    border: '1px solid var(--glass-border)',
  },
  toggleSubBtn: {
    padding: '0.4rem 0.9rem',
    borderRadius: '7px',
    border: 'none',
    background: 'transparent',
    color: 'var(--text-muted)',
    fontSize: '0.775rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  activeToggleSubBtn: {
    padding: '0.4rem 0.9rem',
    borderRadius: '7px',
    border: 'none',
    background: 'var(--bg-main, #ffffff)',
    color: 'var(--primary)',
    fontSize: '0.775rem',
    fontWeight: '700',
    cursor: 'pointer',
    boxShadow: '0 2px 6px rgba(0,0,0,0.05)',
  },
  clearFilterHeaderBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '0.5rem 1rem',
    borderRadius: '12px',
    border: '1px solid rgba(239, 68, 68, 0.2)',
    background: 'rgba(239, 68, 68, 0.08)',
    color: 'var(--danger)',
    fontSize: '0.825rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s',
    boxShadow: '0 2px 8px rgba(239, 68, 68, 0.05)',
  },
  horizontalNavBtns: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  todayBtn: {
    padding: '0.5rem 1rem',
    borderRadius: '12px',
    border: '1px solid var(--glass-border)',
    background: 'var(--bg-main, #ffffff)',
    color: 'var(--primary)',
    fontSize: '0.825rem',
    fontWeight: '700',
    cursor: 'pointer',
    transition: 'all 0.2s',
    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
  },
  navCircleBtn: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    border: '1px solid var(--glass-border)',
    background: 'var(--bg-main, #ffffff)',
    color: 'var(--text-main)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  timelineContainer: {
    width: '100%',
    maxHeight: '75vh',
    overflow: 'auto',
    borderRadius: '16px',
    border: '1px solid var(--glass-border)',
    background: 'rgba(255, 255, 255, 0.2)',
    userSelect: 'none',
  },
  timelineGrid: {
    display: 'flex',
    flexDirection: 'column',
    width: '1400px',
    position: 'relative',
    paddingTop: '60px',
    paddingBottom: '60px',
  },
  rulerRow: {
    display: 'flex',
    alignItems: 'center',
    height: '45px',
    borderBottom: '1px solid var(--glass-border)',
    background: 'var(--bg-main, #ffffff)',
    position: 'sticky',
    top: 0,
    zIndex: 20,
  },
  rulerMonthPlaceholder: {
    width: '160px',
    flexShrink: 0,
    borderRight: '1px solid var(--glass-border)',
    background: 'var(--bg-main, #ffffff)',
    position: 'sticky',
    left: 0,
    zIndex: 21,
  },
  rulerDaysTrack: {
    flex: 1,
    height: '100%',
    position: 'relative',
  },
  rulerDayMark: {
    position: 'absolute',
    top: '50%',
    transform: 'translate(-50%, -50%)',
    fontSize: '0.75rem',
    fontWeight: '700',
    color: 'var(--text-light)',
  },
  monthRow: {
    display: 'flex',
    alignItems: 'center',
    borderBottom: '1px solid rgba(0,0,0,0.03)',
    position: 'relative',
  },
  monthStickyHeader: {
    width: '180px',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    padding: '0 1rem',
    borderRight: '1px solid var(--glass-border)',
    borderLeft: '4px solid transparent',
    background: 'var(--bg-main, #ffffff)',
    position: 'sticky',
    left: 0,
    zIndex: 10,
    flexShrink: 0,
  },
  monthLabelText: {
    fontSize: '0.85rem',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  monthTaskCount: {
    fontSize: '0.7rem',
    color: 'var(--text-light)',
    marginTop: '2px',
  },
  monthTimelineTrack: {
    flex: 1,
    height: '100%',
    position: 'relative',
  },
  horizontalLine: {
    position: 'absolute',
    top: '50%',
    left: 0,
    right: 0,
    height: '2px',
    background: 'var(--glass-border)',
    transform: 'translateY(-50%)',
    zIndex: 1,
  },
  dayTick: {
    position: 'absolute',
    top: '50%',
    transform: 'translate(-50%, -50%)',
    width: '1px',
    zIndex: 2,
  },
  nodeWrapper: {
    position: 'absolute',
    top: '50%',
    transform: 'translate(-50%, -50%)',
    width: '20px',
    height: '20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  nodeDot: {
    width: '12px',
    height: '12px',
    borderRadius: '50%',
    border: '2px solid var(--bg-main, #ffffff)',
    zIndex: 5,
    cursor: 'pointer',
    transition: 'all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
  },
  verticalConnector: {
    position: 'absolute',
    left: '50%',
    width: '1px',
    transform: 'translateX(-50%)',
    zIndex: 2,
    transition: 'all 0.2s ease',
  },
  connectorEven: {
    bottom: '10px',
    height: '42px',
  },
  connectorOdd: {
    top: '10px',
    height: '22px',
  },
  timelineCompactCard: {
    position: 'absolute',
    left: '50%',
    transform: 'translateX(-50%)',
    width: '190px',
    background: 'rgba(255, 255, 255, 0.85)',
    border: '1px solid var(--glass-border)',
    borderLeftWidth: '4px',
    borderRadius: '12px',
    padding: '0.6rem 0.75rem',
    cursor: 'pointer',
    boxShadow: '0 4px 16px rgba(0,0,0,0.03)',
    zIndex: 10,
    transition: 'all 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
  },
  cardEven: {
    top: '-95px',
    bottom: 'auto',
  },
  cardOdd: {
    bottom: '-95px',
    top: 'auto',
  },
  cardHeaderMini: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '4px',
    gap: '4px',
  },
  tagMini: {
    fontSize: '0.58rem',
    fontWeight: '700',
    padding: '0.08rem 0.3rem',
    borderRadius: '4px',
    whiteSpace: 'nowrap',
  },
  cardCompanyMini: {
    fontSize: '0.62rem',
    fontWeight: '600',
    color: 'var(--text-light)',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    maxWidth: '100px',
  },
  cardTitleMini: {
    fontSize: '0.74rem',
    fontWeight: '600',
    color: 'var(--text-main)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    textAlign: 'left',
    margin: '3px 0 5px 0',
  },
  cardFooterMini: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  cardValMini: {
    fontSize: '0.65rem',
    fontWeight: '700',
    color: 'var(--text-light)',
  },
  actionMicroBtn: {
    border: 'none',
    background: 'rgba(0, 0, 0, 0.03)',
    width: '20px',
    height: '20px',
    borderRadius: '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  isolateBtn: {
    border: 'none',
    width: '20px',
    height: '20px',
    borderRadius: '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  expandedDetails: {
    marginTop: '6px',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    textAlign: 'left',
  },
  detailDivider: {
    height: '1px',
    background: 'var(--glass-border)',
    margin: '4px 0',
  },
  expandedField: {
    fontSize: '0.64rem',
    color: 'var(--text-muted)',
    lineHeight: '1.3',
  },

  kanbanContainer: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: '1rem',
    marginTop: '0.5rem',
    flex: 1,
    minHeight: 0,
    overflow: 'hidden',
  },
  kanbanColumn: {
    padding: '1rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
    background: 'rgba(255, 255, 255, 0.2)',
    height: '100%',
    overflowY: 'auto',
  },
  kanbanColumnHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: '0.5rem',
  },
  kanbanColumnTitle: {
    fontSize: '0.95rem',
    fontWeight: '700',
    color: 'var(--text-main)',
  },
  kanbanCountPill: {
    fontSize: '0.75rem',
    fontWeight: '700',
    padding: '0.15rem 0.5rem',
    background: 'var(--glass-border)',
    borderRadius: '8px',
  },
  kanbanCardsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
  },
  kanbanEmptyState: {
    fontSize: '0.8rem',
    color: 'var(--text-light)',
    fontStyle: 'italic',
    padding: '1.5rem 0',
  },
  kanbanCard: {
    padding: '1rem',
    cursor: 'pointer',
    textAlign: 'left',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.4rem',
  },
  kanbanCardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  kanbanCardCompany: {
    fontSize: '0.68rem',
    fontWeight: '700',
    color: 'var(--text-light)',
    textTransform: 'uppercase',
  },
  kanbanCardTitle: {
    fontSize: '0.85rem',
    fontWeight: '600',
    color: 'var(--text-main)',
    margin: '2px 0',
  },
  kanbanCardClass: {
    fontSize: '0.7rem',
    color: 'var(--text-muted)',
  },
  kanbanCardFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: '0.25rem',
  },
  kanbanCardPrice: {
    fontSize: '0.75rem',
    fontWeight: '800',
    color: 'var(--text-light)',
  },
  kanbanConcludeBtn: {
    border: 'none',
    background: 'var(--success-light)',
    color: 'var(--success)',
    width: '24px',
    height: '24px',
    borderRadius: '6px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },

  // STYLES: Gantt Chart
  ganttContainer: {
    padding: '1.5rem',
    textAlign: 'left',
  },
  ganttHeaderRow: {
    display: 'flex',
    borderBottom: '2px solid var(--glass-border)',
    paddingBottom: '0.75rem',
    fontWeight: '700',
    fontSize: '0.85rem',
  },
  ganttCompanyLabelHeader: {
    width: '180px',
    flexShrink: 0,
    color: 'var(--text-main)',
  },
  ganttTimeGridHeader: {
    flex: 1,
    display: 'flex',
  },
  ganttMonthColHeader: {
    flex: 1,
    textAlign: 'center',
    textTransform: 'capitalize',
    color: 'var(--text-light)',
  },
  ganttBody: {
    display: 'flex',
    flexDirection: 'column',
  },
  ganttRow: {
    display: 'flex',
    alignItems: 'center',
    borderBottom: '1px solid rgba(0,0,0,0.03)',
    minHeight: '65px',
  },
  ganttCompanyCell: {
    width: '180px',
    flexShrink: 0,
    paddingRight: '1rem',
    display: 'flex',
    flexDirection: 'column',
  },
  ganttSubCount: {
    fontSize: '0.65rem',
    color: 'var(--text-light)',
    marginTop: '2px',
  },
  ganttTimeTrackCell: {
    flex: 1,
    height: '100%',
    position: 'relative',
    minHeight: '65px',
    display: 'flex',
    alignItems: 'center',
  },
  ganttBgGridLines: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    display: 'flex',
    zIndex: 1,
  },
  ganttGridLine: {
    flex: 1,
    borderRight: '1px solid rgba(0,0,0,0.02)',
    height: '100%',
  },
  ganttBar: {
    position: 'absolute',
    height: '24px',
    borderRadius: '6px',
    display: 'flex',
    alignItems: 'center',
    padding: '0 0.5rem',
    cursor: 'pointer',
    zIndex: 5,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    transition: 'transform 0.2s',
  },
  ganttBarText: {
    fontSize: '0.65rem',
    fontWeight: '700',
    color: '#ffffff',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    width: '100%',
  },

  // STYLES: Radar de Prazos
  radarOuterContainer: {
    padding: '2rem',
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  radarHeader: {
    marginBottom: '1.5rem',
  },
  radarSvg: {
    background: 'rgba(255, 255, 255, 0.4)',
    borderRadius: '50%',
    boxShadow: '0 8px 32px rgba(0,0,0,0.02)',
    border: '1px solid var(--glass-border)',
  },
  radarMonthLabel: {
    fontSize: '0.68rem',
    fontWeight: 'bold',
    fill: 'var(--text-muted)',
  },
  radarTooltip: {
    position: 'absolute',
    width: '180px',
    padding: '0.6rem 0.8rem',
    zIndex: 50,
    textAlign: 'left',
    boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
  },
  radarTooltipEmp: {
    fontSize: '0.62rem',
    fontWeight: '800',
    textTransform: 'uppercase',
    color: 'var(--text-light)',
  },
  radarTooltipTitle: {
    fontSize: '0.8rem',
    margin: '2px 0 4px 0',
    fontWeight: '600',
    color: 'var(--text-main)',
  },
  radarTooltipDate: {
    fontSize: '0.68rem',
    color: 'var(--primary)',
  },
  radarLegend: {
    display: 'flex',
    gap: '1.5rem',
    flexWrap: 'wrap',
    marginTop: '1.5rem',
    justifyContent: 'center',
  },
  radarLegendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '0.75rem',
  },
  radarLegendOrb: {
    fontSize: '0.6rem',
    padding: '0.1rem 0.3rem',
    borderRadius: '4px',
    color: 'var(--text-muted)',
  },

  gridContainer: {
    padding: '1.5rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
    flex: 1,
    minHeight: 0,
    overflow: 'hidden',
  },
  gridFilterBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '1rem',
    flexWrap: 'wrap',
  },
  gridFiltersRight: {
    display: 'flex',
    gap: '0.75rem',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  gridTableWrapper: {
    overflowX: 'auto',
    overflowY: 'auto',
    borderRadius: '16px',
    border: '1px solid var(--glass-border)',
    background: 'rgba(255, 255, 255, 0.15)',
    boxShadow: 'var(--shadow-md)',
    flex: 1,
    minHeight: 0,
  },
  gridTable: {
    width: '100%',
    borderCollapse: 'separate',
    borderSpacing: '0',
    textAlign: 'left',
  },
  gridTableHeaderRow: {
    background: 'rgba(255, 255, 255, 0.45)',
  },
  gridTh: {
    padding: '1rem',
    fontSize: '0.85rem',
    fontWeight: '700',
    color: 'var(--text-main)',
    borderBottom: '2px solid var(--glass-border)',
    fontFamily: 'var(--font-heading)',
  },
  gridThMonth: {
    padding: '1rem',
    fontSize: '0.85rem',
    fontWeight: '700',
    color: 'var(--text-main)',
    textAlign: 'center',
    borderBottom: '2px solid var(--glass-border)',
    borderLeft: '1px solid var(--glass-border)',
    fontFamily: 'var(--font-heading)',
    background: 'rgba(37, 99, 235, 0.04)',
    minWidth: '220px',
  },
  gridTableRow: {
    transition: 'background 0.2s',
  },
  gridTdIndex: {
    padding: '1rem 0.5rem',
    fontSize: '0.8rem',
    fontWeight: '600',
    color: 'var(--text-light)',
    textAlign: 'center',
    borderBottom: '1px solid rgba(0,0,0,0.05)',
  },
  gridTdClient: {
    padding: '1rem',
    fontSize: '0.85rem',
    color: 'var(--text-main)',
    borderBottom: '1px solid rgba(0,0,0,0.05)',
    borderRight: '1px solid var(--glass-border)',
    verticalAlign: 'middle',
    background: 'rgba(255, 255, 255, 0.12)',
  },
  gridTdCell: {
    padding: '0.75rem',
    borderBottom: '1px solid rgba(0,0,0,0.05)',
    borderLeft: '1px solid var(--glass-border)',
    verticalAlign: 'middle',
    background: 'rgba(255, 255, 255, 0.03)',
  },
  gridEmptyCell: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'var(--text-light)',
    fontSize: '0.9rem',
    opacity: 0.25,
  },
  gridTaskCard: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
    padding: '0.75rem',
    borderRadius: '12px',
    background: 'rgba(255, 255, 255, 0.65)',
    border: '1px solid var(--glass-border)',
    boxShadow: 'var(--shadow-sm)',
    position: 'relative',
    cursor: 'pointer',
    transition: 'all 0.25s ease',
    minHeight: '76px',
  },
  gridTaskCardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '0.5rem',
  },
  gridTaskCardTitle: {
    fontSize: '0.825rem',
    fontWeight: '700',
    color: 'var(--text-main)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    lineHeight: '1.25',
  },
  gridStatusDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    flexShrink: 0,
    marginTop: '4px',
  },
  gridTaskCardBody: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: 'auto',
    gap: '0.5rem',
  },
  gridTaskCardClass: {
    fontSize: '0.7rem',
    fontWeight: '600',
    color: 'var(--text-light)',
    textTransform: 'uppercase',
    maxWidth: '120px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  gridTaskCardVal: {
    fontSize: '0.8rem',
    fontWeight: '700',
    color: 'var(--primary)',
  },
  gridTaskCardActions: {
    position: 'absolute',
    bottom: '6px',
    right: '6px',
    display: 'flex',
    gap: '4px',
  },
  gridActionBtn: {
    border: 'none',
    background: 'rgba(16, 185, 129, 0.15)',
    borderRadius: '50%',
    width: '22px',
    height: '22px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'all 0.2s',
    outline: 'none',
  },
  gridTotalRow: {
    background: 'rgba(245, 158, 11, 0.08)',
    borderTop: '2px solid rgba(245, 158, 11, 0.25)',
    borderBottom: '2px solid rgba(245, 158, 11, 0.25)',
  },
  gridTotalLabel: {
    padding: '1.25rem 1rem',
    fontSize: '0.9rem',
    fontWeight: '800',
    color: '#b45309',
    textAlign: 'right',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    fontFamily: 'var(--font-heading)',
  },
  gridTotalVal: {
    padding: '1.25rem 1rem',
    fontSize: '0.9rem',
    fontWeight: '800',
    color: '#b45309',
    textAlign: 'center',
    borderLeft: '1px solid rgba(245, 158, 11, 0.15)',
    fontFamily: 'var(--font-heading)',
  },
  tdEmpty: {
    padding: '2rem',
    textAlign: 'center',
    color: 'var(--text-light)',
    fontStyle: 'italic',
  },

  // Loader / Auxiliar
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

  // STYLES: Mobile Vertical Timeline
  verticalTimelineContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
    padding: '0.25rem',
  },
  mobileMonthSelectorContainer: {
    width: '100%',
    overflow: 'hidden',
    marginBottom: '0.5rem',
    borderBottom: '1px solid var(--glass-border)',
    paddingBottom: '0.75rem',
  },
  mobileMonthSelectorScroll: {
    display: 'flex',
    gap: '0.5rem',
    overflowX: 'auto',
    scrollbarWidth: 'none',
    msOverflowStyle: 'none',
    padding: '2px 0',
    WebkitOverflowScrolling: 'touch',
  },
  mobileMonthTab: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '0.5rem 1rem',
    borderRadius: '20px',
    border: '1px solid var(--glass-border)',
    background: 'rgba(255, 255, 255, 0.4)',
    color: 'var(--text-main)',
    fontSize: '0.8rem',
    fontWeight: '600',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    transition: 'all 0.2s',
  },
  mobileMonthTabActive: {
    background: 'var(--primary)',
    color: '#ffffff',
    border: '1px solid var(--primary)',
    boxShadow: '0 4px 12px rgba(37, 99, 235, 0.2)',
  },
  mobileMonthTabLabel: {
    textTransform: 'capitalize',
  },
  mobileMonthDot: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
  },
  emptyTasksMobile: {
    padding: '2.5rem 1rem',
    textAlign: 'center',
    color: 'var(--text-light)',
    fontStyle: 'italic',
    fontSize: '0.85rem',
  },
  verticalTasksList: {
    display: 'flex',
    flexDirection: 'column',
    position: 'relative',
  },
  verticalTaskRow: {
    display: 'flex',
    gap: '1rem',
    position: 'relative',
  },
  verticalTimelineAxis: {
    width: '16px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    position: 'relative',
  },
  verticalTimelineDot: {
    width: '12px',
    height: '12px',
    borderRadius: '50%',
    zIndex: 2,
    marginTop: '1rem',
  },
  verticalTimelineLine: {
    width: '2px',
    background: 'var(--glass-border)',
    position: 'absolute',
    top: '1rem',
    bottom: '-1rem',
    left: '7px',
    zIndex: 1,
  },
  verticalTaskCard: {
    flex: 1,
    background: 'rgba(255, 255, 255, 0.65)',
    border: '1px solid var(--glass-border)',
    borderLeftWidth: '4px',
    borderRadius: '12px',
    padding: '1rem',
    marginBottom: '1rem',
    cursor: 'pointer',
    textAlign: 'left',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
    boxShadow: '0 4px 12px rgba(0,0,0,0.02)',
    transition: 'all 0.2s',
  },
  verticalCardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  verticalCardCompany: {
    fontSize: '0.75rem',
    fontWeight: '600',
    color: 'var(--text-light)',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    maxWidth: '120px',
  },
  verticalCardTitle: {
    fontSize: '0.875rem',
    fontWeight: '600',
    color: 'var(--text-main)',
    margin: 0,
  },
  verticalCardExpandedContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    padding: '0.5rem',
    background: 'rgba(0, 0, 0, 0.02)',
    borderRadius: '8px',
    marginTop: '0.25rem',
  },
  verticalCardFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: '0.25rem',
  },
  verticalCardVal: {
    fontSize: '0.75rem',
    fontWeight: '700',
    color: 'var(--text-main)',
  },
  verticalCardExpandBtn: {
    border: 'none',
    background: 'transparent',
    color: 'var(--primary)',
    fontSize: '0.725rem',
    fontWeight: '600',
    cursor: 'pointer',
    padding: 0,
  },
  verticalCardDetailsBtn: {
    border: 'none',
    background: 'transparent',
    color: 'var(--text-light)',
    fontSize: '0.725rem',
    fontWeight: '600',
    cursor: 'pointer',
    padding: 0,
    display: 'flex',
    alignItems: 'center',
  },
  rulerWeekMark: {
    position: 'absolute',
    top: '50%',
    transform: 'translateY(-50%)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
  },
  weekLabel: {
    fontSize: '0.78rem',
    fontWeight: '700',
    color: 'var(--primary)',
  },
  weekRange: {
    fontSize: '0.62rem',
    color: 'var(--text-light)',
    marginTop: '2px',
  },
  rulerBackBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(37, 99, 235, 0.08)',
    border: '1px solid rgba(37, 99, 235, 0.2)',
    borderRadius: '8px',
    color: 'var(--primary)',
    padding: '0.3rem 0.6rem',
    fontSize: '0.75rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    width: '100%',
    textAlign: 'center',
  },
  backToAnnualBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(37, 99, 235, 0.08)',
    border: '1px solid rgba(37, 99, 235, 0.2)',
    borderRadius: '8px',
    color: 'var(--primary)',
    padding: '0.4rem 0.8rem',
    fontSize: '0.8rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  paginationContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '1rem',
    marginTop: '1.5rem',
    width: '100%',
  },
  pageBtn: {
    padding: '0.4rem 0.8rem',
    fontSize: '0.85rem',
    fontWeight: '600',
    borderRadius: '8px',
  },
  pageIndicator: {
    fontSize: '0.85rem',
    color: 'var(--text-muted)',
    fontWeight: '550',
  },
  tasksLoadingIndicator: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    background: 'rgba(255, 255, 255, 0.75)',
    backdropFilter: 'blur(8px)',
    border: '1px solid var(--glass-border)',
    borderRadius: '20px',
    padding: '0.4rem 0.8rem',
    fontSize: '0.8rem',
    fontWeight: '600',
    color: 'var(--primary)',
    position: 'absolute',
    top: '1.5rem',
    right: '1.5rem',
    boxShadow: 'var(--shadow-sm)',
    zIndex: 1000,
  },
  microSpinner: {
    width: '12px',
    height: '12px',
    border: '2px solid rgba(37, 99, 235, 0.1)',
    borderTopColor: 'var(--primary)',
    borderRadius: '50%',
  },
  loadMoreBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '42px',
    background: 'rgba(255, 255, 255, 0.4)',
    borderBottom: '1px dashed var(--glass-border)',
    borderTop: '1px dashed var(--glass-border)',
    fontSize: '0.8rem',
    fontWeight: '600',
    color: 'var(--primary)',
    cursor: 'pointer',
    transition: 'all 0.2s',
    userSelect: 'none',
    textAlign: 'center',
    width: '100%',
    margin: '10px 0',
    borderRadius: '10px',
  },
  emptyTrackLoadButton: {
    position: 'absolute',
    left: '10%',
    right: '10%',
    top: '30px',
    bottom: '30px',
    background: 'rgba(255, 255, 255, 0.45)',
    backdropFilter: 'blur(4px)',
    border: '1px dashed var(--glass-border)',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'all 0.2s',
    zIndex: 10,
    boxShadow: 'var(--shadow-sm)',
  },
  emptyTrackText: {
    fontSize: '0.8rem',
    fontWeight: '600',
    color: 'var(--primary)',
    textAlign: 'center',
  },
};
