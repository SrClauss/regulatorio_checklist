import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { Plus, Building, FileText, Settings, ShieldAlert, Check, User, Trash2, Edit } from 'lucide-react';

export default function Cadastros({ user }) {
  const [activeSubTab, setActiveSubTab] = useState('empresas');
  
  // Listas
  const [empresas, setEmpresas] = useState([]);
  const [documentos, setDocumentos] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [consultores, setConsultores] = useState([]);
  const [prestadores, setPrestadores] = useState([]);
  
  // Estados de Formulário
  const [empresaForm, setEmpresaForm] = useState({ razao_social: '', nome_fantasia: '', cnpj: '', cidade: '', uf: 'SP', segmento: 'Farmácia', responsavel_principal_id: '' });
  const [docForm, setDocForm] = useState({ empresa_id: '', tipo: '', orgao: '', numero_processo: '', data_emissao: '', data_vencimento: '', status: 'Ativo', valor_renovacao: 0.0, responsavel_renovacao_id: '', template_id: '' });
  const [templateForm, setTemplateForm] = useState({ segmento: 'Farmácia', nome_documento: '', validade_meses_padrao: 12, valor_renovacao_sugerido: 0.0 });
  const [condicionantesSugeridas, setCondicionantesSugeridas] = useState([{ titulo: '', frequencia_meses: 1, cliente_executa: false, valor_sugerido: 0.0, e_pre_requisito: false }]);
  
  const [prestadorForm, setPrestadorForm] = useState({ nome: '', cnpj: '', contato: '', ativo: true });
  const [editingPrestadorId, setEditingPrestadorId] = useState(null);
  
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchDados = async () => {
    try {
      const eList = await api.listEmpresas();
      setEmpresas(eList);

      const dList = await api.listDocumentos();
      setDocumentos(dList);

      const tList = await api.listTemplates();
      setTemplates(tList);

      const uList = await api.listUsuarios();
      const cList = uList.filter(u => u.role === 'consultor' || u.role === 'admin');
      setConsultores(cList);

      const pList = await api.listPrestadores();
      setPrestadores(pList);

      // Valores default para forms
      if (cList.length > 0) {
        setEmpresaForm(prev => ({ ...prev, responsavel_principal_id: cList[0]._id }));
        setDocForm(prev => ({ ...prev, responsavel_renovacao_id: cList[0]._id }));
      }
      if (eList.length > 0) {
        setDocForm(prev => ({ ...prev, empresa_id: eList[0]._id }));
      }
    } catch (err) {
      console.error("Erro ao obter dados administrativos:", err);
    }
  };

  useEffect(() => {
    fetchDados();
  }, [activeSubTab]);

  const showFeedback = (success, message) => {
    if (success) {
      setSuccessMsg(message);
      setTimeout(() => setSuccessMsg(''), 4000);
    } else {
      setErrorMsg(message);
      setTimeout(() => setErrorMsg(''), 4000);
    }
  };

  // Submissão - Empresa
  const handleEmpresaSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.createEmpresa(empresaForm);
      showFeedback(true, 'Empresa cadastrada com sucesso!');
      setEmpresaForm({ razao_social: '', nome_fantasia: '', cnpj: '', cidade: '', uf: 'SP', segmento: 'Farmácia', responsavel_principal_id: consultores[0]?._id || '' });
      fetchDados();
    } catch (err) {
      showFeedback(false, err.message || 'Erro ao cadastrar empresa.');
    } finally {
      setLoading(false);
    }
  };

  // Submissão - Documento
  const handleDocSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        empresa_id: docForm.empresa_id,
        tipo: docForm.tipo,
        orgao: docForm.orgao,
        numero_processo: docForm.numero_processo || null,
        data_emissao: new Date(docForm.data_emissao).toISOString(),
        data_vencimento: new Date(docForm.data_vencimento).toISOString(),
        status: docForm.status,
        valor_renovacao: parseFloat(docForm.valor_renovacao) || 0.0,
        responsavel_renovacao_id: docForm.responsavel_renovacao_id
      };

      await api.createDocumento(payload, docForm.template_id || null);
      showFeedback(true, 'Documento e condicionantes em lote gerados com sucesso!');
      setDocForm({ empresa_id: empresas[0]?._id || '', tipo: '', orgao: '', numero_processo: '', data_emissao: '', data_vencimento: '', status: 'Ativo', valor_renovacao: 0.0, responsavel_renovacao_id: consultores[0]?._id || '', template_id: '' });
      fetchDados();
    } catch (err) {
      showFeedback(false, err.message || 'Erro ao cadastrar documento.');
    } finally {
      setLoading(false);
    }
  };

  // Submissão - Template
  const handleTemplateSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        ...templateForm,
        valor_renovacao_sugerido: parseFloat(templateForm.valor_renovacao_sugerido) || 0.0,
        condicionantes_sugeridas: condicionantesSugeridas.map(c => ({
          ...c,
          frequencia_meses: parseInt(c.frequencia_meses) || 0,
          valor_sugerido: parseFloat(c.valor_sugerido) || 0.0
        }))
      };

      await api.createTemplate(payload);
      showFeedback(true, 'Template de documento cadastrado com sucesso!');
      setTemplateForm({ segmento: 'Farmácia', nome_documento: '', validade_meses_padrao: 12, valor_renovacao_sugerido: 0.0 });
      setCondicionantesSugeridas([{ titulo: '', frequencia_meses: 1, cliente_executa: false, valor_sugerido: 0.0, e_pre_requisito: false }]);
      fetchDados();
    } catch (err) {
      showFeedback(false, err.message || 'Erro ao cadastrar template.');
    } finally {
      setLoading(false);
    }
  };

  // Manipuladores de condicionantes dinâmicas do template
  const handleAddCondicionante = () => {
    setCondicionantesSugeridas([...condicionantesSugeridas, { titulo: '', frequencia_meses: 1, cliente_executa: false, valor_sugerido: 0.0, e_pre_requisito: false }]);
  };

  const handleCondicionanteChange = (index, field, val) => {
    const list = [...condicionantesSugeridas];
    list[index][field] = val;
    setCondicionantesSugeridas(list);
  };

  const handleRemoveCondicionante = (index) => {
    const list = [...condicionantesSugeridas];
    list.splice(index, 1);
    setCondicionantesSugeridas(list);
  };

  // Submissão - Prestador
  const handlePrestadorSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editingPrestadorId) {
        await api.updatePrestador(editingPrestadorId, prestadorForm);
        showFeedback(true, 'Prestador de serviço atualizado com sucesso!');
        setEditingPrestadorId(null);
      } else {
        await api.createPrestador(prestadorForm);
        showFeedback(true, 'Prestador de serviço cadastrado com sucesso!');
      }
      setPrestadorForm({ nome: '', cnpj: '', contato: '', ativo: true });
      fetchDados();
    } catch (err) {
      showFeedback(false, err.message || 'Erro ao salvar prestador.');
    } finally {
      setLoading(false);
    }
  };

  const handleEditPrestador = (prestador) => {
    setEditingPrestadorId(prestador._id);
    setPrestadorForm({
      nome: prestador.nome,
      cnpj: prestador.cnpj || '',
      contato: prestador.contato || '',
      ativo: prestador.ativo ?? true
    });
  };

  const handleDeletePrestador = async (id) => {
    if (!window.confirm('Tem certeza que deseja inativar este prestador?')) return;
    try {
      await api.deletePrestador(id);
      showFeedback(true, 'Prestador inativado com sucesso!');
      fetchDados();
    } catch (err) {
      showFeedback(false, err.message || 'Erro ao inativar prestador.');
    }
  };

  const getConsultorNome = (id) => {
    const found = consultores.find(c => c._id === id);
    return found ? found.nome : 'Nenhum';
  };

  return (
    <div className="animate-fade-in" style={styles.container}>
      <header style={styles.header}>
        <div>
          <h1 style={styles.title}>Painel Administrativo</h1>
          <p style={styles.subtitle}>Gerencie empresas clientes, configure licenças e cadastre templates operacionais.</p>
        </div>
      </header>

      {/* Sub-abas */}
      <div style={styles.tabsContainer} className="glass-card">
        <button 
          onClick={() => setActiveSubTab('empresas')}
          style={{ ...styles.tabBtn, ...(activeSubTab === 'empresas' ? styles.tabBtnActive : {}) }}
        >
          <Building size={16} /> Empresas
        </button>
        <button 
          onClick={() => setActiveSubTab('documentos')}
          style={{ ...styles.tabBtn, ...(activeSubTab === 'documentos' ? styles.tabBtnActive : {}) }}
        >
          <FileText size={16} /> Documentos & Licenças
        </button>
        <button 
          onClick={() => setActiveSubTab('templates')}
          style={{ ...styles.tabBtn, ...(activeSubTab === 'templates' ? styles.tabBtnActive : {}) }}
        >
          <Settings size={16} /> Templates de Processos
        </button>
        <button 
          onClick={() => setActiveSubTab('prestadores')}
          style={{ ...styles.tabBtn, ...(activeSubTab === 'prestadores' ? styles.tabBtnActive : {}) }}
        >
          <User size={16} /> Prestadores de Serviço
        </button>
      </div>

      {successMsg && (
        <div style={styles.successAlert}>
          <Check size={18} />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div style={styles.errorAlert}>
          <ShieldAlert size={18} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Seção 1: EMPRESAS */}
      {activeSubTab === 'empresas' && (
        <div style={styles.splitLayout}>
          <form onSubmit={handleEmpresaSubmit} className="glass-panel" style={styles.formPanel}>
            <h3 style={styles.panelTitle}>Cadastrar Nova Empresa</h3>
            
            <div className="glass-input-group">
              <label className="glass-label">Razão Social</label>
              <input type="text" required value={empresaForm.razao_social} onChange={e => setEmpresaForm({...empresaForm, razao_social: e.target.value})} className="glass-input" placeholder="Razão Social da Empresa Ltda" />
            </div>

            <div className="glass-input-group">
              <label className="glass-label">Nome Fantasia</label>
              <input type="text" required value={empresaForm.nome_fantasia} onChange={e => setEmpresaForm({...empresaForm, nome_fantasia: e.target.value})} className="glass-input" placeholder="Nome Comercial" />
            </div>

            <div className="glass-input-group">
              <label className="glass-label">CNPJ</label>
              <input type="text" required value={empresaForm.cnpj} onChange={e => setEmpresaForm({...empresaForm, cnpj: e.target.value})} className="glass-input" placeholder="00.000.000/0001-00" />
            </div>

            <div style={styles.formRow}>
              <div className="glass-input-group" style={{ flex: 2 }}>
                <label className="glass-label">Cidade</label>
                <input type="text" required value={empresaForm.cidade} onChange={e => setEmpresaForm({...empresaForm, cidade: e.target.value})} className="glass-input" placeholder="Ex: Campinas" />
              </div>
              <div className="glass-input-group" style={{ flex: 1 }}>
                <label className="glass-label">UF</label>
                <select value={empresaForm.uf} onChange={e => setEmpresaForm({...empresaForm, uf: e.target.value})} className="glass-input glass-select">
                  <option value="SP">SP</option><option value="RJ">RJ</option><option value="MG">MG</option><option value="PR">PR</option>
                </select>
              </div>
            </div>

            <div className="glass-input-group">
              <label className="glass-label">Segmento</label>
              <input type="text" required value={empresaForm.segmento} onChange={e => setEmpresaForm({...empresaForm, segmento: e.target.value})} className="glass-input" placeholder="Farmácia, AVCB, Alimentação..." />
            </div>

            <div className="glass-input-group">
              <label className="glass-label">Consultor Técnico Responsável</label>
              <select value={empresaForm.responsavel_principal_id} onChange={e => setEmpresaForm({...empresaForm, responsavel_principal_id: e.target.value})} className="glass-input glass-select">
                {consultores.map(c => (
                  <option key={c._id} value={c._id}>{c.nome}</option>
                ))}
              </select>
            </div>

            <button type="submit" disabled={loading} className="glass-btn glass-btn-primary" style={styles.fullWidthBtn}>
              Salvar Empresa
            </button>
          </form>

          {/* Listagem */}
          <div className="glass-panel" style={styles.listPanel}>
            <h3 style={styles.panelTitle}>Empresas Ativas ({empresas.length})</h3>
            <div style={styles.list}>
              {empresas.map(emp => (
                <div key={emp._id} style={styles.listItem} className="glass-card">
                  <div>
                    <h4 style={styles.itemTitle}>{emp.nome_fantasia}</h4>
                    <p style={styles.itemSubtitle}>{emp.razao_social}</p>
                    <span style={styles.itemTag}>CNPJ: {emp.cnpj}</span>
                  </div>
                  <span style={styles.itemTag}>Responsável: {getConsultorNome(emp.responsavel_principal_id)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Seção 2: DOCUMENTOS */}
      {activeSubTab === 'documentos' && (
        <div style={styles.splitLayout}>
          <form onSubmit={handleDocSubmit} className="glass-panel" style={styles.formPanel}>
            <h3 style={styles.panelTitle}>Cadastrar Documento Regulatório</h3>
            
            <div className="glass-input-group">
              <label className="glass-label">Empresa Associada</label>
              <select value={docForm.empresa_id} onChange={e => setDocForm({...docForm, empresa_id: e.target.value})} className="glass-input glass-select">
                {empresas.map(emp => (
                  <option key={emp._id} value={emp._id}>{emp.nome_fantasia}</option>
                ))}
              </select>
            </div>

            <div className="glass-input-group">
              <label className="glass-label">Template do Documento (Geração Automática de Tarefas)</label>
              <select value={docForm.template_id} onChange={e => setDocForm({...docForm, template_id: e.target.value})} className="glass-input glass-select">
                <option value="">Nenhum (Cadastrar avulso sem gerar condicionantes)</option>
                {templates.map(t => (
                  <option key={t._id} value={t._id}>{t.nome_documento} ({t.segmento})</option>
                ))}
              </select>
            </div>

            <div className="glass-input-group">
              <label className="glass-label">Tipo de Documento</label>
              <input type="text" required value={docForm.tipo} onChange={e => setDocForm({...docForm, tipo: e.target.value})} className="glass-input" placeholder="Ex: Licença Sanitária, AVCB, Alvará de Funcionamento" />
            </div>

            <div style={styles.formRow}>
              <div className="glass-input-group" style={{ flex: 1 }}>
                <label className="glass-label">Órgão Emissor</label>
                <input type="text" required value={docForm.orgao} onChange={e => setDocForm({...docForm, orgao: e.target.value})} className="glass-input" placeholder="Ex: VISA, Corpo de Bombeiros" />
              </div>
              <div className="glass-input-group" style={{ flex: 1 }}>
                <label className="glass-label">Nº do Processo / Protocolo</label>
                <input type="text" value={docForm.numero_processo} onChange={e => setDocForm({...docForm, numero_processo: e.target.value})} className="glass-input" placeholder="992/2026" />
              </div>
            </div>

            <div style={styles.formRow}>
              <div className="glass-input-group" style={{ flex: 1 }}>
                <label className="glass-label">Data de Emissão</label>
                <input type="date" required value={docForm.data_emissao} onChange={e => setDocForm({...docForm, data_emissao: e.target.value})} className="glass-input" />
              </div>
              <div className="glass-input-group" style={{ flex: 1 }}>
                <label className="glass-label">Data de Vencimento</label>
                <input type="date" required value={docForm.data_vencimento} onChange={e => setDocForm({...docForm, data_vencimento: e.target.value})} className="glass-input" />
              </div>
            </div>

            <div style={styles.formRow}>
              <div className="glass-input-group" style={{ flex: 1 }}>
                <label className="glass-label">Valor Técnico de Renovação (R$)</label>
                <input type="number" step="0.01" required value={docForm.valor_renovacao} onChange={e => setDocForm({...docForm, valor_renovacao: e.target.value})} className="glass-input" placeholder="0.00" />
              </div>
              <div className="glass-input-group" style={{ flex: 1 }}>
                <label className="glass-label">Consultor Responsável</label>
                <select value={docForm.responsavel_renovacao_id} onChange={e => setDocForm({...docForm, responsavel_renovacao_id: e.target.value})} className="glass-input glass-select">
                  {consultores.map(c => (
                    <option key={c._id} value={c._id}>{c.nome}</option>
                  ))}
                </select>
              </div>
            </div>

            <button type="submit" disabled={loading} className="glass-btn glass-btn-primary" style={styles.fullWidthBtn}>
              Salvar Documento & Programar
            </button>
          </form>

          {/* Listagem */}
          <div className="glass-panel" style={styles.listPanel}>
            <h3 style={styles.panelTitle}>Licenças Regulatórias Ativas ({documentos.length})</h3>
            <div style={styles.list}>
              {documentos.map(doc => (
                <div key={doc._id} style={styles.listItem} className="glass-card">
                  <div>
                    <h4 style={styles.itemTitle}>{doc.tipo}</h4>
                    <p style={styles.itemSubtitle}>Orgão: {doc.orgao} | Vence em: {new Date(doc.data_vencimento).toLocaleDateString('pt-BR')}</p>
                    <span style={styles.itemTag}>Processo: {doc.numero_processo || 'Não informado'}</span>
                  </div>
                  <span style={styles.itemTag}>Faturamento de Renovação: R$ {doc.valor_renovacao}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Seção 3: TEMPLATES */}
      {activeSubTab === 'templates' && (
        <div style={styles.splitLayout}>
          <form onSubmit={handleTemplateSubmit} className="glass-panel" style={{ ...styles.formPanel, maxWidth: '550px' }}>
            <h3 style={styles.panelTitle}>Criar Template de Processo</h3>
            
            <div className="glass-input-group">
              <label className="glass-label">Nome do Documento Base</label>
              <input type="text" required value={templateForm.nome_documento} onChange={e => setTemplateForm({...templateForm, nome_documento: e.target.value})} className="glass-input" placeholder="Ex: Licença Sanitária VISA" />
            </div>

            <div style={styles.formRow}>
              <div className="glass-input-group" style={{ flex: 1 }}>
                <label className="glass-label">Validade Padrão (Meses)</label>
                <input type="number" required value={templateForm.validade_meses_padrao} onChange={e => setTemplateForm({...templateForm, validade_meses_padrao: e.target.value})} className="glass-input" placeholder="12" />
              </div>
              <div className="glass-input-group" style={{ flex: 1 }}>
                <label className="glass-label">Valor de Renovação Sugerido (R$)</label>
                <input type="number" step="0.01" required value={templateForm.valor_renovacao_sugerido} onChange={e => setTemplateForm({...templateForm, valor_renovacao_sugerido: e.target.value})} className="glass-input" placeholder="1000.00" />
              </div>
            </div>

            {/* Condicionantes Sugeridas */}
            <div style={styles.condicionantesSection}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <h4 style={styles.condHeader}>Condicionantes Sugeridas</h4>
                <button type="button" onClick={handleAddCondicionante} className="glass-btn" style={styles.addBtn}>
                  <Plus size={14} /> Adicionar Condicionante
                </button>
              </div>

              {condicionantesSugeridas.map((cond, idx) => (
                <div key={idx} style={styles.condRow} className="glass-card">
                  <div className="glass-input-group">
                    <label className="glass-label">Título da Condicionante / Checklist</label>
                    <input type="text" required value={cond.titulo} onChange={e => handleCondicionanteChange(idx, 'titulo', e.target.value)} className="glass-input" placeholder="Ex: Higienização de Caixas d'Água" />
                  </div>

                  <div style={styles.formRow}>
                    <div className="glass-input-group" style={{ flex: 2 }}>
                      <label className="glass-label">Periodicidade (Meses)</label>
                      <select value={cond.frequencia_meses} onChange={e => handleCondicionanteChange(idx, 'frequencia_meses', e.target.value)} className="glass-input glass-select">
                        <option value="1">Mensal (1 em 1 mês)</option>
                        <option value="3">Trimestral (3 em 3 meses)</option>
                        <option value="6">Semestral (6 em 6 meses)</option>
                        <option value="0">Única (Apenas no vencimento da licença)</option>
                      </select>
                    </div>

                    <div className="glass-input-group" style={{ flex: 1.5 }}>
                      <label className="glass-label">Valor (R$)</label>
                      <input type="number" step="0.01" required value={cond.valor_sugerido} onChange={e => handleCondicionanteChange(idx, 'valor_sugerido', e.target.value)} className="glass-input" placeholder="0.00" />
                    </div>

                    <div className="glass-input-group" style={{ flex: 1, justifyContent: 'center' }}>
                      <label className="glass-label">Cliente Executa?</label>
                      <input type="checkbox" checked={cond.cliente_executa} onChange={e => handleCondicionanteChange(idx, 'cliente_executa', e.target.checked)} style={styles.checkbox} />
                    </div>

                    <div className="glass-input-group" style={{ flex: 1, justifyContent: 'center' }}>
                      <label className="glass-label">Pré-requisito?</label>
                      <input type="checkbox" checked={cond.e_pre_requisito || false} onChange={e => handleCondicionanteChange(idx, 'e_pre_requisito', e.target.checked)} style={styles.checkbox} />
                    </div>
                  </div>

                  {condicionantesSugeridas.length > 1 && (
                    <button type="button" onClick={() => handleRemoveCondicionante(idx)} style={styles.removeCondBtn}>
                      Remover Condicionante
                    </button>
                  )}
                </div>
              ))}
            </div>

            <button type="submit" disabled={loading} className="glass-btn glass-btn-primary" style={styles.fullWidthBtn}>
              Criar Template
            </button>
          </form>

          {/* Listagem */}
          <div className="glass-panel" style={styles.listPanel}>
            <h3 style={styles.panelTitle}>Templates Cadastros ({templates.length})</h3>
            <div style={styles.list}>
              {templates.map(temp => (
                <div key={temp._id} style={styles.listItem} className="glass-card">
                  <div>
                    <h4 style={styles.itemTitle}>{temp.nome_documento}</h4>
                    <p style={styles.itemSubtitle}>Segmento: {temp.segmento} | Validade padrão: {temp.validade_meses_padrao} meses</p>
                    <span style={styles.itemTag}>Condicionantes Padrão: {temp.condicionantes_sugeridas?.length || 0}</span>
                  </div>
                  <span style={styles.itemTag}>Faturamento sugerido: R$ {temp.valor_renovacao_sugerido}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Seção 4: PRESTADORES */}
      {activeSubTab === 'prestadores' && (
        <div style={styles.splitLayout}>
          <form onSubmit={handlePrestadorSubmit} className="glass-panel" style={styles.formPanel}>
            <h3 style={styles.panelTitle}>{editingPrestadorId ? 'Editar Prestador' : 'Cadastrar Novo Prestador'}</h3>
            
            <div className="glass-input-group">
              <label className="glass-label">Nome / Razão Social</label>
              <input type="text" required value={prestadorForm.nome} onChange={e => setPrestadorForm({...prestadorForm, nome: e.target.value})} className="glass-input" placeholder="Ex: Dedetizadora Limpa Tudo Ltda" />
            </div>

            <div className="glass-input-group">
              <label className="glass-label">CNPJ (Opcional)</label>
              <input type="text" value={prestadorForm.cnpj} onChange={e => setPrestadorForm({...prestadorForm, cnpj: e.target.value})} className="glass-input" placeholder="00.000.000/0001-00" />
            </div>

            <div className="glass-input-group">
              <label className="glass-label">Contato (Telefone / Email)</label>
              <input type="text" value={prestadorForm.contato} onChange={e => setPrestadorForm({...prestadorForm, contato: e.target.value})} className="glass-input" placeholder="Ex: (19) 99999-9999 / contato@empresa.com" />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '1rem 0' }}>
              <input type="checkbox" id="prestador-ativo" checked={prestadorForm.ativo} onChange={e => setPrestadorForm({...prestadorForm, ativo: e.target.checked})} style={styles.checkbox} />
              <label htmlFor="prestador-ativo" className="glass-label" style={{ margin: 0, cursor: 'pointer' }}>Prestador Ativo</label>
            </div>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <button type="submit" disabled={loading} className="glass-btn glass-btn-primary" style={{ flex: 2, padding: '0.75rem' }}>
                {editingPrestadorId ? 'Salvar Alterações' : 'Salvar Prestador'}
              </button>
              {editingPrestadorId && (
                <button type="button" onClick={() => { setEditingPrestadorId(null); setPrestadorForm({ nome: '', cnpj: '', contato: '', ativo: true }); }} className="glass-btn" style={{ flex: 1, padding: '0.75rem' }}>
                  Cancelar
                </button>
              )}
            </div>
          </form>

          {/* Listagem */}
          <div className="glass-panel" style={styles.listPanel}>
            <h3 style={styles.panelTitle}>Prestadores Cadastrados ({prestadores.length})</h3>
            <div style={styles.list}>
              {prestadores.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Nenhum prestador cadastrado.</p>
              ) : (
                prestadores.map(p => (
                  <div key={p._id} style={{ ...styles.listItem, opacity: p.ativo ? 1 : 0.6 }} className="glass-card">
                    <div>
                      <h4 style={styles.itemTitle}>{p.nome}</h4>
                      {p.cnpj && <p style={styles.itemSubtitle}>CNPJ: {p.cnpj}</p>}
                      {p.contato && <p style={styles.itemSubtitle}>Contato: {p.contato}</p>}
                      <span style={{ ...styles.itemTag, color: p.ativo ? 'var(--success)' : 'var(--danger)' }}>
                        {p.ativo ? 'Ativo' : 'Inativo'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button onClick={() => handleEditPrestador(p)} className="glass-btn" style={{ padding: '0.35rem' }} title="Editar">
                        <Edit size={14} />
                      </button>
                      <button onClick={() => handleDeletePrestador(p._id)} className="glass-btn" style={{ padding: '0.35rem', color: 'var(--danger)' }} title="Deletar/Inativar">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
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
  tabsContainer: {
    display: 'flex',
    gap: '1rem',
    padding: '0.5rem 1rem',
    width: 'max-content',
  },
  tabBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.6rem 1.25rem',
    borderRadius: '10px',
    border: '1px solid transparent',
    background: 'transparent',
    cursor: 'pointer',
    fontFamily: 'var(--font-heading)',
    fontSize: '0.9rem',
    fontWeight: '600',
    color: 'var(--text-muted)',
  },
  tabBtnActive: {
    background: 'rgba(255, 255, 255, 0.55)',
    borderColor: 'var(--glass-border)',
    color: 'var(--primary)',
    boxShadow: 'var(--shadow-sm)',
  },
  splitLayout: {
    display: 'flex',
    gap: '1.5rem',
    alignItems: 'flex-start',
    width: '100%',
  },
  formPanel: {
    flex: 1.2,
    padding: '1.75rem',
  },
  listPanel: {
    flex: 1,
    padding: '1.75rem',
    maxHeight: '750px',
    overflowY: 'auto',
  },
  panelTitle: {
    fontSize: '1.2rem',
    fontWeight: '700',
    marginBottom: '1.5rem',
    color: 'var(--text-main)',
  },
  formRow: {
    display: 'flex',
    gap: '1rem',
    width: '100%',
  },
  fullWidthBtn: {
    width: '100%',
    padding: '0.75rem',
    marginTop: '0.5rem',
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  listItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '1.25rem',
  },
  itemTitle: {
    fontSize: '0.95rem',
    fontWeight: '600',
    color: 'var(--text-main)',
  },
  itemSubtitle: {
    fontSize: '0.8rem',
    color: 'var(--text-muted)',
    marginTop: '0.15rem',
  },
  itemTag: {
    fontSize: '0.75rem',
    fontWeight: '600',
    color: 'var(--text-light)',
  },
  condicionantesSection: {
    marginTop: '1.5rem',
    marginBottom: '1.5rem',
    borderTop: '1px solid var(--glass-border)',
    paddingTop: '1rem',
  },
  condHeader: {
    fontSize: '0.9rem',
    fontWeight: '600',
    color: 'var(--text-main)',
  },
  addBtn: {
    padding: '0.4rem 0.8rem',
    fontSize: '0.8rem',
    background: 'rgba(255, 255, 255, 0.4)',
  },
  condRow: {
    padding: '1rem',
    marginBottom: '0.75rem',
    background: 'rgba(255, 255, 255, 0.25)',
  },
  checkbox: {
    width: '18px',
    height: '18px',
    cursor: 'pointer',
  },
  removeCondBtn: {
    background: 'transparent',
    border: 'none',
    color: 'var(--danger)',
    fontSize: '0.75rem',
    fontWeight: '600',
    cursor: 'pointer',
    marginTop: '0.5rem',
  },
  successAlert: {
    background: 'var(--success-light)',
    border: '1px solid rgba(16, 185, 129, 0.2)',
    borderRadius: '12px',
    padding: '0.75rem 1rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    color: 'var(--success)',
    fontSize: '0.875rem',
    fontWeight: '500',
  },
  errorAlert: {
    background: 'var(--danger-light)',
    border: '1px solid rgba(239, 68, 68, 0.2)',
    borderRadius: '12px',
    padding: '0.75rem 1rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    color: 'var(--danger)',
    fontSize: '0.875rem',
    fontWeight: '500',
  },
};
