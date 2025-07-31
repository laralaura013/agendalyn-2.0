import React from 'react';

const GoalProgress = ({ goal }) => {
  // O cálculo agora é feito no backend, apenas exibimos
  const progress = goal.targetValue > 0 ? (goal.currentValue / goal.targetValue) * 100 : 0;
  const isAchieved = progress >= 100;

  const getTitle = () => {
    switch (goal.type) {
      case 'TOTAL': return 'Meta de Faturação Total';
      case 'BY_USER': return `Meta de ${goal.user?.name || 'Colaborador'}`;
      case 'BY_SERVICE': return `Meta de ${goal.service?.name || 'Serviço'}`;
      default: return 'Meta';
    }
  };

  const formatCurrency = (value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  return (
    <div className="bg-white p-4 rounded-lg shadow-md border">
      <h3 className="font-semibold text-gray-800">{getTitle()}</h3>
      <p className="text-sm text-gray-500">{`Mês ${goal.month}/${goal.year}`}</p>
      
      <div className="flex justify-between items-center text-sm text-gray-600 mt-2">
        <span>{formatCurrency(goal.currentValue)}</span>
        <span className={isAchieved ? 'font-bold text-green-600' : 'text-gray-800'}>
          Meta: {formatCurrency(goal.targetValue)}
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
