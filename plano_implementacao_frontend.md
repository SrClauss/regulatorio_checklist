# Plano de Implementação - Frontend (Web App)

Este documento detalha o planejamento, arquitetura visual e técnica para a construção da interface do usuário (Frontend) do **Sistema de Gestão Regulatória**. A interface será moderna, responsiva, com foco em usabilidade e estética **Premium Light-Theme Glassmorphism**.

---

## 1. Identidade Visual e Estética (Glassmorphism)

O design será construído sob o conceito de "vidro translúcido", usando efeitos de desfoque, gradientes sutis e bordas finas para criar profundidade e sofisticação no tema claro.

### Design Tokens (CSS Variables)
```css
:root {
  /* Cores Base */
  --bg-gradient: linear-gradient(135deg, #f5f7fa 0%, #e4e8f0 100%);
  --glass-bg: rgba(255, 255, 255, 0.45);
  --glass-bg-hover: rgba(255, 255, 255, 0.6);
  --glass-border: rgba(255, 255, 255, 0.25);
  --shadow-sm: 0 4px 12px 0 rgba(31, 38, 135, 0.05);
  --shadow-md: 0 8px 32px 0 rgba(31, 38, 135, 0.08);
  
  /* Cores de Destaque (Acessíveis) */
  --primary: #2563eb;       /* Azul Royal */
  --primary-hover: #1d4ed8;
  --success: #10b981;       /* Verde Esmeralda (Concluído) */
  --warning: #f59e0b;       /* Âmbar (Aguardando Auditoria) */
  --danger: #ef4444;        /* Vermelho Coral (Atrasado) */
  --text-main: #1e293b;     /* Slate 800 */
  --text-muted: #64748b;    /* Slate 500 */
  
  /* Efeito de Vidro */
  --backdrop-blur: blur(16px) saturate(120%);
  --border-radius: 16px;
}
```

### Regra de Ouro da Interface
Nenhuma página deve ser opaca ou cinza padrão. Todos os cards, modais e barras laterais aplicarão:
```css
background: var(--glass-bg);
backdrop-filter: var(--backdrop-blur);
border: 1px solid var(--glass-border);
box-shadow: var(--shadow-md);
border-radius: var(--border-radius);
```

---

## 2. Estrutura do App e Rotas

A aplicação será SPA (Single Page Application) utilizando **React** e **Vite** para build super rápido, estruturada com a seguinte árvore de rotas:

```
[Login] ─── (Auth Guard) ─── [Layout Principal (Glass Sidebar + Container)]
                                ├── [Dashboard] (Faturamento, Métricas e Gráficos)
                                ├── [Calendário] (Linha do tempo e visualização mensal de prazos)
                                ├── [Checklist] (Rastreamento, Auditoria e Ações)
                                └── [Cadastros]
                                      ├── [Empresas] (CRUD)
                                      ├── [Documentos] (CRUD + Ativação de Templates)
                                      └── [Templates] (Configuração de condicionantes padrões)
```

---

## 3. Detalhamento Técnico das Telas

### A. Tela de Login (`/login`)
*   **Visual:** Card central glassmórfico sobreposto a um fundo com gradiente fluido animado.
*   **Campos:** E-mail e Senha.
*   **Mecanismo:** Envia requisição para `/api/auth/login`, armazena o token JWT em `localStorage` e redireciona para a Dashboard.

### B. Dashboard Principal (`/dashboard`)
*   **Indicador de Faturamento Esperado:** Card em destaque exibindo a soma das tarefas ativas e das renovações de documentos programadas para o mês corrente (usando endpoints `/api/previsibilidade/mensal` filtrados por mês/ano atual).
*   **Painel de Alertas Regulatórios:**
    *   *Documentos a vencer:* Contagem e lista rápida de licenças vencendo nos próximos 30, 60 e 90 dias.
    *   *Condicionantes pendentes:* Lista de tarefas urgentes ordenadas por vencimento mais próximo.
*   **Gráfico de Previsibilidade:** Gráfico de barras combinando receitas estimadas de condicionantes e custos de renovações para os 12 meses do ano corrente (`/api/previsibilidade/anual`).

### C. Calendário de Processos (`/calendario`)
*   **Interface:** Calendário interativo mensal baseado em grid fluido.
*   **Eventos:** Exibe blocos coloridos nas datas de vencimento de documentos (AVCB, Licenças, Alvarás) e condicionantes.
*   **Interação:** Clicar em um dia ou evento abre um modal lateral (*drawer*) contendo os detalhes do processo, responsável e atalho de ação (ex: anexar comprovante ou auditar).

### D. Central de Rastreabilidade e Checklist (`/checklist`)
O núcleo operacional ("Checklister") focado na garantia de compliance e na fiscalização de quem executa as tarefas.
*   **Filtros Rápidos:**
    *   Por Empresa, Por Responsável, Por Status (`Pendente`, `Em Andamento`, `Aguardando Auditoria`, `Concluído`).
*   **Ações Operacionais:**
    *   **Assumir Tarefa (Claim):** Botão para o consultor ou funcionário se atribuir à tarefa, registrando automaticamente a transição no banco.
    *   **Submeter Comprovante:** Área de arrastar e soltar (drag & drop) para enviar comprovantes (PDF/Imagens) que faz o upload para `/api/tarefas/{id}/upload-comprovante`.
    *   **Aprovar / Recusar (Auditoria):** Exclusivo para perfis `admin` e `consultor`. Se uma tarefa está como `Aguardando Auditoria`, o consultor revisa o arquivo e a aprova (muda status para `Concluído`) ou recusa (retorna para `Pendente` exigindo uma justificativa textual).
*   **Timeline de Rastreabilidade (Auditoria):**
    Visualização detalhada em formato de linha do tempo de cada alteração da tarefa:
    - 🕒 `04/06/2026 14:00` - **Tarefa Criada:** via ativação do template "Licença Sanitária" (Sistema).
    - 👤 `04/06/2026 14:15` - **Tarefa Assumida:** João Silva se colocou como responsável (João Silva).
    - 🔄 `04/06/2026 16:30` - **Status Alterado:** de 'Pendente' para 'Em Andamento' (João Silva).
    - 📎 `05/06/2026 10:00` - **Comprovante Anexado:** "laudo_limpeza.pdf" enviado. Status alterado para 'Aguardando Auditoria' (João Silva).
    - ❌ `05/06/2026 11:30` - **Auditoria Recusada:** "O arquivo enviado não possui assinatura do engenheiro." Status retornado para 'Pendente' (Claudio Admin).

### E. Módulo de Cadastros (`/cadastros`)
*   **Formulários de Alta Usabilidade:** Inputs flutuantes glassmórficos com validação de dados em tempo real.
*   **Cadastro de Documento com Geração em Lote:**
    *   Ao criar um documento, o usuário seleciona um **Template de Documento** cadastrado.
    *   O backend calcula e gera instantaneamente todas as condicionantes periódicas (mensais, trimestrais) e únicas até a data de expiração, distribuindo as responsabilidades de forma automática.

---

## 4. Notificações Web Push (PWA)

O frontend implementará o suporte ao padrão de Notificações Push nativas do navegador.
*   **Ciclo de Registro:**
    1.  Ao efetuar o login, o App solicita permissão de notificações se ainda não concedida.
    2.  O Service Worker é registrado no navegador (`service-worker.js`).
    3.  A chave pública VAPID é requisitada ao backend (`/api/notificacoes/vapid-key`).
    4.  A inscrição (Subscription) do navegador é gerada e enviada para o backend (`/api/notificacoes/registrar`).
*   **Resultados:** Alertas visuais instantâneos chegam à tela do funcionário/consultor mesmo com a aba ou o navegador fechado quando prazos estão críticos.

---

## 5. Cronograma de Desenvolvimento do Frontend

1.  **Fase 1: Infraestrutura e Estética Base**
    *   Setup do projeto com Vite e Router.
    *   Criação do Design System CSS e componentes atômicos (Button, Input, Card, Drawer, Modal) em estilo Glass.
    *   Implementação do fluxo de Autenticação e Guarda de Rotas.
2.  **Fase 2: Visualizações e Dashboard**
    *   Desenvolvimento do Dashboard Financeiro e alertas.
    *   Integração dos gráficos de faturamento anual.
    *   Construção do Calendário Interativo de Processos.
3.  **Fase 3: Central de Tarefas & Auditoria (Checklister)**
    *   Construção da interface de listagem de tarefas com filtros avançados.
    *   Área de upload de comprovantes.
    *   Painel e Timeline de Rastreabilidade de alterações (Auditoria de passos).
4.  **Fase 4: Formulários e Notificações**
    *   Formulários de cadastro de empresas, documentos e associação de templates.
    *   Configuração do Service Worker para Web Push.
    *   Testes ponta a ponta e homologação.
