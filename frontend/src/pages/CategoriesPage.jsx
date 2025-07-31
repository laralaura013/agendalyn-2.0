import React, { useState, useEffect, useCallback } from 'react';
import ResourceTable from '../components/dashboard/ResourceTable';
import Modal from '../components/dashboard/Modal';
import AdminLayout from '../components/layouts/AdminLayout';
import api from '../services/api';

const CategoryForm = ({ initialData, onSave, onCancel }) => {
  const [name, setName] = useState(initialData?.name || '');

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({ name });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h2 className="text-2xl font-bold mb-4">{initialData ? 'Editar Categoria' : 'Nova Categoria'}</h2>
      <div>
        <label className="block text-sm font-medium text-gray-700">Nome da Categoria</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-1 block w-full p-2 border rounded"
          required
        />
      </div>
      <div className="flex justify-end gap-4 pt-4">
        <button type="button" onClick={onCancel} className="px-4 py-2 bg-gray-200 rounded-md">
          Cancelar
        </button>
        <button type="submit" className="px-4 py-2 bg-purple-700 text-white rounded-md">
          Salvar
        </button>
      </div>
    </form>
  );
};

const CategoriesPage = () => {
  const [categories, setCategories] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get('/categories');
      setCategories(response.data);
    } catch (error) {
      alert("Não foi possível carregar as categorias.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const handleSave = async (data) => {
    try {
      if (selectedCategory) {
        await api.put(`/categories/${selectedCategory.id}`, data);
      } else {
        await api.post('/categories', data);
      }
      fetchCategories();
      setIsModalOpen(false);
      setSelectedCategory(null);
    } catch (error) {
      alert("Não foi possível salvar a categoria.");
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Tem certeza?")) {
      try {
        await api.delete(`/categories/${id}`);
        fetchCategories();
      } catch (error) {
        alert(error.response?.data?.message || "Não foi possível excluir a categoria.");
      }
    }
  };

  const columns = [{ header: 'Nome', accessor: 'name' }];

  return (
    <AdminLayout>
      <div className="min-h-screen px-4 pt-4 pb-20 sm:px-6 md:px-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <h1 className="text-2xl md:text-3xl font-bold">Categorias de Produtos</h1>
          <button
            onClick={() => { setSelectedCategory(null); setIsModalOpen(true); }}
            className="px-4 py-2 bg-purple-700 text-white rounded-lg hover:bg-purple-800 shadow"
          >
            Nova Categoria
          </button>
        </div>

        {loading ? (
          <p className="text-gray-500">Carregando...</p>
        ) : (
          <ResourceTable
            columns={columns}
            data={categories}
            onEdit={(cat) => {
              setSelectedCategory(cat);
              setIsModalOpen(true);
            }}
            onDelete={handleDelete}
          />
        )}

        {isModalOpen && (
          <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
            <CategoryForm
              initialData={selectedCategory}
              onSave={handleSave}
              onCancel={() => setIsModalOpen(false)}
            />
          </Modal>
        )}
      </div>
    </AdminLayout>
  );
};

export default CategoriesPage;
