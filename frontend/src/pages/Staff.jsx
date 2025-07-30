import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import ResourceTable from '../components/dashboard/ResourceTable';
import Modal from '../components/dashboard/Modal';
import StaffForm from '../components/forms/StaffForm';
import api from '../services/api';
import AdminLayout from '../components/layouts/AdminLayout'; // Importa o AdminLayout

const Staff = () => {
  const [staff, setStaff] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchStaff = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get('/staff');
      setStaff(response.data);
    } catch (error) {
      toast.error("Não foi possível carregar os colaboradores.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStaff();
  }, [fetchStaff]);

  const handleSave = async (data) => {
    const dataToSave = { ...data };
    if (!dataToSave.password) {
      delete dataToSave.password;
    }
    
    const isEditing = selectedStaff && selectedStaff.id;
    const savePromise = isEditing
        ? api.put(`/staff/${selectedStaff.id}`, dataToSave)
        : api.post('/staff', dataToSave);

    toast.promise(savePromise, {
        loading: 'A salvar colaborador...',
        success: () => {
            fetchStaff();
            setIsModalOpen(false);
            setSelectedStaff(null);
            return `Colaborador ${isEditing ? 'atualizado' : 'criado'} com sucesso!`;
        },
        error: (err) => err.response?.data?.message || "Não foi possível salvar o colaborador."
    });
  };

  const handleDelete = async (id) => {
    if (window.confirm("Tem certeza que deseja excluir este colaborador?")) {
      const deletePromise = api.delete(`/staff/${id}`);
      toast.promise(deletePromise, {
          loading: 'A excluir colaborador...',
          success: () => {
              fetchStaff();
              return 'Colaborador excluído com sucesso!';
          },
          error: "Não foi possível excluir o colaborador."
      });
    }
  };

  // --- COLUNAS ATUALIZADAS ---
  const columns = [
    { header: 'Nome', accessor: 'name' },
    { header: 'Email', accessor: 'email' },
    { header: 'Função', accessor: 'role' },
    {
        header: 'Visível Agendamento',
        accessor: 'showInBooking',
        render: (show) => (
            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${show ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                {show ? 'Sim' : 'Não'}
            </span>
        )
    }
  ];

  return (
    <AdminLayout>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Colaboradores</h1>
        <button
          onClick={() => { setSelectedStaff(null); setIsModalOpen(true); }}
          className="px-4 py-2 bg-purple-700 text-white rounded-lg hover:bg-purple-800 shadow"
        >
          Novo Colaborador
        </button>
      </div>

      {loading ? (
        <p>Carregando colaboradores...</p>
      ) : (
        <ResourceTable
          columns={columns}
          data={staff}
          onEdit={(staffMember) => { setSelectedStaff(staffMember); setIsModalOpen(true); }}
          onDelete={(id) => handleDelete(id)}
        />
      )}

      {isModalOpen && (
         <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
          <StaffForm
            initialData={selectedStaff}
            onSave={handleSave}
            onCancel={() => setIsModalOpen(false)}
          />
        </Modal>
      )}
    </AdminLayout>
  );
};

export default Staff;
