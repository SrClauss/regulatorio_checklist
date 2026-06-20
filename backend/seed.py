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

    # 2c. Cria Classes de Serviço Mock
    print("Cadastrando classes de serviço...")
    
    classes_data = [
        ("Dedetização / Controle de Pragas", "Serviços periódicos de desinsectização e controle integrado de vetores.", pid_controlx),
        ("Análise de Potabilidade de Água", "Coleta e análise físico-química de amostras de água de consumo.", pid_aquaclean),
        ("Calibração de Termômetros e Balanças", "Serviços de aferição de equipamentos de medição.", pid_calibramed),
        ("Elaboração/Revisão do PGRSS", "Documento do Plano de Gerenciamento de Resíduos de Serviços de Saúde.", pid_solucoes),
        ("Teste de Estanqueidade do Sistema", "Verificação técnica contra vazamentos em tanques subterrâneos.", pid_solucoes),
        ("Limpeza e Laudo da Caixa SAO", "Remoção de lodo e aferição de separador de água e óleo.", pid_controlx),
        ("Relatório Anual RAPP IBAMA", "Preenchimento e emissão do relatório anual do Ibama.", pid_solucoes)
    ]
    
    class_map = {}
    for nome, desc, pid in classes_data:
        cs = ClasseServicoDB(nome=nome, descricao=desc, prestador_id=pid, ativo=True)
        cs_res = await db.classe_servicos.insert_one(cs.model_dump(by_alias=True, exclude={"id"}))
        class_map[nome] = cs_res.inserted_id

    print("-> 7 Classes de Serviço cadastradas.")

    def get_classe_servico_id_for_title(title: str):
        title_lower = title.lower()
        if "dedetização" in title_lower or "pragas" in title_lower:
            return class_map.get("Dedetização / Controle de Pragas")
        elif "potabilidade" in title_lower or "análise de água" in title_lower:
            return class_map.get("Análise de Potabilidade de Água")
        elif "calibração" in title_lower or "termômetro" in title_lower or "balança" in title_lower:
            return class_map.get("Calibração de Termômetros e Balanças")
        elif "pgrss" in title_lower:
            return class_map.get("Elaboração/Revisão do PGRSS")
        elif "estanqueidade" in title_lower:
            return class_map.get("Teste de Estanqueidade do Sistema")
        elif "caixa sao" in title_lower or "limpeza e laudo" in title_lower:
            return class_map.get("Limpeza e Laudo da Caixa SAO")
        elif "rapp ibama" in title_lower or "ibama" in title_lower:
            return class_map.get("Relatório Anual RAPP IBAMA")
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
    empresas_dados = [
        {"razao": "Alpha Alimentos LTDA", "fantasia": "Alpha Foods", "cnpj": "11.222.333/0001-01", "cidade": "São Paulo", "uf": "SP", "seg": "Alimentos"},
        {"razao": "Restaurante Sabor & Arte Ltda", "fantasia": "Sabor & Arte", "cnpj": "12.345.678/0001-02", "cidade": "Campinas", "uf": "SP", "seg": "Alimentos"},
        {"razao": "Panificadora Pão de Ouro Ltda", "fantasia": "Pão de Ouro", "cnpj": "23.456.789/0001-03", "cidade": "São Bernardo", "uf": "SP", "seg": "Alimentos"},
        {"razao": "Supermercado Bom Preço S.A.", "fantasia": "Bom Preço Super", "cnpj": "34.567.890/0001-04", "cidade": "Santos", "uf": "SP", "seg": "Alimentos"},
        {"razao": "Distribuidora Frutos do Mar Ltda", "fantasia": "Frutos do Mar", "cnpj": "45.678.901/0001-05", "cidade": "Guarujá", "uf": "SP", "seg": "Alimentos"},
        
        {"razao": "Drogaria Nova Esperança Ltda", "fantasia": "Drogaria Esperança", "cnpj": "56.789.012/0001-06", "cidade": "Ribeirão Preto", "uf": "SP", "seg": "Farmácia"},
        {"razao": "Farmácia Vida e Saúde Ltda", "fantasia": "Farma Vida", "cnpj": "67.890.123/0001-07", "cidade": "Sorocaba", "uf": "SP", "seg": "Farmácia"},
        {"razao": "FarmaPlus Medicamentos S.A.", "fantasia": "FarmaPlus", "cnpj": "78.901.234/0001-08", "cidade": "São José dos Campos", "uf": "SP", "seg": "Farmácia"},
        {"razao": "Drogaria Medicar Eireli", "fantasia": "Medicar Drogarias", "cnpj": "89.012.345/0001-09", "cidade": "Jundiaí", "uf": "SP", "seg": "Farmácia"},
        
        {"razao": "Auto Posto Shell Trevo Ltda", "fantasia": "Posto Trevo", "cnpj": "90.123.456/0001-10", "cidade": "Limeira", "uf": "SP", "seg": "Posto de Combustíveis"},
        {"razao": "Posto Petrobras Centro Ltda", "fantasia": "Posto Central", "cnpj": "01.234.567/0001-11", "cidade": "Piracicaba", "uf": "SP", "seg": "Posto de Combustíveis"},
        {"razao": "Posto Ipiranga Norte S.A.", "fantasia": "Posto Norte", "cnpj": "02.345.678/0001-12", "cidade": "Araraquara", "uf": "SP", "seg": "Posto de Combustíveis"},
        {"razao": "Auto Posto Petrobrás Rodovia Ltda", "fantasia": "Posto da Rodovia", "cnpj": "03.456.789/0001-13", "cidade": "São Carlos", "uf": "SP", "seg": "Posto de Combustíveis"},
        
        {"razao": "Indústria Química Solvax Ltda", "fantasia": "Química Solvax", "cnpj": "04.567.890/0001-14", "cidade": "Diadema", "uf": "SP", "seg": "Indústria"},
        {"razao": "Plásticos União S.A.", "fantasia": "Plásticos União", "cnpj": "05.678.901/0001-15", "cidade": "Mauá", "uf": "SP", "seg": "Indústria"},
        {"razao": "Metalúrgica Tubox Ltda", "fantasia": "Metalúrgica Tubox", "cnpj": "06.789.012/0001-16", "cidade": "Guarulhos", "uf": "SP", "seg": "Indústria"},
        
        {"razao": "Clínica Médica MedVida Ltda", "fantasia": "MedVida", "cnpj": "07.890.123/0001-17", "cidade": "Osasco", "uf": "SP", "seg": "Saúde"},
        {"razao": "Laboratório Bioclin S.A.", "fantasia": "Laboratório Bioclin", "cnpj": "08.901.234/0001-18", "cidade": "Barueri", "uf": "SP", "seg": "Saúde"},
        {"razao": "Hospital Santa Casa Misericórdia", "fantasia": "Santa Casa", "cnpj": "09.901.234/0001-19", "cidade": "Mogi das Cruzes", "uf": "SP", "seg": "Saúde"},
        
        {"razao": "Transportadora Rápido SP Ltda", "fantasia": "Rápido SP Trans", "cnpj": "10.012.345/0001-20", "cidade": "São Paulo", "uf": "SP", "seg": "Transporte"},
        {"razao": "TransQuímica Transportes Especiais", "fantasia": "TransQuímica", "cnpj": "11.123.456/0001-21", "cidade": "Paulínia", "uf": "SP", "seg": "Transporte"},
    ]
    
    default_client_pw = get_password_hash("cliente123")
    hoje = datetime.utcnow()
    
    total_tarefas = 0
    total_docs = 0
    
    print("\nProcessando cadastro das 21 empresas com distribuição realista de prazos...")
    
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
        
        # 3. Distribuição de Prazos baseada no índice da empresa
        # Distribui o dia de vencimento/emissão entre 2 e 28
        dia_emissao = (idx * 4) % 26 + 2
        # Distribui a retroatividade de emissão (entre 1 e 18 meses atrás)
        meses_retroativos = (idx * 5) % 18
        
        # Calcula data de emissão retroativa distribuída
        ano_emissao = hoje.year - (1 if meses_retroativos >= hoje.month else 0)
        mes_emissao = (hoje.month - meses_retroativos - 1) % 12 + 1
        data_emissao_emp = datetime(ano_emissao, mes_emissao, dia_emissao)
        
        segmento = emp["seg"]
        if segmento in templates_dict:
            _, template = templates_dict[segmento]
            
            validade_meses = template.validade_meses_padrao
            data_vencimento_emp = add_months(data_emissao_emp, validade_meses)
            
            # Status do documento principal
            status_doc = "Ativo" if data_vencimento_emp > hoje else "Vencido"
            
            doc_db = DocumentoDB(
                empresa_id=emp_id,
                tipo=template.nome_documento,
                orgao=f"Órgão Regulador {segmento}",
                numero_processo=f"2026/{segmento[:3].upper()}-{idx:03d}A",
                data_emissao=data_emissao_emp,
                data_vencimento=data_vencimento_emp,
                status=status_doc,
                valor_renovacao=template.valor_renovacao_sugerido,
                responsavel_renovacao_id=consultor_id
            )
            doc_res = await db.documentos.insert_one(doc_db.model_dump(by_alias=True, exclude={"id"}))
            doc_id = doc_res.inserted_id
            total_docs += 1
            
            # 4. Cria Tarefas Condicionantes baseadas nas sugestões do template
            tarefas_empresa = []
            for cond in template.condicionantes_sugeridas:
                freq = cond.frequencia_meses
                data_corrente = add_months(data_emissao_emp, freq)
                periodicidade = "Mensal" if freq == 1 else "Outra"
                
                while data_corrente <= data_vencimento_emp:
                    resp_id = cliente_id if cond.cliente_executa else consultor_id
                    
                    # Determina o status com base na data da condicionante (se é passada ou futura)
                    if data_corrente < hoje:
                        status_tarefa = "Concluído"
                    else:
                        # Próximas tarefas (vencendo em breve) ficam em andamento
                        status_tarefa = "Em Andamento" if (data_corrente - hoje).days < 20 else "Pendente"
                    
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
                        periodicidade=periodicidade,
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
                
        # 5. Adiciona uma tarefa avulsa de rotina distribuída no tempo
        dias_offset = (idx * 7) % 45 - 15  # Varia de -15 a +30 dias da data atual
        data_vencimento_extra = hoje + timedelta(days=dias_offset)
        status_extra = "Concluído" if data_vencimento_extra < hoje else "Pendente"
        
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
            valor_estimado=0.0,
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
