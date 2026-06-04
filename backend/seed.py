import asyncio
import os
import sys
from datetime import datetime

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
    print("Iniciando o Seeder do Banco de Dados...")
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
    
    # 2. Cria Usuários Iniciais
    print("Cadastrando usuários de teste...")
    admin_pw = get_password_hash("admin123")
    consultor_pw = get_password_hash("roberto123")
    cliente_pw = get_password_hash("cliente123")
    
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
    
    print(f"-> Admin criado: admin@consultoria.com.br (ID: {admin_id})")
    print(f"-> Consultor criado: roberto@consultoria.com.br (ID: {consultor_id})")
    
    # 3. Cria Templates de Documentos por Segmento
    print("Cadastrando templates de documentos baseados no levantamento...")
    
    templates = [
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
            validade_meses_padrao=48, # 4 anos
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
        )
    ]
    
    for t in templates:
        res = await db.templates_documentos.insert_one(t.model_dump(by_alias=True, exclude={"id"}))
        print(f"-> Template cadastrado: {t.nome_documento} ({t.segmento})")
        
    # 4. Cria Empresa Cliente de Teste
    print("Cadastrando empresa de exemplo...")
    empresa = EmpresaDB(
        razao_social="Alpha Alimentos LTDA",
        nome_fantasia="Alpha Foods",
        cnpj="11.222.333/0001-01",
        cidade="São Paulo",
        uf="SP",
        segmento="Alimentos",
        responsavel_principal_id=consultor_id,
        ativo=True
    )
    empresa_res = await db.empresas.insert_one(empresa.model_dump(by_alias=True, exclude={"id"}))
    empresa_id = empresa_res.inserted_id
    print(f"-> Empresa criada: {empresa.nome_fantasia} (ID: {empresa_id})")
    
    # Cria o usuário do tipo cliente para esta empresa
    cliente = UsuarioDB(
        nome="Claudio Foods (Cliente)",
        email="cliente@alpha.com.br",
        role="cliente",
        empresa_cliente_id=empresa_id,
        ativo=True,
        senha_hash=cliente_pw
    )
    cliente_res = await db.usuarios.insert_one(cliente.model_dump(by_alias=True, exclude={"id"}))
    cliente_id = cliente_res.inserted_id
    print(f"-> Usuário Cliente criado: cliente@alpha.com.br (ID: {cliente_id})")
    
    # 5. Cadastra um Documento Ativo (Alvará Sanitário) e simula o disparo em lote de Condicionantes
    print("Cadastrando documento ativo e simulando a geração de condicionantes futuras...")
    
    data_emissao = datetime(2026, 6, 1)
    data_vencimento = datetime(2028, 6, 1) # 2 anos de vigência
    
    documento = DocumentoDB(
        empresa_id=empresa_id,
        tipo="Alvará Sanitário Municipal",
        orgao="Vigilância Sanitária SP",
        numero_processo="2026/SP-991A",
        data_emissao=data_emissao,
        data_vencimento=data_vencimento,
        status="Ativo",
        valor_renovacao=1500.0,
        responsavel_renovacao_id=consultor_id
    )
    
    doc_res = await db.documentos.insert_one(documento.model_dump(by_alias=True, exclude={"id"}))
    doc_id = doc_res.inserted_id
    print(f"-> Documento cadastrado: {documento.tipo} (ID: {doc_id})")
    
    # Gera tarefas simuladas baseadas nas condicionantes sugeridas para Alimentos
    print("Gerando tarefas condicionantes futuras ao longo de 2 anos...")
    tarefas_geradas = []
    
    condicionantes = [
        {"titulo": "Controle de Pragas (Dedetização)", "freq": 1, "cliente": True, "valor": 350.0},
        {"titulo": "Análise de Potabilidade de Água", "freq": 6, "cliente": False, "valor": 350.0},
        {"titulo": "Revisão do Manual de Boas Práticas e POPs", "freq": 12, "cliente": False, "valor": 2500.0}
    ]
    
    for cond in condicionantes:
        freq = cond["freq"]
        data_corrente = add_months(data_emissao, freq)
        
        while data_corrente <= data_vencimento:
            # Associa o responsável adequado
            resp_id = cliente_id if cond["cliente"] else consultor_id
            
            nova_tarefa = TarefaDB(
                documento_id=doc_id,
                empresa_id=empresa_id,
                titulo=cond["titulo"],
                descricao=f"Condicionante periódica de {cond['titulo']} vinculada ao Alvará Sanitário.",
                tipo_id="checklist_interno",
                cliente_executa=cond["cliente"],
                status="Pendente",
                responsavel_id=resp_id,
                data_vencimento=data_corrente,
                valor_estimado=cond["valor"],
                historico_observacoes=[
                    HistoricoObservacao(
                        usuario_id=admin_id,
                        texto="Inicializado via Seeder de teste."
                    )
                ]
            )
            tarefas_geradas.append(nova_tarefa.model_dump(by_alias=True, exclude={"id"}))
            data_corrente = add_months(data_corrente, freq)
            
    if tarefas_geradas:
        await db.tarefas.insert_many(tarefas_geradas)
        print(f"-> {len(tarefas_geradas)} tarefas condicionantes futuras inseridas com sucesso.")
        
    print("\nBanco de dados populado com sucesso!")
    print("Usuários para teste:")
    print("1. Administrador: admin@consultoria.com.br / admin123")
    print("2. Consultor: roberto@consultoria.com.br / roberto123")
    print("3. Cliente: cliente@alpha.com.br / cliente123")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(run_seed())
