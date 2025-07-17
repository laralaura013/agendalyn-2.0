import React, { useState, useEffect, useCallback } from 'react';
import ResourceTable from '../components/dashboard/ResourceTable';
import Modal from '../components/dashboard/Modal';
import ClientForm from '../components/forms/ClientForm';
import ClientPackagesModal from '../components/dashboard/ClientPackagesModal';
import AnamnesisHistoryModal from '../components/anamnesis/AnamnesisHistoryModal';
import api from '../services/api';

const Clients = () => {
  const [clients, setClients] = useState([]);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isPackageModalOpen, setIsPackageModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchClients = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get('/clients');
      setClients(response.data);
    } catch (error) {
      console.error("Erro ao buscar clientes:", error);
      alert("Não foi possível carregar os clientes.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  const handleSave = async (data) => {
    try {
      if (selectedClient && selectedClient.id) {
        await api.put(`/clients/${selectedClient.id}`, data);
      } else {
        await api.post('/clients', data);
      }
      fetchClients();
      setIsFormModalOpen(false);
      setSelectedClient(null);
    } catch (error) {
      alert("Não foi possível salvar o cliente.");
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Tem certeza que deseja excluir este cliente e todo o seu histórico?")) {
      try {
        await api.delete(`/clients/${id}`);
        fetchClients();
      } catch (error) {
        alert("Não foi possível excluir o cliente.");
      }
    }
  };

  const handleViewPackages = (client) => {
    setSelectedClient(client);
    setIsPackageModalOpen(true);
  };

  const handleEditClient = (client) => {
    setSelectedClient(client);
    setIsFormModalOpen(true);
  };

  const handleViewHistory = (client) => {
    setSelectedClient(client);
    setIsHistoryModalOpen(true);
  };

  const columns = [
    {
      header: 'Nome',
      accessor: 'name',
      render: (name, client) => (
        <button onClick={() => handleViewPackages(client)} className="text-blue-600 hover:underline font-semibold text-left">
          {name}
        </button>
      )
    },
    { header: 'Telefone', accessor: 'phone' },
    {
      header: 'Histórico Anamnese',
      accessor: 'id',
      render: (id, client) => (
        <button onClick={() => handleViewHistory(client)} className="px-2 py-1 bg-gray-200 text-gray-700 text-xs font-semibold rounded hover:bg-gray-300">
          Ver Fichas
        </button>
      )
    }
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Clientes</h1>
        <button
          onClick={() => { setSelectedClient(null); setIsFormModalOpen(true); }}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow"
        >
          Novo Cliente
        </button>
      </div>

      {loading ? <p>A carregar...</p> : (
        <ResourceTable
          columns={columns}
          data={clients}
          onEdit={handleEditClient}
          onDelete={handleDelete}
        />
      )}

      {/* Modal para Criar/Editar Cliente */}
      {isFormModalOpen && (
        <Modal isOpen={isFormModalOpen} onClose={() => setIsFormModalOpen(false)}>
          <ClientForm
            initialData={selectedClient}
            onSave={handleSave}
            onCancel={() => setIsFormModalOpen(false)}
          />
        </Modal>
      )}

      {/* Modal para ver Pacotes do Cliente */}
      {isPackageModalOpen && selectedClient && (
        <ClientPackagesModal
          client={selectedClient}
          onClose={() => setIsPackageModalOpen(false)}
        />
      )}

      {/* Modal para ver Histórico de Anamnese do Cliente */}
      {isHistoryModalOpen && selectedClient && (
        <AnamnesisHistoryModal
          client={selectedClient}
          onClose={() => setIsHistoryModalOpen(false)}
        />
      )}
    </div>
  );
};

export default Clients;