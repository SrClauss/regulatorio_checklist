import { useState, useEffect, useMemo } from 'react';
import { api } from '../api';
import { 
  TrendingUp, 
  DollarSign, 
  Bell,
  CalendarDays,
  Award,
  CheckSquare,
  CheckCircle2,
  AlertTriangle,
  Info,
  Clock,
  ArrowRight,
  TrendingDown,
  Percent,
  Briefcase
} from 'lucide-react';

const pieColors = [
  'var(--primary, #2563eb)',
  '#8b5cf6',
  '#ec4899',
  '#f59e0b',
  '#10b981',
  '#6b7280'
];

function getSlicePath(startPercent, endPercent) {
  const getCoordinates = (percent) => {
    const angle = (percent - 0.25) * 2 * Math.PI;
    const x = 50 + 40 * Math.cos(angle);
    const y = 50 + 40 * Math.sin(angle);
    return { x, y };
  };

  const start = getCoordinates(startPercent);
  const end = getCoordinates(endPercent);
  const largeArcFlag = endPercent - startPercent > 0.5 ? 1 : 0;

  return [
    `M 50 50`,
    `L ${start.x} ${start.y}`,
    `A 40 40 0 ${largeArcFlag} 1 ${end.x} ${end.y}`,
    `Z`
  ].join(' ');
}

export default function Dashboard({ user, onNavigateTab }) {
  const [allTasks, setAllTasks] = useState([]);
  const [csList, setCsList] = useState([]);
  const [documentos, setDocumentos] = useState([]);
  const [empresas, setEmpresas] = useState([]);
  const [faturamentoMensal, setFaturamentoMensal] = useState({ faturamento_condicionantes: 0, faturamento_renovacoes: 0, faturamento_total: 0 });
  const [anualData, setAnualData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('mensal'); // 'mensal', 'bimestral', 'trimestral'
  const [showNotifications, setShowNotifications] = useState(false);
  const [alertasVistos, setAlertasVistos] = useState([]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const now = new Date();
        const mes = now.getMonth() + 1;
        const ano = now.getFullYear();

        // Janela de 90 dias (Mês atual + próximos 2 meses)
        const startOfRange = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        const endOfRange = new Date(now.getFullYear(), now.getMonth() + 3, 0, 23, 59, 59).toISOString();

        // Carrega dados agregados em paralelo
        const [prevMensal, prevAnual, prListRes, docListRes, empListRes, tarefasAtrasadas, tarefasPeriodo, vistosRes] = await Promise.all([
          (user.role === 'admin' || user.role === 'consultor') 
            ? api.getPrevisibilidadeMensal(mes, ano) 
            : Promise.resolve({ faturamento_total: 0, faturamento_renovacoes: 0, faturamento_condicionantes: 0 }),
          (user.role === 'admin' || user.role === 'consultor') 
            ? api.getPrevisibilidadeAnual(ano) 
            : Promise.resolve({ consolidado_mensal: [] }),
          api.listPrestadores(),
          api.listDocumentos(),
          api.listEmpresas(),
          api.listTarefas({ status: 'Atrasado' }),
          api.listTarefas({ data_inicio: startOfRange, data_fim: endOfRange }),
          api.getAlertasVistos()
        ]);

        if (user.role === 'admin' || user.role === 'consultor') {
          setFaturamentoMensal(prevMensal);
          setAnualData(prevAnual.consolidado_mensal || []);
        }

        setCsList(prListRes.map(p => ({ _id: p._id, nome: p.nome, prestador_id: p._id })));
        setDocumentos(docListRes);
        setEmpresas(empListRes);
        setAlertasVistos(vistosRes || []);

        // Mesclar tarefas do período e as atrasadas
        const mergedTasksMap = {};
        tarefasPeriodo.forEach(t => { mergedTasksMap[t._id] = { ...t, classe_servico_id: t.prestador_id }; });
        tarefasAtrasadas.forEach(t => { mergedTasksMap[t._id] = { ...t, classe_servico_id: t.prestador_id }; });
        setAllTasks(Object.values(mergedTasksMap));

      } catch (error) {
        console.error("Erro ao carregar dados do dashboard enriquecido:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [user]);

  // Fecha dropdown de notificações ao clicar fora
  useEffect(() => {
    if (!showNotifications) return;
    const handleClose = () => setShowNotifications(false);
    document.addEventListener('click', handleClose);
    return () => document.removeEventListener('click', handleClose);
  }, [showNotifications]);

  // Auxiliares de Formatação e Prazos
  const formatCurrency = (val) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
  };

  const getMonthName = (mIndex) => {
    const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    return meses[mIndex - 1] || mIndex;
  };

  const isTaskOverdue = (t) => {
    if (t.status === 'Concluído') return false;
    return new Date(t.data_vencimento) < new Date();
  };

  const getEmpresaNome = (id) => {
    const found = empresas.find(e => e._id === id);
    return found ? found.nome_fantasia : 'Empresa';
  };

  // Retorna as tarefas filtradas para um determinado período (mensal, bimestral ou trimestral)
  const getTasksForPeriod = useMemo(() => {
    return (period) => {
      const now = new Date();
      const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      let limitDate;
      if (period === 'mensal') {
        limitDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
      } else if (period === 'bimestral') {
        limitDate = new Date(now.getFullYear(), now.getMonth() + 2, 0, 23, 59, 59);
      } else {
        limitDate = new Date(now.getFullYear(), now.getMonth() + 3, 0, 23, 59, 59);
      }

      return allTasks.filter(t => {
        const dVenc = new Date(t.data_vencimento);
        if (t.status === 'Concluído') {
          return dVenc >= startOfCurrentMonth && dVenc <= limitDate;
        }
        return dVenc <= limitDate;
      });
    };
  }, [allTasks]);

  // Tarefas do período selecionado atualmente
  const activeTasks = useMemo(() => {
    return getTasksForPeriod(selectedPeriod);
  }, [selectedPeriod, getTasksForPeriod]);

  // Métricas Consolidadas do Período Ativo
  const periodMetrics = useMemo(() => {
    const total = activeTasks.length;
    const concluidas = activeTasks.filter(t => t.status === 'Concluído').length;
    const emProcesso = activeTasks.filter(t => t.status === 'Em Andamento' || t.status === 'Aguardando Auditoria').length;
    const pendentes = activeTasks.filter(t => t.status === 'Pendente' && !isTaskOverdue(t)).length;
    const atrasadas = activeTasks.filter(isTaskOverdue).length;

    const complianceRate = total > 0 ? Math.round((concluidas / total) * 100) : 100;

    // Métricas Financeiras
    const receitaTotal = activeTasks.reduce((acc, t) => acc + (t.valor_estimado || 0), 0);
    const custoTotal = activeTasks.reduce((acc, t) => acc + (t.custo_projetado || 0), 0);
    const margemTotal = receitaTotal - custoTotal;

    return {
      total,
      concluidas,
      emProcesso,
      pendentes,
      atrasadas,
      complianceRate,
      receitaTotal,
      custoTotal,
      margemTotal
    };
  }, [activeTasks]);

  // Agrupamento por Classes de Condicionantes (Serviços)
  const groupedClasses = useMemo(() => {
    const groups = {};
    
    // Inicializa todas as classes conhecidas
    csList.forEach(cs => {
      groups[cs._id] = {
        id: cs._id,
        nome: cs.nome,
        concluidas: 0,
        emProcesso: 0,
        pendentes: 0,
        atrasadas: 0,
        total: 0
      };
    });

    // Inicializa Sem Classe
    groups['sem_classe'] = {
      id: 'sem_classe',
      nome: 'Sem Classe / Outros',
      concluidas: 0,
      emProcesso: 0,
      pendentes: 0,
      atrasadas: 0,
      total: 0
    };

    activeTasks.forEach(t => {
      const classId = t.classe_servico_id || 'sem_classe';
      if (!groups[classId]) {
        groups[classId] = {
          id: classId,
          nome: classId === 'sem_classe' ? 'Sem Classe / Outros' : 'Outros',
          concluidas: 0,
          emProcesso: 0,
          pendentes: 0,
          atrasadas: 0,
          total: 0
        };
      }
      
      groups[classId].total += 1;
      if (t.status === 'Concluído') {
        groups[classId].concluidas += 1;
      } else if (t.status === 'Em Andamento' || t.status === 'Aguardando Auditoria') {
        groups[classId].emProcesso += 1;
      } else if (isTaskOverdue(t)) {
        groups[classId].atrasadas += 1;
      } else {
        groups[classId].pendentes += 1;
      }
    });

    // Remove sem_classe apenas se estiver vazio
    return Object.values(groups)
      .filter(g => g.total > 0 || g.id !== 'sem_classe')
      .sort((a, b) => {
        // Classes com mais pendências e atrasos no topo
        const pendenciasA = a.atrasadas + a.emProcesso + a.pendentes;
        const pendenciasB = b.atrasadas + b.emProcesso + b.pendentes;
        if (pendenciasB !== pendenciasA) return pendenciasB - pendenciasA;
        return b.total - a.total;
      });
  }, [activeTasks, csList]);

  // Principais Condicionantes para Gráfico de Pizza
  const topCondicionantesPieData = useMemo(() => {
    const counts = {};
    activeTasks.forEach(t => {
      const title = t.titulo || 'Outros';
      counts[title] = (counts[title] || 0) + 1;
    });

    const sorted = Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    const top5 = sorted.slice(0, 5);
    const othersValue = sorted.slice(5).reduce((acc, curr) => acc + curr.value, 0);
    
    if (othersValue > 0) {
      top5.push({ name: 'Outras', value: othersValue });
    }

    const total = top5.reduce((acc, curr) => acc + curr.value, 0);
    
    let accumulatedPercent = 0;
    const slices = top5.map((item, index) => {
      const percent = total > 0 ? (item.value / total) : 0;
      const startPercent = accumulatedPercent;
      accumulatedPercent += percent;
      const endPercent = accumulatedPercent;
      
      return {
        ...item,
        percent,
        startPercent,
        endPercent,
        index
      };
    });

    return { slices, total };
  }, [activeTasks]);

  // Alertas Inteligentes do Período com IDs Únicos para marcação de Vistos
  const systemAlerts = useMemo(() => {
    const alerts = [];
    const now = new Date();

    // 1. Condicionantes Atrasadas (Crítico)
    if (periodMetrics.atrasadas > 0) {
      alerts.push({
        id: `tarefas-atrasadas-${selectedPeriod}`,
        type: 'danger',
        message: `${periodMetrics.atrasadas} condicionante${periodMetrics.atrasadas > 1 ? 's estão' : ' está'} em ATRASO!`,
        details: 'Ações imediatas de regularização são necessárias para evitar penalidades.',
        icon: <AlertTriangle size={18} color="var(--danger)" />
      });
    }

    // 2. Licenças Vencidas (Crítico)
    const expiredDocs = documentos.filter(doc => doc.status === 'Vencido');
    expiredDocs.forEach(doc => {
      alerts.push({
        id: `doc-vencido-${doc._id}`,
        type: 'danger',
        message: `Licença "${doc.tipo}" está VENCIDA!`,
        details: `Processo: ${doc.numero_processo || 'N/A'}. Renovação urgente requerida.`,
        icon: <AlertTriangle size={18} color="var(--danger)" />
      });
    });

    // 3. Licenças a Vencer em 30 dias (Crítico)
    const expiringDocs = documentos.filter(doc => {
      if (doc.status === 'Vencido') return false;
      const dVenc = new Date(doc.data_vencimento);
      const diffTime = dVenc - now;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays > 0 && diffDays <= 30;
    });
    expiringDocs.forEach(doc => {
      const dVenc = new Date(doc.data_vencimento);
      const diffDays = Math.ceil((dVenc - now) / (1000 * 60 * 60 * 24));
      alerts.push({
        id: `doc-expirando-${doc._id}`,
        type: 'danger',
        message: `Licença "${doc.tipo}" vence em ${diffDays} dias!`,
        details: `Processo: ${doc.numero_processo || 'N/A'}. Regularização pendente.`,
        icon: <Clock size={18} color="var(--danger)" />
      });
    });

    // 4. Receita Estimada em Risco (Aviso)
    const revenueInRisk = activeTasks.filter(isTaskOverdue).reduce((acc, t) => acc + (t.valor_estimado || 0), 0);
    if (revenueInRisk > 0 && (user.role === 'admin' || user.role === 'consultor')) {
      alerts.push({
        id: `receita-risco-${selectedPeriod}`,
        type: 'warning',
        message: `Faturamento em Risco: ${formatCurrency(revenueInRisk)}`,
        details: 'Receitas retidas devido ao atraso na entrega das condicionantes.',
        icon: <TrendingDown size={18} color="var(--warning)" />
      });
    }

    // 5. Próximos Vencimentos (Aviso)
    const upcomingTasks = activeTasks.filter(t => {
      if (t.status === 'Concluído') return false;
      const dVenc = new Date(t.data_vencimento);
      const diffDays = Math.ceil((dVenc - now) / (1000 * 60 * 60 * 24));
      return diffDays >= 0 && diffDays <= 7;
    });
    if (upcomingTasks.length > 0) {
      alerts.push({
        id: `tarefas-vencimento-7dias-${selectedPeriod}`,
        type: 'warning',
        message: `${upcomingTasks.length} condicionante${upcomingTasks.length > 1 ? 's vencem' : ' vence'} nos próximos 7 dias.`,
        details: 'Acompanhe de perto a execução para garantir a entrega no prazo.',
        icon: <Clock size={18} color="var(--warning)" />
      });
    }

    // 6. Alerta de baixo compliance rate (Aviso)
    if (periodMetrics.complianceRate < 80) {
      alerts.push({
        id: `baixo-compliance-${selectedPeriod}`,
        type: 'warning',
        message: `Taxa de conformidade do período baixa (${periodMetrics.complianceRate}%)`,
        details: 'Meta mínima operacional recomendada: 80%.',
        icon: <Percent size={18} color="var(--warning)" />
      });
    }

    // 7. Informações de Tarefas Pendentes normais (Info)
    const normalPending = activeTasks.filter(t => t.status === 'Pendente' && !isTaskOverdue(t)).length;
    if (normalPending > 0) {
      alerts.push({
        id: `tarefas-pendentes-inicio-${selectedPeriod}`,
        type: 'info',
        message: `${normalPending} condicionante${normalPending > 1 ? 's agendadas' : ' agendada'} aguardando início.`,
        details: 'Consulte o cronograma de atividades para iniciar a execução.',
        icon: <Info size={18} color="var(--primary)" />
      });
    }

    return alerts;
  }, [activeTasks, periodMetrics, documentos, user.role, selectedPeriod]);

  // Filtra alertas que ainda não foram marcados como vistos pelo usuário
  const unseenAlertsCount = useMemo(() => {
    return systemAlerts.filter(alert => !alertasVistos.includes(alert.id)).length;
  }, [systemAlerts, alertasVistos]);

  // Ações Recomendadas (Top 5 tarefas mais urgentes)
  const urgentActions = useMemo(() => {
    return activeTasks
      .filter(t => t.status !== 'Concluído')
      .sort((a, b) => new Date(a.data_vencimento) - new Date(b.data_vencimento))
      .slice(0, 5);
  }, [activeTasks]);

  // Dados comparativos das barras horizontais dos períodos
  const comparativePeriods = useMemo(() => {
    return ['mensal', 'bimestral', 'trimestral'].map(p => {
      const tasks = getTasksForPeriod(p);
      const total = tasks.length;
      const concl = tasks.filter(t => t.status === 'Concluído').length;
      const proc = tasks.filter(t => t.status === 'Em Andamento' || t.status === 'Aguardando Auditoria').length;
      const pend = tasks.filter(t => t.status === 'Pendente' && !isTaskOverdue(t)).length;
      const atras = tasks.filter(isTaskOverdue).length;
      return {
        key: p,
        label: p === 'mensal' ? 'Mensal (Mês Atual)' : p === 'bimestral' ? 'Bimestral (60 dias)' : 'Trimestral (90 dias)',
        total,
        concl,
        proc,
        pend,
        atras
      };
    });
  }, [getTasksForPeriod]);

  // Handler de conclusão rápida de tarefas
  const handleConcludeTask = async (taskId) => {
    try {
      await api.updateTarefa(taskId, { status: 'Concluído' });
      setAllTasks(prev => prev.map(t => 
        t._id === taskId 
          ? { ...t, status: 'Concluído', data_conclusao: new Date().toISOString() } 
          : t
      ));
    } catch (error) {
      console.error("Erro ao concluir tarefa:", error);
      alert("Não foi possível concluir a condicionante.");
    }
  };

  // Handler para marcar/desmarcar alerta como visto com persistência
  const handleToggleAlertaVisto = async (alertId) => {
    const isCurrentlyVisto = alertasVistos.includes(alertId);
    const newVisto = !isCurrentlyVisto;

    // Atualiza otimisticamente
    if (newVisto) {
      setAlertasVistos(prev => [...prev, alertId]);
    } else {
      setAlertasVistos(prev => prev.filter(id => id !== alertId));
    }

    try {
      await api.marcarAlertaVisto(alertId, newVisto);
    } catch (error) {
      console.error("Erro ao alternar status de visto no banco de dados:", error);
      // Reverte em caso de falha
      if (newVisto) {
        setAlertasVistos(prev => prev.filter(id => id !== alertId));
      } else {
        setAlertasVistos(prev => [...prev, alertId]);
      }
    }
  };

  const maxRevenue = Math.max(
    ...anualData.map(m => Math.max(m.faturamento_condicionantes || 0, m.faturamento_renovacoes || 0)),
    1000
  );

  if (loading) {
    return (
      <div style={styles.loaderContainer}>
        <div className="animate-spin" style={styles.spinner}></div>
        <p style={{ marginTop: '1rem', color: 'var(--text-muted)' }}>Carregando painel analítico...</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in" style={styles.container}>
      {/* Header */}
      <header style={styles.header}>
        <div>
          <h1 style={styles.title}>Olá, {user.nome}!</h1>
          <p style={styles.subtitle}>Sua visão panorâmica de faturamento, prazos regulatórios e compliance.</p>
        </div>
        <div style={styles.topRightControls}>
          {/* Seletor de Período Global */}
          <div style={styles.periodSelector}>
            {['mensal', 'bimestral', 'trimestral'].map(p => (
              <button
                key={p}
                onClick={() => setSelectedPeriod(p)}
                style={{
                  ...styles.periodButton,
                  ...(selectedPeriod === p ? styles.periodButtonActive : {})
                }}
              >
                {p === 'mensal' ? 'Mensal' : p === 'bimestral' ? 'Bimestral' : 'Trimestral'}
              </button>
            ))}
          </div>

          {/* Sininho com Dropdown de Notificações */}
          <div 
            style={styles.iconButton} 
            title="Notificações"
            onClick={(e) => {
              e.stopPropagation();
              setShowNotifications(!showNotifications);
            }}
          >
            <Bell size={22} color="var(--text-main)" />
            {unseenAlertsCount > 0 && (
              <span style={styles.notificationBadge}>
                {unseenAlertsCount}
              </span>
            )}

            {showNotifications && (
              <div 
                style={styles.notificationsDropdown} 
                onClick={(e) => e.stopPropagation()}
              >
                <div style={styles.dropdownHeader}>
                  <h4 style={styles.dropdownTitle}>Alertas Regulatórios</h4>
                  <span style={styles.dropdownSubtitle}>{unseenAlertsCount} não visto(s)</span>
                </div>
                <div style={styles.dropdownBody}>
                  {systemAlerts.length > 0 ? (
                    systemAlerts.map((alert) => {
                      const isVisto = alertasVistos.includes(alert.id);
                      return (
                        <div 
                          key={alert.id} 
                          style={{
                            ...styles.dropdownAlertCard,
                            borderLeftColor: isVisto ? 'rgba(100, 116, 139, 0.4)' : (alert.type === 'danger' ? 'var(--danger)' : alert.type === 'warning' ? 'var(--warning)' : 'var(--primary)'),
                            background: isVisto ? 'rgba(241, 245, 249, 0.5)' : (alert.type === 'danger' ? 'var(--danger-light)' : alert.type === 'warning' ? 'var(--warning-light)' : 'var(--primary-light)'),
                            opacity: isVisto ? 0.65 : 1,
                            display: 'flex',
                            gap: '0.5rem',
                            alignItems: 'flex-start',
                            transition: 'all 0.2s ease',
                          }}
                        >
                          <input 
                            type="checkbox"
                            checked={isVisto}
                            onChange={() => handleToggleAlertaVisto(alert.id)}
                            style={styles.alertCheckbox}
                            title={isVisto ? "Marcar como não visto" : "Marcar como visto"}
                            onClick={(e) => e.stopPropagation()}
                          />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={styles.alertHeader}>
                              {alert.icon}
                              <span style={{ 
                                ...styles.alertTitle, 
                                color: isVisto ? 'var(--text-muted)' : (alert.type === 'danger' ? 'var(--danger)' : alert.type === 'warning' ? '#854d0e' : 'var(--primary)'),
                                fontSize: '0.82rem',
                                textDecoration: isVisto ? 'line-through' : 'none'
                              }}>
                                {alert.message}
                              </span>
                            </div>
                            <p style={{ ...styles.alertDetails, fontSize: '0.74rem', marginTop: '0.15rem' }}>{alert.details}</p>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div style={styles.emptyDropdown}>
                      <CheckCircle2 size={24} color="var(--success)" />
                      <p style={{ marginTop: '0.5rem', fontWeight: '600', fontSize: '0.85rem' }}>Nenhum alerta!</p>
                      <p style={{ color: 'var(--text-light)', fontSize: '0.75rem', textAlign: 'center' }}>Tudo sob controle para este período.</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div 
            style={styles.iconButton} 
            title="Ver Calendário Completo"
            onClick={() => onNavigateTab && onNavigateTab('calendario')}
          >
            <CalendarDays size={22} color="var(--text-main)" />
          </div>
        </div>
      </header>

      {/* Grid de Informações Ricas (4 Cards) */}
      <section style={styles.cardGrid}>
        {(user.role === 'admin' || user.role === 'consultor') ? (
          <>
            <div className="glass-card" style={styles.card}>
              <div style={{ ...styles.cardIconBg, background: 'var(--primary-light)' }}>
                <DollarSign size={24} color="var(--primary)" />
              </div>
              <div style={styles.cardContent}>
                <span style={styles.cardLabel}>Receita Estimada ({selectedPeriod})</span>
                <h2 style={styles.cardVal}>{formatCurrency(periodMetrics.receitaTotal)}</h2>
                <div style={styles.cardDetails}>
                  <span style={{ color: 'var(--text-light)', fontSize: '0.78rem' }}>
                    Renovações no mês: {formatCurrency(faturamentoMensal.faturamento_renovacoes || 0)}
                  </span>
                </div>
              </div>
            </div>

            <div className="glass-card" style={styles.card}>
              <div style={{ ...styles.cardIconBg, background: 'var(--success-light)' }}>
                <TrendingUp size={24} color="var(--success)" />
              </div>
              <div style={styles.cardContent}>
                <span style={styles.cardLabel}>Margem Projetada ({selectedPeriod})</span>
                <h2 style={styles.cardVal}>{formatCurrency(periodMetrics.margemTotal)}</h2>
                <div style={styles.cardDetails}>
                  <span style={{ color: 'var(--text-light)', fontSize: '0.78rem' }}>
                    Custo: {formatCurrency(periodMetrics.custoTotal)}
                  </span>
                </div>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="glass-card" style={styles.card}>
              <div style={{ ...styles.cardIconBg, background: 'var(--primary-light)' }}>
                <Briefcase size={24} color="var(--primary)" />
              </div>
              <div style={styles.cardContent}>
                <span style={styles.cardLabel}>Licenças Monitoradas</span>
                <h2 style={styles.cardVal}>{documentos.length}</h2>
                <div style={styles.cardDetails}>
                  <span style={{ color: 'var(--text-light)', fontSize: '0.78rem' }}>
                    Licenças ativas com condicionantes.
                  </span>
                </div>
              </div>
            </div>

            <div className="glass-card" style={styles.card}>
              <div style={{ ...styles.cardIconBg, background: 'rgba(59, 130, 246, 0.1)' }}>
                <CheckCircle2 size={24} color="#3b82f6" />
              </div>
              <div style={styles.cardContent}>
                <span style={styles.cardLabel}>Seu Escopo de Trabalho</span>
                <h2 style={styles.cardVal}>Ativo</h2>
                <div style={styles.cardDetails}>
                  <span style={{ color: 'var(--text-light)', fontSize: '0.78rem' }}>
                    Monitoramento contínuo habilitado.
                  </span>
                </div>
              </div>
            </div>
          </>
        )}

        <div className="glass-card" style={styles.card}>
          <div style={{ ...styles.cardIconBg, background: 'rgba(234, 179, 8, 0.1)' }}>
            <CalendarDays size={24} color="#eab308" />
          </div>
          <div style={styles.cardContent}>
            <span style={styles.cardLabel}>Obrigações no Período</span>
            <h2 style={styles.cardVal}>{periodMetrics.total}</h2>
            <div style={styles.cardDetails}>
              <span style={{ color: 'var(--danger)', fontSize: '0.78rem', fontWeight: '600' }}>
                Atrasadas: {periodMetrics.atrasadas} | Em Processo: {periodMetrics.emProcesso}
              </span>
            </div>
          </div>
        </div>

        <div className="glass-card" style={styles.card}>
          <div style={{ ...styles.cardIconBg, background: periodMetrics.complianceRate >= 80 ? 'var(--success-light)' : 'var(--danger-light)' }}>
            <Percent size={24} color={periodMetrics.complianceRate >= 80 ? 'var(--success)' : 'var(--danger)'} />
          </div>
          <div style={styles.cardContent}>
            <span style={styles.cardLabel}>Compliance ({selectedPeriod})</span>
            <h2 style={styles.cardVal}>{periodMetrics.complianceRate}%</h2>
            <div style={styles.cardDetails}>
              <span style={{ color: 'var(--text-light)', fontSize: '0.78rem' }}>
                Concluídas: {periodMetrics.concluidas} de {periodMetrics.total}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* 1. SEÇÃO DE GRÁFICOS (SUPERIOR): Previsão Financeira & Comparativo de Prazos */}
      <div style={styles.dashboardBodyRow}>
        
        {/* Previsão Financeira Anual (Apenas Admins/Consultores) */}
        {(user.role === 'admin' || user.role === 'consultor') ? (
          <>
            <div style={{ ...styles.column, flex: 1.8 }}>
              <div className="glass-panel" style={{ ...styles.panel, height: '360px' }}>
                <div style={styles.panelHeader}>
                  <TrendingUp size={20} color="var(--primary)" />
                  <h3 style={styles.panelTitle}>Previsão Financeira Anual ({new Date().getFullYear()})</h3>
                </div>
                
                <div style={styles.chartArea}>
                  <div style={styles.yAxis}>
                    <span>{formatCurrency(maxRevenue)}</span>
                    <span>{formatCurrency(maxRevenue / 2)}</span>
                    <span>R$ 0,00</span>
                  </div>
                  
                  <div style={styles.chartScrollWrapper}>
                    <div style={styles.barsContainer}>
                      {anualData.map((mesData, index) => {
                        const heightPercent = Math.max(((mesData.faturamento_condicionantes || 0) / maxRevenue) * 100, 4);
                        const costHeightPercent = Math.max(((mesData.faturamento_renovacoes || 0) / maxRevenue) * 100, 4);
                        return (
                          <div key={index} style={styles.barColumn}>
                            <div style={styles.barGroup}>
                              <div 
                                style={{ ...styles.bar, height: `${heightPercent}%`, background: 'var(--primary)' }}
                                title={`Receita: ${formatCurrency(mesData.faturamento_condicionantes || 0)}`}
                              ></div>
                              <div 
                                style={{ ...styles.bar, height: `${costHeightPercent}%`, background: 'var(--danger)' }}
                                title={`Custos: ${formatCurrency(mesData.faturamento_renovacoes || 0)}`}
                              ></div>
                            </div>
                            <span style={styles.barLabel}>{getMonthName(mesData.mes)}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
                <div style={styles.chartLegend}>
                  <div style={styles.legendItem}><div style={{ ...styles.legendDot, background: 'var(--primary)' }}></div><span>Receitas Estimadas</span></div>
                  <div style={styles.legendItem}><div style={{ ...styles.legendDot, background: 'var(--danger)' }}></div><span>Custos de Renovação</span></div>
                </div>
              </div>
            </div>

            <div style={{ ...styles.column, flex: 1.2 }}>
              <div className="glass-panel" style={{ ...styles.panel, height: '360px', justifyContent: 'space-between' }}>
                <div>
                  <div style={styles.panelHeader}>
                    <CalendarDays size={20} color="var(--primary)" />
                    <h3 style={styles.panelTitle}>Visão Comparativa de Prazos</h3>
                  </div>
                  <p style={styles.panelDescription}>
                    Proporção de status de condicionantes mensais, bimestrais e trimestrais.
                  </p>
                </div>
                
                <div style={{ ...styles.comparisonList, flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '0.75rem' }}>
                  {comparativePeriods.map(period => {
                    const compliance = period.total > 0 ? Math.round((period.concl / period.total) * 100) : 100;
                    const pConcl = period.total > 0 ? (period.concl / period.total) * 100 : 0;
                    const pProc = period.total > 0 ? (period.proc / period.total) * 100 : 0;
                    const pPend = period.total > 0 ? ((period.pend + period.atras) / period.total) * 100 : 0;

                    return (
                      <div key={period.key} style={styles.comparisonItem}>
                        <div style={styles.comparisonLabelRow}>
                          <span style={styles.comparisonName}>{period.label}</span>
                          <span style={styles.comparisonDetails}>
                            Total: <strong>{period.total}</strong> | Compliance: <strong style={{ color: compliance >= 80 ? 'var(--success)' : 'var(--danger)' }}>{compliance}%</strong>
                          </span>
                        </div>
                        <div style={styles.comparisonBarOuter}>
                          {period.total > 0 ? (
                            <>
                              {pConcl > 0 && <div style={{ ...styles.comparisonBarInner, width: `${pConcl}%`, background: 'var(--success)' }} title={`Concluídas: ${Math.round(pConcl)}%`}></div>}
                              {pProc > 0 && <div style={{ ...styles.comparisonBarInner, width: `${pProc}%`, background: '#eab308' }} title={`Em Processo: ${Math.round(pProc)}%`}></div>}
                              {pPend > 0 && <div style={{ ...styles.comparisonBarInner, width: `${pPend}%`, background: 'var(--danger)' }} title={`Pendente/Atrasada: ${Math.round(pPend)}%`}></div>}
                            </>
                          ) : (
                            <div style={styles.comparisonBarEmpty}>Nenhuma obrigação</div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div style={{ ...styles.chartLegend, marginTop: '0.5rem' }}>
                  <div style={styles.legendItem}><div style={{ ...styles.legendDot, background: 'var(--success)' }}></div><span>Concluídas</span></div>
                  <div style={styles.legendItem}><div style={{ ...styles.legendDot, background: '#eab308' }}></div><span>Em Processo</span></div>
                  <div style={styles.legendItem}><div style={{ ...styles.legendDot, background: 'var(--danger)' }}></div><span>Pendentes / Atrasadas</span></div>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div style={{ ...styles.column, flex: 1 }}>
            <div className="glass-panel" style={{ ...styles.panel, height: '360px', justifyContent: 'space-between' }}>
              <div>
                <div style={styles.panelHeader}>
                  <CalendarDays size={20} color="var(--primary)" />
                  <h3 style={styles.panelTitle}>Visão Comparativa de Prazos</h3>
                </div>
                <p style={styles.panelDescription}>
                  Proporção de status de condicionantes mensais, bimestrais e trimestrais.
                </p>
              </div>
              
              <div style={{ ...styles.comparisonList, flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '0.75rem' }}>
                {comparativePeriods.map(period => {
                  const compliance = period.total > 0 ? Math.round((period.concl / period.total) * 100) : 100;
                  const pConcl = period.total > 0 ? (period.concl / period.total) * 100 : 0;
                  const pProc = period.total > 0 ? (period.proc / period.total) * 100 : 0;
                  const pPend = period.total > 0 ? ((period.pend + period.atras) / period.total) * 100 : 0;

                  return (
                    <div key={period.key} style={styles.comparisonItem}>
                      <div style={styles.comparisonLabelRow}>
                        <span style={styles.comparisonName}>{period.label}</span>
                        <span style={styles.comparisonDetails}>
                          Total: <strong>{period.total}</strong> | Compliance: <strong style={{ color: compliance >= 80 ? 'var(--success)' : 'var(--danger)' }}>{compliance}%</strong>
                        </span>
                      </div>
                      <div style={styles.comparisonBarOuter}>
                        {period.total > 0 ? (
                          <>
                            {pConcl > 0 && <div style={{ ...styles.comparisonBarInner, width: `${pConcl}%`, background: 'var(--success)' }} title={`Concluídas: ${Math.round(pConcl)}%`}></div>}
                            {pProc > 0 && <div style={{ ...styles.comparisonBarInner, width: `${pProc}%`, background: '#eab308' }} title={`Em Processo: ${Math.round(pProc)}%`}></div>}
                            {pPend > 0 && <div style={{ ...styles.comparisonBarInner, width: `${pPend}%`, background: 'var(--danger)' }} title={`Pendente/Atrasada: ${Math.round(pPend)}%`}></div>}
                          </>
                        ) : (
                          <div style={styles.comparisonBarEmpty}>Nenhuma obrigação</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div style={{ ...styles.chartLegend, marginTop: '0.5rem' }}>
                <div style={styles.legendItem}><div style={{ ...styles.legendDot, background: 'var(--success)' }}></div><span>Concluídas</span></div>
                <div style={styles.legendItem}><div style={{ ...styles.legendDot, background: '#eab308' }}></div><span>Em Processo</span></div>
                <div style={styles.legendItem}><div style={{ ...styles.legendDot, background: 'var(--danger)' }}></div><span>Pendentes / Atrasadas</span></div>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* 2. SEÇÃO DE PRINCIPAIS CONDICIONANTES (LINHA INTEIRA) */}
      <div style={{ ...styles.dashboardBodyRow, marginTop: '1.5rem' }}>
        <div style={{ ...styles.column, flex: 1 }}>
          <div className="glass-panel" style={{ ...styles.panel, height: '360px', justifyContent: 'flex-start' }}>
            <div style={styles.panelHeader}>
              <Award size={20} color="var(--primary)" />
              <h3 style={styles.panelTitle}>Principais Condicionantes</h3>
            </div>
            
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1.2fr',
              gap: '3rem',
              padding: '0.5rem 1.5rem',
              flex: 1,
              minHeight: 0,
              alignItems: 'center'
            }}>
              {topCondicionantesPieData.total > 0 ? (
                <>
                  {/* Coluna do Gráfico */}
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    minWidth: 0
                  }}>
                    <div style={{ 
                      position: 'relative', 
                      width: '260px', 
                      height: '260px', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      flexShrink: 0 
                    }}>
                      <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
                        {topCondicionantesPieData.slices.map((slice, idx) => {
                          const pathData = getSlicePath(slice.startPercent, slice.endPercent);
                          return (
                            <path
                              key={idx}
                              d={pathData}
                              fill={pieColors[idx % pieColors.length]}
                              style={{ 
                                transition: 'all 0.3s ease',
                                cursor: 'pointer'
                              }}
                              title={`${slice.name}: ${slice.value}`}
                            />
                          );
                        })}
                        <circle cx="50" cy="50" r="28" fill="var(--card-bg, #ffffff)" />
                      </svg>
                      <div style={{
                        position: 'absolute',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        pointerEvents: 'none'
                      }}>
                        <span style={{ fontSize: '2.4rem', fontWeight: '800', color: 'var(--text-main)', lineHeight: 1 }}>
                          {topCondicionantesPieData.total}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-light)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: '4px' }}>
                          Total
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Coluna da Legenda */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '0.75rem',
                    minWidth: 0,
                    alignContent: 'center'
                  }}>
                    {topCondicionantesPieData.slices.map((slice, idx) => (
                      <div key={idx} style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '0.75rem',
                        fontSize: '0.85rem',
                        padding: '0.6rem 0.8rem',
                        background: 'rgba(255, 255, 255, 0.02)',
                        borderRadius: '8px',
                        border: '1px solid rgba(255, 255, 255, 0.05)',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
                        minWidth: 0
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', minWidth: 0, flex: 1 }}>
                          <div style={{
                            width: '10px',
                            height: '10px',
                            borderRadius: '50%',
                            backgroundColor: pieColors[idx % pieColors.length],
                            flexShrink: 0
                          }}></div>
                          <span style={{
                            color: 'var(--text-main)',
                            fontWeight: '600',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                          }} title={slice.name}>
                            {slice.name}
                          </span>
                        </div>
                        <span style={{ color: 'var(--text-muted)', fontWeight: '700', flexShrink: 0, marginLeft: '0.5rem' }}>
                          {slice.value} <span style={{ fontSize: '0.72rem', fontWeight: '500', color: 'var(--text-light)' }}>({Math.round(slice.percent * 100)}%)</span>
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem', width: '100%', gridColumn: 'span 2' }}>
                  Nenhuma condicionante no período
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 3. SEÇÃO OPERACIONAL (ABAIXO DOS GRÁFICOS): Ações Críticas & Agrupamento por Classes */}
      <div style={{ ...styles.dashboardBodyRow, marginTop: '1.5rem' }}>
        
        {/* Ações Críticas (flex: 1.2) */}
        <div style={{ ...styles.column, flex: 1.2 }}>
          <div className="glass-panel" style={{ ...styles.panel, height: '440px', justifyContent: 'space-between' }}>
            <div>
              <div style={styles.panelHeader}>
                <CheckSquare size={20} color="var(--primary)" />
                <h3 style={styles.panelTitle}>Ações Críticas ("O que precisa ser feito")</h3>
              </div>
              <p style={styles.panelDescription}>
                Listagem imediata das condicionantes pendentes mais próximas do vencimento regulatório.
              </p>
            </div>

            <div style={{ ...styles.todoList, flex: 1, overflowY: 'auto', marginTop: '0.5rem' }}>
              {urgentActions.length > 0 ? (
                urgentActions.map(task => {
                  const isOverdue = isTaskOverdue(task);
                  const color = isOverdue ? 'var(--danger)' : task.status === 'Em Andamento' ? 'var(--warning)' : 'var(--primary)';
                  const dateLabel = new Date(task.data_vencimento).toLocaleDateString('pt-BR');
                  
                  return (
                    <div key={task._id} style={styles.todoItem}>
                      <div style={{ ...styles.todoStatusIndicator, background: color }}></div>
                      
                      <div style={styles.todoContent}>
                        <div style={styles.todoTitleRow}>
                          <span style={styles.todoTaskTitle} title={task.titulo}>{task.titulo}</span>
                          <span style={{ ...styles.todoDateBadge, color: isOverdue ? 'var(--danger)' : 'var(--text-muted)' }}>
                            venc. {dateLabel}
                          </span>
                        </div>
                        
                        <div style={styles.todoMetadataRow}>
                          <span>{getEmpresaNome(task.empresa_id)}</span>
                          {task.valor_estimado > 0 && (user.role === 'admin' || user.role === 'consultor') && (
                            <span style={styles.todoValue}>{formatCurrency(task.valor_estimado)}</span>
                          )}
                        </div>
                      </div>

                      <div style={styles.todoActions}>
                        <button
                          onClick={() => handleConcludeTask(task._id)}
                          style={styles.todoCheckButton}
                          title="Concluir tarefa agora"
                        >
                          <CheckCircle2 size={16} />
                        </button>
                        <button
                          onClick={() => onNavigateTab && onNavigateTab('cronograma')}
                          style={styles.todoLinkButton}
                          title="Ver no Cronograma completo"
                        >
                          <ArrowRight size={16} />
                        </button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div style={styles.emptyTodo}>
                  <CheckCircle2 size={36} color="var(--success)" />
                  <p style={{ marginTop: '0.5rem', fontWeight: '600' }}>Tudo limpo!</p>
                  <p style={{ color: 'var(--text-light)', fontSize: '0.8rem' }}>Sem pendências críticas ou de execução urgente no período.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Agrupamento por Classes de Condicionantes (flex: 1.8) */}
        <div style={{ ...styles.column, flex: 1.8 }}>
          <div className="glass-panel" style={{ ...styles.panel, height: '440px', justifyContent: 'space-between' }}>
            <div>
              <div style={styles.panelHeader}>
                <Award size={20} color="var(--primary)" />
                <h3 style={styles.panelTitle}>Agrupamento por Classes de Condicionantes</h3>
              </div>
              
              <p style={styles.panelDescription}>
                Visão consolidada de obrigações agrupadas por classe de serviço no período ({selectedPeriod}).
              </p>
            </div>

            <div style={{ ...styles.tableWrapper, flex: 1, overflowY: 'auto', marginTop: '0.5rem' }}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Classe de Serviço</th>
                    <th style={styles.th}>Concluídas</th>
                    <th style={styles.th}>Em Processo</th>
                    <th style={styles.th}>Pendentes</th>
                    <th style={styles.th}>Atrasadas</th>
                    <th style={styles.th}>Progresso / Conformidade</th>
                  </tr>
                </thead>
                <tbody>
                  {groupedClasses.length > 0 ? (
                    groupedClasses.map(group => {
                      const compliance = group.total > 0 ? Math.round((group.concluidas / group.total) * 100) : 100;
                      const pConcl = group.total > 0 ? (group.concluidas / group.total) * 100 : 0;
                      const pProc = group.total > 0 ? (group.emProcesso / group.total) * 100 : 0;
                      const pPend = group.total > 0 ? ((group.pendentes + group.atrasadas) / group.total) * 100 : 0;

                      return (
                        <tr key={group.id} style={styles.tr}>
                          <td style={{ ...styles.td, fontWeight: '600' }}>{group.nome}</td>
                          <td style={styles.td}>
                            <span style={{ ...styles.badgeMini, background: 'var(--success-light)', color: 'var(--success)' }}>
                              {group.concluidas}
                            </span>
                          </td>
                          <td style={styles.td}>
                            <span style={{ ...styles.badgeMini, background: 'rgba(234, 179, 8, 0.1)', color: '#854d0e' }}>
                              {group.emProcesso}
                            </span>
                          </td>
                          <td style={styles.td}>
                            <span style={{ ...styles.badgeMini, background: 'var(--primary-light)', color: 'var(--primary)' }}>
                              {group.pendentes}
                            </span>
                          </td>
                          <td style={styles.td}>
                            <span style={{ ...styles.badgeMini, background: 'var(--danger-light)', color: 'var(--danger)' }}>
                              {group.atrasadas}
                            </span>
                          </td>
                          <td style={styles.td}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <div style={styles.rowProgressBar}>
                                {pConcl > 0 && <div style={{ ...styles.rowProgressBarSegment, width: `${pConcl}%`, background: 'var(--success)' }}></div>}
                                {pProc > 0 && <div style={{ ...styles.rowProgressBarSegment, width: `${pProc}%`, background: '#eab308' }}></div>}
                                {pPend > 0 && <div style={{ ...styles.rowProgressBarSegment, width: `${pPend}%`, background: 'var(--danger)' }}></div>}
                              </div>
                              <span style={{ fontSize: '0.8rem', fontWeight: '700', width: '32px' }}>{compliance}%</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan="6" style={styles.emptyTable}>Nenhuma condicionante agendada ou executada no período.</td>
                    </tr>
                  )}
                </tbody>
              </table>
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
  periodSelector: {
    display: 'flex',
    background: 'rgba(255, 255, 255, 0.25)',
    border: '1px solid var(--glass-border)',
    borderRadius: '12px',
    padding: '3px',
    backdropFilter: 'var(--backdrop-blur)',
  },
  periodButton: {
    border: 'none',
    background: 'transparent',
    padding: '0.5rem 1rem',
    fontSize: '0.85rem',
    fontWeight: '600',
    color: 'var(--text-muted)',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  periodButtonActive: {
    background: '#ffffff',
    color: 'var(--primary)',
    boxShadow: 'var(--shadow-sm)',
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
    top: '-4px',
    right: '-4px',
    background: 'var(--danger)',
    color: '#ffffff',
    fontSize: '0.7rem',
    fontWeight: '700',
    borderRadius: '50%',
    width: '18px',
    height: '18px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '2px solid var(--bg-main)',
  },
  notificationsDropdown: {
    position: 'absolute',
    top: '48px',
    right: '0px',
    width: '340px',
    background: 'var(--bg-main)',
    border: '1px solid var(--glass-border)',
    borderRadius: '12px',
    boxShadow: 'var(--shadow-lg)',
    zIndex: 1000,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    maxHeight: '450px',
    backdropFilter: 'blur(20px)',
  },
  dropdownHeader: {
    padding: '0.75rem 1rem',
    borderBottom: '1px solid var(--glass-border)',
    background: 'rgba(255, 255, 255, 0.4)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dropdownTitle: {
    fontSize: '0.85rem',
    fontWeight: '700',
    color: 'var(--text-main)',
    margin: 0,
  },
  dropdownSubtitle: {
    fontSize: '0.72rem',
    color: 'var(--text-muted)',
    fontWeight: '500',
  },
  dropdownBody: {
    padding: '0.75rem',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  dropdownAlertCard: {
    borderLeft: '3px solid',
    borderRadius: '8px',
    padding: '0.65rem 0.85rem',
    textAlign: 'left',
  },
  emptyDropdown: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '2rem 1rem',
    color: 'var(--text-muted)',
  },
  alertCheckbox: {
    width: '16px',
    height: '16px',
    cursor: 'pointer',
    accentColor: 'var(--primary)',
    marginTop: '2px',
  },
  cardGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '1rem',
    marginTop: '1.25rem',
  },
  card: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    padding: '1.25rem 1rem',
    textAlign: 'left',
  },
  cardIconBg: {
    width: '48px',
    height: '48px',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  cardContent: {
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  cardLabel: {
    fontSize: '0.72rem',
    fontWeight: '700',
    color: 'var(--text-light)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  cardVal: {
    fontSize: '1.5rem',
    fontWeight: '700',
    color: 'var(--text-main)',
    margin: '0.15rem 0',
  },
  cardDetails: {
    display: 'flex',
    alignItems: 'center',
  },
  dashboardBodyRow: {
    display: 'flex',
    gap: '1.5rem',
    flexWrap: 'wrap',
    marginTop: '0.5rem',
  },
  column: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
    minWidth: '320px',
  },
  panel: {
    padding: '1.5rem',
    display: 'flex',
    flexDirection: 'column',
    textAlign: 'left',
  },
  panelHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    marginBottom: '0.75rem',
  },
  panelTitle: {
    fontSize: '1.15rem',
    fontWeight: '600',
    color: 'var(--text-main)',
  },
  panelDescription: {
    fontSize: '0.85rem',
    color: 'var(--text-muted)',
    marginBottom: '1.25rem',
  },
  tableWrapper: {
    overflowX: 'auto',
    width: '100%',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    textAlign: 'left',
  },
  th: {
    fontSize: '0.78rem',
    fontWeight: '700',
    color: 'var(--text-light)',
    textTransform: 'uppercase',
    padding: '0.75rem 1rem',
    borderBottom: '1px solid var(--glass-border)',
  },
  tr: {
    borderBottom: '1px solid rgba(15, 23, 42, 0.05)',
  },
  td: {
    padding: '1rem',
    fontSize: '0.875rem',
    color: 'var(--text-main)',
    whiteSpace: 'nowrap',
  },
  emptyTable: {
    padding: '2rem',
    textAlign: 'center',
    color: 'var(--text-muted)',
  },
  badgeMini: {
    padding: '0.15rem 0.4rem',
    borderRadius: '4px',
    fontSize: '0.75rem',
    fontWeight: '700',
  },
  rowProgressBar: {
    display: 'flex',
    width: '100px',
    height: '6px',
    borderRadius: '3px',
    overflow: 'hidden',
    background: 'rgba(15, 23, 42, 0.08)',
  },
  rowProgressBarSegment: {
    height: '100%',
  },
  comparisonList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
    marginTop: '0.5rem',
  },
  comparisonItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  comparisonLabelRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '0.8rem',
    flexWrap: 'wrap',
    gap: '0.5rem',
  },
  comparisonName: {
    fontWeight: '600',
    color: 'var(--text-main)',
  },
  comparisonDetails: {
    color: 'var(--text-light)',
  },
  comparisonBarOuter: {
    display: 'flex',
    width: '100%',
    height: '12px',
    borderRadius: '6px',
    overflow: 'hidden',
    background: 'rgba(15, 23, 42, 0.08)',
  },
  comparisonBarInner: {
    height: '100%',
  },
  comparisonBarEmpty: {
    width: '100%',
    height: '100%',
    background: 'rgba(15, 23, 42, 0.08)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '0.65rem',
    color: 'var(--text-light)',
    fontWeight: '600',
  },
  todoList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
  },
  todoItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '0.85rem',
    borderRadius: '12px',
    background: 'rgba(255, 255, 255, 0.2)',
    border: '1px solid var(--glass-border)',
    transition: 'all 0.2s ease',
  },
  todoStatusIndicator: {
    width: '4px',
    height: '32px',
    borderRadius: '2px',
    flexShrink: 0,
  },
  todoContent: {
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
    overflow: 'hidden',
    textAlign: 'left',
  },
  todoTitleRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    gap: '0.5rem',
  },
  todoTaskTitle: {
    fontSize: '0.875rem',
    fontWeight: '600',
    color: 'var(--text-main)',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    maxWidth: '160px',
  },
  todoDateBadge: {
    fontSize: '0.72rem',
    fontWeight: '500',
    flexShrink: 0,
  },
  todoMetadataRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '0.75rem',
    color: 'var(--text-light)',
    marginTop: '0.15rem',
  },
  todoValue: {
    fontWeight: '600',
    color: 'var(--primary)',
  },
  todoActions: {
    display: 'flex',
    gap: '4px',
    alignItems: 'center',
  },
  todoCheckButton: {
    border: 'none',
    background: 'transparent',
    color: 'var(--success)',
    padding: '4px',
    cursor: 'pointer',
    borderRadius: '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.15s ease',
  },
  todoLinkButton: {
    border: 'none',
    background: 'transparent',
    color: 'var(--primary)',
    padding: '4px',
    cursor: 'pointer',
    borderRadius: '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.15s ease',
  },
  emptyTodo: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '2.5rem 1rem',
    color: 'var(--text-main)',
  },
  chartArea: {
    flex: 1,
    display: 'flex',
    gap: '1rem',
    height: '180px',
    position: 'relative',
    borderBottom: '1px solid var(--glass-border)',
    paddingBottom: '0.5rem',
    minWidth: 0,
    marginTop: '1rem',
  },
  yAxis: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    fontSize: '0.75rem',
    color: 'var(--text-light)',
    textAlign: 'right',
    width: '80px',
    paddingRight: '0.5rem',
  },
  chartScrollWrapper: {
    flex: 1,
    overflowX: 'auto',
    height: '100%',
    paddingBottom: '4px',
    minWidth: 0,
  },
  barsContainer: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: '100%',
    minWidth: '480px',
  },
  barColumn: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    flex: 1,
    height: '100%',
    justifyContent: 'flex-end',
    gap: '0.5rem',
  },
  barGroup: {
    display: 'flex',
    gap: '3px',
    alignItems: 'flex-end',
    height: '100%',
    width: '100%',
    justifyContent: 'center',
  },
  bar: {
    width: '12px',
    borderRadius: '4px 4px 0 0',
    minHeight: '4px',
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.2)',
  },
  barLabel: {
    fontSize: '0.75rem',
    color: 'var(--text-light)',
    fontWeight: '500',
  },
  chartLegend: {
    display: 'flex',
    justifyContent: 'center',
    gap: '1rem',
    flexWrap: 'wrap',
    marginTop: '1.25rem',
  },
  legendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    fontSize: '0.8rem',
    color: 'var(--text-muted)',
    fontWeight: '500',
  },
  legendDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
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
