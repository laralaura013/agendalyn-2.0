import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast'; // Importa a notificação
import Modal from '../components/dashboard/Modal';
import OrderForm from '../components/forms/OrderForm';
import api from '../services/api';

const OrderCard = ({ order, onFinish, onCancel }) => {
  const statusMap = {
    OPEN: { text: 'ABERTA', style: 'bg-blue-100 text-blue-800' },
    FINISHED: { text: 'FINALIZADA', style: 'bg-green-100 text-green-800' },
    CANCELED: { text: 'CANCELADA', style: 'bg-red-100 text-red-800' },
  };
  const currentStatus = statusMap[order.status] || { text: 'DESCONHECIDO', style: 'bg-gray-100' };

  return (
    <div className="bg-white p-4 rounded-lg shadow-md border flex flex-col">
      <div className="flex justify-between items-center">
        <h3 className="font-bold text-lg">Comanda #{order.id.substring(0, 8)}</h3>
        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${currentStatus.style}`}>
          {currentStatus.text}
        </span>
      </div>
      <div className="mt-2 text-sm text-gray-600 flex-grow">
        <p><strong>Cliente:</strong> {order.client.name}</p>
        <p><strong>Colaborador:</strong> {order.user.name}</p>
        <p><strong>Data:</strong> {new Date(order.createdAt).toLocaleDateString()}</p>
      </div>
      <div className="mt-3 border-t pt-3 flex justify-between items-center">
        <p className="font-semibold text-lg">Total: <span className="text-green-600">R$ {Number(order.total).toFixed(2)}</span></p>
        {order.status === 'OPEN' && (
          <div className="flex items-center gap-2">
            <button 
              onClick={() => onCancel(order.id)}
              className="px-3 py-1 bg-red-500 text-white text-sm font-semibold rounded-md hover:bg-red-600"
            >
              Cancelar
            </button>
            <button 
              onClick={() => onFinish(order.id)}
              className="px-3 py-1 bg-green-500 text-white text-sm font-semibold rounded-md hover:bg-green-600"
            >
              Finalizar
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get('/orders');
      setOrders(response.data);
    } catch (error) {
      console.error("Erro ao buscar comandas:", error);
      toast.error("Não foi possível carregar as comandas.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleSave = async (data) => {
    const savePromise = api.post('/orders', data);
    toast.promise(savePromise, {
        loading: 'A criar comanda...',
        success: () => {
            fetchOrders();
            setIsModalOpen(false);
            return 'Comanda criada com sucesso!';
        },
        error: (err) => err.response?.data?.message || "Não foi possível salvar a comanda."
    });
  };

  const handleFinishOrder = async (orderId) => {
    if (window.confirm("Deseja realmente finalizar esta comanda e lançar o pagamento no caixa?")) {
      const finishPromise = api.put(`/orders/${orderId}/finish`);
      toast.promise(finishPromise, {
          loading: 'A finalizar comanda...',
          success: () => {
              fetchOrders();
              return 'Comanda finalizada com sucesso!';
          },
          error: (err) => err.response?.data?.message || "Não foi possível finalizar a comanda."
      });
    }
  };
  
  const handleCancelOrder = async (orderId) => {
    if (window.confirm("Tem certeza que deseja cancelar esta comanda? O stock dos produtos será devolvido.")) {
      const cancelPromise = api.delete(`/orders/${orderId}/cancel`);
      toast.promise(cancelPromise, {
          loading: 'A cancelar comanda...',
          success: () => {
              fetchOrders();
              return 'Comanda cancelada com sucesso!';
          },
          error: (err) => err.response?.data?.message || "Não foi possível cancelar a comanda."
      });
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Comandas</h1>
        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2 bg-purple-700 text-white rounded-lg hover:bg-purple-800 shadow"
        >
          Nova Comanda
        </button>
      </div>
      
      {loading ? (
        <p>Carregando comandas...</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {orders.map(order => (
            <OrderCard key={order.id} order={order} onFinish={handleFinishOrder} onCancel={handleCancelOrder} />
          ))}
        </div>
      )}
      
      {isModalOpen && (
        <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
          <OrderForm
            onSave={handleSave}
            onCancel={() => setIsModalOpen(false)}
          />
        </Modal>
      )}
    </div>
  );
};

export default Orders;