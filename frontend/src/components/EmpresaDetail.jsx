import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { 
  Building, 
  MapPin, 
  User, 
  FileText, 
  CheckCircle, 
  AlertCircle, 
  ArrowLeft, 
  ChevronRight, 
  BarChart2, 
  Calendar, 
  Plus,
  Briefcase
} from 'lucide-react';

export default function EmpresaDetail({ companyId, user, onBack, onViewDocument, onViewTask }) {
  const [empresa, setEmpresa] = useState(null);
  const [documentos, setDocumentos] = useState([]);
  const [tarefas, setTarefas] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDetails = async () => {
      try {
        setLoading(true);
        const [empData, docList, tList, uList] = await Promise.all([
          api.getEmpresa(companyId),
          api.listDocumentos(),
          api.listTarefas({ empresa_id: companyId }),
          user.role !== 'cliente' ? api.listUsuarios() : Promise.resolve([])
        ]);

        setEmpresa(empData);
        setDocumentos(docList.filter(d => d.empresa_id === companyId));
        setTarefas(tList);
        setUsuarios(uList);
      } catch (err) {
        console.error("Erro ao obter dados detalhados da empresa:", err);
      } finally {
        setLoading(false);
      }
    };

    if (companyId) {
      loadDetails();
    }
  }, [companyId, user]);

  const getConsultorNome = (id) => {
    const found = usuarios.find(u => u._id === id);
    return found ? found.nome : 'Não atribuído';
  };

  if (loading) {
    return (
      <div style={styles.loaderContainer}>
        <div className="animate-spin" style={styles.spinner}></div>
        <p style={{ marginTop: '1rem', color: 'var(--text-muted)' }}>Buscando dados da empresa...</p>
      </div>
    );
  }

  if (!empresa) {
    return (
      <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}>
        <AlertCircle size={40} color="var(--danger)" style={{ margin: '0 auto 1rem' }} />
        <h3 style={{ color: 'var(--text-main)' }}>Empresa não encontrada</h3>
        <button onClick={onBack} className="glass-btn" style={{ marginTop: '1rem' }}>
          Voltar para Portfólio
        </button>
      </div>
    );
  }

  // Calculate compliance statistics
  const totalTasks = tarefas.length;
  const completedTasks = tarefas.filter(t => t.status === 'Concluído').length;
  const pendingTasks = tarefas.filter(t => t.status === 'Pendente' || t.status === 'Em Andamento' || t.status === 'Atrasado').length;
  const activeDocs = documentos.filter(d => d.status === 'Ativo').length;
  const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  return (
    <div className="animate-fade-in" style={styles.container}>
      {/* Botão de Voltar e Breadcrumb */}
      <div style={styles.breadcrumbRow}>
        <button onClick={onBack} className="glass-btn" style={styles.backBtn}>
          <ArrowLeft size={16} />
          <span>Voltar</span>
        </button>
        <span style={styles.breadcrumbLink} onClick={onBack}>Clientes</span>
        <ChevronRight size={14} color="var(--text-muted)" />
        <span style={styles.breadcrumbCurrent}>{empresa.nome_fantasia}</span>
      </div>

      {/* Header da Empresa */}
      <div className="glass-panel" style={styles.empresaHeader}>
        <div style={styles.headerBrand}>
          <div style={styles.brandIcon}>
            <Building size={32} color="var(--primary)" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <h1 style={styles.title}>{empresa.nome_fantasia}</h1>
              <span className="glass-tag" style={styles.segmentTag}>{empresa.segmento}</span>
            </div>
            <p style={styles.subtitle}>{empresa.razao_social} | CNPJ: {empresa.cnpj}</p>
          </div>
        </div>
      </div>

      {/* Grid de Informações Gerais e Métricas */}
      <div style={styles.gridTwoColumns}>
        {/* Ficha Técnica */}
        <div className="glass-panel" style={styles.panelCard}>
          <h3 style={styles.cardHeaderTitle}>Ficha Cadastral</h3>
          <div style={styles.infoList}>
            <div style={styles.infoItem}>
              <MapPin size={18} color="var(--text-muted)" />
              <div>
                <span style={styles.infoLabel}>Endereço Principal</span>
                <span style={styles.infoValue}>{empresa.cidade} - {empresa.uf}</span>
              </div>
            </div>
            <div style={styles.infoItem}>
              <User size={18} color="var(--text-muted)" />
              <div>
                <span style={styles.infoLabel}>Técnico Responsável</span>
                <span style={styles.infoValue}>{getConsultorNome(empresa.responsavel_principal_id)}</span>
              </div>
            </div>
            <div style={styles.infoItem}>
              <Briefcase size={18} color="var(--text-muted)" />
              <div>
                <span style={styles.infoLabel}>Status Operacional</span>
                <span style={{ ...styles.infoValue, color: 'var(--success)' }}>Ativo no Sistema</span>
              </div>
            </div>
          </div>
        </div>

        {/* Progresso de Conformidade */}
        <div className="glass-panel" style={styles.panelCard}>
          <h3 style={styles.cardHeaderTitle}>Painel de Conformidade</h3>
          <div style={styles.metricsWrapper}>
            <div style={styles.scoreGauge}>
              <span style={styles.gaugeNumber}>{progress}%</span>
              <span style={styles.gaugeLabel}>Conclusão</span>
            </div>
            <div style={styles.metricGrid}>
              <div style={styles.metricItemMini} className="glass-card">
                <span style={styles.metricValMini}>{documentos.length}</span>
                <span style={styles.metricLabelMini}>Licenças</span>
              </div>
              <div style={styles.metricItemMini} className="glass-card">
                <span style={styles.metricValMini}>{activeDocs}</span>
                <span style={{ ...styles.metricLabelMini, color: 'var(--success)' }}>Ativas</span>
              </div>
              <div style={styles.metricItemMini} className="glass-card">
                <span style={{ ...styles.metricValMini, color: 'var(--warning)' }}>{pendingTasks}</span>
                <span style={styles.metricLabelMini}>Pendências</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Licenças e Documentos Regulatórios */}
      <div className="glass-panel" style={styles.panelCard}>
        <div style={styles.sectionHeader}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FileText size={20} color="var(--primary)" />
            <h2 style={styles.sectionTitle}>Licenças, Documentos e Alvarás ({documentos.length})</h2>
          </div>
        </div>

        <div style={styles.tableWrapper}>
          <table style={styles.table}>
            <thead>
              <tr style={styles.theadRow}>
                <th style={styles.th}>Tipo de Documento</th>
                <th style={styles.th}>Órgão Emissor</th>
                <th style={styles.th}>Número Processo</th>
                <th style={styles.th}>Status</th>
                <th style={styles.th}>Vencimento</th>
                <th style={styles.th}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {documentos.map(doc => {
                const isExpired = new Date(doc.data_vencimento) < new Date() && doc.status !== 'Ativo';
                return (
                  <tr key={doc._id} style={styles.tableRow} className="table-row-hover">
                    <td style={{ ...styles.td, fontWeight: '600', color: 'var(--text-main)' }}>{doc.tipo}</td>
                    <td style={styles.td}>{doc.orgao}</td>
                    <td style={styles.td}>{doc.numero_processo || 'Não informado'}</td>
                    <td style={styles.td}>
                      <span style={{ 
                        ...styles.statusBadge, 
                        background: doc.status === 'Ativo' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                        color: doc.status === 'Ativo' ? 'var(--success)' : 'var(--danger)'
                      }}>{doc.status}</span>
                    </td>
                    <td style={styles.td}>
                      <span style={{ color: isExpired ? 'var(--danger)' : 'var(--text-main)', fontWeight: isExpired ? '600' : 'normal' }}>
                        {new Date(doc.data_vencimento).toLocaleDateString('pt-BR')}
                      </span>
                    </td>
                    <td style={styles.td}>
                      <button 
                        onClick={() => onViewDocument(doc._id)} 
                        className="glass-btn"
                        style={styles.actionBtnTable}
                      >
                        Abrir Documento
                      </button>
                    </td>
                  </tr>
                );
              })}
              {documentos.length === 0 && (
                <tr>
                  <td colSpan={6} style={styles.emptyCell}>
                    Nenhum documento cadastrado para esta empresa.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Condicionantes e Checklist Geral */}
      <div className="glass-panel" style={styles.panelCard}>
        <div style={styles.sectionHeader}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <CheckCircle size={20} color="var(--primary)" />
            <h2 style={styles.sectionTitle}>Todas as Condicionantes & Tarefas ({tarefas.length})</h2>
          </div>
        </div>

        <div style={styles.tableWrapper}>
          <table style={styles.table}>
            <thead>
              <tr style={styles.theadRow}>
                <th style={styles.th}>Título da Condicionante</th>
                <th style={styles.th}>Frequência</th>
                <th style={styles.th}>Status</th>
                <th style={styles.th}>Vencimento</th>
                <th style={styles.th}>Valor Estimado</th>
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
                        <div>{task.titulo}</div>
                        <span style={styles.taskSubtext}>{task.descricao.substring(0, 60)}...</span>
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
                    Nenhuma condicionante agendada para esta empresa.
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
  empresaHeader: {
    padding: '1.5rem',
  },
  headerBrand: {
    display: 'flex',
    alignItems: 'center',
    gap: '1.25rem',
  },
  brandIcon: {
    width: '60px',
    height: '60px',
    borderRadius: '14px',
    background: 'rgba(37, 99, 235, 0.08)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: '1.5rem',
    fontWeight: '750',
    color: 'var(--text-main)',
  },
  subtitle: {
    fontSize: '0.85rem',
    color: 'var(--text-muted)',
    marginTop: '0.2rem',
  },
  segmentTag: {
    fontSize: '0.75rem',
    fontWeight: '600',
    background: 'rgba(37, 99, 235, 0.08)',
    border: '1px solid rgba(37, 99, 235, 0.15)',
    color: 'var(--primary)',
    padding: '0.15rem 0.5rem',
  },
  gridTwoColumns: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
    gap: '1.5rem',
  },
  panelCard: {
    padding: '1.5rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '1.25rem',
  },
  cardHeaderTitle: {
    fontSize: '1rem',
    fontWeight: '700',
    color: 'var(--text-main)',
    borderBottom: '1px solid var(--glass-border)',
    paddingBottom: '0.75rem',
    margin: 0,
  },
  infoList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  infoItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
  },
  infoLabel: {
    display: 'block',
    fontSize: '0.7rem',
    color: 'var(--text-muted)',
  },
  infoValue: {
    fontSize: '0.875rem',
    fontWeight: '600',
    color: 'var(--text-main)',
  },
  metricsWrapper: {
    display: 'flex',
    alignItems: 'center',
    gap: '2rem',
    flexWrap: 'wrap',
  },
  scoreGauge: {
    width: '90px',
    height: '90px',
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(255,255,255,0.95) 0%, rgba(240,244,249,0.7) 100%)',
    border: '4px solid var(--primary)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: 'var(--shadow-sm)',
  },
  gaugeNumber: {
    fontSize: '1.35rem',
    fontWeight: '850',
    color: 'var(--primary)',
  },
  gaugeLabel: {
    fontSize: '0.55rem',
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
  },
  metricGrid: {
    flex: 1,
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '0.5rem',
  },
  metricItemMini: {
    padding: '0.75rem 0.5rem',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  metricValMini: {
    fontSize: '1.1rem',
    fontWeight: '750',
    color: 'var(--text-main)',
  },
  metricLabelMini: {
    fontSize: '0.625rem',
    color: 'var(--text-muted)',
    marginTop: '0.1rem',
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1px solid var(--glass-border)',
    paddingBottom: '0.75rem',
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
  statusBadge: {
    fontSize: '0.7rem',
    fontWeight: '600',
    padding: '0.15rem 0.45rem',
    borderRadius: '6px',
    display: 'inline-block',
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
