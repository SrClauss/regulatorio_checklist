# 📋 Roteiro de Desenvolvimento (Amanhã)

## 🏗️ Melhorias no Módulo de Prestadores

Objetivo: Evoluir a gestão de fornecedores terceirizados de serviços ambientais e auditores de condicionantes.

### Checklist de Tarefas:

- [ ] **Designação de Prestadores a Condicionantes:**
  - Permitir associar um prestador/consultor a tarefas ou licenças específicas.
  - Tela de edição de tarefa: adicionar dropdown de seleção de prestador cadastrado.

- [ ] **Mapeamento de Custos e Tarifas:**
  - Cadastrar o custo estimado por obrigação ou o valor acordado com o prestador.
  - Exibir nas listas analíticas e relatórios do cronograma o valor associado ao prestador.

- [ ] **Painel de Desempenho (Performance):**
  - Monitorar taxa de atrasos de condicionantes por prestador.
  - Criar um indicador visual de SLA de conformidade do prestador.

- [ ] **Filtros e Visualização:**
  - Adicionar filtro por prestador na lista analítica do Cronograma.
  - Exibir o nome do prestador atrelado nos cards expandidos da Linha do Tempo.

---
*Mapeamento de arquivos a serem editados amanhã:*
* Frontend: `frontend/src/components/Prestadores.jsx` e `frontend/src/components/Cronograma.jsx`
* Backend: `backend/app/models/prestador.py` e `backend/app/routes/prestadores.py`
