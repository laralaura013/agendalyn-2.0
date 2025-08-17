import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import Modal from '../components/dashboard/Modal';
import GoalForm from '../components/forms/GoalForm';
import GoalProgress from '../components/goals/GoalProgress';
// import AdminLayout from '../components/layouts/AdminLayout'; // REMOVIDO

const GoalsPage = () => {
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchGoals = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get('/goals');
      setGoals(response.data);
    } catch (error) {
      console.error("Erro ao buscar metas:", error);
      alert("Não foi possível carregar as metas.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGoals();
  }, [fetchGoals]);

  const handleSave = async (data) => {
    try {
      await api.post('/goals', data);
      fetchGoals();
      setIsModalOpen(false);
    } catch (error) {
      alert(error.response?.data?.message || "Não foi possível salvar a meta.");
    }
  };

  return (
    <div className="min-h-screen px-4 pt-4 pb-20 sm:px-6 md:px-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h1 className="text-2xl md:text-3xl font-bold">Metas de Faturação</h1>
        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow"
        >
          Definir Nova Meta
        </button>
      </div>

      {loading ? (
        <p className="text-gray-500">A carregar metas...</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {goals.length > 0 ? (
            goals.map(goal => (
              <GoalProgress key={goal.id} goal={goal} />
            ))
          ) : (
            <p className="col-span-full text-center text-gray-500 py-8">
              Nenhuma meta definida ainda.
            </p>
          )}
        </div>
      )}

      {isModalOpen && (
        <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
          <GoalForm onSave={handleSave} onCancel={() => setIsModalOpen(false)} />
        </Modal>
      )}
    </div>
  );
};

export default GoalsPage;
