import React, { useState, useEffect, useCallback } from 'react';
import ResourceTable from '../components/dashboard/ResourceTable';
import Modal from '../components/dashboard/Modal';
import StaffForm from '../components/forms/StaffForm';
// import api from '../services/api';

const Staff = () => {
  const [staff, setStaff] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState(null);

  const fetchStaff = useCallback(async () => {
    // const response = await api.get('/staff');
    // setStaff(response.data);
    setStaff([
        {id: 1, name: 'Carlos Pereira', email: 'carlos@agendalyn.com', role: 'STAFF'},
        {id: 2, name: 'Ana Souza', email: 'ana@agendalyn.com', role: 'OWNER'},
    ]);
  }, []);

  useEffect(() => {
    fetchStaff();
  }, [fetchStaff]);

  const handleSave = async (data) => {
    console.log("Salvando colaborador:", data);
    // Lógica para salvar na API
    fetchStaff();
    setIsModalOpen(false);
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
        <button onClick={() => { setSelectedStaff(null); setIsModalOpen(true); }} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          Novo Colaborador
        </button>
      </div>
      <ResourceTable columns={columns} data={staff} onEdit={(s) => { setSelectedStaff(s); setIsModalOpen(true); }} />
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
        <StaffForm initialData={selectedStaff} onSave={handleSave} onCancel={() => setIsModalOpen(false)} />
      </Modal>
    </div>
  );
};
export default Staff;