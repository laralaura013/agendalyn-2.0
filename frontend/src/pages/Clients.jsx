import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import ResourceTable from '../components/dashboard/ResourceTable';
import Modal from '../components/dashboard/Modal';
import ClientForm from '../components/forms/ClientForm';
import api from '../services/api';

const Clients = () => {
  const [clients, setClients] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchClients = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get('/clients');
      setClients(response.data);
    } catch (error) {
      toast.error("Não foi possível carregar os clientes.");
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
            setIsModalOpen(false);
            setSelectedClient(null);
            return `Cliente ${isEditing ? 'atualizado' : 'criado'} com sucesso!`;
        },
        error: "Não foi possível salvar o cliente."
    });
  };

  const handleDelete = async (id) => {
    if (window.confirm("Tem certeza que deseja excluir este cliente?")) {
        const deletePromise = api.delete(`/clients/${id}`);
        toast.promise(deletePromise, {
            loading: 'A excluir cliente...',
            success: () => {
                fetchClients();
                return 'Cliente excluído com sucesso!';
            },
            error: "Não foi possível excluir o cliente."
        });
    }
  };

  // --- COLUNAS ATUALIZADAS ---
  const columns = [
    { header: 'Nome', accessor: 'name' },
    { header: 'Telefone', accessor: 'phone' },
    { header: 'Email', accessor: 'email' }, // COLUNA ADICIONADA
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Clientes</h1>
        <button
          onClick={() => { setSelectedClient(null); setIsModalOpen(true); }}
          className="px-4 py-2 bg-purple-700 text-white rounded-lg hover:bg-purple-800 shadow"
        >
          Novo Cliente
        </button>
      </div>

      {loading ? (
        <p>A carregar clientes...</p>
      ) : (
        <ResourceTable
          columns={columns}
          data={clients}
          onEdit={(client) => { setSelectedClient(client); setIsModalOpen(true); }}
          onDelete={(id) => handleDelete(id)}
        />
      )}

      {isModalOpen && (
        <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
          <ClientForm
            initialData={selectedClient}
            onSave={handleSave}
            onCancel={() => setIsModalOpen(false)}
          />
        </Modal>
      )}
    </div>
  );
};

export default Clients;