# Levantamento de Setores, Documentos e Condicionantes Regulatórias no Brasil

Este documento apresenta um mapeamento detalhado dos principais setores de negócios no Brasil, identificando seus principais órgãos reguladores, licenças/alvarás mandatórios e as respectivas condicionantes e tarefas recorrentes. Este levantamento servirá como base para popular os templates do banco de dados (MongoDB) e estruturar o "plano de manutenção regulatória" de cada cliente.

---

## 1. Setor: Farmácias e Drogarias (Setor Regulado - ANVISA/VISA)

As farmácias atuam sob rígido controle sanitário e necessitam de renovações frequentes e acompanhamento contínuo de tarefas operacionais internas e externas.

### Documentos Principais
* **Licença Sanitária (Municipal ou Estadual)**
  * **Vencimento típico:** 1 ano.
  * **Órgão emissor:** Vigilância Sanitária local (VISA/COVISA).
* **AFE - Autorização de Funcionamento de Empresa**
  * **Vencimento típico:** Válida por tempo indeterminado (porém sujeita a suspensão se as taxas/obrigações anuais não forem pagas).
  * **Órgão emissor:** ANVISA.
* **CRT - Certificado de Regularidade Técnica**
  * **Vencimento típico:** 1 ano.
  * **Órgão emissor:** Conselho Regional de Farmácia (CRF).

### Plano de Manutenção (Condicionantes e Serviços Cobrados)
| Código | Condicionante / Serviço | Tipo | Frequência | Responsável | Descrição / Detalhe Técnico | Valor Estimado (R$) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **FAR_C01** | Envio de BMPO (Balanço de Medicamentos Psicotrópicos) | Obrigação | Mensal | Cliente (Módulo Empresa) | Envio eletrônico ao SNGPC / ANVISA dos relatórios de entrada/saída de medicamentos controlados. | R$ 150,00 |
| **FAR_C02** | PGRSS (Plano de Gerenciamento de Resíduos de Saúde) | Documental | Anual | Consultoria | Elaboração e atualização do plano de descarte de agulhas, medicamentos vencidos e resíduos químicos. | R$ 1.200,00 |
| **FAR_C03** | Calibração de Termômetros e Balança | Técnica | Anual | Consultoria (Terceirizado) | Laudo de aferição do termômetro da geladeira de termolábeis e balança de precisão. | R$ 450,00 |
| **FAR_C04** | Treinamento de Boas Práticas de Dispensação | Treinamento | Semestral | Consultoria | Treinamento da equipe de atendimento conforme RDC 44/2009. | R$ 600,00 |
| **FAR_C05** | Laudo de Potabilidade de Água | Monitoramento | Semestral | Consultoria / Lab | Análise microbiológica e físico-química da água usada na farmácia. | R$ 350,00 |

---

## 2. Setor: Postos de Combustíveis (Setor Ambiental e ANP)

Considerado atividade de alto potencial poluidor, os postos de combustíveis exigem monitoramentos complexos e caros sob risco de interdição imediata.

### Documentos Principais
* **LO - Licença de Operação Ambiental**
  * **Vencimento típico:** 4 a 6 anos.
  * **Órgão emissor:** Órgão Ambiental Estadual (ex: CETESB-SP, INEA-RJ, FEAM-MG) ou Municipal.
* **Alvará de Funcionamento e Localização**
  * **Vencimento típico:** 1 ano ou indeterminado com taxa anual.
  * **Órgão emissor:** Prefeitura Municipal.
* **AVCB - Auto de Vistoria do Corpo de Bombeiros**
  * **Vencimento típico:** 1 a 3 anos.
  * **Órgão emissor:** Corpo de Bombeiros Militar do Estado.
* **Autorização ANP**
  * **Vencimento típico:** Indeterminado (sujeito à manutenção dos requisitos cadastrais).
  * **Órgão emissor:** Agência Nacional do Petróleo.

### Plano de Manutenção (Condicionantes e Serviços Cobrados)
| Código | Condicionante / Serviço | Tipo | Frequência | Responsável | Descrição / Detalhe Técnico | Valor Estimado (R$) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **POS_C01** | Teste de Estanqueidade do Sistema (Sump, Linhas e Tanques) | Técnico | Bienal | Consultoria (Parceiro) | Laudo de estanqueidade para certificar que não há vazamento de hidrocarbonetos no solo. | R$ 3.500,00 |
| **POS_C02** | Análise de Água de Poço de Monitoramento | Monitoramento | Semestral | Consultoria | Coleta e análise laboratorial de águas subterrâneas (BTEX/PAH) nos poços do entorno do tanque. | R$ 1.800,00 |
| **POS_C03** | Limpeza e Laudo da Caixa Separadora de Água e Óleo (SAO) | Operacional | Trimestral | Cliente / Terceiro | Limpeza física e laudo fotográfico do correto direcionamento dos efluentes do pátio de lavagem/abastecimento. | R$ 800,00 |
| **POS_C04** | Declaração de Carga Poluidora e Relatório IBAMA (CTF) | Documental | Anual | Consultoria | Entrega do Relatório Anual de Atividades Poluidoras (RAPP) até 31 de março. | R$ 1.200,00 |
| **POS_C05** | Renovação do Prontuário NR-20 | Documental | Trienal | Consultoria | Inspeção, análise de risco e atualização das pastas de documentação da NR-20 (Líquidos Inflamáveis). | R$ 4.000,00 |

---

## 3. Setor: Supermercados, Padarias e Açougues (Alimentação Geral)

Foco em segurança alimentar, higiene e controle de vetores. Costumam sofrer fiscalizações de surpresa da vigilância municipal e do Procon.

### Documentos Principais
* **Licença Sanitária Municipal**
  * **Vencimento típico:** 1 ano.
  * **Órgão emissor:** Vigilância Sanitária local.
* **Alvará de Funcionamento e AVCB**
  * **Vencimento típico:** 1 a 3 anos.
* **Cadastro de Gerador de Resíduos Sólidos (Grandes Geradores)**
  * **Vencimento típico:** 1 ano.
  * **Órgão emissor:** Limpurb / Autarquia de Limpeza Urbana municipal.

### Plano de Manutenção (Condicionantes e Serviços Cobrados)
| Código | Condicionante / Serviço | Tipo | Frequência | Responsável | Descrição / Detalhe Técnico | Valor Estimado (R$) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **ALI_C01** | Controle Integrado de Pragas (Dedetização/Desratização) | Operacional | Mensal | Terceiro / Cliente | Certificados de dedetização e aplicação de iscas exigidos por lei para áreas de alimentos. | R$ 350,00 |
| **ALI_C02** | Manual de Boas Práticas e POPs (Procedimentos Operacionais) | Documental | Anual | Consultoria | Elaboração ou revisão anual do Manual de Boas Práticas de Fabricação (MBPF) e dos POPs obrigatórios. | R$ 2.500,00 |
| **ALI_C03** | Análise Microbiológica de Alimentos / Superfície | Monitoramento | Semestral | Consultoria / Lab | Coleta de amostras de alimentos produzidos no local (ex: padaria/açougue) para teste microbiológico. | R$ 900,00 |
| **ALI_C04** | Higienização dos Reservatórios de Água | Técnico | Semestral | Terceiro / Cliente | Limpeza física das caixas d'água com emissão de laudo técnico por engenheiro ou químico. | R$ 1.200,00 |
| **ALI_C05** | Laudo Técnico das Instalações Elétricas (LISE) | Técnico | Bienal | Consultoria (Engenheiro) | Avaliação dos quadros de energia, geradores e proteção contra descargas atmosféricas (SPDA). | R$ 3.800,00 |

---

## 4. Setor: Hotéis e Pousadas (Turismo e Hospitalidade)

Devem atender normas de segurança contra incêndios, controle sanitário de grandes reservatórios de água e ar-condicionado central.

### Documentos Principais
* **AVCB (Corpo de Bombeiros)**
  * **Vencimento típico:** 2 a 3 anos.
* **Licença Ambiental de Operação (para hotéis com poço artesiano, lavanderia industrial ou gerador)**
  * **Vencimento típico:** 4 a 5 anos.
* **Alvará de Funcionamento e Sanitário**
  * **Vencimento típico:** 1 ano.

### Plano de Manutenção (Condicionantes e Serviços Cobrados)
| Código | Condicionante / Serviço | Tipo | Frequência | Responsável | Descrição / Detalhe Técnico | Valor Estimado (R$) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **HOT_C01** | PMOC - Plano de Manutenção, Operação e Controle (Ar Condicionado) | Técnico | Mensal | Cliente / Terceiro | Manutenção preventiva e higienização dos aparelhos de climatização coletiva (Portaria MS nº 3.523/98). | R$ 1.500,00 |
| **HOT_C02** | Teste de Estanqueidade da Rede de Gás GNL/GLP | Técnico | Anual | Consultoria / Eng | Teste sob pressão pneumática da tubulação de gás das cozinhas industriais e caldeiras. | R$ 1.200,00 |
| **HOT_C03** | Manutenção e Recarga de Extintores e Hidrantes | Técnico | Anual | Terceiro / Cliente | Verificação de carga de CO2, pó químico, mangueiras e sinalizações de emergência. | R$ 800,00 |
| **HOT_C04** | Treinamento de Brigada de Incêndio | Treinamento | Anual | Consultoria / Bombeiro | Treinamento prático e emissão de certificado para a equipe de funcionários sobre combate ao fogo. | R$ 1.500,00 |

---

## 5. Setor: Clínicas Médicas e Odontológicas (Saúde Humana)

Esses estabelecimentos manipulam substâncias biológicas e perfurocortantes, gerando uma regulação rigorosa da vigilância e do descarte de resíduos.

### Documentos Principais
* **Licença de Funcionamento Sanitário**
  * **Vencimento típico:** 1 ano.
* **LRE - Laudo de Radioproteção e Levantamento Radiométrico** (Clínicas com aparelhos de Raio-X)
  * **Vencimento típico:** 2 anos.
  * **Órgão emissor:** Físico credenciado / Vigilância Sanitária.
* **CNES - Cadastro Nacional de Estabelecimentos de Saúde**
  * **Vencimento típico:** Permanente (atualizado sempre que houver alteração de profissionais).

### Plano de Manutenção (Condicionantes e Serviços Cobrados)
| Código | Condicionante / Serviço | Tipo | Frequência | Responsável | Descrição / Detalhe Técnico | Valor Estimado (R$) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **MED_C01** | PGRSS (Plano de Resíduos de Serviços de Saúde) | Documental | Anual | Consultoria | Elaboração e acompanhamento das diretrizes de segregação de lixo infectante e químico. | R$ 1.100,00 |
| **MED_C02** | Teste Biológico de Autoclaves | Monitoramento | Semanal / Mensal | Cliente (Módulo Empresa) | Indicador biológico para certificar a correta esterilização de pinças, espelhos e bisturis. | R$ 150,00 |
| **MED_C03** | Renovação do Cadastro de Gerador de Resíduos Infectantes | Documental | Anual | Consultoria | Declaração e pagamento de taxas municipais para coleta especial de lixo hospitalar (Grupo A). | R$ 500,00 |
| **MED_C04** | Calibração de Equipamentos Médicos (Laudo de Calibração) | Técnica | Anual | Terceiro / Consultoria | Calibração de esfigmomanômetros, bisturis elétricos, estufas e desfibriladores. | R$ 2.200,00 |

---

## Integração no Sistema
Ao criar uma nova empresa cliente no sistema, o administrador poderá escolher o **Segmento do Negócio** (ex: *Posto de Combustíveis*). Ao selecionar o segmento, o sistema apresentará uma lista de **Templates de Documentos** e **Templates de Condicionantes** recomendados.
1. O consultor seleciona quais documentos o cliente possui.
2. O sistema autogerencia e programa as datas futuras com base na data de concessão do documento.
3. Se um documento tem vigência de 4 anos, a data de renovação do documento final é gerada para daqui a 4 anos.
4. As condicionantes vinculadas (mensais, semestrais ou anuais) são disparadas em lote (ex: gerando 48 tarefas mensais, 8 semestrais e 4 anuais de forma automática ao longo dos 4 anos de validade da licença). Cada uma destas tarefas herda o valor padrão do serviço, permitindo a previsibilidade do faturamento futuro no Dashboard.
