import React, { useState, useEffect, createContext, useContext } from "react";
import "./App.css";
import { BrowserRouter, Routes, Route, Navigate, useParams } from "react-router-dom";
import axios from "axios";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

const API = '/api';

// Auth Context
const AuthContext = createContext();

const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      const vendor = JSON.parse(localStorage.getItem('vendor') || '{}');
      setUser(vendor);
    }
    setLoading(false);
  }, []);

  const login = (token, vendor) => {
    localStorage.setItem('token', token);
    localStorage.setItem('vendor', JSON.stringify(vendor));
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    setUser(vendor);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('vendor');
    delete axios.defaults.headers.common['Authorization'];
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

// Components
const Header = ({ title, showBack = false, onBack, showHome = false }) => (
  <header className="bg-green-600 text-white p-4 shadow-md">
    <div className="max-w-4xl mx-auto flex items-center">
      {showBack && (
        <button onClick={onBack} className="mr-4 hover:text-green-200">
          ← Voltar
        </button>
      )}
      {showHome && (
        <a href="/" className="mr-4 hover:text-green-200">
          🏠 Home
        </a>
      )}
      <h1 className="text-xl font-bold flex-1">{title}</h1>
    </div>
  </header>
);

const ProductCard = ({ product, isOwner = false, onEdit, onDelete, onAddToCart }) => (
  <div className="bg-white rounded-lg shadow-md overflow-hidden">
    {product.imagem && (
      <img src={product.imagem} alt={product.nome} className="w-full h-48 object-cover" />
    )}
    <div className="p-4">
      <h3 className="font-bold text-lg mb-2">{product.nome}</h3>
      <p className="text-gray-600 mb-2">{product.descricao}</p>
      <div className="flex justify-between items-center mb-2">
        <span className="text-green-600 font-bold text-xl">R$ {product.preco.toFixed(2)}</span>
        <span className="text-sm text-gray-500">Estoque: {product.quantidade}</span>
      </div>
      {/* Alerta de estoque baixo para o vendedor */}
      {isOwner && product.quantidade > 0 && product.quantidade <= 5 && (
        <div className="text-xs text-yellow-700 bg-yellow-100 rounded px-2 py-1 mb-2 inline-block">⚠️ Estoque baixo</div>
      )}
      <p className="text-sm text-gray-500 mb-3">{product.categoria}</p>
      
      {isOwner ? (
        <div className="flex gap-2">
          <button 
            onClick={() => onEdit(product)}
            className="flex-1 bg-blue-500 text-white px-3 py-2 rounded hover:bg-blue-600"
          >
            Editar
          </button>
          <button 
            onClick={() => onDelete(product.id)}
            className="flex-1 bg-red-500 text-white px-3 py-2 rounded hover:bg-red-600"
          >
            Excluir
          </button>
        </div>
      ) : (
        <button 
          onClick={() => onAddToCart(product)}
          className="w-full bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
          disabled={product.quantidade === 0}
        >
          {product.quantidade === 0 ? 'Fora de Estoque' : 'Adicionar ao Carrinho'}
        </button>
      )}
    </div>
  </div>
);

// Auth Pages
const LoginPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    email: '',
    senha: '',
    nome: '',
    telefone: '',
    nome_loja: ''
  });
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const endpoint = isLogin ? '/auth/login' : '/auth/register';
      const response = await axios.post(`${API}${endpoint}`, formData);
      login(response.data.access_token, response.data.vendor);
    } catch (error) {
      alert(error.response?.data?.detail || 'Erro ao processar solicitação');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-green-100">
      <Header title="Sistema de Feirantes Online" />
      
      <div className="max-w-md mx-auto p-6">
        <div className="bg-white rounded-lg shadow-md p-6 mt-8">
          <h2 className="text-2xl font-bold text-center mb-6">
            {isLogin ? 'Entrar na Conta' : 'Cadastrar Feirante'}
          </h2>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <>
                <div>
                  <label className="block text-sm font-medium mb-1">Nome Completo</label>
                  <input
                    type="text"
                    required
                    className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    value={formData.nome}
                    onChange={(e) => setFormData({...formData, nome: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Telefone</label>
                  <input
                    type="tel"
                    required
                    className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    value={formData.telefone}
                    onChange={(e) => setFormData({...formData, telefone: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Nome da Loja</label>
                  <input
                    type="text"
                    required
                    className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    value={formData.nome_loja}
                    onChange={(e) => setFormData({...formData, nome_loja: e.target.value})}
                  />
                </div>
              </>
            )}
            
            <div>
              <label className="block text-sm font-medium mb-1">Email</label>
              <input
                type="email"
                required
                className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Senha</label>
              <input
                type="password"
                required
                className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
                value={formData.senha}
                onChange={(e) => setFormData({...formData, senha: e.target.value})}
              />
            </div>
            
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-green-600 text-white py-2 rounded-md hover:bg-green-700 disabled:opacity-50"
            >
              {loading ? 'Processando...' : (isLogin ? 'Entrar' : 'Cadastrar')}
            </button>
          </form>
          
          <div className="text-center mt-4">
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-green-600 hover:underline"
            >
              {isLogin ? 'Não tem conta? Cadastre-se' : 'Já tem conta? Entre aqui'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Dashboard
const Dashboard = () => {
  const { user, logout } = useAuth();
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [activeTab, setActiveTab] = useState('products');
  const [showProductForm, setShowProductForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [productForm, setProductForm] = useState({
    nome: '',
    descricao: '',
    preco: '',
    quantidade: '',
    categoria: '',
    imagem: ''
  });
  // Dashboard de vendas
  const [dashboard, setDashboard] = useState(null);
  const [loadingDashboard, setLoadingDashboard] = useState(true);

  // Produtos - paginação
  const [prodPage, setProdPage] = useState(1);
  const [prodTotal, setProdTotal] = useState(0);
  const prodLimit = 12;
  // Pedidos - paginação
  const [orderPage, setOrderPage] = useState(1);
  const [orderTotal, setOrderTotal] = useState(0);
  const orderLimit = 10;

  useEffect(() => {
    loadProducts();
    loadOrders();
    loadDashboard();
  }, []);

  // useEffect para atualizar ao mudar página
  useEffect(() => { loadProducts(prodPage); }, [prodPage]);
  useEffect(() => { loadOrders(orderPage); }, [orderPage]);

  const loadProducts = async (page = prodPage) => {
    try {
      const skip = (page - 1) * prodLimit;
      const response = await axios.get(`${API}/products/my?skip=${skip}&limit=${prodLimit}`);
      setProducts(response.data.items);
      setProdTotal(response.data.total);
    } catch (error) {
      console.error('Erro ao carregar produtos:', error);
    }
  };

  const loadOrders = async (page = orderPage) => {
    try {
      const skip = (page - 1) * orderLimit;
      const response = await axios.get(`${API}/orders/my?skip=${skip}&limit=${orderLimit}`);
      setOrders(response.data.items);
      setOrderTotal(response.data.total);
    } catch (error) {
      console.error('Erro ao carregar pedidos:', error);
    }
  };

  const loadDashboard = async () => {
    setLoadingDashboard(true);
    try {
      const response = await axios.get(`${API}/dashboard`);
      setDashboard(response.data);
    } catch (error) {
      setDashboard(null);
    } finally {
      setLoadingDashboard(false);
    }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProductForm({...productForm, imagem: reader.result});
      };
      reader.readAsDataURL(file);
    }
  };

  const handleProductSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const productData = {
        ...productForm,
        preco: parseFloat(productForm.preco),
        quantidade: parseInt(productForm.quantidade)
      };
      
      if (editingProduct) {
        await axios.put(`${API}/products/${editingProduct.id}`, productData);
      } else {
        await axios.post(`${API}/products`, productData);
      }
      
      setShowProductForm(false);
      setEditingProduct(null);
      setProductForm({
        nome: '',
        descricao: '',
        preco: '',
        quantidade: '',
        categoria: '',
        imagem: ''
      });
      loadProducts();
    } catch (error) {
      alert('Erro ao salvar produto');
    }
  };

  const handleDeleteProduct = async (productId) => {
    if (window.confirm('Deseja excluir este produto?')) {
      try {
        await axios.delete(`${API}/products/${productId}`);
        loadProducts();
      } catch (error) {
        alert('Erro ao excluir produto');
      }
    }
  };

  const shareStore = () => {
    const storeUrl = `${window.location.origin}/loja/${user.nome_loja}`;
    const whatsappText = `🏪 Confira minha loja online: ${storeUrl}

🥕 ${user.nome_loja}
📱 Produtos frescos direto do feirante!`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(whatsappText)}`;
    window.open(whatsappUrl, '_blank');
  };

  // Filtros de pedidos
  const [filterStart, setFilterStart] = useState('');
  const [filterEnd, setFilterEnd] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterCliente, setFilterCliente] = useState('');
  // Adicionar useState para filtros colapsáveis
  const [showFilters, setShowFilters] = useState(false);

  // Função para exportar pedidos filtrados para CSV
  const exportPedidosCSV = () => {
    const headers = ['ID', 'Cliente', 'Telefone', 'Endereço', 'Total', 'Status', 'Data', 'Itens'];
    const rows = filteredOrders.map(order => [
      order.id,
      order.cliente_nome,
      order.cliente_telefone,
      order.cliente_endereco,
      order.total.toFixed(2),
      order.status,
      new Date(order.created_at).toLocaleString('pt-BR'),
      order.items.map(item => `${item.quantidade}x ${item.nome}`).join('; ')
    ]);
    const csvContent = [headers, ...rows].map(e => e.map(v => `"${v}"`).join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'pedidos.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Aplicar filtros localmente
  const filteredOrders = orders.filter(order => {
    const dataPedido = new Date(order.created_at);
    const startOK = !filterStart || dataPedido >= new Date(filterStart);
    const endOK = !filterEnd || dataPedido <= new Date(filterEnd + 'T23:59:59');
    const statusOK = !filterStatus || order.status === filterStatus;
    const clienteOK = !filterCliente || order.cliente_nome.toLowerCase().includes(filterCliente.toLowerCase());
    return startOK && endOK && statusOK && clienteOK;
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <Header title={`Área do Feirante - ${user.nome}`} showHome={true} />
      
      <div className="max-w-6xl mx-auto p-6">
        {/* Painel de Dashboard de Vendas */}
        <div className="bg-white rounded-lg shadow-md p-4 md:p-6 mb-6">
          <h3 className="text-xl font-bold mb-4 text-green-700">Resumo de Vendas</h3>
          {loadingDashboard ? (
            <p>Carregando dados do dashboard...</p>
          ) : dashboard ? (
            <>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
              <div>
                <div className="text-2xl font-bold text-green-600">R$ {dashboard.total_vendas.toFixed(2)}</div>
                <div className="text-gray-600">Total em vendas</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600">{dashboard.quantidade_pedidos}</div>
                <div className="text-gray-600">Pedidos realizados</div>
              </div>
              <div className="md:col-span-2">
                <div className="font-semibold mb-1">Produtos mais vendidos:</div>
                <ul className="list-disc ml-5">
                  {dashboard.produtos_mais_vendidos.length === 0 && <li>Nenhum produto vendido ainda.</li>}
                  {dashboard.produtos_mais_vendidos.map(([nome, qtd]) => (
                    <li key={nome}>{nome} <span className="text-gray-500">({qtd} vendas)</span></li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Gráficos Essenciais */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Gráfico de Barras: Vendas por Dia */}
              <div>
                <div className="font-semibold mb-2">Vendas por dia</div>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={Object.entries(dashboard.vendas_por_dia).map(([dia, total]) => ({ dia, total }))}>
                    <XAxis dataKey="dia" fontSize={12} />
                    <YAxis fontSize={12} />
                    <Tooltip formatter={v => `R$ ${Number(v).toFixed(2)}`} />
                    <Bar dataKey="total" fill="#22c55e" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              {/* Gráfico de Pizza: Produtos mais vendidos */}
              <div>
                <div className="font-semibold mb-2">Produtos mais vendidos</div>
                {dashboard.produtos_mais_vendidos.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={dashboard.produtos_mais_vendidos.map(([nome, qtd]) => ({ nome, qtd }))}
                        dataKey="qtd"
                        nameKey="nome"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                      >
                        {dashboard.produtos_mais_vendidos.map((entry, idx) => (
                          <Cell key={`cell-${idx}`} fill={["#22c55e", "#16a34a", "#4ade80", "#bbf7d0", "#166534"][idx % 5]} />
                        ))}
                      </Pie>
                      <Legend />
                      <Tooltip formatter={v => `${v} vendas`} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-gray-500">Nenhum produto vendido ainda.</div>
                )}
              </div>
            </div>
            </>
          ) : (
            <p className="text-red-500">Erro ao carregar dados do dashboard.</p>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <div>
              <h2 className="text-2xl font-bold">Bem-vindo, {user.nome}!</h2>
              <p className="text-gray-600">Loja: {user.nome_loja}</p>
              <a 
                href={`/loja/${user.nome_loja}`}
                target="_blank" 
                rel="noopener noreferrer"
                className="text-green-600 hover:underline text-sm"
              >
                👁️ Ver minha loja pública →
              </a>
            </div>
            <div className="flex gap-2">
              <button
                onClick={shareStore}
                className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
              >
                📱 Compartilhar Loja
              </button>
              <button
                onClick={logout}
                className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
              >
                Sair
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md">
          <div className="border-b">
            <nav className="flex">
              <button
                onClick={() => setActiveTab('products')}
                className={`px-6 py-4 ${activeTab === 'products' ? 'border-b-2 border-green-500 text-green-600' : 'text-gray-600'}`}
              >
                Produtos ({prodTotal})
              </button>
              <button
                onClick={() => setActiveTab('orders')}
                className={`px-6 py-4 ${activeTab === 'orders' ? 'border-b-2 border-green-500 text-green-600' : 'text-gray-600'}`}
              >
                Pedidos ({orderTotal})
              </button>
            </nav>
          </div>

          <div className="p-6">
            {activeTab === 'products' && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-semibold">Meus Produtos</h3>
                  <button
                    onClick={() => setShowProductForm(true)}
                    className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
                  >
                    + Adicionar Produto
                  </button>
                </div>

                {showProductForm && (
                  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-90vh overflow-y-auto">
                      <h3 className="text-xl font-semibold mb-4">
                        {editingProduct ? 'Editar Produto' : 'Adicionar Produto'}
                      </h3>
                      
                      <form onSubmit={handleProductSubmit} className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium mb-1">Nome do Produto</label>
                          <input
                            type="text"
                            required
                            className="w-full px-3 py-2 border rounded-md"
                            value={productForm.nome}
                            onChange={(e) => setProductForm({...productForm, nome: e.target.value})}
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium mb-1">Descrição</label>
                          <textarea
                            required
                            className="w-full px-3 py-2 border rounded-md"
                            rows="3"
                            value={productForm.descricao}
                            onChange={(e) => setProductForm({...productForm, descricao: e.target.value})}
                          />
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium mb-1">Preço (R$)</label>
                            <input
                              type="number"
                              step="0.01"
                              required
                              className="w-full px-3 py-2 border rounded-md"
                              value={productForm.preco}
                              onChange={(e) => setProductForm({...productForm, preco: e.target.value})}
                            />
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium mb-1">Quantidade</label>
                            <input
                              type="number"
                              required
                              className="w-full px-3 py-2 border rounded-md"
                              value={productForm.quantidade}
                              onChange={(e) => setProductForm({...productForm, quantidade: e.target.value})}
                            />
                          </div>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium mb-1">Categoria</label>
                          <input
                            type="text"
                            required
                            className="w-full px-3 py-2 border rounded-md"
                            value={productForm.categoria}
                            onChange={(e) => setProductForm({...productForm, categoria: e.target.value})}
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium mb-1">Foto do Produto</label>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleImageUpload}
                            className="w-full px-3 py-2 border rounded-md"
                          />
                          {productForm.imagem && (
                            <img src={productForm.imagem} alt="Preview" className="mt-2 w-20 h-20 object-cover rounded" />
                          )}
                        </div>
                        
                        <div className="flex gap-2">
                          <button
                            type="submit"
                            className="flex-1 bg-green-500 text-white py-2 rounded hover:bg-green-600"
                          >
                            Salvar
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setShowProductForm(false);
                              setEditingProduct(null);
                              setProductForm({
                                nome: '',
                                descricao: '',
                                preco: '',
                                quantidade: '',
                                categoria: '',
                                imagem: ''
                              });
                            }}
                            className="flex-1 bg-gray-500 text-white py-2 rounded hover:bg-gray-600"
                          >
                            Cancelar
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {products.map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      isOwner={true}
                      onEdit={(product) => {
                        setEditingProduct(product);
                        setProductForm({
                          nome: product.nome,
                          descricao: product.descricao,
                          preco: product.preco.toString(),
                          quantidade: product.quantidade.toString(),
                          categoria: product.categoria,
                          imagem: product.imagem || ''
                        });
                        setShowProductForm(true);
                      }}
                      onDelete={handleDeleteProduct}
                    />
                  ))}
                </div>
                
                {products.length === 0 && (
                  <div className="text-center py-12">
                    <p className="text-gray-500">Nenhum produto cadastrado ainda.</p>
                    <button
                      onClick={() => setShowProductForm(true)}
                      className="mt-4 bg-green-500 text-white px-6 py-2 rounded hover:bg-green-600"
                    >
                      Adicionar Primeiro Produto
                    </button>
                  </div>
                )}
                {activeTab === 'products' && products.length > 0 && (
                  <div className="flex justify-center items-center gap-2 mt-4">
                    <button onClick={() => setProdPage(p => Math.max(1, p - 1))} disabled={prodPage === 1} className="px-3 py-1 rounded bg-gray-200 text-gray-700 disabled:opacity-50">Anterior</button>
                    <span className="text-sm">Página {prodPage} de {Math.ceil(prodTotal / prodLimit) || 1}</span>
                    <button onClick={() => setProdPage(p => p < Math.ceil(prodTotal / prodLimit) ? p + 1 : p)} disabled={prodPage >= Math.ceil(prodTotal / prodLimit)} className="px-3 py-1 rounded bg-gray-200 text-gray-700 disabled:opacity-50">Próxima</button>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'orders' && (
              <div>
                <h3 className="text-xl font-semibold mb-4 md:mb-6">Pedidos Recebidos</h3>
                {/* Filtros colapsáveis no mobile */}
                <div className="md:flex md:flex-wrap md:gap-4 md:mb-4 items-end">
                  <button
                    className="md:hidden mb-2 bg-gray-200 text-gray-700 px-3 py-2 rounded w-full flex items-center justify-between"
                    onClick={() => setShowFilters(!showFilters)}
                  >
                    <span>Filtros</span>
                    <span>{showFilters ? '▲' : '▼'}</span>
                  </button>
                  <div className={`w-full md:w-auto grid grid-cols-1 md:grid-cols-5 gap-2 md:gap-4 transition-all duration-300 ${showFilters ? 'block' : 'hidden md:block'}`}>
                    <div>
                      <label className="block text-xs font-semibold mb-1">Data inicial</label>
                      <input type="date" value={filterStart} onChange={e => setFilterStart(e.target.value)} className="border rounded px-2 py-1 text-sm w-full" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold mb-1">Data final</label>
                      <input type="date" value={filterEnd} onChange={e => setFilterEnd(e.target.value)} className="border rounded px-2 py-1 text-sm w-full" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold mb-1">Status</label>
                      <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="border rounded px-2 py-1 text-sm w-full">
                        <option value="">Todos</option>
                        <option value="novo">Novo</option>
                        <option value="aceito">Aceito</option>
                        <option value="em_preparo">Em preparo</option>
                        <option value="entregue">Entregue</option>
                        <option value="cancelado">Cancelado</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold mb-1">Cliente</label>
                      <input type="text" value={filterCliente} onChange={e => setFilterCliente(e.target.value)} placeholder="Nome do cliente" className="border rounded px-2 py-1 text-sm w-full" />
                    </div>
                    <div className="flex items-end">
                      <button onClick={exportPedidosCSV} className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 text-sm font-semibold w-full">Exportar CSV</button>
                    </div>
                  </div>
                </div>
                {/* Listagem de pedidos responsiva e compacta */}
                <div className="space-y-4 mt-4">
                  {filteredOrders.length === 0 && (
                    <div className="text-center text-gray-500 py-8">Nenhum pedido encontrado para os filtros selecionados.</div>
                  )}
                  {filteredOrders.map((order) => (
                    <div key={order.id} className="bg-gray-50 rounded-lg p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-2 shadow-sm border border-gray-100">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col md:flex-row md:items-center md:gap-4 mb-2">
                          <div className="font-semibold truncate">{order.cliente_nome}</div>
                          <div className="text-sm text-gray-600 truncate">{order.cliente_telefone}</div>
                          <div className="text-sm text-gray-500">{new Date(order.created_at).toLocaleDateString('pt-BR')}</div>
                          <span className={`inline-block text-xs font-bold px-2 py-1 rounded ml-2 mt-1 md:mt-0 ${order.status === 'entregue' ? 'bg-green-100 text-green-700' : order.status === 'cancelado' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>{order.status}</span>
                        </div>
                        <div className="text-xs text-gray-500 truncate mb-1"><strong>Endereço:</strong> {order.cliente_endereco}</div>
                        {order.observacoes && <div className="text-xs text-gray-500 mb-1"><strong>Obs:</strong> {order.observacoes}</div>}
                        <div className="text-xs text-gray-700 mb-1"><strong>Itens:</strong> {order.items.map(item => `${item.quantidade}x ${item.nome}`).join(', ')}</div>
                        <div className="font-bold text-green-600 text-lg">R$ {order.total.toFixed(2)}</div>
                      </div>
                      <div className="flex flex-row md:flex-col gap-2 mt-2 md:mt-0 md:ml-4">
                        <button
                          onClick={() => {
                            const whatsappText = `Olá ${order.cliente_nome}! Recebi seu pedido de R$ ${order.total.toFixed(2)}. Em breve entramos em contato para confirmar a entrega.`;
                            const whatsappUrl = `https://wa.me/${order.cliente_telefone}?text=${encodeURIComponent(whatsappText)}`;
                            window.open(whatsappUrl, '_blank');
                          }}
                          className="bg-green-500 text-white px-3 py-1 rounded text-sm hover:bg-green-600 w-full"
                        >
                          📱 WhatsApp
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                
                {orders.length === 0 && (
                  <div className="text-center py-12">
                    <p className="text-gray-500">Nenhum pedido recebido ainda.</p>
                    <p className="text-sm text-gray-400 mt-2">
                      Compartilhe sua loja para começar a receber pedidos!
                    </p>
                  </div>
                )}
                {activeTab === 'orders' && filteredOrders.length > 0 && (
                  <div className="flex justify-center items-center gap-2 mt-4">
                    <button onClick={() => setOrderPage(p => Math.max(1, p - 1))} disabled={orderPage === 1} className="px-3 py-1 rounded bg-gray-200 text-gray-700 disabled:opacity-50">Anterior</button>
                    <span className="text-sm">Página {orderPage} de {Math.ceil(orderTotal / orderLimit) || 1}</span>
                    <button onClick={() => setOrderPage(p => p < Math.ceil(orderTotal / orderLimit) ? p + 1 : p)} disabled={orderPage >= Math.ceil(orderTotal / orderLimit)} className="px-3 py-1 rounded bg-gray-200 text-gray-700 disabled:opacity-50">Próxima</button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Public Store Page
const StorePage = () => {
  const { nome_loja } = useParams();
  const [storeData, setStoreData] = useState(null);
  const [cart, setCart] = useState([]);
  const [showCart, setShowCart] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [checkoutForm, setCheckoutForm] = useState({
    cliente_nome: '',
    cliente_telefone: '',
    cliente_endereco: '',
    observacoes: ''
  });

  useEffect(() => {
    loadStore();
  }, [nome_loja]);

  const loadStore = async () => {
    try {
      const response = await axios.get(`${API}/loja/${nome_loja}`);
      setStoreData(response.data);
    } catch (error) {
      console.error('Erro ao carregar loja:', error);
    }
  };

  const addToCart = (product) => {
    // Verifica se já está no carrinho
    const existing = cart.find(item => item.id === product.id);
    if (existing) {
      if (existing.quantidade < product.quantidade) {
        setCart(cart.map(item =>
          item.id === product.id ? { ...item, quantidade: item.quantidade + 1 } : item
        ));
      } else {
        alert('Você já adicionou o máximo disponível em estoque para este produto.');
      }
    } else {
      if (product.quantidade > 0) {
        setCart([...cart, { ...product, quantidade: 1 }]);
      } else {
        alert('Produto fora de estoque.');
      }
    }
  };

  const updateCartItem = (productId, newQuantity) => {
    if (newQuantity === 0) {
      setCart(cart.filter(item => item.id !== productId));
    } else {
      setCart(cart.map(item =>
        item.id === productId ? {...item, quantidade: newQuantity} : item
      ));
    }
  };

  const getCartTotal = () => {
    return cart.reduce((total, item) => total + (item.preco * item.quantidade), 0);
  };

  const handleCheckout = async (e) => {
    e.preventDefault();
    try {
      const orderData = {
        vendor_id: storeData.vendor.id,
        ...checkoutForm,
        items: cart.map(item => ({
          product_id: item.id,
          nome: item.nome,
          preco: item.preco,
          quantidade: item.quantidade
        }))
      };
      await axios.post(`${API}/orders`, orderData);
      
      // Generate WhatsApp message
      const itemsList = cart.map(item => 
        `${item.quantidade}x ${item.nome} - R$ ${(item.preco * item.quantidade).toFixed(2)}`
      ).join('\n');
      
      const whatsappText = `*Novo Pedido - ${storeData.vendor.nome_loja}*\n\n*Cliente:* ${checkoutForm.cliente_nome}\n*Telefone:* ${checkoutForm.cliente_telefone}\n*Endereço:* ${checkoutForm.cliente_endereco}\n\n*Itens:*\n${itemsList}\n\n*Total: R$ ${getCartTotal().toFixed(2)}*\n\n${checkoutForm.observacoes ? `*Observações:* ${checkoutForm.observacoes}` : ''}`;
      
      const whatsappUrl = `https://wa.me/${storeData.vendor.telefone}?text=${encodeURIComponent(whatsappText)}`;
      
      // Clear cart and show success
      setCart([]);
      setShowCheckout(false);
      alert('Pedido enviado! Você será redirecionado para o WhatsApp.');
      window.open(whatsappUrl, '_blank');
    } catch (error) {
      const msg = error.response?.data?.detail;
      if (msg && msg.toLowerCase().includes('estoque')) {
        alert(msg);
      } else {
        alert('Não foi possível concluir o pedido. Por favor, revise seu carrinho ou tente novamente.');
      }
    }
  };

  if (!storeData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p>Carregando loja...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-green-600 text-white">
        <div className="max-w-6xl mx-auto px-6 py-2">
          <div className="flex items-center justify-between">
            <a href="/" className="text-green-200 hover:text-white text-sm">
              ← Voltar para Home
            </a>
            <div className="text-center">
              <span className="text-sm">Feirantes Online</span>
            </div>
            <div></div> {/* Spacer for centering */}
          </div>
        </div>
      </div>
      
      <div className="bg-green-600 text-white">
        <div className="max-w-6xl mx-auto px-6 py-6">
          <div className="flex flex-col md:flex-row items-center gap-6">
            <img 
              src="https://images.unsplash.com/photo-1611573479036-872a262ad2a5?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2Nzd8MHwxfHNlYXJjaHwyfHxicmF6aWxpYW4lMjBmYXJtZXJzJTIwbWFya2V0fGVufDB8fHxncmVlbnwxNzUzMTgwOTk3fDA&ixlib=rb-4.1.0&q=85"
              alt="Feira"
              className="w-24 h-24 rounded-full object-cover"
            />
            <div className="text-center md:text-left">
              <h1 className="text-3xl font-bold mb-2">{storeData.vendor.nome_loja}</h1>
              <p className="text-green-100">Por {storeData.vendor.nome}</p>
              <p className="text-green-100">📱 {storeData.vendor.telefone}</p>
            </div>
            
            {cart.length > 0 && (
              <div className="ml-auto">
                <button
                  onClick={() => setShowCart(true)}
                  className="bg-white text-green-600 px-4 py-2 rounded-lg font-semibold relative"
                >
                  🛒 Carrinho ({cart.length})
                  <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs w-6 h-6 rounded-full flex items-center justify-center">
                    {cart.reduce((sum, item) => sum + item.quantidade, 0)}
                  </span>
                </button>
              </div>
            )}
            
            {cart.length === 0 && (
              <div className="ml-auto">
                <button
                  onClick={() => {
                    const storeUrl = `${window.location.origin}/loja/${storeData.vendor.nome_loja}`;
                    const whatsappText = `🏪 Confira esta loja online: ${storeUrl}

🥕 ${storeData.vendor.nome_loja}
📱 Produtos frescos direto do feirante!`;
                    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(whatsappText)}`;
                    window.open(whatsappUrl, '_blank');
                  }}
                  className="bg-green-500 text-white px-4 py-2 rounded-lg font-semibold hover:bg-green-600"
                >
                  📱 Compartilhar Loja
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-6">
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-4">Produtos Disponíveis</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {storeData.products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onAddToCart={addToCart}
              />
            ))}
          </div>
          
          {storeData.products.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">Esta loja ainda não tem produtos disponíveis.</p>
            </div>
          )}
        </div>
      </div>

      {/* Cart Modal */}
      {showCart && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-96 overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold">Carrinho</h3>
              <button
                onClick={() => setShowCart(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-3">
              {cart.map((item) => (
                <div key={item.id} className="flex items-center gap-3 p-2 bg-gray-50 rounded">
                  <div className="flex-1">
                    <h4 className="font-medium">{item.nome}</h4>
                    <p className="text-sm text-gray-600">R$ {item.preco.toFixed(2)} cada</p>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateCartItem(item.id, item.quantidade - 1)}
                      className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center hover:bg-gray-300"
                    >
                      -
                    </button>
                    <span className="w-8 text-center">{item.quantidade}</span>
                    <button
                      onClick={() => updateCartItem(item.id, item.quantidade + 1)}
                      className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center hover:bg-gray-300"
                      disabled={item.quantidade >= item.quantidade}
                    >
                      +
                    </button>
                  </div>
                  
                  <button
                    onClick={() => updateCartItem(item.id, 0)}
                    className="text-red-500 hover:text-red-700"
                  >
                    🗑️
                  </button>
                </div>
              ))}
            </div>
            
            <div className="mt-4 pt-4 border-t">
              <div className="flex justify-between items-center mb-4">
                <span className="font-bold">Total: R$ {getCartTotal().toFixed(2)}</span>
              </div>
              
              <div className="flex gap-2">
                <button
                  onClick={() => setShowCart(false)}
                  className="flex-1 bg-gray-500 text-white py-2 rounded hover:bg-gray-600"
                >
                  Continuar Comprando
                </button>
                <button
                  onClick={() => {
                    setShowCart(false);
                    setShowCheckout(true);
                  }}
                  className="flex-1 bg-green-500 text-white py-2 rounded hover:bg-green-600"
                >
                  Finalizar Pedido
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Checkout Modal */}
      {showCheckout && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-96 overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold">Finalizar Pedido</h3>
              <button
                onClick={() => setShowCheckout(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            
            <form onSubmit={handleCheckout} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Nome Completo</label>
                <input
                  type="text"
                  required
                  className="w-full px-3 py-2 border rounded-md"
                  value={checkoutForm.cliente_nome}
                  onChange={(e) => setCheckoutForm({...checkoutForm, cliente_nome: e.target.value})}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Telefone (com DDD)</label>
                <input
                  type="tel"
                  required
                  placeholder="Ex: 11999999999"
                  className="w-full px-3 py-2 border rounded-md"
                  value={checkoutForm.cliente_telefone}
                  onChange={(e) => setCheckoutForm({...checkoutForm, cliente_telefone: e.target.value})}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Endereço Completo</label>
                <textarea
                  required
                  className="w-full px-3 py-2 border rounded-md"
                  rows="3"
                  value={checkoutForm.cliente_endereco}
                  onChange={(e) => setCheckoutForm({...checkoutForm, cliente_endereco: e.target.value})}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Observações (opcional)</label>
                <textarea
                  className="w-full px-3 py-2 border rounded-md"
                  rows="2"
                  value={checkoutForm.observacoes}
                  onChange={(e) => setCheckoutForm({...checkoutForm, observacoes: e.target.value})}
                />
              </div>
              
              <div className="bg-gray-50 p-3 rounded">
                <h4 className="font-semibold mb-2">Resumo do Pedido:</h4>
                {cart.map((item) => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <span>{item.quantidade}x {item.nome}</span>
                    <span>R$ {(item.preco * item.quantidade).toFixed(2)}</span>
                  </div>
                ))}
                <div className="border-t mt-2 pt-2 font-bold">
                  Total: R$ {getCartTotal().toFixed(2)}
                </div>
              </div>
              
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowCheckout(false)}
                  className="flex-1 bg-gray-500 text-white py-2 rounded hover:bg-gray-600"
                >
                  Voltar
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-green-500 text-white py-2 rounded hover:bg-green-600"
                >
                  Enviar Pedido via WhatsApp
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// Homepage Component
const Homepage = () => {
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStores();
  }, []);

  const loadStores = async () => {
    try {
      // Get all vendors - we'll need to create this endpoint
      const response = await axios.get(`${API}/stores/all`);
      setStores(response.data);
    } catch (error) {
      console.error('Erro ao carregar lojas:', error);
    } finally {
      setLoading(false);
    }
  };

  const shareStore = (nomeLoja) => {
    const storeUrl = `${window.location.origin}/loja/${nomeLoja}`;
    const whatsappText = `Confira esta loja online: ${storeUrl}`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(whatsappText)}`;
    window.open(whatsappUrl, '_blank');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p>Carregando lojas...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-green-600 text-white">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <div className="text-center">
            <img 
              src="https://images.unsplash.com/photo-1611573479036-872a262ad2a5?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2Nzd8MHwxfHNlYXJjaHwyfHxicmF6aWxpYW4lMjBmYXJtZXJzJTIwbWFya2V0fGVufDB8fHxncmVlbnwxNzUzMTgwOTk3fDA&ixlib=rb-4.1.0&q=85"
              alt="Feira"
              className="w-24 h-24 rounded-full object-cover mx-auto mb-4"
            />
            <h1 className="text-4xl font-bold mb-2">🥕 Feirantes Online</h1>
            <p className="text-green-100 text-lg mb-6">Encontre os melhores produtos direto dos feirantes brasileiros</p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a 
                href="/login" 
                className="bg-white text-green-600 px-6 py-3 rounded-lg font-semibold hover:bg-green-50 transition"
              >
                🏪 Sou Feirante - Criar Minha Loja
              </a>
              <button 
                onClick={() => document.getElementById('lojas').scrollIntoView({ behavior: 'smooth' })}
                className="bg-green-700 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-800 transition"
              >
                🛒 Quero Comprar
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-6" id="lojas">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-800 mb-2">Lojas dos Feirantes</h2>
          <p className="text-gray-600">Clique em uma loja para ver os produtos disponíveis</p>
        </div>

        {stores.length === 0 ? (
          <div className="text-center py-12">
            <img 
              src="https://images.unsplash.com/photo-1647069603841-efaba3c82822?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2Nzh8MHwxfHNlYXJjaHwyfHxzdHJlZXQlMjB2ZW5kb3JzfGVufDB8fHxncmVlbnwxNzUzMTgxMDA0fDA&ixlib=rb-4.1.0&q=85"
              alt="Feirante"
              className="w-32 h-32 rounded-full object-cover mx-auto mb-4 opacity-70"
            />
            <p className="text-gray-500 text-lg">Ainda não temos feirantes cadastrados.</p>
            <p className="text-gray-400 mb-6">Seja o primeiro a criar sua loja online!</p>
            <a 
              href="/login" 
              className="bg-green-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-700 transition inline-block"
            >
              Cadastrar Minha Loja
            </a>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {stores.map((store) => (
              <div key={store.id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
                <div className="bg-green-100 p-6 text-center">
                  <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-3">
                    <span className="text-white text-2xl">🏪</span>
                  </div>
                  <h3 className="font-bold text-xl text-green-800 mb-1">{store.nome_loja}</h3>
                  <p className="text-green-600">por {store.nome}</p>
                  <p className="text-sm text-green-600">📱 {store.telefone}</p>
                </div>
                
                <div className="p-4">
                  <p className="text-gray-600 mb-4 text-center">
                    {store.product_count || 0} produto{store.product_count !== 1 ? 's' : ''} disponível{store.product_count !== 1 ? 'is' : ''}
                  </p>
                  
                  <div className="flex gap-2">
                    <a
                      href={`/loja/${store.nome_loja}`}
                      className="flex-1 bg-green-600 text-white px-4 py-2 rounded text-center hover:bg-green-700 transition"
                    >
                      Ver Loja
                    </a>
                    <button
                      onClick={() => shareStore(store.nome_loja)}
                      className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 transition"
                      title="Compartilhar no WhatsApp"
                    >
                      📱
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <footer className="bg-green-800 text-white mt-16">
        <div className="max-w-6xl mx-auto p-6 text-center">
          <h3 className="font-bold mb-2">Feirantes Online</h3>
          <p className="text-green-200 text-sm">Conectando feirantes e clientes em todo o Brasil</p>
        </div>
      </footer>
    </div>
  );
};

// Main App Component
const App = () => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p>Carregando...</p>
      </div>
    );
  }

  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Homepage />} />
          <Route path="/loja/:nome_loja" element={<StorePage />} />
          <Route path="/login" element={!user ? <LoginPage /> : <Navigate to="/dashboard" />} />
          <Route path="/dashboard" element={user ? <Dashboard /> : <Navigate to="/login" />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
};

const AppWithAuth = () => (
  <AuthProvider>
    <App />
  </AuthProvider>
);

export default AppWithAuth;