import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { 
  FileText, 
  MapPin, 
  User, 
  CheckCircle, 
  AlertCircle, 
  ArrowLeft, 
  ChevronRight, 
  Clock, 
  Calendar, 
  ExternalLink,
  Plus
} from 'lucide-react';

export default function DocumentoDetail({ documentId, user, onBack, onGoToCompany, onViewTask }) {
  const [documento, setDocumento] = useState(null);
  const [empresa, setEmpresa] = useState(null);
  const [tarefas, setTarefas] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDetails = async () => {
      try {
        setLoading(true);
        const docData = await api.getDocumento(documentId);
        setDocumento(docData);

        const [empData, tList] = await Promise.all([
          api.getEmpresa(docData.empresa_id),
          api.listTarefas({ documento_id: documentId })
        ]);
        setEmpresa(empData);
        setTarefas(tList);
      } catch (err) {
        console.error("Erro ao obter dados detalhados do documento:", err);
      } finally {
        setLoading(false);
      }
    };

    if (documentId) {
      loadDetails();
    }
  }, [documentId]);

  if (loading) {
    return (
      <div style={styles.loaderContainer}>
        <div className="animate-spin" style={styles.spinner}></div>
        <p style={{ marginTop: '1rem', color: 'var(--text-muted)' }}>Buscando dados da licença...</p>
      </div>
    );
  }

  if (!documento) {
    return (
      <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}>
        <AlertCircle size={40} color="var(--danger)" style={{ margin: '0 auto 1rem' }} />
        <h3 style={{ color: 'var(--text-main)' }}>Documento não encontrado</h3>
        <button onClick={onBack} className="glass-btn" style={{ marginTop: '1rem' }}>
          Voltar
        </button>
      </div>
    );
  }

  // Stats calculation
  const totalTasks = tarefas.length;
  const completedTasks = tarefas.filter(t => t.status === 'Concluído').length;
  const pendingTasks = tarefas.filter(t => t.status === 'Pendente' || t.status === 'Em Andamento' || t.status === 'Atrasado').length;
  const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const isExpired = new Date(documento.data_vencimento) < new Date();

  return (
    <div className="animate-fade-in" style={styles.container}>
      {/* Breadcrumbs e Botão Voltar */}
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
        <span style={styles.breadcrumbCurrent}>{documento.tipo}</span>
      </div>

      {/* Cartão de Ficha Técnica do Documento */}
      <div className="glass-panel" style={styles.documentHeader}>
        <div style={styles.headerTitleRow}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={styles.brandIcon}>
              <FileText size={28} color="var(--primary)" />
            </div>
            <div>
              <h1 style={styles.title}>{documento.tipo}</h1>
              {empresa && <p style={styles.subtitle}>Empresa: <strong onClick={() => onGoToCompany(empresa._id)} style={{ cursor: 'pointer', color: 'var(--primary)', textDecoration: 'underline' }}>{empresa.nome_fantasia}</strong></p>}
            </div>
          </div>
          <div>
            <span style={{ 
              ...styles.statusBadge, 
              background: isExpired ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
              color: isExpired ? 'var(--danger)' : 'var(--success)'
            }}>
              {isExpired ? 'Vencido' : documento.status}
            </span>
          </div>
        </div>

        <div style={styles.metaGrid}>
          <div className="glass-card" style={styles.metaCard}>
            <span style={styles.metaLabel}>Órgão Emissor</span>
            <span style={styles.metaValue}>{documento.orgao}</span>
          </div>
          <div className="glass-card" style={styles.metaCard}>
            <span style={styles.metaLabel}>Processo</span>
            <span style={styles.metaValue}>{documento.numero_processo || 'Não informado'}</span>
          </div>
          <div className="glass-card" style={styles.metaCard}>
            <span style={styles.metaLabel}>Emissão</span>
            <span style={styles.metaValue}>{new Date(documento.data_emissao).toLocaleDateString('pt-BR')}</span>
          </div>
          <div className="glass-card" style={styles.metaCard}>
            <span style={styles.metaLabel}>Vencimento</span>
            <span style={{ ...styles.metaValue, color: isExpired ? 'var(--danger)' : 'var(--text-main)' }}>
              {new Date(documento.data_vencimento).toLocaleDateString('pt-BR')}
            </span>
          </div>
        </div>

        {/* Progresso de Condicionantes deste Documento */}
        <div style={styles.progressSection}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.35rem' }}>
            <span style={{ color: 'var(--text-muted)', fontWeight: '500' }}>Conformidade do Documento</span>
            <span style={{ fontWeight: '700', color: 'var(--primary)' }}>{progress}% ({completedTasks} de {totalTasks} concluídas)</span>
          </div>
          <div style={styles.progressBarBg}>
            <div style={{ ...styles.progressBarFill, width: `${progress}%` }}></div>
          </div>
        </div>
      </div>

      {/* Lista de Condicionantes Vinculadas */}
      <div className="glass-panel" style={styles.panelCard}>
        <div style={styles.sectionHeader}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <CheckCircle size={20} color="var(--primary)" />
            <h2 style={styles.sectionTitle}>Condicionantes Obrigatórias ({tarefas.length})</h2>
          </div>
        </div>

        <div style={styles.tableWrapper}>
          <table style={styles.table}>
            <thead>
              <tr style={styles.theadRow}>
                <th style={styles.th}>Condicionante</th>
                <th style={styles.th}>Periodicidade</th>
                <th style={styles.th}>Status</th>
                <th style={styles.th}>Vencimento</th>
                <th style={styles.th}>Custo Técnico</th>
                <th style={styles.th}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {tarefas.map(task => {
                const isOverdue = task.status === 'Atrasado' || (new Date(task.data_vencimento) < new Date() && task.status !== 'Concluído');
                return (
                  <tr key={task._id} style={styles.tableRow} className="table-row-hover">
                    <td style={{ ...styles.td, fontWeight: '550', color: 'var(--text-main)' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                          <span>{task.titulo}</span>
                          {task.e_pre_requisito && (
                            <span style={{ 
                              fontSize: '0.625rem', 
                              fontWeight: '700', 
                              color: 'var(--primary)', 
                              background: 'rgba(37, 99, 235, 0.08)', 
                              padding: '0.05rem 0.35rem', 
                              borderRadius: '4px',
                              textTransform: 'uppercase'
                            }}>Pré-requisito</span>
                          )}
                        </div>
                        <span style={styles.taskSubtext}>{task.descricao ? task.descricao.substring(0, 80) : ''}...</span>
                      </div>
                    </td>
                    <td style={styles.td}>{task.periodicidade}</td>
                    <td style={styles.td}>
                      <span style={{ 
                        ...styles.statusBadge, 
                        background: task.status === 'Concluído' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(245, 158, 11, 0.12)',
                        color: task.status === 'Concluído' ? 'var(--success)' : 'var(--warning)'
                      }}>{task.status}</span>
                    </td>
                    <td style={styles.td}>
                      <span style={{ color: isOverdue ? 'var(--danger)' : 'var(--text-main)', fontWeight: isOverdue ? '600' : 'normal' }}>
                        {new Date(task.data_vencimento).toLocaleDateString('pt-BR')}
                      </span>
                    </td>
                    <td style={{ ...styles.td, fontWeight: '600', color: 'var(--primary)' }}>R$ {task.valor_estimado}</td>
                    <td style={styles.td}>
                      <button 
                        onClick={() => onViewTask(task._id)} 
                        className="glass-btn"
                        style={styles.actionBtnTable}
                      >
                        Auditar / Resolver
                      </button>
                    </td>
                  </tr>
                );
              })}
              {tarefas.length === 0 && (
                <tr>
                  <td colSpan={6} style={styles.emptyCell}>
                    Nenhuma condicionante programada para esta licença.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
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
  },
  breadcrumbCurrent: {
    color: 'var(--text-main)',
    fontWeight: '600',
  },
  documentHeader: {
    padding: '1.5rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '1.25rem',
  },
  headerTitleRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '1rem',
  },
  brandIcon: {
    width: '56px',
    height: '56px',
    borderRadius: '12px',
    background: 'rgba(37, 99, 235, 0.08)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: '1.4rem',
    fontWeight: '750',
    color: 'var(--text-main)',
    margin: 0,
  },
  subtitle: {
    fontSize: '0.85rem',
    color: 'var(--text-muted)',
    marginTop: '0.2rem',
  },
  statusBadge: {
    fontSize: '0.75rem',
    fontWeight: '600',
    padding: '0.2rem 0.6rem',
    borderRadius: '6px',
  },
  metaGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '0.75rem',
  },
  metaCard: {
    padding: '0.75rem 1rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.15rem',
  },
  metaLabel: {
    fontSize: '0.7rem',
    color: 'var(--text-muted)',
  },
  metaValue: {
    fontSize: '0.85rem',
    fontWeight: '600',
    color: 'var(--text-main)',
  },
  progressSection: {
    marginTop: '0.5rem',
  },
  progressBarBg: {
    width: '100%',
    height: '6px',
    background: 'rgba(15, 23, 42, 0.05)',
    borderRadius: '3px',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    background: 'var(--primary)',
    borderRadius: '3px',
  },
  panelCard: {
    padding: '1.5rem',
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1px solid var(--glass-border)',
    paddingBottom: '0.75rem',
    marginBottom: '1rem',
  },
  sectionTitle: {
    fontSize: '1rem',
    fontWeight: '700',
    color: 'var(--text-main)',
    margin: 0,
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
  theadRow: {
    borderBottom: '2px solid var(--glass-border)',
  },
  th: {
    padding: '0.75rem 1rem',
    fontSize: '0.75rem',
    fontWeight: '600',
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.03em',
  },
  tableRow: {
    borderBottom: '1px solid var(--glass-border)',
  },
  td: {
    padding: '0.85rem 1rem',
    fontSize: '0.85rem',
    color: 'var(--text-main)',
    verticalAlign: 'middle',
  },
  taskSubtext: {
    display: 'block',
    fontSize: '0.7rem',
    color: 'var(--text-muted)',
    marginTop: '0.15rem',
  },
  actionBtnTable: {
    padding: '0.35rem 0.75rem',
    fontSize: '0.75rem',
  },
  emptyCell: {
    padding: '2rem',
    textAlign: 'center',
    color: 'var(--text-muted)',
    fontStyle: 'italic',
    fontSize: '0.85rem',
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
