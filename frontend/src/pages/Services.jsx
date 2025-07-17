import React, { useState, useEffect, useCallback } from 'react';
import ResourceTable from '../components/dashboard/ResourceTable';
import Modal from '../components/dashboard/Modal';
import ServiceForm from '../components/forms/ServiceForm';
import api from '../services/api';

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
      alert("Não foi possível carregar os serviços.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  const handleSave = async (data) => {
    try {
      if (selectedService) {
        await api.put(`/services/${selectedService.id}`, data);
      } else {
        await api.post('/services', data);
      }
      fetchServices();
      setIsModalOpen(false);
      setSelectedService(null);
    } catch (error) {
      console.error("Erro ao salvar serviço:", error);
      alert("Não foi possível salvar o serviço.");
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Tem certeza que deseja excluir este serviço?")) {
      try {
        await api.delete(`/services/${id}`);
        fetchServices();
      } catch (error) {
        console.error("Erro ao deletar serviço:", error);
        alert("Não foi possível excluir o serviço.");
      }
    }
  };

  const columns = [
    { header: 'Nome', accessor: 'name' },
    { header: 'Preço', accessor: 'price', render: (price) => `R$ ${price}` },
    { header: 'Duração', accessor: 'duration', render: (dur) => `${dur} min` },
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Serviços</h1>
        <button
          onClick={() => { setSelectedService(null); setIsModalOpen(true); }}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow"
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
    </div>
  );
};

export default Services;