import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { 
  Building, 
  Search, 
  MapPin, 
  ClipboardList, 
  AlertCircle, 
  FileText, 
  CheckCircle, 
  ChevronRight, 
  X, 
  ArrowUpRight, 
  BarChart2, 
  User 
} from 'lucide-react';

export default function Empresas({ user, onViewCompany }) {
  const [empresas, setEmpresas] = useState([]);
  const [documentos, setDocumentos] = useState([]);
  const [tarefas, setTarefas] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSegment, setSelectedSegment] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [empList, docList, tList, uList] = await Promise.all([
          api.listEmpresas(),
          api.listDocumentos(),
          api.listTarefas(),
          user.role !== 'cliente' ? api.listUsuarios() : Promise.resolve([])
        ]);

        setEmpresas(empList);
        setDocumentos(docList);
        setTarefas(tList);
        setUsuarios(uList);
      } catch (err) {
        console.error("Erro ao carregar dados do painel de empresas:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  // Função para calcular estatísticas por empresa
  const getEmpresaStats = (empresaId) => {
    const empDocs = documentos.filter(d => d.empresa_id === empresaId);
    const empTasks = tarefas.filter(t => t.empresa_id === empresaId);
    
    const totalTasks = empTasks.length;
    const completedTasks = empTasks.filter(t => t.status === 'Concluído').length;
    const pendingTasks = empTasks.filter(t => t.status === 'Pendente' || t.status === 'Em Andamento' || t.status === 'Atrasado').length;
    const activeDocs = empDocs.filter(d => d.status === 'Ativo').length;
    
    const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    return {
      totalTasks,
      completedTasks,
      pendingTasks,
      activeDocs,
      progress
    };
  };

  const getConsultorNome = (id) => {
    const found = usuarios.find(u => u._id === id);
    return found ? found.nome : 'Não atribuído';
  };

  // Filtragem
  const filteredEmpresas = empresas.filter(emp => {
    const matchSearch = 
      emp.nome_fantasia.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.razao_social.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.cnpj.includes(searchTerm);
    
    const matchSegment = selectedSegment ? emp.segmento === selectedSegment : true;

    return matchSearch && matchSegment;
  });

  const segmentosUnicos = [...new Set(empresas.map(emp => emp.segmento))];

  if (loading) {
    return (
      <div style={styles.loaderContainer}>
        <div className="animate-spin" style={styles.spinner}></div>
        <p style={{ marginTop: '1rem', color: 'var(--text-muted)' }}>Carregando portfólio de empresas...</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in" style={styles.container}>
      <header style={styles.header}>
        <div>
          <h1 style={styles.title}>Painel de Clientes</h1>
          <p style={styles.subtitle}>Consulte a conformidade regulatória, tarefas e licenças ativas da carteira.</p>
        </div>
      </header>

      {/* Controles de Filtro */}
      <div style={styles.filtersRow} className="glass-card">
        <div style={styles.searchContainer}>
          <Search size={18} style={styles.searchIcon} />
          <input 
            type="text"
            placeholder="Pesquisar por nome, razão social ou CNPJ..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={styles.searchInput}
          />
        </div>

        <select
          value={selectedSegment}
          onChange={e => setSelectedSegment(e.target.value)}
          className="glass-input glass-select"
          style={styles.selectInput}
        >
          <option value="">Todos os Segmentos</option>
          {segmentosUnicos.map(seg => (
            <option key={seg} value={seg}>{seg}</option>
          ))}
        </select>
      </div>

      {/* Grid de Empresas */}
      <div style={styles.grid} className="empresas-grid">
        {filteredEmpresas.map(emp => {
          const stats = getEmpresaStats(emp._id);
          return (
            <div 
              key={emp._id} 
              className="glass-panel card-hover" 
              style={styles.card}
              onClick={() => onViewCompany(emp._id)}
            >
              <div style={styles.cardHeader}>
                <div style={styles.brandIconContainer}>
                  <Building size={20} color="var(--primary)" />
                </div>
                <div style={{ flex: 1 }}>
                  <h3 style={styles.cardTitle}>{emp.nome_fantasia}</h3>
                  <span style={styles.segmentBadge}>{emp.segmento}</span>
                </div>
                <ArrowUpRight size={18} style={styles.arrowIcon} />
              </div>

              <div style={styles.cardBody}>
                <div style={styles.infoRow}>
                  <MapPin size={14} color="var(--text-muted)" />
                  <span>{emp.cidade} - {emp.uf}</span>
                </div>
                <div style={styles.infoRow}>
                  <User size={14} color="var(--text-muted)" />
                  <span>Técnico: {getConsultorNome(emp.responsavel_principal_id)}</span>
                </div>

                {/* Barra de Progresso */}
                <div style={styles.progressSection}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '0.25rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Conformidade</span>
                    <span style={{ fontWeight: '600', color: 'var(--primary)' }}>{stats.progress}%</span>
                  </div>
                  <div style={styles.progressBarBg}>
                    <div style={{ ...styles.progressBarFill, width: `${stats.progress}%` }}></div>
                  </div>
                </div>

                {/* Contadores */}
                <div style={styles.badgeRow}>
                  <div style={styles.statMiniCard}>
                    <span style={styles.miniVal}>{stats.activeDocs}</span>
                    <span style={styles.miniLabel}>Licenças</span>
                  </div>
                  <div style={styles.statMiniCard}>
                    <span style={styles.miniVal}>{stats.pendingTasks}</span>
                    <span style={styles.miniLabel}>Pendências</span>
                  </div>
                  <div style={styles.statMiniCard}>
                    <span style={{ ...styles.miniVal, color: 'var(--success)' }}>{stats.completedTasks}</span>
                    <span style={styles.miniLabel}>Concluídas</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2rem',
    textAlign: 'left',
    width: '100%',
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
  filtersRow: {
    display: 'flex',
    gap: '1rem',
    padding: '0.75rem 1rem',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  searchContainer: {
    position: 'relative',
    flex: 1,
    maxWidth: '500px',
  },
  searchIcon: {
    position: 'absolute',
    left: '12px',
    top: '50%',
    transform: 'translateY(-50%)',
    color: 'var(--text-muted)',
  },
  searchInput: {
    width: '100%',
    padding: '0.6rem 1rem 0.6rem 2.5rem',
    borderRadius: '10px',
    border: '1px solid var(--glass-border)',
    background: 'rgba(255, 255, 255, 0.4)',
    fontSize: '0.9rem',
    outline: 'none',
  },
  selectInput: {
    width: '240px',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
    gap: '1.5rem',
  },
  card: {
    padding: '1.25rem',
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
    textAlign: 'left',
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
  },
  brandIconContainer: {
    width: '40px',
    height: '40px',
    borderRadius: '10px',
    background: 'rgba(37, 99, 235, 0.08)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: '1rem',
    fontWeight: '600',
    color: 'var(--text-main)',
  },
  segmentBadge: {
    fontSize: '0.7rem',
    fontWeight: '600',
    background: 'rgba(255, 255, 255, 0.7)',
    border: '1px solid var(--glass-border)',
    color: 'var(--primary)',
    padding: '0.1rem 0.4rem',
    borderRadius: '6px',
    marginTop: '0.2rem',
    display: 'inline-block',
  },
  arrowIcon: {
    color: 'var(--text-muted)',
    opacity: 0.7,
  },
  cardBody: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.65rem',
  },
  infoRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    fontSize: '0.8rem',
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
  badgeRow: {
    display: 'flex',
    gap: '0.5rem',
    marginTop: '0.5rem',
  },
  statMiniCard: {
    flex: 1,
    background: 'rgba(255, 255, 255, 0.35)',
    border: '1px solid var(--glass-border)',
    borderRadius: '8px',
    padding: '0.4rem 0.25rem',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  miniVal: {
    fontSize: '0.9rem',
    fontWeight: '700',
    color: 'var(--text-main)',
  },
  miniLabel: {
    fontSize: '0.65rem',
    color: 'var(--text-muted)',
    marginTop: '0.05rem',
  },
  // Drawer Overlay & Panel
  drawerOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(15, 23, 42, 0.15)',
    backdropFilter: 'blur(4px)',
    zIndex: 999,
    display: 'flex',
    justifyContent: 'flex-end',
  },
  drawer: {
    width: '100%',
    maxWidth: '520px',
    height: '100%',
    borderRadius: '0',
    borderLeft: '1px solid var(--glass-border)',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: 'var(--shadow-lg)',
    animation: 'slideIn 0.3s ease',
  },
  drawerHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '1.5rem',
    borderBottom: '1px solid var(--glass-border)',
  },
  drawerIcon: {
    width: '44px',
    height: '44px',
    borderRadius: '12px',
    background: 'rgba(37, 99, 235, 0.08)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  drawerTitle: {
    fontSize: '1.2rem',
    fontWeight: '700',
    color: 'var(--text-main)',
  },
  drawerSubtitle: {
    fontSize: '0.8rem',
    color: 'var(--text-muted)',
  },
  closeBtn: {
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    color: 'var(--text-muted)',
  },
  drawerContent: {
    flex: 1,
    overflowY: 'auto',
    padding: '1.5rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
  },
  drawerSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
  },
  sectionTitle: {
    fontSize: '0.9rem',
    fontWeight: '600',
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.03em',
  },
  detailsGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '1rem',
    padding: '1rem',
  },
  detailLabel: {
    fontSize: '0.75rem',
    color: 'var(--text-muted)',
    display: 'block',
    marginBottom: '0.15rem',
  },
  detailValue: {
    fontSize: '0.85rem',
    fontWeight: '600',
    color: 'var(--text-main)',
  },
  metricsRow: {
    display: 'flex',
    gap: '0.75rem',
  },
  metricItem: {
    flex: 1,
    padding: '1rem 0.5rem',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '0.25rem',
  },
  metricVal: {
    fontSize: '1.25rem',
    fontWeight: '700',
    color: 'var(--text-main)',
    marginTop: '0.25rem',
  },
  metricLabel: {
    fontSize: '0.7rem',
    color: 'var(--text-muted)',
    textAlign: 'center',
  },
  listContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
  },
  docItem: {
    padding: '1rem',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  docIconContainer: {
    padding: '0.5rem',
    borderRadius: '8px',
    background: 'rgba(37, 99, 235, 0.05)',
  },
  docTitle: {
    fontSize: '0.85rem',
    fontWeight: '600',
    color: 'var(--text-main)',
  },
  docSubtitle: {
    fontSize: '0.75rem',
    color: 'var(--text-muted)',
    marginTop: '0.1rem',
  },
  docExpiry: {
    fontSize: '0.7rem',
    color: 'var(--text-muted)',
    marginTop: '0.25rem',
  },
  statusBadge: {
    fontSize: '0.7rem',
    fontWeight: '600',
    padding: '0.15rem 0.45rem',
    borderRadius: '6px',
    display: 'inline-block',
  },
  taskItem: {
    padding: '1rem',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '1rem',
  },
  taskTitle: {
    fontSize: '0.85rem',
    fontWeight: '600',
    color: 'var(--text-main)',
  },
  taskDesc: {
    fontSize: '0.75rem',
    color: 'var(--text-muted)',
    marginTop: '0.15rem',
  },
  taskDate: {
    fontSize: '0.7rem',
    color: 'var(--text-muted)',
  },
  emptyText: {
    fontSize: '0.8rem',
    color: 'var(--text-muted)',
    fontStyle: 'italic',
  },
  drawerFooter: {
    padding: '1.25rem 1.5rem',
    borderTop: '1px solid var(--glass-border)',
  },
  actionBtn: {
    width: '100%',
    padding: '0.75rem',
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
