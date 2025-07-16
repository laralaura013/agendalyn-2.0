import React, { useState, useEffect, useCallback } from 'react';
import ResourceTable from '../components/dashboard/ResourceTable';
import Modal from '../components/dashboard/Modal';
import ServiceForm from '../components/forms/ServiceForm';
// import api from '../services/api';

const Services = () => {
  const [services, setServices] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedService, setSelectedService] = useState(null);

  const fetchServices = useCallback(async () => {
    // const response = await api.get('/services');
    // setServices(response.data);
    setServices([
        {id: 1, name: 'Corte Masculino', price: 50.00, duration: 30},
        {id: 2, name: 'Manicure', price: 35.00, duration: 45},
    ]);
  }, []);

  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  const handleSave = async (data) => {
    console.log("Salvando serviço:", data);
    // Lógica para salvar na API
    fetchServices();
    setIsModalOpen(false);
  };

  const columns = [
    { header: 'Nome', accessor: 'name' },
    { header: 'Preço', accessor: 'price', render: (price) => `R$ ${price.toFixed(2)}` },
    { header: 'Duração (min)', accessor: 'duration' },
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Serviços</h1>
        <button onClick={() => { setSelectedService(null); setIsModalOpen(true); }} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          Novo Serviço
        </button>
      </div>
      <ResourceTable columns={columns} data={services} onEdit={(s) => { setSelectedService(s); setIsModalOpen(true); }} />
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
        <ServiceForm initialData={selectedService} onSave={handleSave} onCancel={() => setIsModalOpen(false)} />
      </Modal>
    </div>
  );
};
export default Services;
