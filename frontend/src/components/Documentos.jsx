import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { 
  FileText, 
  Search, 
  Building, 
  Calendar, 
  AlertCircle, 
  ArrowUpRight, 
  CheckCircle,
  Clock
} from 'lucide-react';

export default function Documentos({ user, onViewDocument, onGoToCompany }) {
  const [documentos, setDocumentos] = useState([]);
  const [empresas, setEmpresas] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrgao, setSelectedOrgao] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // Reset pagination on filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedOrgao, selectedStatus]);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [docList, empList] = await Promise.all([
          api.listDocumentos(),
          api.listEmpresas()
        ]);
        setDocumentos(docList);
        setEmpresas(empList);
      } catch (err) {
        console.error("Erro ao obter lista de documentos:", err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const getEmpresaNome = (companyId) => {
    const found = empresas.find(e => e._id === companyId);
    return found ? found.nome_fantasia : 'Desconhecida';
  };

  const getEmpresaSegmento = (companyId) => {
    const found = empresas.find(e => e._id === companyId);
    return found ? found.segmento : '';
  };

  // Unique lists for filtering dropdowns
  const orgaosUnicos = [...new Set(documentos.map(d => d.orgao))];

  // Filtering logic
  const filteredDocs = documentos.filter(doc => {
    const companyName = getEmpresaNome(doc.empresa_id);
    const matchesSearch = 
      doc.tipo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.orgao.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (doc.numero_processo || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      companyName.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesOrgao = selectedOrgao ? doc.orgao === selectedOrgao : true;
    
    // expiry date checks or status checks
    let matchesStatus = true;
    if (selectedStatus === 'Vencido') {
      matchesStatus = new Date(doc.data_vencimento) < new Date();
    } else if (selectedStatus === 'Ativo') {
      matchesStatus = doc.status === 'Ativo' && new Date(doc.data_vencimento) >= new Date();
    }

    return matchesSearch && matchesOrgao && matchesStatus;
  });

  const ITEMS_PER_PAGE = 12;
  const totalPages = Math.ceil(filteredDocs.length / ITEMS_PER_PAGE);
  const paginatedDocs = filteredDocs.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  if (loading) {
    return (
      <div style={styles.loaderContainer}>
        <div className="animate-spin" style={styles.spinner}></div>
        <p style={{ marginTop: '1rem', color: 'var(--text-muted)' }}>Carregando portfólio de licenças...</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in" style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.title}>Documentos & Licenças</h1>
        <p style={styles.subtitle}>Consulte o acervo de alvarás, certificados e licenças regulatórias de todas as empresas.</p>
      </header>

      {/* Controles de Filtros */}
      <div style={styles.filtersRow} className="glass-card">
        <div style={styles.searchContainer}>
          <Search size={18} style={styles.searchIcon} />
          <input 
            type="text"
            placeholder="Pesquisar por licença, órgão, processo ou cliente..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={styles.searchInput}
          />
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <select
            value={selectedOrgao}
            onChange={e => setSelectedOrgao(e.target.value)}
            className="glass-input glass-select"
            style={styles.selectInput}
          >
            <option value="">Todos os Órgãos</option>
            {orgaosUnicos.map(org => (
              <option key={org} value={org}>{org}</option>
            ))}
          </select>

          <select
            value={selectedStatus}
            onChange={e => setSelectedStatus(e.target.value)}
            className="glass-input glass-select"
            style={styles.selectInput}
          >
            <option value="">Todos os Status</option>
            <option value="Ativo">Válidos (Ativos)</option>
            <option value="Vencido">Vencidos / Expirados</option>
          </select>
        </div>
      </div>

      {/* Grid de Cartões de Documento */}
      <div style={styles.grid} className="documentos-grid">
        {paginatedDocs.map(doc => {
          const isExpired = new Date(doc.data_vencimento) < new Date();
          const companyName = getEmpresaNome(doc.empresa_id);
          const segment = getEmpresaSegmento(doc.empresa_id);

          return (
            <div 
              key={doc._id} 
              className="glass-panel card-hover" 
              style={styles.card}
              onClick={() => onViewDocument(doc._id)}
            >
              <div style={styles.cardHeader}>
                <div style={styles.brandIconContainer}>
                  <FileText size={20} color="var(--primary)" />
                </div>
                <div style={{ flex: 1 }}>
                  <h3 style={styles.cardTitle}>{doc.tipo}</h3>
                  <span style={styles.orgaoBadge}>{doc.orgao}</span>
                </div>
                <ArrowUpRight size={18} style={styles.arrowIcon} />
              </div>

              <div style={styles.cardBody}>
                <div style={styles.infoRow} onClick={(e) => { e.stopPropagation(); onGoToCompany(doc.empresa_id); }}>
                  <Building size={14} color="var(--text-muted)" />
                  <span style={styles.companyLink}>Cliente: {companyName}</span>
                </div>

                <div style={styles.infoRow}>
                  <Calendar size={14} color="var(--text-muted)" />
                  <span>
                    Vencimento: <strong style={{ color: isExpired ? 'var(--danger)' : 'var(--text-main)' }}>
                      {new Date(doc.data_vencimento).toLocaleDateString('pt-BR')}
                    </strong>
                  </span>
                </div>

                <div style={styles.infoRow}>
                  <Clock size={14} color="var(--text-muted)" />
                  <span>Processo: {doc.numero_processo || 'Não informado'}</span>
                </div>

                {/* Status Badge */}
                <div style={{ marginTop: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ 
                    ...styles.statusBadge, 
                    background: isExpired ? 'rgba(239, 68, 68, 0.12)' : 'rgba(16, 185, 129, 0.12)',
                    color: isExpired ? 'var(--danger)' : 'var(--success)'
                  }}>
                    {isExpired ? 'Vencido' : doc.status}
                  </span>
                  <span style={styles.segmentBadge}>{segment}</span>
                </div>
              </div>
            </div>
          );
        })}

        {filteredDocs.length === 0 && (
          <div className="glass-panel" style={{ colSpan: '3', padding: '3rem', width: '100%', textAlign: 'center' }}>
            <AlertCircle size={36} color="var(--text-muted)" style={{ margin: '0 auto 0.5rem' }} />
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Nenhum documento encontrado com os filtros informados.</p>
          </div>
        )}
      </div>

      {/* Paginação */}
      {totalPages > 1 && (
        <div style={styles.paginationRow}>
          <button 
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            className="glass-button"
            style={{
              ...styles.pageBtn,
              opacity: currentPage === 1 ? 0.5 : 1,
              cursor: currentPage === 1 ? 'not-allowed' : 'pointer'
            }}
          >
            Anterior
          </button>
          <span style={styles.pageInfo}>
            Página <strong style={{ color: 'var(--primary)' }}>{currentPage}</strong> de {totalPages} ({filteredDocs.length} documentos)
          </span>
          <button 
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            className="glass-button"
            style={{
              ...styles.pageBtn,
              opacity: currentPage === totalPages ? 0.5 : 1,
              cursor: currentPage === totalPages ? 'not-allowed' : 'pointer'
            }}
          >
            Próxima
          </button>
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
    flexWrap: 'wrap',
  },
  searchContainer: {
    position: 'relative',
    flex: 1,
    maxWidth: '500px',
    minWidth: '280px',
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
    width: '200px',
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
  orgaoBadge: {
    fontSize: '0.7rem',
    fontWeight: '600',
    background: 'rgba(255, 255, 255, 0.7)',
    border: '1px solid var(--glass-border)',
    color: 'var(--text-muted)',
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
    fontSize: '0.825rem',
    color: 'var(--text-main)',
  },
  companyLink: {
    fontWeight: '550',
    textDecoration: 'underline',
    cursor: 'pointer',
    color: 'var(--primary)',
  },
  statusBadge: {
    fontSize: '0.7rem',
    fontWeight: '600',
    padding: '0.15rem 0.45rem',
    borderRadius: '6px',
  },
  segmentBadge: {
    fontSize: '0.65rem',
    color: 'var(--text-muted)',
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
  paginationRow: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '1.5rem',
    marginTop: '2.5rem',
    padding: '1rem',
  },
  pageBtn: {
    padding: '0.5rem 1rem',
    border: '1px solid var(--glass-border)',
    background: 'rgba(255, 255, 255, 0.4)',
    borderRadius: '8px',
    fontSize: '0.85rem',
    fontWeight: '600',
    color: 'var(--text-main)',
    transition: 'all 0.2s',
  },
  pageInfo: {
    fontSize: '0.85rem',
    color: 'var(--text-muted)',
  },
};
