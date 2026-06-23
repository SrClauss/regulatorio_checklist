import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { 
  TrendingUp, 
  DollarSign, 
  Bell,
  CalendarDays,
  Award,
  CheckSquare,
  Users,
  CheckCircle2
} from 'lucide-react';

export default function Dashboard({ user, onNavigateTab }) {
  const [faturamentoMensal, setFaturamentoMensal] = useState({ faturamento_condicionantes: 0, faturamento_renovacoes: 0, faturamento_total: 0 });
  const [anualData, setAnualData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tarefasCount, setTarefasCount] = useState(0);
  const [tarefasMesCount, setTarefasMesCount] = useState(0);
  const [topClasseServico, setTopClasseServico] = useState({ nome: 'Nenhuma', count: 0 });
  const [complianceRate, setComplianceRate] = useState(100);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const now = new Date();
        const mes = now.getMonth() + 1;
        const ano = now.getFullYear();

        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();

        // Carrega dados agregados em paralelo
        const [prevMensal, prevAnual, tarefasMes, csList, tarefasAtrasadas, documentos] = await Promise.all([
          (user.role === 'admin' || user.role === 'consultor') 
            ? api.getPrevisibilidadeMensal(mes, ano) 
            : Promise.resolve({ faturamento_total: 0, faturamento_renovacoes: 0, faturamento_condicionantes: 0 }),
          (user.role === 'admin' || user.role === 'consultor') 
            ? api.getPrevisibilidadeAnual(ano) 
            : Promise.resolve({ consolidado_mensal: [] }),
          api.listTarefas({ data_inicio: startOfMonth, data_fim: endOfMonth }),
          api.listClasseServicos(),
          api.listTarefas({ status: 'Atrasado' }),
          api.listDocumentos()
        ]);

        if (user.role === 'admin' || user.role === 'consultor') {
          setFaturamentoMensal(prevMensal);
          setAnualData(prevAnual.consolidado_mensal || []);
        }

        // 1. Total de tarefas pendentes gerais no sistema -> substituído pelas tarefas atrasadas globais
        setTarefasCount(tarefasAtrasadas.length);
        
        // Vamos guardar também a lista de atrasadas e documentos no estado
        setTopClasseServico(prev => ({ ...prev, atrasadas: tarefasAtrasadas.slice(0, 5), docCount: documentos.length }));

        // 2. Tarefas do mês atual (Já vem filtrado do backend! FIM DO GARGALO!)
        setTarefasMesCount(tarefasMes.length);

        // 3. Taxa de Conformidade do Mês (Concluídas / Total do Mês)
        if (tarefasMes.length > 0) {
          const concluidasMes = tarefasMes.filter(t => t.status === 'Concluído').length;
          const rate = Math.round((concluidasMes / tarefasMes.length) * 100);
          setComplianceRate(rate);
        } else {
          setComplianceRate(100);
        }

        // 4. Classe de Serviço mais frequente no mês (excluindo nulas / sem classe)
        const classCounts = {};
        tarefasMes.forEach(t => {
          if (t.classe_servico_id) {
            classCounts[t.classe_servico_id] = (classCounts[t.classe_servico_id] || 0) + 1;
          }
        });

        let topCSId = null;
        let topCount = 0;
        Object.entries(classCounts).forEach(([id, count]) => {
          if (count > topCount) {
            topCount = count;
            topCSId = id;
          }
        });

        if (topCSId) {
          const matched = csList.find(cs => cs._id === topCSId);
          if (matched) {
            setTopClasseServico({ nome: matched.nome, count: topCount });
          }
        } else {
          setTopClasseServico({ nome: 'Nenhuma no mês', count: 0 });
        }

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
        <p style={{ marginTop: '1rem', color: 'var(--text-muted)' }}>Carregando dados do painel...</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in" style={styles.container}>
      {/* Header */}
      <header style={styles.header}>
        <div>
          <h1 style={styles.title}>Olá, {user.nome}!</h1>
          <p style={styles.subtitle}>Sua visão panorâmica de faturamento, receitas estimadas e compliance.</p>
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

      {/* Grid de Informações Ricas (4 Cards) */}
      <section style={styles.cardGrid}>
        {(user.role === 'admin' || user.role === 'consultor') ? (
          <div className="glass-card" style={styles.card}>
            <div style={{ ...styles.cardIconBg, background: 'var(--primary-light)' }}>
              <DollarSign size={24} color="var(--primary)" />
            </div>
            <div style={styles.cardContent}>
              <span style={styles.cardLabel}>Faturamento Esperado (Mês)</span>
              <h2 style={styles.cardVal}>{formatCurrency(faturamentoMensal.faturamento_total || 0)}</h2>
              <div style={styles.cardDetails}>
                <span style={{ color: 'var(--text-light)', fontSize: '0.78rem' }}>
                  Renovações: {formatCurrency(faturamentoMensal.faturamento_renovacoes || 0)}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="glass-card" style={styles.card}>
            <div style={{ ...styles.cardIconBg, background: 'var(--primary-light)' }}>
              <CheckCircle2 size={24} color="var(--primary)" />
            </div>
            <div style={styles.cardContent}>
              <span style={styles.cardLabel}>Seu Escopo de Trabalho</span>
              <h2 style={styles.cardVal}>Ativo</h2>
              <div style={styles.cardDetails}>
                <span style={{ color: 'var(--text-light)', fontSize: '0.78rem' }}>
                  Acompanhamento ambiental regular.
                </span>
              </div>
            </div>
          </div>
        )}

        <div className="glass-card" style={styles.card}>
          <div style={{ ...styles.cardIconBg, background: 'rgba(59, 130, 246, 0.1)' }}>
            <CalendarDays size={24} color="#3b82f6" />
          </div>
          <div style={styles.cardContent}>
            <span style={styles.cardLabel}>Obrigações no Mês</span>
            <h2 style={styles.cardVal}>{tarefasMesCount}</h2>
            <div style={styles.cardDetails}>
              <span style={{ color: 'var(--text-light)', fontSize: '0.78rem' }}>
                Condicionantes em vermelho: {tarefasCount}
              </span>
            </div>
          </div>
        </div>

        <div className="glass-card" style={styles.card}>
          <div style={{ ...styles.cardIconBg, background: 'rgba(234, 179, 8, 0.1)' }}>
            <Award size={24} color="#eab308" />
          </div>
          <div style={styles.cardContent}>
            <span style={styles.cardLabel}>Classe mais Frequente (Mês)</span>
            <h2 style={{ ...styles.cardVal, fontSize: topClasseServico.nome.length > 18 ? '1.25rem' : '1.5rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '240px' }} title={topClasseServico.nome}>
              {topClasseServico.nome}
            </h2>
            <div style={styles.cardDetails}>
              <span style={{ color: 'var(--text-light)', fontSize: '0.78rem' }}>
                Ocorrências: {topClasseServico.count}
              </span>
            </div>
          </div>
        </div>

        <div className="glass-card" style={styles.card}>
          <div style={{ ...styles.cardIconBg, background: complianceRate >= 80 ? 'var(--success-light)' : 'var(--danger-light)' }}>
            <TrendingUp size={24} color={complianceRate >= 80 ? 'var(--success)' : 'var(--danger)'} />
          </div>
          <div style={styles.cardContent}>
            <span style={styles.cardLabel}>Taxa de Compliance (Mês)</span>
            <h2 style={styles.cardVal}>{complianceRate}%</h2>
            <div style={styles.cardDetails}>
              <span style={{ color: 'var(--text-light)', fontSize: '0.78rem' }}>
                Índice de conclusão mensal.
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Conteúdo Gráfico e Bloco de Planejamento TODO */}
      <div style={styles.dashboardBodyRow}>
        
        {/* Gráfico Anual */}
        {(user.role === 'admin' || user.role === 'consultor') && (
          <div className="glass-panel" style={{ ...styles.chartPanel, flex: 2 }}>
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

        {/* Bloco de Obrigações Atrasadas (Substituindo o antigo TODO) */}
        <div className="glass-panel" style={{ ...styles.chartPanel, flex: 1, height: 'auto', minHeight: '380px' }}>
          <div style={styles.panelHeader}>
            <Bell size={20} color="var(--danger)" />
            <h3 style={styles.panelTitle}>Atenção: Obrigações Atrasadas</h3>
          </div>

          <div style={styles.todoContainer}>
            <div style={{ ...styles.todoBadge, background: 'var(--danger-light)', color: 'var(--danger)' }}>
              CRÍTICO ({tarefasCount} no total)
            </div>
            <h4 style={styles.todoTitle}>Ação Imediata Necessária</h4>
            
            <div style={styles.todoList}>
              {topClasseServico.atrasadas && topClasseServico.atrasadas.length > 0 ? (
                topClasseServico.atrasadas.map(t => (
                  <div key={t._id} style={{ ...styles.todoItem, cursor: 'pointer' }} onClick={() => onNavigateTab && onNavigateTab('cronograma')} title="Ver no Cronograma">
                    <CheckSquare size={16} color="var(--danger)" style={{ marginTop: '2px', flexShrink: 0 }} />
                    <span style={styles.todoText}>
                      <strong>{new Date(t.data_vencimento).toLocaleDateString('pt-BR')}</strong>: {t.titulo}
                    </span>
                  </div>
                ))
              ) : (
                <div style={styles.todoItem}>
                  <CheckCircle2 size={16} color="var(--success)" style={{ marginTop: '2px', flexShrink: 0 }} />
                  <span style={styles.todoText}>Nenhuma obrigação atrasada! Excelente trabalho.</span>
                </div>
              )}
            </div>

            <div style={styles.todoFooter}>
              <Users size={14} color="var(--text-light)" />
              <span>Base de Licenças e Documentos Ativos: <strong>{topClasseServico.docCount || 0}</strong></span>
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
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '1rem',
    marginTop: '1rem',
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

  // TODO Panel Styles
  todoContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
    height: '100%',
    justifyContent: 'space-between',
  },
  todoBadge: {
    background: 'var(--primary-light)',
    color: 'var(--primary)',
    fontSize: '0.7rem',
    fontWeight: '700',
    padding: '0.25rem 0.6rem',
    borderRadius: '6px',
    alignSelf: 'flex-start',
    textTransform: 'uppercase',
  },
  todoTitle: {
    fontSize: '1rem',
    fontWeight: '700',
    color: 'var(--text-main)',
    margin: '4px 0',
  },
  todoList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
    flex: 1,
    marginTop: '0.5rem',
  },
  todoItem: {
    display: 'flex',
    gap: '0.6rem',
    alignItems: 'flex-start',
  },
  todoCheck: {
    marginTop: '3px',
    cursor: 'pointer',
    width: '14px',
    height: '14px',
    accentColor: 'var(--primary)',
  },
  todoText: {
    fontSize: '0.825rem',
    color: 'var(--text-main)',
    lineHeight: '1.4',
    textAlign: 'left',
  },
  todoFooter: {
    borderTop: '1px solid var(--glass-border)',
    paddingTop: '0.75rem',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '0.72rem',
    color: 'var(--text-light)',
  },
};
