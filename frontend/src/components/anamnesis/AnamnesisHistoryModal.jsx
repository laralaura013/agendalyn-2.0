import React, { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';


import { asArray } from '../../utils/asArray';
const AnamnesisHistoryModal = ({ client, onClose }) => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchHistory = useCallback(async () => {
    if (!client) return;
    setLoading(true);
    try {
      const response = await api.get(`/anamnesis/answers/client/${client.id}`);
      setHistory(response.data);
    } catch (error) {
      console.error("Erro ao buscar histórico:", error);
      alert("Não foi possível carregar o histórico deste cliente.");
    } finally {
      setLoading(false);
    }
  }, [client]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center">
      <div className="bg-white p-6 rounded-lg shadow-2xl w-full max-w-2xl">
        <h2 className="text-2xl font-bold mb-4">Histórico de Anamnese de {client.name}</h2>
        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
          {loading ? <p>A carregar...</p> : history.length > 0 ? (
            asArray(history).map(item => (
              <div key={item.id} className="p-4 border rounded-md bg-gray-50">
                <p className="font-semibold">{item.form.title}</p>
                <p className="text-xs text-gray-500 mb-3">
                  Respondido em: {new Date(item.createdAt).toLocaleString('pt-BR')}
                </p>
                <div className="space-y-2">
                  {Object.entries(asArray(item.answers)).map(([questionId, answer]) => (
                    <div key={questionId} className="text-sm">
                      {/* Precisaríamos buscar a pergunta original, mas por agora exibimos a resposta */}
                      <p className="text-gray-800">{answer || <span className="italic text-gray-400">Não respondido</span>}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))
          ) : <p className="text-center text-gray-500 py-6">Nenhuma ficha de anamnese respondida para este cliente.</p>}
        </div>
        <div className="flex justify-end mt-6">
          <button onClick={onClose} className="px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300">Fechar</button>
        </div>
      </div>
    </div>
  );
};

export default AnamnesisHistoryModal;
