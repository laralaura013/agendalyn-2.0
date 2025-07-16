import React, { useState, useEffect, useCallback } from 'react';
import ResourceTable from '../components/dashboard/ResourceTable';
import Modal from '../components/dashboard/Modal';
import ClientForm from '../components/forms/ClientForm';
// import api from '../services/api';

const Clients = () => {
  const [clients, setClients] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);

  const fetchClients = useCallback(async () => {
    // const response = await api.get('/clients');
    // setClients(response.data);
    console.log("Buscando clientes...");
    setClients([ // Dados mocados
        {id: 1, name: 'João da Silva', phone: '11999998888', birthDate: '1990-01-15T00:00:00.000Z'},
        {id: 2, name: 'Maria Oliveira', phone: '21988887777', birthDate: '1985-05-20T00:00:00.000Z'}
    ]);
  }, []);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  const handleSave = async (data) => {
    console.log("Salvando cliente:", data);
    // if (selectedClient) {
    //   await api.put(`/clients/${selectedClient.id}`, data);
    // } else {
    //   await api.post('/clients', data);
    // }
    fetchClients();
    setIsModalOpen(false);
    setSelectedClient(null);
  };

  const handleDelete = async (id) => {
    console.log("Deletando cliente:", id);
    // await api.delete(`/clients/${id}`);
    fetchClients();
  };

  const columns = [
    { header: 'Nome', accessor: 'name' },
    { header: 'Telefone', accessor: 'phone' },
    { header: 'Nascimento', accessor: 'birthDate', render: (date) => date ? new Date(date).toLocaleDateString() : '-' },
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Clientes</h1>
        <button onClick={() => { setSelectedClient(null); setIsModalOpen(true); }} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          Novo Cliente
        </button>
      </div>
      <ResourceTable columns={columns} data={clients} onEdit={(client) => { setSelectedClient(client); setIsModalOpen(true); }} onDelete={handleDelete} />
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
        <ClientForm initialData={selectedClient} onSave={handleSave} onCancel={() => setIsModalOpen(false)} />
      </Modal>
    </div>
  );
};
export default Clients;
