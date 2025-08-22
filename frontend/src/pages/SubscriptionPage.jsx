import React, { useState } from 'react';
import api from '../services/api';
import PlanCard from '../components/subscription/PlanCard';

import { asArray } from '../utils/asArray';
// // REMOVIDO

const SubscriptionPage = () => {
  const [loading, setLoading] = useState(false);

  const plans = [
    {
      name: 'Plano Pro',
      price: '27,00',
      stripePriceId: 'price_1RmO42Ru0UQiqSF4YzX9jB4O',
      features: [
        'Agendamentos Ilimitados',
        'Cadastro de Clientes',
        'Cadastro de Colaboradores e Serviços',
        'Controle de Caixa',
        'Relatórios de Faturamento',
        'Suporte por Email',
      ]
    },
  ];

  const handleChoosePlan = async (priceId) => {
    if (!priceId || priceId.includes('COLE_AQUI')) {
      alert("Erro de configuração: O ID do preço do Stripe não foi definido no código.");
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/subscriptions/create-checkout-session', { priceId });
      window.location.href = response.data.url;
    } catch (error) {
      console.error("Erro ao iniciar assinatura:", error);
      alert("Não foi possível iniciar o processo de assinatura.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen px-4 pt-4 pb-20 sm:px-6 md:px-8">
      <h1 className="text-2xl md:text-3xl font-bold text-center mb-4">Planos e Assinatura</h1>
      <p className="text-center text-gray-600 mb-10">
        Escolha o plano que melhor se adapta ao seu negócio.
      </p>

      <div className="w-full max-w-md mx-auto">
        <div className="grid grid-cols-1 gap-6">
          {asArray(plans).map(plan => (
            <PlanCard key={plan.name} plan={plan} onChoosePlan={handleChoosePlan} />
          ))}
        </div>
      </div>

      {loading && (
        <p className="text-center mt-6 text-purple-700 font-medium animate-pulse">
          A redirecionar para o portal de pagamento...
        </p>
      )}
    </div>
  );
};

export default SubscriptionPage;
