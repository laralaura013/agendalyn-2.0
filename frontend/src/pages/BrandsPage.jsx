import React, { useState, useEffect, useCallback } from 'react';
import ResourceTable from '../components/dashboard/ResourceTable';
import Modal from '../components/dashboard/Modal';
import api from '../services/api';
import AdminLayout from '../components/layouts/AdminLayout';

const BrandForm = ({ initialData, onSave, onCancel }) => {
  const [name, setName] = useState(initialData?.name || '');

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({ name });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h2 className="text-2xl font-bold mb-4">{initialData ? 'Editar Marca' : 'Nova Marca'}</h2>
      <div>
        <label className="block text-sm font-medium text-gray-700">Nome da Marca</label>
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

const BrandsPage = () => {
  const [brands, setBrands] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedBrand, setSelectedBrand] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchBrands = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get('/brands');
      setBrands(response.data);
    } catch (error) {
      alert("Não foi possível carregar as marcas.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBrands();
  }, [fetchBrands]);

  const handleSave = async (data) => {
    try {
      if (selectedBrand) {
        await api.put(`/brands/${selectedBrand.id}`, data);
      } else {
        await api.post('/brands', data);
      }
      fetchBrands();
      setIsModalOpen(false);
      setSelectedBrand(null);
    } catch (error) {
      alert("Não foi possível salvar a marca.");
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Tem certeza?")) {
      try {
        await api.delete(`/brands/${id}`);
        fetchBrands();
      } catch (error) {
        alert(error.response?.data?.message || "Não foi possível excluir a marca.");
      }
    }
  };

  const columns = [{ header: 'Nome', accessor: 'name' }];

  return (
    <AdminLayout>
      <div className="min-h-screen px-4 pt-4 pb-20 sm:px-6 md:px-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <h1 className="text-2xl md:text-3xl font-bold">Marcas de Produtos</h1>
          <button
            onClick={() => { setSelectedBrand(null); setIsModalOpen(true); }}
            className="px-4 py-2 bg-purple-700 text-white rounded-lg hover:bg-purple-800 shadow"
          >
            Nova Marca
          </button>
        </div>

        {loading ? (
          <p className="text-gray-500">Carregando...</p>
        ) : (
          <ResourceTable
            columns={columns}
            data={brands}
            onEdit={(brand) => {
              setSelectedBrand(brand);
              setIsModalOpen(true);
            }}
            onDelete={handleDelete}
          />
        )}

        {isModalOpen && (
          <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
            <BrandForm
              initialData={selectedBrand}
              onSave={handleSave}
              onCancel={() => setIsModalOpen(false)}
            />
          </Modal>
        )}
      </div>
    </AdminLayout>
  );
};

export default BrandsPage;
