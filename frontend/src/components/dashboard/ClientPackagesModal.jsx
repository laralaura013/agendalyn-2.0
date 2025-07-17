import React, { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';

const ClientPackagesModal = ({ client, onClose }) => {
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchClientPackages = useCallback(async () => {
    if (!client) return;
    setLoading(true);
    try {
      const response = await api.get(`/packages/client/${client.id}`);
      setPackages(response.data);
    } catch (error) {
      console.error("Erro ao buscar pacotes do cliente:", error);
      alert("Não foi possível carregar os pacotes deste cliente.");
    } finally {
      setLoading(false);
    }
  }, [client]);

  useEffect(() => {
    fetchClientPackages();
  }, [fetchClientPackages]);

  const handleUseSession = async (clientPackageId) => {
    if (!window.confirm("Confirmar o uso de 1 sessão deste pacote?")) return;

    try {
      await api.post(`/packages/use-session/${clientPackageId}`);
      alert("Sessão utilizada com sucesso!");
      fetchClientPackages(); // Atualiza a lista para mostrar o novo saldo
    } catch (error) {
      alert(error.response?.data?.message || "Não foi possível usar a sessão.");
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center">
      <div className="bg-white p-6 rounded-lg shadow-2xl w-full max-w-lg">
        <h2 className="text-2xl font-bold mb-4">Pacotes de {client.name}</h2>
        <div className="space-y-4 max-h-96 overflow-y-auto">
          {loading ? <p>A carregar...</p> : packages.length > 0 ? (
            packages.map(cp => (
              <div key={cp.id} className="p-4 border rounded-md flex justify-between items-center">
                <div>
                  <p className="font-semibold">{cp.package.name}</p>
                  <p className="text-sm text-gray-600">
                    Sessões restantes: <span className="font-bold text-blue-600">{cp.sessionsRemaining}</span> / {cp.package.sessions}
                  </p>
                  <p className="text-xs text-gray-500">Expira em: {new Date(cp.expiresAt).toLocaleDateString()}</p>
                </div>
                <button
                  onClick={() => handleUseSession(cp.id)}
                  disabled={cp.sessionsRemaining <= 0}
                  className="px-3 py-1 bg-green-500 text-white text-sm font-semibold rounded-md hover:bg-green-600 disabled:bg-gray-400"
                >
                  Usar 1 Sessão
                </button>
              </div>
            ))
          ) : <p className="text-center text-gray-500 py-4">Este cliente não possui pacotes ativos.</p>}
        </div>
        <div className="flex justify-end mt-6">
          <button onClick={onClose} className="px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300">Fechar</button>
        </div>
      </div>
    </div>
  );
};

export default ClientPackagesModal;