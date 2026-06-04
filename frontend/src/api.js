const API_BASE_URL = '';

// Retorna os cabeçalhos de autenticação padrão
function getHeaders() {
  const token = localStorage.getItem('token');
  const headers = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export const api = {
  // Autenticação
  async login(email, password) {
    const formData = new URLSearchParams();
    formData.append('username', email); // O OAuth2 do FastAPI espera 'username'
    formData.append('password', password);

    const response = await fetch(`${API_BASE_URL}/api/auth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || 'Falha no login');
    }

    const data = await response.json();
    localStorage.setItem('token', data.access_token);
    return data;
  },

  logout() {
    localStorage.removeItem('token');
  },

  async getMe() {
    const response = await fetch(`${API_BASE_URL}/api/usuarios/me`, {
      method: 'GET',
      headers: getHeaders(),
    });
    if (!response.ok) {
      throw new Error('Não autenticado');
    }
    return response.json();
  },

  async listUsuarios() {
    const response = await fetch(`${API_BASE_URL}/api/usuarios`, {
      method: 'GET',
      headers: getHeaders(),
    });
    if (!response.ok) throw new Error('Falha ao listar usuários');
    return response.json();
  },

  // Empresas
  async listEmpresas() {
    const response = await fetch(`${API_BASE_URL}/api/empresas`, {
      method: 'GET',
      headers: getHeaders(),
    });
    if (!response.ok) throw new Error('Falha ao listar empresas');
    return response.json();
  },

  async createEmpresa(data) {
    const response = await fetch(`${API_BASE_URL}/api/empresas`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.detail || 'Falha ao criar empresa');
    }
    return response.json();
  },

  // Templates
  async listTemplates() {
    const response = await fetch(`${API_BASE_URL}/api/templates`, {
      method: 'GET',
      headers: getHeaders(),
    });
    if (!response.ok) throw new Error('Falha ao listar templates');
    return response.json();
  },

  async createTemplate(data) {
    const response = await fetch(`${API_BASE_URL}/api/templates`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.detail || 'Falha ao criar template');
    }
    return response.json();
  },

  // Documentos
  async listDocumentos() {
    const response = await fetch(`${API_BASE_URL}/api/documentos`, {
      method: 'GET',
      headers: getHeaders(),
    });
    if (!response.ok) throw new Error('Falha ao listar documentos');
    return response.json();
  },

  async createDocumento(data, templateId = null) {
    let url = `${API_BASE_URL}/api/documentos`;
    if (templateId) {
      url += `?template_id=${templateId}`;
    }
    const response = await fetch(url, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.detail || 'Falha ao criar documento');
    }
    return response.json();
  },

  // Tarefas (Checklist)
  async listTarefas(filters = {}) {
    const params = new URLSearchParams();
    if (filters.empresa_id) params.append('empresa_id', filters.empresa_id);
    if (filters.documento_id) params.append('documento_id', filters.documento_id);
    if (filters.responsavel_id) params.append('responsavel_id', filters.responsavel_id);
    if (filters.status) params.append('status', filters.status);
    if (filters.data_inicio) params.append('data_inicio', filters.data_inicio);
    if (filters.data_fim) params.append('data_fim', filters.data_fim);

    const response = await fetch(`${API_BASE_URL}/api/tarefas?${params.toString()}`, {
      method: 'GET',
      headers: getHeaders(),
    });
    if (!response.ok) throw new Error('Falha ao listar tarefas');
    return response.json();
  },

  async updateTarefa(id, payload, observacao = null) {
    let url = `${API_BASE_URL}/api/tarefas/${id}`;
    if (observacao) {
      url += `?observacao=${encodeURIComponent(observacao)}`;
    }
    const response = await fetch(url, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.detail || 'Falha ao atualizar tarefa');
    }
    return response.json();
  },

  async uploadComprovante(id, file) {
    const formData = new FormData();
    formData.append('file', file);

    const token = localStorage.getItem('token');
    const headers = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}/api/tarefas/${id}/upload-comprovante`, {
      method: 'POST',
      headers: headers, // Não passa Content-Type no FormData para o navegador definir a fronteira
      body: formData,
    });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.detail || 'Falha ao enviar comprovante');
    }
    return response.json();
  },

  // Previsibilidade (Faturamento)
  async getPrevisibilidadeMensal(mes, ano) {
    const response = await fetch(`${API_BASE_URL}/api/previsibilidade/mensal?mes=${mes}&ano=${ano}`, {
      method: 'GET',
      headers: getHeaders(),
    });
    if (!response.ok) throw new Error('Falha ao obter previsibilidade mensal');
    return response.json();
  },

  async getPrevisibilidadeAnual(ano) {
    const response = await fetch(`${API_BASE_URL}/api/previsibilidade/anual?ano=${ano}`, {
      method: 'GET',
      headers: getHeaders(),
    });
    if (!response.ok) throw new Error('Falha ao obter previsibilidade anual');
    return response.json();
  },
};
