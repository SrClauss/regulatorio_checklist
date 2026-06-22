import asyncio
import time
from datetime import datetime, timedelta
from app.database import get_database, connect_to_mongo, close_mongo_connection

async def profile_query():
    await connect_to_mongo()
    db = get_database()
    
    # Simulate the Timeline fetch: [now - 1 month, now + 5 months]
    now = datetime.utcnow()
    date_start = now - timedelta(days=30)
    date_end = now + timedelta(days=150)
    
    query = {"data_vencimento": {"$gte": date_start, "$lte": date_end}}
    
    start_db = time.time()
    tasks_cursor = db.tarefas.find(query).sort("data_vencimento", 1)
    tasks = await tasks_cursor.to_list(length=2000)
    end_db = time.time()
    
    print(f"Fetched {len(tasks)} tasks from MongoDB")
    print(f"MongoDB query time: {(end_db - start_db) * 1000:.2f} ms")
    
    # Simulate Python model serialization (TarefaResponse)
    start_serialize = time.time()
    from app.models.tarefa import TarefaResponse
    serialized = [TarefaResponse(**t).model_dump() for t in tasks]
    end_serialize = time.time()
    
    print(f"Pydantic serialization time: {(end_serialize - start_serialize) * 1000:.2f} ms")
    
    await close_mongo_connection()

if __name__ == "__main__":
    asyncio.run(profile_query())
