import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { PlusCircle, X } from 'lucide-react';

const normalizeList = (data) => {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.items)) return data.items;
  return [];
};

const OrderForm = ({ onSave, onCancel }) => {
  const [items, setItems] = useState([{ type: 'service', id: '', quantity: 1 }]);
  const [clientId, setClientId] = useState('');
  const [userId, setUserId] = useState('');

  const [availableServices, setAvailableServices] = useState([]);
  const [availableProducts, setAvailableProducts] = useState([]);
  const [availableClients, setAvailableClients] = useState([]);
  const [availableStaff, setAvailableStaff] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [clientsRes, staffRes, servicesRes, productsRes] = await Promise.all([
          api.get('/clients'),
          api.get('/staff'),
          api.get('/services'),
          api.get('/products'),
        ]);

        setAvailableClients(normalizeList(clientsRes.data));
        setAvailableStaff(normalizeList(staffRes.data));
        setAvailableServices(normalizeList(servicesRes.data));
        setAvailableProducts(normalizeList(productsRes.data));
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Erro ao carregar dados:', error);
        alert('Não foi possível carregar os dados necessários.');
        setAvailableClients([]);
        setAvailableStaff([]);
        setAvailableServices([]);
        setAvailableProducts([]);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleItemChange = (index, field, value) => {
    const newItems = [...items];
    newItems[index][field] = value;
    if (field === 'type') newItems[index]['id'] = '';
    setItems(newItems);
  };

  const addItem = () => {
    setItems((prev) => [...prev, { type: 'service', id: '', quantity: 1 }]);
  };

  const removeItem = (index) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // validações simples
    if (!clientId) {
      alert('Selecione um cliente.');
      return;
    }
    if (!userId) {
      alert('Selecione um colaborador.');
      return;
    }
    const hasInvalid = items.some((it) => !it.id || !it.type || Number(it.quantity) < 1);
    if (hasInvalid) {
      alert('Preencha todos os itens corretamente.');
      return;
    }

    const formattedItems = items.map((item) => ({
      quantity: Math.max(1, parseInt(item.quantity || 1, 10)),
      serviceId: item.type === 'service' ? item.id : null,
      productId: item.type === 'product' ? item.id : null,
    }));

    onSave({ clientId, userId, items: formattedItems });
  };

  if (loading) return <p>Carregando dados...</p>;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <h2 className="text-2xl font-bold text-purple-700">Nova Comanda</h2>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium mb-1">Cliente</label>
          <select
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            required
            className="w-full px-4 py-3 text-base border rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="">Selecione um cliente</option>
            {availableClients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Colaborador</label>
          <select
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            required
            className="w-full px-4 py-3 text-base border rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="">Selecione um colaborador</option>
            {availableStaff.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <hr className="my-4" />
      <h3 className="text-lg font-semibold text-gray-700">Itens</h3>

      <div className="space-y-4">
        {items.map((item, index) => (
          <div key={index} className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
            <div className="sm:col-span-3">
              <label className="text-xs font-medium">Tipo</label>
              <select
                value={item.type}
                onChange={(e) => handleItemChange(index, 'type', e.target.value)}
                className="w-full px-3 py-2 text-sm border rounded"
              >
                <option value="service">Serviço</option>
                <option value="product">Produto</option>
              </select>
            </div>

            <div className="sm:col-span-6">
              <label className="text-xs font-medium">Item</label>
              <select
                value={item.id}
                onChange={(e) => handleItemChange(index, 'id', e.target.value)}
                required
                className="w-full px-3 py-2 text-sm border rounded"
              >
                <option value="">Selecione</option>
                {item.type === 'service'
                  ? availableServices.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))
                  : availableProducts.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} {typeof p.stock === 'number' ? `(Estoque: ${p.stock})` : ''}
                      </option>
                    ))}
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="text-xs font-medium">Qtd.</label>
              <input
                type="number"
                value={item.quantity}
                onChange={(e) =>
                  handleItemChange(index, 'quantity', Math.max(1, parseInt(e.target.value || 1, 10)))
                }
                min="1"
                required
                className="w-full px-3 py-2 text-sm border rounded"
              />
            </div>

            <div className="sm:col-span-1 text-right">
              <button
                type="button"
                onClick={() => removeItem(index)}
                className="p-2 text-red-600 hover:text-red-800"
                title="Remover item"
              >
                <X size={18} />
              </button>
            </div>
          </div>
        ))}

        <button
          type="button"
          onClick={addItem}
          className="flex items-center gap-2 w-full justify-center py-2 border-2 border-dashed border-purple-500 text-purple-600 rounded hover:bg-purple-50"
        >
          <PlusCircle size={18} /> Adicionar Item
        </button>
      </div>

      <div className="flex flex-col sm:flex-row justify-end gap-4 pt-6">
        <button
          type="button"
          onClick={onCancel}
          className="px-5 py-3 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition"
        >
          Cancelar
        </button>
        <button
          type="submit"
          className="px-6 py-3 bg-purple-700 text-white font-medium rounded-md hover:bg-purple-800 transition"
        >
          Salvar Comanda
        </button>
      </div>
    </form>
  );
};

export default OrderForm;
