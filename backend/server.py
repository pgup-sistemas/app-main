from fastapi import FastAPI, APIRouter, HTTPException, UploadFile, File, Form, Depends, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime
import jwt
import bcrypt
import base64


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Security
security = HTTPBearer()
JWT_SECRET = os.environ.get("JWT_SECRET", "changeme-unsafe")
JWT_ALGORITHM = "HS256"

# Models
class Vendor(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    nome: str
    email: str
    telefone: str
    senha: str = None  # Won't be returned in responses
    nome_loja: str
    created_at: datetime = Field(default_factory=datetime.utcnow)

class VendorCreate(BaseModel):
    nome: str
    email: str
    telefone: str
    senha: str
    nome_loja: str

class VendorLogin(BaseModel):
    email: str
    senha: str

class VendorResponse(BaseModel):
    id: str
    nome: str
    email: str
    telefone: str
    nome_loja: str
    created_at: datetime

class Product(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    vendor_id: str
    nome: str
    descricao: str
    preco: float
    quantidade: int
    categoria: str
    imagem: Optional[str] = None  # Base64 encoded image
    created_at: datetime = Field(default_factory=datetime.utcnow)

class ProductCreate(BaseModel):
    nome: str
    descricao: str
    preco: float
    quantidade: int
    categoria: str
    imagem: Optional[str] = None

class Order(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    vendor_id: str
    cliente_nome: str
    cliente_telefone: str
    cliente_endereco: str
    observacoes: Optional[str] = None
    items: List[dict]  # [{"product_id": str, "nome": str, "preco": float, "quantidade": int}]
    total: float
    status: str = "novo"  # novo, aceito, em_preparo, entregue, cancelado
    created_at: datetime = Field(default_factory=datetime.utcnow)

class OrderCreate(BaseModel):
    vendor_id: str
    cliente_nome: str
    cliente_telefone: str
    cliente_endereco: str
    observacoes: Optional[str] = None
    items: List[dict]

# Helper functions
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_access_token(vendor_id: str) -> str:
    return jwt.encode({"vendor_id": vendor_id}, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_vendor(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        vendor_id = payload.get("vendor_id")
        vendor = await db.vendors.find_one({"id": vendor_id})
        if not vendor:
            raise HTTPException(status_code=401, detail="Vendedor não encontrado")
        return vendor
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token inválido")

# Auth routes
@api_router.post("/auth/register")
async def register_vendor(vendor_data: VendorCreate):
    # Check if email already exists
    existing_vendor = await db.vendors.find_one({"email": vendor_data.email})
    if existing_vendor:
        raise HTTPException(status_code=400, detail="Email já cadastrado")
    
    # Hash password
    vendor_dict = vendor_data.dict()
    vendor_dict["senha"] = hash_password(vendor_data.senha)
    vendor_dict["id"] = str(uuid.uuid4())
    vendor_dict["created_at"] = datetime.utcnow()
    
    await db.vendors.insert_one(vendor_dict)
    
    # Create access token
    access_token = create_access_token(vendor_dict["id"])
    
    return {
        "access_token": access_token,
        "vendor": VendorResponse(**vendor_dict)
    }

@api_router.post("/auth/login")
async def login_vendor(login_data: VendorLogin):
    vendor = await db.vendors.find_one({"email": login_data.email})
    if not vendor or not verify_password(login_data.senha, vendor["senha"]):
        raise HTTPException(status_code=401, detail="Email ou senha inválidos")
    
    access_token = create_access_token(vendor["id"])
    
    return {
        "access_token": access_token,
        "vendor": VendorResponse(**vendor)
    }

# Product routes
@api_router.post("/products")
async def create_product(product_data: ProductCreate, current_vendor: dict = Depends(get_current_vendor)):
    product_dict = product_data.dict()
    product_dict["id"] = str(uuid.uuid4())
    product_dict["vendor_id"] = current_vendor["id"]
    product_dict["created_at"] = datetime.utcnow()
    
    await db.products.insert_one(product_dict)
    return Product(**product_dict)

@api_router.get("/products/my")
async def get_my_products(
    current_vendor: dict = Depends(get_current_vendor),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100)
):
    total = await db.products.count_documents({"vendor_id": current_vendor["id"]})
    products = await db.products.find({"vendor_id": current_vendor["id"]}).skip(skip).limit(limit).to_list(limit)
    return {"total": total, "items": [Product(**product) for product in products]}

@api_router.put("/products/{product_id}")
async def update_product(product_id: str, product_data: ProductCreate, current_vendor: dict = Depends(get_current_vendor)):
    product = await db.products.find_one({"id": product_id, "vendor_id": current_vendor["id"]})
    if not product:
        raise HTTPException(status_code=404, detail="Produto não encontrado")
    
    await db.products.update_one(
        {"id": product_id}, 
        {"$set": product_data.dict()}
    )
    
    updated_product = await db.products.find_one({"id": product_id})
    return Product(**updated_product)

@api_router.delete("/products/{product_id}")
async def delete_product(product_id: str, current_vendor: dict = Depends(get_current_vendor)):
    result = await db.products.delete_one({"id": product_id, "vendor_id": current_vendor["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Produto não encontrado")
    
    return {"message": "Produto excluído com sucesso"}

# Public store routes
@api_router.get("/stores/all")
async def get_all_stores():
    """Get all stores with basic info for homepage"""
    try:
        # Get all vendors
        vendors = await db.vendors.find({}).to_list(1000)
        
        stores = []
        for vendor in vendors:
            # Count products for each vendor
            product_count = await db.products.count_documents({
                "vendor_id": vendor["id"],
                "quantidade": {"$gt": 0}
            })
            
            store_info = {
                "id": vendor["id"],
                "nome": vendor["nome"],
                "nome_loja": vendor["nome_loja"],
                "telefone": vendor["telefone"],
                "product_count": product_count,
                "created_at": vendor["created_at"]
            }
            stores.append(store_info)
        
        # Sort by creation date (newest first)
        stores.sort(key=lambda x: x["created_at"], reverse=True)
        return stores
        
    except Exception as e:
        raise HTTPException(status_code=500, detail="Erro ao buscar lojas")

@api_router.get("/loja/{nome_loja}")
async def get_store(nome_loja: str):
    vendor = await db.vendors.find_one({"nome_loja": nome_loja})
    if not vendor:
        raise HTTPException(status_code=404, detail="Loja não encontrada")
    
    products = await db.products.find({"vendor_id": vendor["id"], "quantidade": {"$gt": 0}}).to_list(1000)
    
    return {
        "vendor": VendorResponse(**vendor),
        "products": [Product(**product) for product in products]
    }

@api_router.get("/categorias/{nome_loja}")
async def get_store_categories(nome_loja: str):
    vendor = await db.vendors.find_one({"nome_loja": nome_loja})
    if not vendor:
        raise HTTPException(status_code=404, detail="Loja não encontrada")
    
    categories = await db.products.distinct("categoria", {"vendor_id": vendor["id"]})
    return {"categorias": categories}

# Order routes
@api_router.post("/orders")
async def create_order(order_data: OrderCreate):
    # Verificar e atualizar estoque
    for item in order_data.items:
        product = await db.products.find_one({"id": item["product_id"]})
        if not product:
            raise HTTPException(status_code=404, detail=f"Produto {item['nome']} não encontrado")
        if product["quantidade"] < item["quantidade"]:
            raise HTTPException(status_code=400, detail=f"Estoque insuficiente para o produto {item['nome']}")
    # Se tudo ok, decrementar estoque
    for item in order_data.items:
        await db.products.update_one(
            {"id": item["product_id"]},
            {"$inc": {"quantidade": -item["quantidade"]}}
        )
    # Calculate total
    total = sum(item["preco"] * item["quantidade"] for item in order_data.items)
    order_dict = order_data.dict()
    order_dict["id"] = str(uuid.uuid4())
    order_dict["total"] = total
    order_dict["created_at"] = datetime.utcnow()
    await db.orders.insert_one(order_dict)
    return Order(**order_dict)

@api_router.get("/orders/my")
async def get_my_orders(
    current_vendor: dict = Depends(get_current_vendor),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100)
):
    total = await db.orders.count_documents({"vendor_id": current_vendor["id"]})
    orders = await db.orders.find({"vendor_id": current_vendor["id"]}).skip(skip).limit(limit).to_list(limit)
    return {"total": total, "items": [Order(**order) for order in orders]}

@api_router.put("/orders/{order_id}/status")
async def update_order_status(order_id: str, status: dict, current_vendor: dict = Depends(get_current_vendor)):
    result = await db.orders.update_one(
        {"id": order_id, "vendor_id": current_vendor["id"]}, 
        {"$set": {"status": status["status"]}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Pedido não encontrado")
    
    return {"message": "Status atualizado com sucesso"}

@api_router.get("/dashboard")
async def get_dashboard(current_vendor: dict = Depends(get_current_vendor)):
    from collections import Counter, defaultdict
    import pytz
    
    # Buscar todos os pedidos do vendedor
    orders = await db.orders.find({"vendor_id": current_vendor["id"]}).to_list(1000)
    
    total_vendas = sum(order.get("total", 0) for order in orders)
    quantidade_pedidos = len(orders)
    
    # Produtos mais vendidos
    produtos_counter = Counter()
    for order in orders:
        for item in order.get("items", []):
            produtos_counter[item["nome"]] += item["quantidade"]
    produtos_mais_vendidos = produtos_counter.most_common(5)
    
    # Vendas por dia
    vendas_por_dia = defaultdict(float)
    for order in orders:
        dt = order.get("created_at")
        if isinstance(dt, str):
            dt = datetime.fromisoformat(dt)
        # Ajustar para o fuso horário do Brasil
        dt = dt.astimezone(pytz.timezone("America/Sao_Paulo"))
        dia = dt.strftime("%Y-%m-%d")
        vendas_por_dia[dia] += order.get("total", 0)
    vendas_por_dia = dict(sorted(vendas_por_dia.items()))
    
    return {
        "total_vendas": total_vendas,
        "quantidade_pedidos": quantidade_pedidos,
        "produtos_mais_vendidos": produtos_mais_vendidos,
        "vendas_por_dia": vendas_por_dia
    }

# Health check
@api_router.get("/")
async def root():
    return {"message": "Sistema de Feirantes Online"}

# Include the router in the main app
app.include_router(api_router)

# Configurar CORS seguro
ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    # Adicione aqui o domínio de produção, ex:
    # "https://meusite.com"
]
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=ALLOWED_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()