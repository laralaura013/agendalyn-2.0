import React from 'react';

const GoalProgress = ({ goal }) => {
  const progress = (goal.currentValue / goal.targetValue) * 100;
  const isAchieved = progress >= 100;

  const getTitle = () => {
    switch (goal.type) {
      case 'TOTAL':
        return 'Meta de Faturamento Total';
      case 'BY_USER':
        return `Meta de ${goal.user?.name || 'Colaborador'}`;
      case 'BY_SERVICE':
        return `Meta de ${goal.service?.name || 'Serviço'}`;
      default:
        return 'Meta';
    }
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow-md">
      <h3 className="font-semibold text-gray-800">{getTitle()}</h3>
      <p className="text-sm text-gray-500">{`Mês ${goal.month}/${goal.year}`}</p>
      
      <div className="flex justify-between items-center text-sm text-gray-600 mt-2">
        <span>R$ {goal.currentValue.toFixed(2)}</span>
        <span className={isAchieved ? 'font-bold text-green-600' : 'text-gray-800'}>
          Meta: R$ {goal.targetValue.toFixed(2)}
        </span>
      </div>
      
      <div className="w-full bg-gray-200 rounded-full h-4 mt-2 overflow-hidden">
        <div
          className={`h-4 rounded-full transition-all duration-500 ${isAchieved ? 'bg-green-500' : 'bg-blue-500'}`}
          style={{ width: `${Math.min(progress, 100)}%` }}
        ></div>
      </div>
      
      <p className={`text-right text-xs mt-1 font-semibold ${isAchieved ? 'text-green-600' : 'text-gray-500'}`}>
        {progress.toFixed(1)}% {isAchieved && ' (Atingida!)'}
      </p>
    </div>
  );
};

export default GoalProgress;
