import React, { useState, useEffect, useCallback } from 'react';
import ResourceTable from '../components/dashboard/ResourceTable';
import Modal from '../components/dashboard/Modal';
import StaffForm from '../components/forms/StaffForm';
import api from '../services/api';

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
      console.error("Erro ao buscar colaboradores:", error);
      alert("Não foi possível carregar os colaboradores.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStaff();
  }, [fetchStaff]);

  // ATUALIZADO: Agora lida com criar e editar
  const handleSave = async (data) => {
    const dataToSave = { ...data };
    // Remove o campo de senha se estiver vazio para não alterar a senha sem necessidade
    if (!dataToSave.password) {
      delete dataToSave.password;
    }

    try {
      if (selectedStaff) {
        // Lógica de Edição REAL
        await api.put(`/staff/${selectedStaff.id}`, dataToSave);
      } else {
        // Lógica de Criação REAL
        await api.post('/staff', dataToSave);
      }
      fetchStaff();
      setIsModalOpen(false);
      setSelectedStaff(null);
    } catch (error) {
      console.error("Erro ao salvar colaborador:", error);
      const errorMessage = error.response?.data?.message || "Não foi possível salvar o colaborador.";
      alert(errorMessage);
    }
  };

  // ATUALIZADO: Agora deleta de verdade
  const handleDelete = async (id) => {
    if (window.confirm("Tem certeza que deseja excluir este colaborador?")) {
      try {
        await api.delete(`/staff/${id}`);
        fetchStaff(); // Atualiza a lista
      } catch (error) {
        console.error("Erro ao deletar colaborador:", error);
        alert("Não foi possível excluir o colaborador.");
      }
    }
  };

  const columns = [
    { header: 'Nome', accessor: 'name' },
    { header: 'Email', accessor: 'email' },
    { header: 'Função', accessor: 'role' },
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Colaboradores</h1>
        <button
          onClick={() => { setSelectedStaff(null); setIsModalOpen(true); }}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow"
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
    </div>
  );
};

export default Staff;