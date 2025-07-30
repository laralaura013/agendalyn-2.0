import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import Modal from '../components/dashboard/Modal';
import GoalForm from '../components/forms/GoalForm';
import GoalProgress from '../components/goals/GoalProgress';
import AdminLayout from '../components/layouts/AdminLayout'; // ✅ Importado

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
    <AdminLayout>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Metas de Faturação</h1>
        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow"
        >
          Definir Nova Meta
        </button>
      </div>

      {loading ? (
        <p>A carregar metas...</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {goals.length > 0 ? goals.map(goal => (
            <GoalProgress key={goal.id} goal={goal} />
          )) : (
            <p className="col-span-full text-center text-gray-500 py-8">Nenhuma meta definida ainda.</p>
          )}
        </div>
      )}

      {isModalOpen && (
        <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
          <GoalForm onSave={handleSave} onCancel={() => setIsModalOpen(false)} />
        </Modal>
      )}
    </AdminLayout>
  );
};

export default GoalsPage;
