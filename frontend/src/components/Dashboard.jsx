import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { 
  TrendingUp, 
  DollarSign, 
  Bell,
  CalendarDays
} from 'lucide-react';

export default function Dashboard({ user, onNavigateTab }) {
  const [faturamentoMensal, setFaturamentoMensal] = useState({ faturamento_condicionantes: 0, faturamento_renovacoes: 0, faturamento_total: 0 });
  const [anualData, setAnualData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tarefasCount, setTarefasCount] = useState(0);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const now = new Date();
        const mes = now.getMonth() + 1;
        const ano = now.getFullYear();

        // Carrega dados de faturamento (Admins/Consultores)
        if (user.role === 'admin' || user.role === 'consultor') {
          const prevMensal = await api.getPrevisibilidadeMensal(mes, ano);
          setFaturamentoMensal(prevMensal);
          const prevAnual = await api.getPrevisibilidadeAnual(ano);
          setAnualData(prevAnual.consolidado_mensal || []);
        }

        const tarefas = await api.listTarefas({ status: 'Pendente' });
        setTarefasCount(tarefas.length);

      } catch (error) {
        console.error("Erro ao carregar dados do dashboard:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [user]);

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
  };

  const getMonthName = (mIndex) => {
    const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    return meses[mIndex - 1] || mIndex;
  };

  const maxRevenue = Math.max(
    ...anualData.map(m => Math.max(m.faturamento_condicionantes || 0, m.faturamento_renovacoes || 0)),
    1000
  );

  if (loading) {
    return (
      <div style={styles.loaderContainer}>
        <div className="animate-spin" style={styles.spinner}></div>
        <p style={{ marginTop: '1rem', color: 'var(--text-muted)' }}>Carregando faturamento...</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in" style={styles.container}>
      {/* Header */}
      <header style={styles.header}>
        <div>
          <h1 style={styles.title}>Olá, {user.nome}!</h1>
          <p style={styles.subtitle}>Sua visão panorâmica de faturamento e receitas estimadas.</p>
        </div>
        <div style={styles.topRightControls}>
          <div style={styles.iconButton} title="Notificações">
            <Bell size={22} color="var(--text-main)" />
            {tarefasCount > 0 && <span style={styles.notificationBadge}></span>}
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

      {/* Conteúdo Financeiro */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', marginTop: '1rem' }}>
        <section className="dashboard-card-grid" style={{
          ...styles.cardGrid,
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))'
        }}>
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
          <div className="glass-card" style={{...styles.card, opacity: 0.7}}>
            <div style={{ ...styles.cardIconBg, background: 'var(--glass-bg)' }}>
              <TrendingUp size={24} color="var(--text-muted)" />
            </div>
            <div style={styles.cardContent}>
              <span style={styles.cardLabel}>Margem Estimada</span>
              <h2 style={{...styles.cardVal, color: 'var(--text-muted)'}}>--</h2>
            </div>
          </div>
        </section>

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
        )}
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
  cardGrid: {
    display: 'grid',
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
  chartPanel: {
    padding: '1.75rem',
    display: 'flex',
    flexDirection: 'column',
    height: '420px',
    textAlign: 'left',
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
    minWidth: 0,
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
