import React, { useState, useEffect, useCallback, useMemo } from 'react';
import toast from 'react-hot-toast';
// import api from '../services/api'; // O import original foi comentado para demonstração.

// --- Mock da API para demonstração e correção do erro ---
// Este objeto simula as chamadas à sua API, permitindo que o componente funcione.
// Quando você integrar este código ao seu projeto, pode remover este mock
// e descomentar a linha "import api from '../services/api';" acima.
const mockApi = {
    get: async (url) => {
        console.log(`GET: ${url}`);
        await new Promise(resolve => setTimeout(resolve, 500));
        // Simula os dados que sua API retornaria
        const mockProductsData = [
            { id: 1, name: 'GEL', price: '70.00', stock: 9, cost: '25.00', category: 'Cabelo', brand: 'Marca A', description: 'Gel de alta fixação para cabelos.' },
            { id: 2, name: 'SHAMPOO ANTIQUEDA', price: '45.50', stock: 15, cost: '18.00', category: 'Cabelo', brand: 'Marca B', description: 'Shampoo para fortalecimento capilar.' },
            { id: 3, name: 'CERA MODELADORA', price: '35.00', stock: 4, cost: '12.50', category: 'Barba', brand: 'Marca C', description: 'Cera para modelar barba e bigode.' },
        ];
        return { data: mockProductsData };
    },
    post: (url, data) => new Promise(resolve => setTimeout(() => { console.log(`POST: ${url}`, data); resolve({ data }); }, 500)),
    put: (url, data) => new Promise(resolve => setTimeout(() => { console.log(`PUT: ${url}`, data); resolve({ data }); }, 500)),
    delete: (url) => new Promise(resolve => setTimeout(() => { console.log(`DELETE: ${url}`); resolve({}); }, 500)),
};
const api = mockApi; // Atribui o mock à variável api que o restante do código usa.
// --- Fim do Mock ---


// --- Ícones em SVG ---
const EditIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" /><path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" /></svg>;
const DeleteIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg>;
const AddIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" /></svg>;
const CloseIcon = () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>;
const SearchIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" /></svg>;
const ProductPlaceholderIcon = () => <svg className="w-16 h-16 text-gray-300" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.43 2.43h10.268c1.282 0 2.43-1.043 2.43-2.43a2.25 2.25 0 01-2.43-2.43 3 3 0 00-5.78-1.128v.001z" /><path strokeLinecap="round" strokeLinejoin="round" d="M12 21a2.25 2.25 0 002.25-2.25H9.75A2.25 2.25 0 0012 21zm-2.25-4.125a3.375 3.375 0 116.75 0 3.375 3.375 0 01-6.75 0zM12 3.75a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0z" /></svg>;


// --- Componente do Modal de Formulário de Produto ---
const ProductFormModal = ({ isOpen, onClose, onSave, initialData }) => {
    const [formData, setFormData] = useState({
        name: '', category: '', brand: '', price: '', stock: '0', cost: '', description: ''
    });

    useEffect(() => {
        if (initialData) {
            setFormData({
                name: initialData.name || '',
                category: initialData.category || '',
                brand: initialData.brand || '',
                price: initialData.price || '',
                stock: initialData.stock || '0',
                cost: initialData.cost || '',
                description: initialData.description || ''
            });
        } else {
            setFormData({ name: '', category: '', brand: '', price: '', stock: '0', cost: '', description: '' });
        }
    }, [initialData]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(formData);
    };

    if (!isOpen) return null;

    return (
        <div className="modal-backdrop fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50 transition-opacity duration-300">
            <div className="modal-content bg-white w-full max-w-2xl rounded-2xl shadow-2xl p-8 relative border border-gray-200 transform transition-all duration-300 scale-95 opacity-0 animate-fade-in-scale">
                <style>{`@keyframes fade-in-scale { 0% { opacity: 0; transform: scale(.95); } 100% { opacity: 1; transform: scale(1); } } .animate-fade-in-scale { animation: fade-in-scale 0.3s forwards; }`}</style>
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-2xl font-bold text-gray-900">{initialData ? 'Editar Produto' : 'Novo Produto'}</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-full hover:bg-gray-100"><CloseIcon /></button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">Nome do Produto</label>
                        <input type="text" name="name" id="name" value={formData.name} onChange={handleChange} placeholder="Ex: Gel Fixador" className="block w-full rounded-lg border-gray-300 focus:border-[#8C7F8A] focus:ring-2 focus:ring-[#8C7F8A]/50" required />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div>
                            <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-2">Categoria (Opcional)</label>
                            <select name="category" id="category" value={formData.category} onChange={handleChange} className="block w-full rounded-lg border-gray-300 focus:border-[#8C7F8A] focus:ring-2 focus:ring-[#8C7F8A]/50">
                                <option value="">Nenhuma</option><option value="Cabelo">Cabelo</option><option value="Barba">Barba</option><option value="Pele">Pele</option>
                            </select>
                        </div>
                        <div>
                            <label htmlFor="brand" className="block text-sm font-medium text-gray-700 mb-2">Marca (Opcional)</label>
                            <select name="brand" id="brand" value={formData.brand} onChange={handleChange} className="block w-full rounded-lg border-gray-300 focus:border-[#8C7F8A] focus:ring-2 focus:ring-[#8C7F8A]/50">
                                <option value="">Nenhuma</option><option value="Marca A">Marca A</option><option value="Marca B">Marca B</option><option value="Marca C">Marca C</option>
                            </select>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                        <div>
                            <label htmlFor="price" className="block text-sm font-medium text-gray-700 mb-2">Preço de Venda (R$)</label>
                            <input type="number" step="0.01" name="price" id="price" value={formData.price} onChange={handleChange} placeholder="70.00" className="block w-full rounded-lg border-gray-300 focus:border-[#8C7F8A] focus:ring-2 focus:ring-[#8C7F8A]/50" required />
                        </div>
                        <div>
                            <label htmlFor="stock" className="block text-sm font-medium text-gray-700 mb-2">Quantidade em Stock</label>
                            <input type="number" name="stock" id="stock" value={formData.stock} onChange={handleChange} className="block w-full rounded-lg border-gray-300 focus:border-[#8C7F8A] focus:ring-2 focus:ring-[#8C7F8A]/50" required />
                        </div>
                        <div>
                            <label htmlFor="cost" className="block text-sm font-medium text-gray-700 mb-2">Preço de Custo (R$)</label>
                            <input type="number" step="0.01" name="cost" id="cost" value={formData.cost} onChange={handleChange} placeholder="25.00" className="block w-full rounded-lg border-gray-300 focus:border-[#8C7F8A] focus:ring-2 focus:ring-[#8C7F8A]/50" />
                        </div>
                    </div>
                    <div>
                        <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">Descrição (Opcional)</label>
                        <textarea name="description" id="description" value={formData.description} onChange={handleChange} rows="3" placeholder="Detalhes sobre o produto..." className="block w-full rounded-lg border-gray-300 focus:border-[#8C7F8A] focus:ring-2 focus:ring-[#8C7F8A]/50"></textarea>
                    </div>
                    <div className="mt-8 pt-6 border-t border-gray-200 flex flex-col-reverse sm:flex-row justify-end gap-4">
                        <button type="button" onClick={onClose} className="w-full sm:w-auto rounded-lg bg-white border border-gray-300 px-6 py-2.5 text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#838996] focus:ring-offset-2">Cancelar</button>
                        <button type="submit" className="w-full sm:w-auto rounded-lg bg-[#4A544A] px-8 py-2.5 text-base font-medium text-white hover:bg-opacity-80 focus:outline-none focus:ring-2 focus:ring-[#8A998C] focus:ring-offset-2">Salvar Produto</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// --- Componente do Modal de Confirmação de Exclusão ---
const ConfirmDeleteModal = ({ isOpen, onClose, onConfirm, productName }) => {
    if (!isOpen) return null;
    return (
        <div className="modal-backdrop fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50">
            <div className="modal-content bg-white w-full max-w-md rounded-2xl shadow-2xl p-8 relative border border-gray-200">
                <h3 className="text-xl font-bold text-gray-900">Confirmar Exclusão</h3>
                <p className="mt-4 text-gray-600">Tem certeza que deseja excluir "<strong>{productName}</strong>"?</p>
                <div className="mt-8 flex justify-end gap-4">
                    <button onClick={onClose} className="rounded-lg bg-white border border-gray-300 px-6 py-2.5 font-medium text-gray-700 hover:bg-gray-50">Cancelar</button>
                    <button onClick={onConfirm} className="rounded-lg bg-red-600 px-6 py-2.5 font-medium text-white hover:bg-red-700">Excluir</button>
                </div>
            </div>
        </div>
    );
};

// --- Componente do Card de Produto ---
const ProductCard = ({ product, onEdit, onDelete }) => {
    const stock = Number(product.stock);
    let stockStatusColor = 'bg-green-100 text-green-800';
    if (stock <= 10) stockStatusColor = 'bg-yellow-100 text-yellow-800';
    if (stock <= 5) stockStatusColor = 'bg-red-100 text-red-800';

    return (
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 flex flex-col overflow-hidden transition-all duration-300 hover:shadow-2xl hover:-translate-y-1">
            <div className="bg-gray-50 h-40 flex items-center justify-center">
                <ProductPlaceholderIcon />
            </div>
            <div className="p-5 flex flex-col flex-grow">
                <div className="flex-grow">
                    <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${stockStatusColor}`}>{stock} em estoque</span>
                    <h3 className="text-lg font-bold text-gray-900 mt-2 truncate">{product.name}</h3>
                    <p className="text-sm text-gray-500">{product.category || 'Sem categoria'}</p>
                    <div className="mt-4 flex items-baseline gap-2">
                        <p className="text-2xl font-extrabold text-gray-900">R${Number(product.price).toFixed(2)}</p>
                        {product.cost && <p className="text-sm text-gray-500 line-through">R${Number(product.cost).toFixed(2)}</p>}
                    </div>
                </div>
                <div className="mt-6 pt-4 border-t border-gray-200 flex gap-2">
                    <button onClick={() => onEdit(product)} className="w-full flex items-center justify-center gap-2 text-sm font-semibold py-2 px-3 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors">
                        <EditIcon /> Editar
                    </button>
                    <button onClick={() => onDelete(product)} className="w-full flex items-center justify-center gap-2 text-sm font-semibold py-2 px-3 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 transition-colors">
                        <DeleteIcon /> Excluir
                    </button>
                </div>
            </div>
        </div>
    );
};

// --- Componente Principal da Página de Produtos ---
const ProductsPage = () => {
    const [products, setProducts] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [productToDelete, setProductToDelete] = useState(null);
    const [loading, setLoading] = useState(true);

    const fetchProducts = useCallback(async () => {
        setLoading(true);
        try {
            const response = await api.get('/products');
            setProducts(response.data);
        } catch (error) {
            console.error("Erro ao buscar produtos:", error);
            toast.error("Não foi possível carregar os produtos.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchProducts(); }, [fetchProducts]);

    const handleSave = (data) => {
        const isEditing = selectedProduct && selectedProduct.id;
        const savePromise = isEditing 
            ? api.put(`/products/${selectedProduct.id}`, data) 
            : api.post('/products', data);

        toast.promise(savePromise, {
            loading: 'Salvando produto...',
            success: () => {
                fetchProducts();
                closeModal();
                return `Produto ${isEditing ? 'atualizado' : 'criado'} com sucesso!`;
            },
            error: (err) => err.response?.data?.message || "Não foi possível salvar o produto."
        });
    };

    const confirmDelete = () => {
        if (!productToDelete) return;
        const deletePromise = api.delete(`/products/${productToDelete.id}`);
        toast.promise(deletePromise, {
            loading: 'Excluindo produto...',
            success: () => {
                fetchProducts();
                closeConfirmModal();
                return 'Produto excluído com sucesso!';
            },
            error: (err) => err.response?.data?.message || "Não foi possível excluir o produto."
        });
    };

    const filteredProducts = useMemo(() =>
        products.filter(product =>
            product.name.toLowerCase().includes(searchTerm.toLowerCase())
        ), [products, searchTerm]);

    const openModal = (product = null) => { setSelectedProduct(product); setIsModalOpen(true); };
    const closeModal = () => { setIsModalOpen(false); setSelectedProduct(null); };
    const openConfirmModal = (product) => { setProductToDelete(product); setIsConfirmModalOpen(true); };
    const closeConfirmModal = () => { setIsConfirmModalOpen(false); setProductToDelete(null); };

    return (
        <div className="bg-gray-50 min-h-screen">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <header className="flex flex-col md:flex-row justify-between items-center gap-6 mb-10">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Produtos</h1>
                        <p className="text-md text-gray-600 mt-1">Gerencie seu inventário de produtos.</p>
                    </div>
                    <div className="w-full md:w-auto flex flex-col sm:flex-row gap-4">
                        <div className="relative w-full sm:w-64">
                            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                <SearchIcon />
                            </div>
                            <input
                                type="text"
                                placeholder="Buscar produto..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="block w-full rounded-lg border-gray-300 pl-10 py-2 focus:border-[#8C7F8A] focus:ring-2 focus:ring-[#8C7F8A]/50"
                            />
                        </div>
                        <button onClick={() => openModal()} className="flex-shrink-0 flex items-center justify-center gap-2 bg-[#8C7F8A] hover:bg-opacity-80 text-white font-semibold py-2 px-5 rounded-lg shadow-md">
                            <AddIcon /> Novo Produto
                        </button>
                    </div>
                </header>

                {loading ? <p className="text-center text-gray-500 py-10">Carregando produtos...</p> : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                        {filteredProducts.map((product) => (
                            <ProductCard key={product.id} product={product} onEdit={openModal} onDelete={openConfirmModal} />
                        ))}
                    </div>
                )}
                { !loading && filteredProducts.length === 0 && (
                    <div className="text-center py-16">
                        <h3 className="text-xl font-semibold text-gray-800">Nenhum produto encontrado</h3>
                        <p className="text-gray-500 mt-2">Tente ajustar sua busca ou adicione um novo produto.</p>
                    </div>
                )}

                <ProductFormModal isOpen={isModalOpen} onClose={closeModal} onSave={handleSave} initialData={selectedProduct} />
                <ConfirmDeleteModal isOpen={isConfirmModalOpen} onClose={closeConfirmModal} onConfirm={confirmDelete} productName={productToDelete?.name} />
            </div>
        </div>
    );
};

export default ProductsPage;
