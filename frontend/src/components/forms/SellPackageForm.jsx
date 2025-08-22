import React, { useState, useEffect } from 'react';
import api from '../../services/api';


import { asArray } from '../../utils/asArray';
const SellPackageForm = ({ pkg, onSave, onCancel }) => {
  const [clientId, setClientId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('CASH'); // valor padrão
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
    if (!paymentMethod) {
      alert("Por favor, selecione uma forma de pagamento.");
      return;
    }

    onSave({
      packageId: pkg.id,
      clientId,
      paymentMethod, // ✅ Adicionado corretamente
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
        <label className="block text-sm font-medium">Cliente</label>
        <select
          value={clientId}
          onChange={(e) => setClientId(e.target.value)}
          required
          className="mt-1 block w-full p-2 border rounded-md"
        >
          <option value="">-- Selecione um cliente --</option>
          {asArray(availableClients).map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium">Forma de Pagamento</label>
        <select
          value={paymentMethod}
          onChange={(e) => setPaymentMethod(e.target.value)}
          required
          className="mt-1 block w-full p-2 border rounded-md"
        >
          <option value="">-- Selecione uma forma de pagamento --</option>
          <option value="CASH">Dinheiro</option>
          <option value="CREDIT_CARD">Cartão de Crédito</option>
          <option value="DEBIT_CARD">Cartão de Débito</option>
          <option value="PIX">PIX</option>
          <option value="OTHER">Outro</option>
        </select>
      </div>

      <div className="flex justify-end gap-4 pt-4">
        <button type="button" onClick={onCancel} className="px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300">Cancelar</button>
        <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700">Confirmar Venda</button>
      </div>
    </form>
  );
};

export default SellPackageForm;
