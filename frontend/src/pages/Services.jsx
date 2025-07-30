import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import ResourceTable from '../components/dashboard/ResourceTable';
import Modal from '../components/dashboard/Modal';
import ServiceForm from '../components/forms/ServiceForm';
import api from '../services/api';
import AdminLayout from '../components/layouts/AdminLayout'; // ✅ Importado

const Services = () => {
  const [services, setServices] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedService, setSelectedService] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchServices = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get('/services');
      setServices(response.data);
    } catch (error) {
      console.error("Erro ao buscar serviços:", error);
      toast.error("Não foi possível carregar os serviços.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  const handleSave = async (data) => {
    const isEditing = selectedService && selectedService.id;
    const savePromise = isEditing
      ? api.put(`/services/${selectedService.id}`, data)
      : api.post('/services', data);

    toast.promise(savePromise, {
      loading: 'A salvar serviço...',
      success: () => {
        fetchServices();
        setIsModalOpen(false);
        setSelectedService(null);
        return `Serviço ${isEditing ? 'atualizado' : 'criado'} com sucesso!`;
      },
      error: "Não foi possível salvar o serviço."
    });
  };

  const handleDelete = async (id) => {
    if (window.confirm("Tem certeza que deseja excluir este serviço?")) {
      const deletePromise = api.delete(`/services/${id}`);
      toast.promise(deletePromise, {
        loading: 'A excluir serviço...',
        success: () => {
          fetchServices();
          return 'Serviço excluído com sucesso!';
        },
        error: (err) => err.response?.data?.message || "Não foi possível excluir o serviço."
      });
    }
  };

  const columns = [
    { header: 'Nome', accessor: 'name' },
    { header: 'Preço', accessor: 'price', render: (price) => `R$ ${Number(price).toFixed(2)}` },
    { header: 'Duração', accessor: 'duration', render: (dur) => `${dur} min` },
  ];

  return (
    <AdminLayout>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Serviços</h1>
        <button
          onClick={() => { setSelectedService(null); setIsModalOpen(true); }}
          className="px-4 py-2 bg-purple-700 text-white rounded-lg hover:bg-purple-800 shadow"
        >
          Novo Serviço
        </button>
      </div>

      {loading ? <p>Carregando...</p> : (
        <ResourceTable
          columns={columns}
          data={services}
          onEdit={(service) => { setSelectedService(service); setIsModalOpen(true); }}
          onDelete={(id) => handleDelete(id)}
        />
      )}

      {isModalOpen && (
        <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
          <ServiceForm
            initialData={selectedService}
            onSave={handleSave}
            onCancel={() => setIsModalOpen(false)}
          />
        </Modal>
      )}
    </AdminLayout>
  );
};

export default Services;
