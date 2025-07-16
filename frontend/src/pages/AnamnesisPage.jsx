import React, { useState } from 'react';
import Modal from '../components/dashboard/Modal';
import AnamnesisFormBuilder from '../components/anamnesis/AnamnesisFormBuilder';

const AnamnesisPage = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [forms, setForms] = useState([
    { id: 1, title: 'Ficha para Tratamento Facial' },
    { id: 2, title: 'Ficha para Massagem Relaxante' },
  ]);

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Modelos de Anamnese</h1>
        <button onClick={() => setIsModalOpen(true)} className="px-4 py-2 bg-blue-600 text-white rounded-lg">
          Nova Ficha
        </button>
      </div>
      <div className="bg-white p-4 rounded-lg shadow">
        <ul className="divide-y divide-gray-200">
          {forms.map(form => (
            <li key={form.id} className="py-3 px-2 hover:bg-gray-50 cursor-pointer">
                {form.title}
            </li>
          ))}
        </ul>
      </div>
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
        <AnamnesisFormBuilder onSave={() => setIsModalOpen(false)} />
      </Modal>
    </div>
  );
};
export default AnamnesisPage;
