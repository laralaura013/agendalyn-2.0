import React, { useState, useEffect } from 'react';
import api from '../../services/api';

const SellPackageForm = ({ pkg, onSave, onCancel }) => {
  const [clientId, setClientId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('PIX');
  const [availableClients, setAvailableClients] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/clients')
      .then(response => {
        setAvailableClients(response.data);
        setLoading(false);
      })
      .catch(error => {
        console.error("Erro ao buscar clientes:", error);
        alert("Não foi possível carregar a lista de clientes.");
        setLoading(false);
      });
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!clientId) {
      alert("Por favor, selecione um cliente.");
      return;
    }

    onSave({
      packageId: pkg.id,
      clientId,
      paymentMethod,
      price: pkg.price
    });
  };

  if (loading) return <p>Carregando clientes...</p>;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <h2 className="text-2xl font-bold mb-2">Vender Pacote</h2>

      <div className="p-4 bg-gray-100 rounded-md">
        <p className="font-semibold text-lg">{pkg.name}</p>
        <p className="text-md text-gray-700">Valor: R$ {Number(pkg.price).toFixed(2)}</p>
      </div>

      <div>
        <label htmlFor="client-select" className="block text-sm font-medium text-gray-700">Selecione o Cliente</label>
        <select
          id="client-select"
          value={clientId}
          onChange={(e) => setClientId(e.target.value)}
          className="mt-1 block w-full p-2 border rounded-md"
          required
        >
          <option value="">-- Escolha um cliente --</option>
          {availableClients.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="payment-method" className="block text-sm font-medium text-gray-700">Forma de Pagamento</label>
        <select
          id="payment-method"
          value={paymentMethod}
          onChange={(e) => setPaymentMethod(e.target.value)}
          className="mt-1 block w-full p-2 border rounded-md"
        >
          <option value="PIX">PIX</option>
          <option value="DINHEIRO">Dinheiro</option>
          <option value="CARTAO_CREDITO">Cartão de Crédito</option>
          <option value="CARTAO_DEBITO">Cartão de Débito</option>
        </select>
      </div>

      <div className="flex justify-end gap-4 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300"
        >
          Cancelar
        </button>
        <button
          type="submit"
          className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
        >
          Confirmar Venda
        </button>
      </div>
    </form>
  );
};

export default SellPackageForm;
