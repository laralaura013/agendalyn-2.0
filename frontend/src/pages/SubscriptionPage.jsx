import React, { useState } from 'react';
import api from '../services/api';
import PlanCard from '../components/subscription/PlanCard';

const SubscriptionPage = () => {
  const [loading, setLoading] = useState(false);

  const plans = [
    {
      name: 'Plano Pro',
      price: '27,00', // Valor real baseado no Stripe (2700 centavos = R$27,00)
      stripePriceId: 'price_1Rlufh2MrsmBW59IYcYTHwcU', // ID real do Stripe
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
    // Validação para garantir que o ID do preço foi inserido corretamente
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
      alert("Não foi possível iniciar o processo de assinatura. Tente novamente.");
      setLoading(false);
    }
  };

  return (
    <div>
      <h1 className="text-3xl font-bold text-center mb-4">Planos e Assinatura</h1>
      <p className="text-center text-gray-600 mb-10">Escolha o plano que melhor se adapta ao seu negócio.</p>

      <div className="flex justify-center">
        <div className="grid grid-cols-1 md:grid-cols-1 lg:grid-cols-1 gap-8 max-w-sm">
          {plans.map(plan => (
            <PlanCard key={plan.name} plan={plan} onChoosePlan={handleChoosePlan} />
          ))}
        </div>
      </div>
      
      {loading && <p className="text-center mt-4">A redirecionar para o portal de pagamento...</p>}
    </div>
  );
};

export default SubscriptionPage;
