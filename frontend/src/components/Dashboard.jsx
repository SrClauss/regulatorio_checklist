import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { 
  TrendingUp, 
  AlertTriangle, 
  CalendarDays, 
  Briefcase, 
  DollarSign, 
  FileWarning 
} from 'lucide-react';

export default function Dashboard({ user, onViewTask, onViewDocument }) {
  const [faturamentoMensal, setFaturamentoMensal] = useState({ faturamento_condicionantes: 0, faturamento_renovacoes: 0, faturamento_total: 0 });
  const [anualData, setAnualData] = useState([]);
  const [tarefasUrgentes, setTarefasUrgentes] = useState([]);
  const [documentosUrgentes, setDocumentosUrgentes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const now = new Date();
        const mes = now.getMonth() + 1;
        const ano = now.getFullYear();

        if (user.role === 'admin' || user.role === 'consultor') {
          // 1. Faturamento e Previsibilidade Mensal
          const prevMensal = await api.getPrevisibilidadeMensal(mes, ano);
          setFaturamentoMensal(prevMensal);

          // 2. Gráfico Anual
          const prevAnual = await api.getPrevisibilidadeAnual(ano);
          setAnualData(prevAnual.consolidado_mensal || []);
        }

        // 3. Tarefas pendentes/urgentes
        const tarefas = await api.listTarefas({ status: 'Pendente' });
        // Filtra e ordena as próximas a vencer
        const proximasTarefas = tarefas
          .filter(t => new Date(t.data_vencimento) >= new Date())
          .sort((a, b) => new Date(a.data_vencimento) - new Date(b.data_vencimento))
          .slice(0, 4);
        setTarefasUrgentes(proximasTarefas);

        // 4. Documentos a vencer
        const docs = await api.listDocumentos();
        const proximosDocs = docs
          .filter(d => d.status === 'Ativo' || d.status === 'Em Renovação')
          .sort((a, b) => new Date(a.data_vencimento) - new Date(b.data_vencimento))
          .slice(0, 4);
        setDocumentosUrgentes(proximosDocs);

      } catch (error) {
        console.error("Erro ao carregar dados do dashboard:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [user]);

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('pt-BR');
  };

  // Encontra a maior receita ou custo anual para escalar a altura do gráfico
  const maxRevenue = Math.max(
    ...anualData.map(m => Math.max(m.faturamento_condicionantes || 0, m.faturamento_renovacoes || 0)),
    1000
  );

  const getMonthName = (mIndex) => {
    const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    return meses[mIndex - 1] || mIndex;
  };

  if (loading) {
    return (
      <div style={styles.loaderContainer}>
        <div className="animate-spin" style={styles.spinner}></div>
        <p style={{ marginTop: '1rem', color: 'var(--text-muted)' }}>Carregando dados da dashboard...</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in" style={styles.container}>
      {/* Header */}
      <header style={styles.header}>
        <div>
          <h1 style={styles.title}>Olá, {user.nome}!</h1>
          <p style={styles.subtitle}>Aqui está o panorama geral de compliance e receitas para este mês.</p>
        </div>
      </header>

      {/* Grid de Cards de Destaque */}
      <section className="dashboard-card-grid" style={{
        ...styles.cardGrid,
        gridTemplateColumns: (user.role === 'admin' || user.role === 'consultor') ? 'repeat(auto-fit, minmax(300px, 1fr))' : 'repeat(auto-fit, minmax(350px, 1fr))'
      }}>
        {/* Faturamento (Admin e Consultor) */}
        {(user.role === 'admin' || user.role === 'consultor') && (
          <div className="glass-card" style={styles.card}>
            <div style={{ ...styles.cardIconBg, background: 'var(--primary-light)' }}>
              <DollarSign size={24} color="var(--primary)" />
            </div>
            <div style={styles.cardContent}>
              <span style={styles.cardLabel}>Faturamento Esperado (Mês)</span>
              <h2 style={styles.cardVal}>{formatCurrency(faturamentoMensal.faturamento_total || 0)}</h2>
              <div style={styles.cardDetails}>
                <span style={{ color: 'var(--text-light)', fontSize: '0.8rem' }}>
                  Custos de Renovação: {formatCurrency(faturamentoMensal.faturamento_renovacoes || 0)}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Condicionantes Pendentes */}
        <div className="glass-card" style={styles.card}>
          <div style={{ ...styles.cardIconBg, background: 'var(--warning-light)' }}>
            <CalendarDays size={24} color="var(--warning)" />
          </div>
          <div style={styles.cardContent}>
            <span style={styles.cardLabel}>Tarefas Urgentes</span>
            <h2 style={styles.cardVal}>{tarefasUrgentes.length}</h2>
            <div style={styles.cardDetails}>
              <span style={{ color: 'var(--warning)', fontSize: '0.8rem', fontWeight: '500' }}>
                Próximas condicionantes regulatórias
              </span>
            </div>
          </div>
        </div>

        {/* Documentos a Vencer */}
        <div className="glass-card" style={styles.card}>
          <div style={{ ...styles.cardIconBg, background: 'var(--danger-light)' }}>
            <FileWarning size={24} color="var(--danger)" />
          </div>
          <div style={styles.cardContent}>
            <span style={styles.cardLabel}>Documentos Próximos do Vencimento</span>
            <h2 style={styles.cardVal}>{documentosUrgentes.length}</h2>
            <div style={styles.cardDetails}>
              <span style={{ color: 'var(--danger)', fontSize: '0.8rem', fontWeight: '500' }}>
                Requerem renovação urgente
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Gráfico & Alertas Secundários */}
      <section className="dashboard-main-section">
        {/* Gráfico de Barras Pure CSS (Admin e Consultor) */}
        {(user.role === 'admin' || user.role === 'consultor') && (
          <div className="glass-panel" style={styles.chartPanel}>
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
                          {/* Barra de Receita */}
                          <div 
                            style={{ ...styles.bar, height: `${heightPercent}%`, background: 'var(--primary)' }}
                            title={`Receita: ${formatCurrency(mesData.faturamento_condicionantes || 0)}`}
                          ></div>
                          {/* Barra de Custos */}
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
        )}

        {/* Listas Rápidas de Alertas */}
        <div style={{
          ...styles.alertsPanelGroup,
          display: (user.role === 'admin' || user.role === 'consultor') ? 'flex' : 'grid',
          gridTemplateColumns: (user.role === 'admin' || user.role === 'consultor') ? '1fr' : 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))',
          gap: '1.5rem'
        }}>
          {/* Tarefas */}
          <div className="glass-panel" style={styles.listPanel}>
            <div style={styles.panelHeader}>
              <AlertTriangle size={20} color="var(--warning)" />
              <h3 style={styles.panelTitle}>Próximas Condicionantes</h3>
            </div>
            <div style={styles.list}>
              {tarefasUrgentes.length === 0 ? (
                <p style={styles.emptyText}>Nenhuma tarefa urgente pendente.</p>
              ) : (
                tarefasUrgentes.map(t => (
                  <div 
                    key={t._id} 
                    style={{ ...styles.listItem, cursor: 'pointer' }}
                    onClick={() => onViewTask && onViewTask(t._id)}
                    className="card-hover"
                  >
                    <div style={styles.listItemInfo}>
                      <h4 style={styles.itemTitle}>{t.titulo}</h4>
                      <span style={styles.itemDate}>Vence em: {formatDate(t.data_vencimento)}</span>
                    </div>
                    <span className="glass-card" style={styles.statusPill}>
                      R$ {t.valor_estimado}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Licenças */}
          <div className="glass-panel" style={styles.listPanel}>
            <div style={styles.panelHeader}>
              <Briefcase size={20} color="var(--primary)" />
              <h3 style={styles.panelTitle}>Vencimento de Licenças</h3>
            </div>
            <div style={styles.list}>
              {documentosUrgentes.length === 0 ? (
                <p style={styles.emptyText}>Nenhum documento prestes a expirar.</p>
              ) : (
                documentosUrgentes.map(d => (
                  <div 
                    key={d._id} 
                    style={{ ...styles.listItem, cursor: 'pointer' }}
                    onClick={() => onViewDocument && onViewDocument(d._id)}
                    className="card-hover"
                  >
                    <div style={styles.listItemInfo}>
                      <h4 style={styles.itemTitle}>{d.tipo}</h4>
                      <span style={styles.itemDate}>Vencimento: {formatDate(d.data_vencimento)}</span>
                    </div>
                    <span style={{ ...styles.statusPill, color: 'var(--danger)', background: 'var(--danger-light)' }}>
                      Renovação
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </section>
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
  cardGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '1.5rem',
  },
  card: {
    display: 'flex',
    alignItems: 'center',
    gap: '1.25rem',
    padding: '1.75rem 1.5rem',
    textAlign: 'left',
  },
  cardIconBg: {
    width: '56px',
    height: '56px',
    borderRadius: '14px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardContent: {
    display: 'flex',
    flexDirection: 'column',
  },
  cardLabel: {
    fontSize: '0.85rem',
    fontWeight: '600',
    color: 'var(--text-light)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  cardVal: {
    fontSize: '1.75rem',
    fontWeight: '700',
    color: 'var(--text-main)',
    margin: '0.25rem 0',
  },
  cardDetails: {
    display: 'flex',
    alignItems: 'center',
  },
  mainSection: {
    display: 'grid',
    gridTemplateColumns: '2fr 1.25fr',
    gap: '1.5rem',
  },
  chartPanel: {
    padding: '1.75rem',
    display: 'flex',
    flexDirection: 'column',
    height: '420px',
  },
  panelHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    marginBottom: '1.5rem',
  },
  panelTitle: {
    fontSize: '1.1rem',
    fontWeight: '600',
    color: 'var(--text-main)',
  },
  chartArea: {
    flex: 1,
    display: 'flex',
    gap: '1rem',
    height: '240px',
    position: 'relative',
    borderBottom: '1px solid var(--glass-border)',
    paddingBottom: '0.5rem',
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
  alertsPanelGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
  },
  listPanel: {
    padding: '1.5rem',
    textAlign: 'left',
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
  },
  listItem: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0.75rem 1rem',
    background: 'rgba(255, 255, 255, 0.3)',
    borderRadius: '12px',
    border: '1px solid var(--glass-border)',
  },
  listItemInfo: {
    display: 'flex',
    flexDirection: 'column',
  },
  itemTitle: {
    fontSize: '0.9rem',
    fontWeight: '600',
    color: 'var(--text-main)',
  },
  itemDate: {
    fontSize: '0.75rem',
    color: 'var(--text-light)',
    marginTop: '0.15rem',
  },
  statusPill: {
    fontSize: '0.75rem',
    fontWeight: '600',
    padding: '0.35rem 0.65rem',
    borderRadius: '8px',
    background: 'rgba(255, 255, 255, 0.7)',
    color: 'var(--primary)',
    border: '1px solid var(--glass-border)',
  },
  emptyText: {
    fontSize: '0.85rem',
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
};
