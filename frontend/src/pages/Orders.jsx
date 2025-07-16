import React, { useState } from 'react';
import ResourceTable from '../components/dashboard/ResourceTable';
import Modal from '../components/dashboard/Modal';
import OrderForm from '../components/forms/OrderForm';

const Orders = () => {
  const [orders, setOrders] = useState([
    { id: 'cmd1', client: { name: 'João da Silva' }, user: { name: 'Maria' }, total: '150.00', status: 'FINISHED' },
    { id: 'cmd2', client: { name: 'Ana Costa' }, user: { name: 'Pedro' }, total: '75.50', status: 'OPEN' }
  ]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const columns = [
    { header: 'Cliente', accessor: 'client.name' },
    { header: 'Colaborador', accessor: 'user.name' },
    { header: 'Total', accessor: 'total', render: (val) => `R$ ${val}` },
    { header: 'Status', accessor: 'status' },
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Comandas</h1>
        <button onClick={() => setIsModalOpen(true)} className="px-4 py-2 bg-blue-600 text-white rounded-lg">
          Nova Comanda
        </button>
      </div>
      <ResourceTable columns={columns} data={orders} />
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
        <OrderForm onSave={() => { setIsModalOpen(false); }} onCancel={() => setIsModalOpen(false)} />
      </Modal>
    </div>
  );
};
export default Orders;
