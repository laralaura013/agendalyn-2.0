import React, { useState, useEffect, useCallback } from 'react';
import Modal from '../components/dashboard/Modal';
import AnamnesisFormBuilder from '../components/anamnesis/AnamnesisFormBuilder';
import AnamnesisViewer from '../components/anamnesis/AnamnesisViewer'; // Importa o novo componente
import api from '../services/api';

const AnamnesisPage = () => {
  const [forms, setForms] = useState([]);
  const [isBuilderModalOpen, setIsBuilderModalOpen] = useState(false);
  const [isViewerModalOpen, setIsViewerModalOpen] = useState(false); // Novo estado para o modal de preenchimento
  const [selectedForm, setSelectedForm] = useState(null); // Para saber qual ficha preencher
  const [loading, setLoading] = useState(true);

  const fetchForms = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get('/anamnesis/forms');
      setForms(response.data);
    } catch (error) {
      console.error("Erro ao buscar modelos de ficha:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchForms();
  }, [fetchForms]);

  const handleCreateSave = async (data) => {
    try {
      await api.post('/anamnesis/forms', data);
      fetchForms();
      setIsBuilderModalOpen(false);
    } catch (error) {
      alert(error.response?.data?.message || "Não foi possível salvar o modelo.");
    }
  };

  const handleOpenViewer = (form) => {
    setSelectedForm(form);
    setIsViewerModalOpen(true);
  };

  const handleAnswerSave = async (data) => {
    try {
        await api.post('/anamnesis/answers', data);
        alert("Respostas da ficha salvas com sucesso!");
        setIsViewerModalOpen(false);
        setSelectedForm(null);
    } catch (error) {
        alert(error.response?.data?.message || "Não foi possível salvar as respostas.");
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Modelos de Ficha de Anamnese</h1>
        <button
          onClick={() => setIsBuilderModalOpen(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow"
        >
          Criar Novo Modelo
        </button>
      </div>

      <div className="bg-white p-4 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4">Modelos Salvos</h2>
        {loading ? <p>A carregar...</p> : (
          <ul className="space-y-3">
            {forms.length > 0 ? forms.map(form => (
              <li key={form.id} className="p-4 border rounded-md flex justify-between items-center">
                <div>
                    <span className="font-medium text-gray-800">{form.title}</span>
                    <p className="text-sm text-gray-500">{form.questions.length} perguntas</p>
                </div>
                <button 
                    onClick={() => handleOpenViewer(form)}
                    className="px-3 py-1 bg-green-500 text-white text-sm font-semibold rounded-md hover:bg-green-600"
                >
                    Preencher Ficha
                </button>
              </li>
            )) : <p className="text-center text-gray-500 py-4">Nenhum modelo de ficha criado ainda.</p>}
          </ul>
        )}
      </div>

      {isBuilderModalOpen && (
        <Modal isOpen={isBuilderModalOpen} onClose={() => setIsBuilderModalOpen(false)}>
          <AnamnesisFormBuilder onSave={handleCreateSave} onCancel={() => setIsBuilderModalOpen(false)} />
        </Modal>
      )}

      {isViewerModalOpen && selectedForm && (
        <Modal isOpen={isViewerModalOpen} onClose={() => setIsViewerModalOpen(false)}>
            <AnamnesisViewer form={selectedForm} onSave={handleAnswerSave} onCancel={() => setIsViewerModalOpen(false)} />
        </Modal>
      )}
    </div>
  );
};

export default AnamnesisPage;