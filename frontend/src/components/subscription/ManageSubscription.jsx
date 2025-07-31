import React from 'react';

const ManageSubscription = ({ subscription }) => {
  const handleManage = async () => {
    // Lógica para chamar a API que cria o portal do cliente no Stripe
    // import api from '../../services/api';
    // const response = await api.post('/subscriptions/create-customer-portal');
    // window.location.href = response.data.url;
    console.log("Redirecionando para o portal do cliente...");
    alert("Redirecionando para o portal do cliente...");
  };

  const statusMap = {
    ACTIVE: { text: 'Ativa', color: 'bg-green-100 text-green-800' },
    CANCELED: { text: 'Cancelada', color: 'bg-red-100 text-red-800' },
    PAST_DUE: { text: 'Pendente', color: 'bg-yellow-100 text-yellow-800' },
    INCOMPLETE: { text: 'Incompleta', color: 'bg-gray-100 text-gray-800' },
  };

  const currentStatus = statusMap[subscription.status] || statusMap.INCOMPLETE;

  return (
    <div className="bg-white p-8 rounded-lg shadow-md max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">Sua Assinatura</h2>
      <div className="space-y-3">
        <div className="flex justify-between">
          <span className="font-semibold text-gray-600">Plano Atual:</span>
          <span className="font-bold text-gray-900">{subscription.plan?.name || 'N/A'}</span>
        </div>
        <div className="flex justify-between">
          <span className="font-semibold text-gray-600">Status:</span>
          <span className={`px-2 py-1 text-xs font-bold rounded-full ${currentStatus.color}`}>
            {currentStatus.text}
          </span>
        </div>
        {subscription.renews && (
          <div className="flex justify-between">
            <span className="font-semibold text-gray-600">Próxima Renovação:</span>
            <span className="font-bold text-gray-900">{new Date(subscription.renews).toLocaleDateString()}</span>
          </div>
        )}
      </div>
      <div className="mt-8 border-t pt-6">
        <button
          onClick={handleManage}
          className="w-full py-3 px-4 bg-gray-700 text-white font-semibold rounded-lg hover:bg-gray-800"
        >
          Gerenciar Assinatura e Pagamento
        </button>
        <p className="text-xs text-gray-500 text-center mt-2">
          Você será redirecionado para o nosso portal de pagamentos seguro.
        </p>
      </div>
    </div>
  );
};

export default ManageSubscription;
