// src/pages/Orders.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { FileText, CheckCircle, XCircle, Eye } from 'lucide-react';
import toast from 'react-hot-toast';
import Modal from '../components/dashboard/Modal';
import OrderForm from '../components/forms/OrderForm';
import OrderDrawer from '../components/orders/OrderDrawer';
import api from '../services/api';

const statusMap = {
  OPEN: { text: 'ABERTA', style: 'bg-yellow-100 text-yellow-800' },
  FINISHED: { text: 'FINALIZADA', style: 'bg-green-100 text-green-800' },
  CANCELED: { text: 'CANCELADA', style: 'bg-red-100 text-red-800' },
};

const OrderCard = ({ order, onFinish, onCancel, onOpen }) => {
  const currentStatus = statusMap[order.status] || {
    text: 'DESCONHECIDO',
    style: 'bg-gray-100 text-gray-700',
  };

  return (
    <div className="bg-white p-5 rounded-2xl shadow hover:shadow-lg transition-all border flex flex-col justify-between">
      <div className="flex justify-between items-center mb-2">
        <h3 className="font-semibold text-lg">#{order.id.slice(0, 8)}</h3>
        <span className={`px-2 py-1 text-xs font-bold rounded-full ${currentStatus.style}`}>
          {currentStatus.text}
        </span>
      </div>

      <div className="text-sm text-gray-600 space-y-1 mb-4">
        <p><strong>Cliente:</strong> {order.client?.name || 'N/A'}</p>
        <p><strong>Colaborador:</strong> {order.user?.name || 'N/A'}</p>
        <p><strong>Data:</strong> {new Date(order.createdAt).toLocaleString('pt-BR')}</p>
      </div>

      <div className="mt-auto pt-3 border-t flex flex-wrap gap-2 items-center justify-between">
        <p className="font-bold text-base">
          Total: <span className="text-emerald-600">R$ {Number(order.total).toFixed(2)}</span>
        </p>

        <div className="flex items-center gap-2 flex-wrap justify-end">
          <button
            onClick={() => onOpen(order)}
            className="flex items-center gap-1 px-3 py-1.5 bg-white border text-gray-700 text-xs font-medium rounded-md hover:bg-gray-50 transition"
          >
            <Eye size={16} /> Abrir
          </button>

          {order.status === 'OPEN' && (
            <>
              <button
                onClick={() => onCancel(order.id)}
                className="flex items-center gap-1 px-3 py-1.5 bg-red-600 text-white text-xs font-medium rounded-md hover:bg-red-700 transition"
              >
                <XCircle size={16} /> Cancelar
              </button>
              <button
                onClick={() => onFinish(order.id)}
                className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white text-xs font-medium rounded-md hover:bg-green-700 transition"
              >
                <CheckCircle size={16} /> Finalizar
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/orders');
      setOrders(res.data);
    } catch (error) {
      console.error('Erro ao buscar comandas:', error);
      toast.error('Não foi possível carregar as comandas.');
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
      loading: 'Criando comanda...',
      success: async (res) => {
        await fetchOrders();
        setIsModalOpen(false);
        // Abre direto o drawer da comanda criada para já lançar pagamento
        const created = res?.data;
        const fullOrder = created
          ? (await api.get('/orders')).data.find(o => o.id === created.id)
          : null;
        if (fullOrder) {
          setSelectedOrder(fullOrder);
          setDrawerOpen(true);
        }
        return 'Comanda criada com sucesso!';
      },
      error: (err) => err.response?.data?.message || 'Erro ao criar comanda.',
    });
  };

  const handleFinishOrder = async (id) => {
    if (window.confirm('Finalizar esta comanda (sem editar pagamentos)?')) {
      const finishPromise = api.put(`/orders/${id}/finish`);
      toast.promise(finishPromise, {
        loading: 'Finalizando...',
        success: () => {
          fetchOrders();
          return 'Comanda finalizada!';
        },
        error: (err) => err.response?.data?.message || 'Erro ao finalizar comanda.',
      });
    }
  };

  const handleCancelOrder = async (id) => {
    if (window.confirm('Cancelar esta comanda? Os produtos voltarão ao estoque.')) {
      const cancelPromise = api.delete(`/orders/${id}/cancel`);
      toast.promise(cancelPromise, {
        loading: 'Cancelando...',
        success: () => {
          fetchOrders();
          return 'Comanda cancelada!';
        },
        error: (err) => err.response?.data?.message || 'Erro ao cancelar comanda.',
      });
    }
  };

  const openDrawer = (order) => {
    setSelectedOrder(order);
    setDrawerOpen(true);
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setSelectedOrder(null);
  };

  return (
    <div className="min-h-screen px-4 pt-4 pb-20 sm:px-6 md:px-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-3">
        <h1 className="text-2xl md:text-3xl font-bold">Comandas</h1>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-purple-700 text-white rounded-lg hover:bg-purple-800 transition shadow-md"
        >
          <FileText size={18} /> Nova Comanda
        </button>
      </div>

      {loading ? (
        <p className="text-gray-500">Carregando comandas...</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {orders.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              onFinish={handleFinishOrder}
              onCancel={handleCancelOrder}
              onOpen={openDrawer}
            />
          ))}
        </div>
      )}

      {/* Modal de criação */}
      {isModalOpen && (
        <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
          <OrderForm
            onSave={handleSave}
            onCancel={() => setIsModalOpen(false)}
          />
        </Modal>
      )}

      {/* Drawer de Pagamentos/Resumo */}
      {selectedOrder && (
        <OrderDrawer
          order={selectedOrder}
          open={drawerOpen}
          onClose={closeDrawer}
          refreshOrders={fetchOrders}
        />
      )}
    </div>
  );
};

export default Orders;
