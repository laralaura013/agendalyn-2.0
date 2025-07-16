import React, { useState, useEffect } from 'react';
import PlanCard from '../components/subscription/PlanCard';
import ManageSubscription from '../components/subscription/ManageSubscription';
// import api from '../services/api';

const SubscriptionPage = () => {
  const [plans, setPlans] = useState([]);
  const [currentSubscription, setCurrentSubscription] = useState(null);

  useEffect(() => {
    // Mock de dados - Substituir com chamadas de API
    setPlans([
      { id: 'plan_basic', name: 'Básico', price: '29.90', features: ['5 Colaboradores', '200 Clientes', 'Agenda Online'], stripePriceId: 'price_1...' },
      { id: 'plan_pro', name: 'Pro', price: '59.90', features: ['15 Colaboradores', '1000 Clientes', 'Relatórios'], stripePriceId: 'price_2...' },
      { id: 'plan_premium', name: 'Premium', price: '99.90', features: ['Colaboradores Ilimitados', 'Clientes Ilimitados', 'Suporte VIP'], stripePriceId: 'price_3...' },
    ]);
    // Simula uma assinatura ativa
    setCurrentSubscription({ plan: { name: 'Pro' }, status: 'ACTIVE', renews: '2025-08-15' });
  }, []);

  const handleChoosePlan = async (stripePriceId) => {
    try {
      // const response = await api.post('/subscriptions/create-checkout-session', { priceId: stripePriceId });
      // window.location.href = response.data.url;
      console.log("Redirecionando para o checkout do Stripe para o plano:", stripePriceId);
      alert("Redirecionando para o checkout...")
    } catch (error) {
      console.error("Erro ao iniciar assinatura", error);
    }
  };

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-8">Planos e Assinatura</h1>
      {currentSubscription ? (
        <ManageSubscription subscription={currentSubscription} />
      ) : (
        <div>
          <h2 className="text-2xl font-semibold text-center mb-6">Escolha o plano ideal para você</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {plans.map(plan => (
              <PlanCard key={plan.id} plan={plan} onChoosePlan={handleChoosePlan} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
export default SubscriptionPage;
