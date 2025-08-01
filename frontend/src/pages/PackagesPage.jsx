import React, { useState, useEffect, useCallback } from 'react';
import Modal from '../components/dashboard/Modal';
import PackageForm from '../components/forms/PackageForm';
import SellPackageForm from '../components/forms/SellPackageForm';
import api from '../services/api';
// import AdminLayout from '../components/layouts/AdminLayout'; // REMOVIDO

const PackageCard = ({ pkg, onSell }) => (
  <div className="bg-white p-5 rounded-lg shadow-md border flex flex-col justify-between">
    <div>
      <h3 className="font-bold text-xl text-gray-800">{pkg.name}</h3>
      <p className="text-2xl font-light text-blue-600 my-2">R$ {Number(pkg.price).toFixed(2)}</p>
      <div className="text-sm text-gray-600 space-y-1">
        <p><strong>Sessões:</strong> {pkg.sessions}</p>
        <p><strong>Validade:</strong> {pkg.validityDays} dias</p>
      </div>
      <div className="mt-3 pt-3 border-t">
        <h4 className="font-semibold text-xs text-gray-500 uppercase mb-2">Serviços Inclusos:</h4>
        <ul className="list-disc list-inside text-sm text-gray-700">
          {pkg.services.map(service => <li key={service.name}>{service.name}</li>)}
        </ul>
      </div>
    </div>
    <div className="mt-4">
      <button 
        onClick={() => onSell(pkg)}
        className="w-full px-4 py-2 bg-green-500 text-white font-semibold rounded-lg hover:bg-green-600"
      >
        Vender Pacote
      </button>
    </div>
  </div>
);

const PackagesPage = () => {
  const [packages, setPackages] = useState([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSellModalOpen, setIsSellModalOpen] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchPackages = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get('/packages');
      setPackages(response.data);
    } catch (error) {
      console.error("Erro ao buscar pacotes:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPackages();
  }, [fetchPackages]);

  const handleCreateSave = async (data) => {
    try {
      await api.post('/packages', data);
      fetchPackages();
      setIsCreateModalOpen(false);
    } catch (error) {
      alert(error.response?.data?.message || "Não foi possível salvar o pacote.");
    }
  };

  const handleSellClick = (pkg) => {
    setSelectedPackage(pkg);
    setIsSellModalOpen(true);
  };

  const handleSellSave = async (data) => {
    try {
      await api.post('/packages/sell', data);
      alert(`Pacote "${selectedPackage.name}" vendido com sucesso!`);
      setIsSellModalOpen(false);
      setSelectedPackage(null);
    } catch (error) {
      alert(error.response?.data?.message || "Não foi possível vender o pacote.");
    }
  };

  return (
    <div className="min-h-screen px-4 pt-4 pb-20 sm:px-6 md:px-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h1 className="text-2xl md:text-3xl font-bold">Pacotes de Serviços</h1>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow"
        >
          Criar Pacote
        </button>
      </div>

      {loading ? (
        <p className="text-gray-500">Carregando...</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {packages.length > 0 ? (
            packages.map(pkg => (
              <PackageCard key={pkg.id} pkg={pkg} onSell={handleSellClick} />
            ))
          ) : (
            <p className="col-span-full text-center text-gray-500">Nenhum pacote cadastrado.</p>
          )}
        </div>
      )}

      {isCreateModalOpen && (
        <Modal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)}>
          <PackageForm onSave={handleCreateSave} onCancel={() => setIsCreateModalOpen(false)} />
        </Modal>
      )}

      {isSellModalOpen && selectedPackage && (
        <Modal isOpen={isSellModalOpen} onClose={() => setIsSellModalOpen(false)}>
          <SellPackageForm
            pkg={selectedPackage}
            onSave={handleSellSave}
            onCancel={() => setIsSellModalOpen(false)}
          />
        </Modal>
      )}
    </div>
  );
};

export default PackagesPage;
