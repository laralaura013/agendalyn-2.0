import React, { useState } from 'react';
import Modal from '../components/dashboard/Modal';
import PackageForm from '../components/packages/PackageForm';

const PackagesPage = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [packages, setPackages] = useState([
    { id: 1, name: 'Pacote 10 Massagens', price: 800, sessions: 10 },
    { id: 2, name: 'Pacote 5 Limpezas de Pele', price: 450, sessions: 5 },
  ]);

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Pacotes de Serviços</h1>
        <button onClick={() => setIsModalOpen(true)} className="px-4 py-2 bg-blue-600 text-white rounded-lg">
          Novo Pacote
        </button>
      </div>
      <div className="bg-white p-4 rounded-lg shadow">
        <ul className="divide-y divide-gray-200">
            {packages.map(pkg => (
                <li key={pkg.id} className="py-3 px-2 flex justify-between items-center hover:bg-gray-50">
                    <span>{pkg.name} ({pkg.sessions} sessões)</span>
                    <span className="font-semibold">R$ {pkg.price.toFixed(2)}</span>
                </li>
            ))}
        </ul>
      </div>
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
        <PackageForm onSave={() => setIsModalOpen(false)} />
      </Modal>
    </div>
  );
};
export default PackagesPage;