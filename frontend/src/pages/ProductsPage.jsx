import React, { useState, useEffect, useCallback } from 'react';
import ResourceTable from '../components/dashboard/ResourceTable';
import Modal from '../components/dashboard/Modal';
import ProductForm from '../components/forms/ProductForm';
import api from '../services/api';
import AdminLayout from '../components/layout/AdminLayout'; // ✅ Importado

const ProductsPage = () => {
  const [products, setProducts] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get('/products');
      setProducts(response.data);
    } catch (error) {
      console.error("Erro ao buscar produtos:", error);
      alert("Não foi possível carregar os produtos.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleSave = async (data) => {
    try {
      if (selectedProduct) {
        await api.put(`/products/${selectedProduct.id}`, data);
      } else {
        await api.post('/products', data);
      }
      fetchProducts();
      setIsModalOpen(false);
      setSelectedProduct(null);
    } catch (error) {
      alert(error.response?.data?.message || "Não foi possível salvar o produto.");
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Tem certeza que deseja excluir este produto?")) {
      try {
        await api.delete(`/products/${id}`);
        fetchProducts();
      } catch (error) {
        alert(error.response?.data?.message || "Não foi possível excluir o produto.");
      }
    }
  };

  const columns = [
    { header: 'Nome', accessor: 'name' },
    { header: 'Preço Venda', accessor: 'price', render: (price) => `R$ ${Number(price).toFixed(2)}` },
    { header: 'Stock', accessor: 'stock' },
    { header: 'Custo', accessor: 'cost', render: (cost) => cost ? `R$ ${Number(cost).toFixed(2)}` : '-' },
  ];

  return (
    <AdminLayout>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Produtos</h1>
        <button 
          onClick={() => { setSelectedProduct(null); setIsModalOpen(true); }}
          className="px-4 py-2 bg-purple-700 text-white rounded-lg hover:bg-purple-800 shadow"
        >
          Novo Produto
        </button>
      </div>

      {loading ? <p>Carregando produtos...</p> : (
        <ResourceTable 
          columns={columns} 
          data={products} 
          onEdit={(product) => { setSelectedProduct(product); setIsModalOpen(true); }}
          onDelete={handleDelete}
        />
      )}

      {isModalOpen && (
        <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
          <ProductForm
            initialData={selectedProduct}
            onSave={handleSave}
            onCancel={() => setIsModalOpen(false)}
          />
        </Modal>
      )}
    </AdminLayout>
  );
};

export default ProductsPage;
