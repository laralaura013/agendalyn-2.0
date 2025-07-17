import React from 'react';

const PlanCard = ({ plan, onChoosePlan }) => {
  return (
    <div className="border rounded-lg p-6 flex flex-col shadow-lg bg-white hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
      <h2 className="text-2xl font-bold text-center text-gray-800">{plan.name}</h2>
      <p className="text-4xl font-bold text-center my-4 text-gray-900">
        R$ {plan.price}<span className="text-lg font-normal text-gray-500">/mês</span>
      </p>
      <ul className="space-y-3 mb-6 flex-grow">
        {plan.features.map((feature, index) => (
          <li key={index} className="flex items-center text-gray-600">
            <svg className="w-5 h-5 text-green-500 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
            {feature}
          </li>
        ))}
      </ul>
      <button 
        onClick={() => onChoosePlan(plan.stripePriceId)}
        className="w-full mt-auto px-4 py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-colors"
      >
        Assinar Agora
      </button>
    </div>
  );
};

export default PlanCard;
