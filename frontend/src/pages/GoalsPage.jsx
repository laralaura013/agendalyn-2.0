import React, { useState } from 'react';
import GoalProgress from '../components/goals/GoalProgress';
import Modal from '../components/dashboard/Modal';
import GoalForm from '../components/goals/GoalForm';

const GoalsPage = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [goals, setGoals] = useState([
    { id: 1, type: 'TOTAL', targetValue: 10000, currentValue: 7500, month: 7, year: 2025 },
    { id: 2, type: 'BY_USER', user: { name: 'João' }, targetValue: 4000, currentValue: 4100, month: 7, year: 2025 },
    { id: 3, type: 'BY_SERVICE', service: { name: 'Corte Masculino' }, targetValue: 2000, currentValue: 1500, month: 7, year: 2025 },
  ]);

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Metas</h1>
        <button onClick={() => setIsModalOpen(true)} className="px-4 py-2 bg-blue-600 text-white rounded-lg">
          Nova Meta
        </button>
      </div>
      <div className="space-y-6">
        {goals.map(goal => (
          <GoalProgress key={goal.id} goal={goal} />
        ))}
      </div>
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
        <GoalForm onSave={() => setIsModalOpen(false)} onCancel={() => setIsModalOpen(false)} />
      </Modal>
    </div>
  );
};
export default GoalsPage;
