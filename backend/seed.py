import asyncio
import os
import sys
import re
from datetime import datetime, timedelta

# Adiciona o diretório atual ao path para resolver os imports de 'app'
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from motor.motor_asyncio import AsyncIOMotorClient
from app.config import settings
from app.auth.security import get_password_hash
from app.models.template import TemplateDocumentoDB, CondicionanteSugerida
from app.models.usuario import UsuarioDB
from app.models.empresa import EmpresaDB
from app.models.documento import DocumentoDB
from app.models.tarefa import TarefaDB, HistoricoObservacao
from app.models.prestador import PrestadorDB
from app.models.classe_servico import ClasseServicoDB

# Função utilitária para adicionar meses
def add_months(sourcedate: datetime, months: int) -> datetime:
    month = sourcedate.month - 1 + months
    year = sourcedate.year + month // 12
    month = month % 12 + 1
    day = min(sourcedate.day, [31,
        29 if year % 4 == 0 and (year % 100 != 0 or year % 400 == 0) else 28,
        31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month-1])
    return datetime(year, month, day, sourcedate.hour, sourcedate.minute, sourcedate.second)

async def run_seed():
    print("Iniciando o Seeder do Banco de Dados com Distribuição Realista...")
    client = AsyncIOMotorClient(settings.MONGODB_URI)
    db = client[settings.DB_NAME]
    
    # 1. Limpa coleções para evitar duplicados no teste
    print("Limpando dados anteriores...")
    await db.usuarios.delete_many({})
    await db.empresas.delete_many({})
    await db.documentos.delete_many({})
    await db.tarefas.delete_many({})
    await db.templates_documentos.delete_many({})
    await db.inscricoes_push.delete_many({})
    await db.prestadores.delete_many({})
    await db.classe_servicos.delete_many({})
    
    # 2. Cria Usuários Iniciais de Consultoria
    print("Cadastrando equipe técnica...")
    admin_pw = get_password_hash("admin123")
    consultor_pw = get_password_hash("roberto123")
    
    admin = UsuarioDB(
        nome="Administrador Geral",
        email="admin@consultoria.com.br",
        role="admin",
        ativo=True,
        senha_hash=admin_pw
    )
    admin_res = await db.usuarios.insert_one(admin.model_dump(by_alias=True, exclude={"id"}))
    admin_id = admin_res.inserted_id
    
    consultor = UsuarioDB(
        nome="Roberto Silva (Consultor)",
        email="roberto@consultoria.com.br",
        role="consultor",
        ativo=True,
        senha_hash=consultor_pw
    )
    consultor_res = await db.usuarios.insert_one(consultor.model_dump(by_alias=True, exclude={"id"}))
    consultor_id = consultor_res.inserted_id
    
    print(f"-> Admin criado: admin@consultoria.com.br")
    print(f"-> Consultor criado: roberto@consultoria.com.br")
    
    # 2b. Cria Prestadores de Serviço Mock
    print("Cadastrando prestadores de serviço...")
    
    prestador_controlx = PrestadorDB(nome="Dedetizadora Control-X", cnpj="10.222.333/0001-99", contato="contato@controlx.com.br", ativo=True)
    p_res1 = await db.prestadores.insert_one(prestador_controlx.model_dump(by_alias=True, exclude={"id"}))
    pid_controlx = p_res1.inserted_id

    prestador_aquaclean = PrestadorDB(nome="Laboratório AquaClean", cnpj="20.333.444/0001-88", contato="laudo@aquaclean.com.br", ativo=True)
    p_res2 = await db.prestadores.insert_one(prestador_aquaclean.model_dump(by_alias=True, exclude={"id"}))
    pid_aquaclean = p_res2.inserted_id

    prestador_calibramed = PrestadorDB(nome="CalibraMed Equipamentos", cnpj="30.444.555/0001-77", contato="assistencia@calibramed.com.br", ativo=True)
    p_res3 = await db.prestadores.insert_one(prestador_calibramed.model_dump(by_alias=True, exclude={"id"}))
    pid_calibramed = p_res3.inserted_id

    prestador_solucoes = PrestadorDB(nome="Soluções Ambientais PGRSS", cnpj="40.555.666/0001-66", contato="contato@solucoesambientais.com.br", ativo=True)
    p_res4 = await db.prestadores.insert_one(prestador_solucoes.model_dump(by_alias=True, exclude={"id"}))
    pid_solucoes = p_res4.inserted_id

    print("-> 4 Prestadores de Serviço cadastrados.")

    # 2c. Cria Classes de Serviço Mock vinculadas aos Prestadores
    print("Cadastrando classes de serviço...")
    classes_data = [
        ("Dedetização / Controle de Pragas", "Serviços de dedetização, desinsetização e controle de vetores e pragas urbanas.", pid_controlx),
        ("Análise de Potabilidade de Água", "Análises laboratoriais de potabilidade de água de consumo humano.", pid_aquaclean),
        ("Calibração de Termômetros e Balanças", "Serviços de calibração periódica e certificação de instrumentos de medição.", pid_calibramed),
        ("Elaboração/Revisão do PGRSS", "Serviços de engenharia e consultoria ambiental para PGRSS.", pid_solucoes),
        ("Teste de Estanqueidade do Sistema", "Testes de estanqueidade em tanques e tubulações.", pid_solucoes),
        ("Limpeza e Laudo da Caixa SAO", "Limpeza, higienização e emissão de laudo técnico de caixa separadora de água e óleo.", pid_solucoes),
        ("Relatório Anual RAPP IBAMA", "Preenchimento e protocolo do Relatório de Atividades do IBAMA.", pid_solucoes),
        ("Análise de Água de Poço de Monitoramento", "Coleta e análise físico-química e bacteriológica de água de poços de monitoramento.", pid_solucoes),
        ("Laudo de Emissões Atmosféricas", "Medições e emissão de laudo técnico de emissões atmosféricas por chaminé ou fontes estacionárias.", pid_solucoes),
        ("Relatório de Geração de Resíduos Sólidos", "Declaração e controle de resíduos gerados na atividade produtiva (MTR/DMR).", pid_solucoes),
        ("Monitoramento de Ruído Limítrofe", "Avaliação de impacto sonoro em áreas habitadas vizinhas à empresa.", pid_solucoes),
        ("Coleta de Resíduos de Saúde (Grupo A/B)", "Serviço de coleta, transporte e destinação final de resíduos de serviços de saúde.", pid_solucoes),
        ("Laudo de Radioproteção e Calibração", "Ensaios de radiação e testes de radioproteção em equipamentos médicos.", pid_calibramed),
        ("Treinamento MOPP de Motoristas", "Curso e atualização de motoristas para transporte de produtos perigosos.", pid_solucoes),
        ("Ficha de Emergência e Envelopamento", "Confecção e revisão de fichas de emergência e envelopes de transporte regulamentares.", pid_solucoes),
        ("Plano de Atendimento a Emergências (PAE)", "Elaboração de planos de contingência e atendimento a emergências ambientais.", pid_solucoes),
        ("Envio de BMPO (Psicotrópicos)", "Envio periódico de balancete de medicamentos controlados para a vigilância sanitária.", pid_solucoes),
        ("Revisão de Manual de Boas Práticas e POPs", "Elaboração e atualização de POPs e manual de boas práticas sanitárias.", pid_solucoes),
    ]
    
    class_map = {}
    for nome, desc, pid in classes_data:
        cs = ClasseServicoDB(nome=nome, descricao=desc, prestador_id=pid, ativo=True)
        cs_res = await db.classe_servicos.insert_one(cs.model_dump(by_alias=True, exclude={"id"}))
        class_map[nome] = cs_res.inserted_id

    print(f"-> {len(classes_data)} Classes de Serviço cadastradas.")

    def get_classe_servico_id_for_title(title: str):
        title_lower = title.lower()
        if "dedetização" in title_lower or "pragas" in title_lower:
            return class_map.get("Dedetização / Controle de Pragas")
        elif "potabilidade" in title_lower or "análise de água de consumo" in title_lower or "análise de potabilidade" in title_lower:
            return class_map.get("Análise de Potabilidade de Água")
        elif "calibração" in title_lower or "termômetro" in title_lower or "balança" in title_lower:
            if "radioproteção" in title_lower:
                return class_map.get("Laudo de Radioproteção e Calibração")
            return class_map.get("Calibração de Termômetros e Balanças")
        elif "pgrss" in title_lower:
            return class_map.get("Elaboração/Revisão do PGRSS")
        elif "estanqueidade" in title_lower:
            return class_map.get("Teste de Estanqueidade do Sistema")
        elif "caixa sao" in title_lower or "limpeza e laudo" in title_lower:
            return class_map.get("Limpeza e Laudo da Caixa SAO")
        elif "rapp ibama" in title_lower or "ibama" in title_lower:
            return class_map.get("Relatório Anual RAPP IBAMA")
        elif "poço de monitoramento" in title_lower or "água de poço" in title_lower:
            return class_map.get("Análise de Água de Poço de Monitoramento")
        elif "emissões" in title_lower or "atmosféricas" in title_lower:
            return class_map.get("Laudo de Emissões Atmosféricas")
        elif "resíduos sólidos" in title_lower or "geração de resíduos" in title_lower:
            return class_map.get("Relatório de Geração de Resíduos Sólidos")
        elif "ruído" in title_lower or "sonora" in title_lower:
            return class_map.get("Monitoramento de Ruído Limítrofe")
        elif "grupo a/b" in title_lower or "coleta de resíduos" in title_lower:
            return class_map.get("Coleta de Resíduos de Saúde (Grupo A/B)")
        elif "radioproteção" in title_lower:
            return class_map.get("Laudo de Radioproteção e Calibração")
        elif "mopp" in title_lower or "treinamento" in title_lower:
            return class_map.get("Treinamento MOPP de Motoristas")
        elif "envelopamento" in title_lower or "ficha de emergência" in title_lower:
            return class_map.get("Ficha de Emergência e Envelopamento")
        elif "emergências" in title_lower or "pae" in title_lower:
            return class_map.get("Plano de Atendimento a Emergências (PAE)")
        elif "bmpo" in title_lower or "psicotrópicos" in title_lower:
            return class_map.get("Envio de BMPO (Psicotrópicos)")
        elif "boas práticas" in title_lower or "pop" in title_lower:
            return class_map.get("Revisão de Manual de Boas Práticas e POPs")
        return None

    # 3. Cria Templates de Documentos por Segmento
    print("Cadastrando templates de referência...")
    
    templates_data = [
        # Segmento: Farmácia
        TemplateDocumentoDB(
            segmento="Farmácia",
            nome_documento="Licença Sanitária (VISA)",
            validade_meses_padrao=12,
            valor_renovacao_sugerido=1200.0,
            condicionantes_sugeridas=[
                CondicionanteSugerida(titulo="Envio de BMPO (Balanço de Psicotrópicos)", frequencia_meses=1, cliente_executa=True, valor_sugerido=150.0),
                CondicionanteSugerida(titulo="Elaboração/Revisão do PGRSS", frequencia_meses=12, cliente_executa=False, valor_sugerido=1200.0),
                CondicionanteSugerida(titulo="Calibração de Termômetros e Balanças", frequencia_meses=12, cliente_executa=False, valor_sugerido=450.0),
                CondicionanteSugerida(titulo="Laudo de Potabilidade de Água", frequencia_meses=6, cliente_executa=False, valor_sugerido=350.0),
            ]
        ),
        # Segmento: Posto de Combustíveis
        TemplateDocumentoDB(
            segmento="Posto de Combustíveis",
            nome_documento="Licença de Operação Ambiental (LO)",
            validade_meses_padrao=48,
            valor_renovacao_sugerido=5000.0,
            condicionantes_sugeridas=[
                CondicionanteSugerida(titulo="Teste de Estanqueidade do Sistema", frequencia_meses=24, cliente_executa=False, valor_sugerido=3500.0),
                CondicionanteSugerida(titulo="Análise de Água de Poço de Monitoramento", frequencia_meses=6, cliente_executa=False, valor_sugerido=1800.0),
                CondicionanteSugerida(titulo="Limpeza e Laudo da Caixa SAO", frequencia_meses=3, cliente_executa=True, valor_sugerido=800.0),
                CondicionanteSugerida(titulo="Relatório Anual RAPP IBAMA", frequencia_meses=12, cliente_executa=False, valor_sugerido=1200.0),
            ]
        ),
        # Segmento: Alimentação
        TemplateDocumentoDB(
            segmento="Alimentos",
            nome_documento="Alvará Sanitário Municipal",
            validade_meses_padrao=12,
            valor_renovacao_sugerido=1500.0,
            condicionantes_sugeridas=[
                CondicionanteSugerida(titulo="Dedetização / Controle Integrado de Pragas", frequencia_meses=1, cliente_executa=True, valor_sugerido=350.0),
                CondicionanteSugerida(titulo="Revisão do Manual de Boas Práticas e POPs", frequencia_meses=12, cliente_executa=False, valor_sugerido=2500.0),
                CondicionanteSugerida(titulo="Análise de Potabilidade de Água", frequencia_meses=6, cliente_executa=False, valor_sugerido=350.0),
            ]
        ),
        # Segmento: Indústria
        TemplateDocumentoDB(
            segmento="Indústria",
            nome_documento="Licença de Operação Ambiental (LO)",
            validade_meses_padrao=24,
            valor_renovacao_sugerido=6000.0,
            condicionantes_sugeridas=[
                CondicionanteSugerida(titulo="Laudo de Emissões Atmosféricas", frequencia_meses=12, cliente_executa=False, valor_sugerido=2500.0),
                CondicionanteSugerida(titulo="Relatório de Geração de Resíduos Sólidos", frequencia_meses=6, cliente_executa=False, valor_sugerido=1500.0),
                CondicionanteSugerida(titulo="Monitoramento de Ruído Limítrofe", frequencia_meses=12, cliente_executa=False, valor_sugerido=1800.0),
            ]
        ),
        # Segmento: Saúde
        TemplateDocumentoDB(
            segmento="Saúde",
            nome_documento="Licença de Funcionamento Sanitário (VISA)",
            validade_meses_padrao=12,
            valor_renovacao_sugerido=3000.0,
            condicionantes_sugeridas=[
                CondicionanteSugerida(titulo="Revisão Anual do PGRSS", frequencia_meses=12, cliente_executa=False, valor_sugerido=1500.0),
                CondicionanteSugerida(titulo="Contrato e Comprovante de Coleta de Resíduos Grupo A/B", frequencia_meses=3, cliente_executa=True, valor_sugerido=600.0),
                CondicionanteSugerida(titulo="Laudo de Radioproteção e Calibração", frequencia_meses=12, cliente_executa=False, valor_sugerido=2200.0),
            ]
        ),
        # Segmento: Transporte
        TemplateDocumentoDB(
            segmento="Transporte",
            nome_documento="Licença Ambiental de Transporte de Produtos Perigosos",
            validade_meses_padrao=24,
            valor_renovacao_sugerido=4500.0,
            condicionantes_sugeridas=[
                CondicionanteSugerida(titulo="Treinamento MOPP dos Motoristas", frequencia_meses=12, cliente_executa=True, valor_sugerido=800.0),
                CondicionanteSugerida(titulo="Ficha de Emergência e Envelopamento de Cargas", frequencia_meses=1, cliente_executa=True, valor_sugerido=300.0),
                CondicionanteSugerida(titulo="Plano de Atendimento a Emergências (PAE)", frequencia_meses=24, cliente_executa=False, valor_sugerido=4000.0),
            ]
        )
    ]
    
    templates_dict = {}
    for t in templates_data:
        res = await db.templates_documentos.insert_one(t.model_dump(by_alias=True, exclude={"id"}))
        t_id = res.inserted_id
        templates_dict[t.segmento] = (t_id, t)
        print(f"-> Template cadastrado: {t.nome_documento} ({t.segmento})")
        
    # 4. Lista de 21 Empresas para Gerar
    # 4. Geração programática de 200 Empresas para teste de carga
    bairros = ["Centro", "Jardins", "Pinheiros", "Vila Olímpia", "Berrini", "Alphaville", "Barra da Tijuca", "Leblon", "Boa Viagem", "Savassi", "Batel", "Moinhos de Vento"]
    segmentos_lista = ["Alimentos", "Farmácia", "Posto de Combustíveis", "Indústria", "Saúde", "Transporte"]
    cidades_lista = [
        ("São Paulo", "SP"), ("Campinas", "SP"), ("Santos", "SP"), ("Rio de Janeiro", "RJ"),
        ("Belo Horizonte", "MG"), ("Curitiba", "PR"), ("Porto Alegre", "RS"), ("Salvador", "BA"),
        ("Recife", "PE"), ("Fortaleza", "CE"), ("Brasília", "DF"), ("Goiânia", "GO")
    ]
    
    empresas_dados = []
    # Sempre insere Alpha Foods como o primeiro da lista para manter compatibilidade com testes e logins salvos
    empresas_dados.append({"razao": "Alpha Alimentos LTDA", "fantasia": "Alpha Foods", "cnpj": "11.222.333/0001-01", "cidade": "São Paulo", "uf": "SP", "seg": "Alimentos"})

    for i in range(1, 200):
        seg = segmentos_lista[i % len(segmentos_lista)]
        cidade, uf = cidades_lista[i % len(cidades_lista)]
        bairro = bairros[i % len(bairros)]
        
        cnpj_digits = f"{10+i:02d}{(i*7)%900+100:03d}{(i*13)%900+100:03d}0001{(i*17)%90+10:02d}"
        cnpj_formatted = f"{cnpj_digits[0:2]}.{cnpj_digits[2:5]}.{cnpj_digits[5:8]}/{cnpj_digits[8:12]}-{cnpj_digits[12:14]}"
        
        razao = f"Empresa {seg} {bairro} {i} LTDA"
        fantasia = f"Cliente {seg} {i}"
        
        empresas_dados.append({
            "razao": razao,
            "fantasia": fantasia,
            "cnpj": cnpj_formatted,
            "cidade": cidade,
            "uf": uf,
            "seg": seg
        })
    
    default_client_pw = get_password_hash("cliente123")
    hoje = datetime.utcnow()
    
    total_tarefas = 0
    total_docs = 0
    
    print("\nProcessando cadastro das 200 empresas com distribuição realista de prazos (histórico de 2 anos)...")
    
    for idx, emp in enumerate(empresas_dados):
        # 1. Cria Empresa
        empresa_db = EmpresaDB(
            razao_social=emp["razao"],
            nome_fantasia=emp["fantasia"],
            cnpj=emp["cnpj"],
            cidade=emp["cidade"],
            uf=emp["uf"],
            segmento=emp["seg"],
            responsavel_principal_id=consultor_id,
            ativo=True
        )
        emp_res = await db.empresas.insert_one(empresa_db.model_dump(by_alias=True, exclude={"id"}))
        emp_id = emp_res.inserted_id
        
        # 2. Cria Usuário Cliente (único para cada empresa)
        slug = re.sub(r'[^a-z0-9]', '', emp["fantasia"].lower())
        cliente_email = f"cliente@{slug}.com.br"
        if emp["fantasia"] == "Alpha Foods":
            cliente_email = "cliente@alpha.com.br"
            
        cliente_db = UsuarioDB(
            nome=f"Gestor {emp['fantasia']}",
            email=cliente_email,
            role="cliente",
            empresa_cliente_id=emp_id,
            ativo=True,
            senha_hash=default_client_pw
        )
        cliente_res = await db.usuarios.insert_one(cliente_db.model_dump(by_alias=True, exclude={"id"}))
        cliente_id = cliente_res.inserted_id
        
        # 3. Distribuição de Prazos baseada no índice da empresa (retroagindo para cobrir 2025, 2026, 2027)
        # Vamos começar a emissão inicial no ano de 2024 (entre Janeiro e Dezembro de 2024)
        dia_emissao = (idx * 4) % 26 + 2
        mes_emissao = (idx * 3) % 12 + 1
        data_emissao_emp = datetime(2024, mes_emissao, dia_emissao)
        
        segmento = emp["seg"]
        if segmento in templates_dict:
            _, template = templates_dict[segmento]
            validade_meses = template.validade_meses_padrao
            
            # loop para simular renovações históricas até o futuro (cobrir até o final de 2027)
            current_emissao = data_emissao_emp
            while current_emissao < datetime(2028, 1, 1):
                data_vencimento_emp = add_months(current_emissao, validade_meses)
                
                # status do documento
                if data_vencimento_emp < hoje:
                    # Apenas 3% das licenças passadas são deixadas como Vencido
                    status_doc = "Vencido" if (idx % 33 == 0) else "Ativo"
                elif current_emissao <= hoje <= data_vencimento_emp:
                    status_doc = "Ativo"
                else:
                    status_doc = "Ativo"  # Futuro/Planejado
                
                doc_db = DocumentoDB(
                    empresa_id=emp_id,
                    tipo=template.nome_documento,
                    orgao=f"Órgão Regulador {segmento}",
                    numero_processo=f"2026/{segmento[:3].upper()}-{idx:03d}A",
                    data_emissao=current_emissao,
                    data_vencimento=data_vencimento_emp,
                    status=status_doc,
                    valor_renovacao=template.valor_renovacao_sugerido,
                    responsavel_renovacao_id=consultor_id
                )
                doc_res = await db.documentos.insert_one(doc_db.model_dump(by_alias=True, exclude={"id"}))
                doc_id = doc_res.inserted_id
                total_docs += 1
                
                # 4. Cria Tarefas Condicionantes baseadas nas sugestões do template para este ciclo do documento
                tarefas_empresa = []
                for cond in template.condicionantes_sugeridas:
                    freq = cond.frequencia_meses
                    data_corrente = add_months(current_emissao, freq)
                    periodicidade = "Mensal" if freq == 1 else "Outra"
                    
                    while data_corrente <= data_vencimento_emp:
                        resp_id = cliente_id if cond.cliente_executa else consultor_id
                        
                        # Determina o status com base na data da condicionante (se é passada ou futura)
                        if data_corrente < hoje:
                            # 98% Concluído, 2% Atrasado (pouquíssimas atrasadas)
                            if (idx + data_corrente.month) % 50 == 0:
                                status_tarefa = "Atrasado"
                            else:
                                status_tarefa = "Concluído"
                        else:
                            # Vencimento futuro
                            if (data_corrente - hoje).days < 30:
                                # Algumas em andamento no futuro próximo
                                status_tarefa = "Em Andamento" if (idx % 4 == 0) else "Pendente"
                            else:
                                status_tarefa = "Pendente"
                                
                        data_conclusao_val = data_corrente if status_tarefa == "Concluído" else None
                        
                        nova_tarefa = TarefaDB(
                            documento_id=doc_id,
                            empresa_id=emp_id,
                            classe_servico_id=get_classe_servico_id_for_title(cond.titulo),
                            titulo=cond.titulo,
                            descricao=f"Condicionante periódica de {cond.titulo} vinculada ao documento {template.nome_documento}.",
                            tipo_id="checklist_interno",
                            cliente_executa=cond.cliente_executa,
                            status=status_tarefa,
                            responsavel_id=resp_id,
                            data_vencimento=data_corrente,
                            valor_estimado=cond.valor_sugerido,
                            custo_projetado=cond.valor_sugerido * 0.7,
                            periodicidade=periodicidade,
                            data_conclusao=data_conclusao_val,
                            historico_observacoes=[
                                HistoricoObservacao(
                                    usuario_id=admin_id,
                                    texto="Gerada automaticamente pelo distribuidor de seed."
                                )
                            ]
                        )
                        tarefas_empresa.append(nova_tarefa.model_dump(by_alias=True, exclude={"id"}))
                        data_corrente = add_months(data_corrente, freq)
                        
                if tarefas_empresa:
                    await db.tarefas.insert_many(tarefas_empresa)
                    total_tarefas += len(tarefas_empresa)
                
                # Avança para o próximo ciclo de documento
                current_emissao = data_vencimento_emp
                
        # 5. Adiciona uma tarefa avulsa de rotina distribuída no tempo
        # 5. Adiciona uma tarefa avulsa de rotina distribuída no tempo (cobrindo 3 anos: 2025, 2026, 2027)
        dias_offset = (idx * 17) % 1080 - 540  # Varia de -540 a +540 dias da data atual
        data_vencimento_extra = hoje + timedelta(days=dias_offset)
        
        if data_vencimento_extra < hoje:
            # Muito poucas extras atrasadas
            status_extra = "Concluído" if idx % 40 != 0 else "Atrasado"
        else:
            status_extra = "Pendente" if idx % 3 != 0 else "Em Andamento"
            
        data_conclusao_extra = data_vencimento_extra if status_extra == "Concluído" else None
        
        t_extra = TarefaDB(
            documento_id=None,
            empresa_id=emp_id,
            classe_servico_id=get_classe_servico_id_for_title(f"Checklist de Auditoria Interna - {emp['fantasia']}"),
            titulo=f"Checklist de Auditoria Interna - {emp['fantasia']}",
            descricao=f"Auditoria interna geral e verificação semanal de compliance de rotina.",
            tipo_id="checklist_interno",
            cliente_executa=True,
            status=status_extra,
            responsavel_id=cliente_id,
            data_vencimento=data_vencimento_extra,
            data_conclusao=data_conclusao_extra,
            valor_estimado=0.0,
            custo_projetado=0.0,
            periodicidade="Semanal" if idx % 2 == 0 else "Diária",
            historico_observacoes=[HistoricoObservacao(usuario_id=admin_id, texto="Tarefa avulsa distribuída cadastrada via Seeder.")]
        )
        await db.tarefas.insert_one(t_extra.model_dump(by_alias=True, exclude={"id"}))
        total_tarefas += 1

    print("\nBanco de dados populado com sucesso!")
    print(f"-> Total de Empresas Cadastradas: {len(empresas_dados)}")
    print(f"-> Total de Documentos Gerados: {total_docs}")
    print(f"-> Total de Tarefas/Condicionantes Inseridas: {total_tarefas}")
    print("\nCredenciais de Login de Teste:")
    print("1. Administrador: admin@consultoria.com.br / admin123")
    print("2. Consultor Técnico: roberto@consultoria.com.br / roberto123")
    print("3. Clientes das Empresas: cliente@<slug_da_empresa>.com.br / cliente123")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(run_seed())
