import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast'; // 1. Importa a função de notificação
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
      toast.error("Não foi possível carregar os clientes."); // 2. Substitui o alert
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  const handleSave = async (data) => {
    const isEditing = selectedClient && selectedClient.id;
    const savePromise = isEditing
      ? api.put(`/clients/${selectedClient.id}`, data)
      : api.post('/clients', data);

    toast.promise(savePromise, {
      loading: 'A salvar cliente...',
      success: () => {
        fetchClients();
        setIsFormModalOpen(false);
        setSelectedClient(null);
        return `Cliente ${isEditing ? 'atualizado' : 'criado'} com sucesso!`;
      },
      error: 'Não foi possível salvar o cliente.',
    });
  };

  const handleDelete = async (id) => {
    if (window.confirm("Tem certeza que deseja excluir este cliente e todo o seu histórico?")) {
      const deletePromise = api.delete(`/clients/${id}`);
      toast.promise(deletePromise, {
        loading: 'A excluir cliente...',
        success: () => {
          fetchClients();
          return 'Cliente excluído com sucesso!';
        },
        error: 'Não foi possível excluir o cliente.',
      });
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
        <button onClick={() => handleViewPackages(client)} className="text-purple-700 hover:underline font-semibold text-left">
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
          className="px-4 py-2 bg-purple-700 text-white rounded-lg hover:bg-purple-800 shadow"
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

      {isFormModalOpen && (
        <Modal isOpen={isFormModalOpen} onClose={() => setIsFormModalOpen(false)}>
          <ClientForm 
            initialData={selectedClient} 
            onSave={handleSave} 
            onCancel={() => setIsFormModalOpen(false)} 
          />
        </Modal>
      )}

      {isPackageModalOpen && selectedClient && (
        <ClientPackagesModal
          client={selectedClient}
          onClose={() => setIsPackageModalOpen(false)}
        />
      )}

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