// src/pages/Orders.jsx
import React, { useState, useEffect, useCallback } from "react";
import { FileText, CheckCircle, XCircle, Eye } from "lucide-react";
import toast from "react-hot-toast";

import Modal from "../components/dashboard/Modal";
import OrderForm from "../components/forms/OrderForm";
import OrderDrawer from "../components/orders/OrderDrawer";
import api from "../services/api";
import { asArray } from "../utils/asArray";

import NeuCard from "../components/ui/NeuCard";
import NeuButton from "../components/ui/NeuButton";
import "../styles/neumorphism.css";

/* ================= Helpers ================= */
const normalizeOrders = (data) => {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.items)) return data.items;
  return [];
};

const toBRL = (v) =>
  Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const safeDateTime = (v) => {
  const d = v ? new Date(v) : null;
  return d && !isNaN(d.getTime()) ? d.toLocaleString("pt-BR") : "—";
};

const StatusChip = ({ status }) => {
  const s = (status || "").toUpperCase();
  if (s === "OPEN")
    return <span className="neu-chip text-amber-700">ABERTA</span>;
  if (s === "FINISHED")
    return <span className="neu-chip text-emerald-700">FINALIZADA</span>;
  if (s === "CANCELED")
    return <span className="neu-chip text-rose-700">CANCELADA</span>;
  return <span className="neu-chip text-slate-600">—</span>;
};

/* ================= Card ================= */
const OrderCard = ({ order, onFinish, onCancel, onOpen }) => {
  return (
    <NeuCard className="p-5 flex flex-col justify-between">
      <div className="flex justify-between items-center mb-2">
        <h3 className="font-semibold text-lg text-[var(--text-color)]">
          #{order?.id?.slice?.(0, 8) || "—"}
        </h3>
        <StatusChip status={order?.status} />
      </div>

      <div className="text-sm text-[var(--text-color)] opacity-90 space-y-1 mb-4">
        <p>
          <strong>Cliente:</strong> {order?.client?.name || "N/A"}
        </p>
        <p>
          <strong>Colaborador:</strong> {order?.user?.name || "N/A"}
        </p>
        <p>
          <strong>Data:</strong> {safeDateTime(order?.createdAt)}
        </p>
      </div>

      <div className="mt-auto pt-3 flex flex-wrap gap-2 items-center justify-between">
        <p className="font-bold text-base text-[var(--text-color)]">
          Total: <span className="text-emerald-700">{toBRL(order?.total)}</span>
        </p>

        <div className="flex items-center gap-2 flex-wrap justify-end">
          <NeuButton
            onClick={() => onOpen(order)}
            className="!px-3 !py-1.5 text-xs flex items-center gap-1"
            title="Abrir comanda"
          >
            <Eye size={16} /> Abrir
          </NeuButton>

          {order?.status === "OPEN" && (
            <>
              <NeuButton
                variant="danger"
                onClick={() => onCancel(order.id)}
                className="!px-3 !py-1.5 text-xs flex items-center gap-1"
                title="Cancelar comanda"
              >
                <XCircle size={16} /> Cancelar
              </NeuButton>
              <NeuButton
                variant="primary"
                onClick={() => onFinish(order.id)}
                className="!px-3 !py-1.5 text-xs flex items-center gap-1"
                title="Finalizar comanda"
              >
                <CheckCircle size={16} /> Finalizar
              </NeuButton>
            </>
          )}
        </div>
      </div>
    </NeuCard>
  );
};

/* ================= Page ================= */
export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/orders");
      setOrders(normalizeOrders(res.data));
    } catch (error) {
      console.error("Erro ao buscar comandas:", error);
      toast.error("Não foi possível carregar as comandas.");
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleSave = async (data) => {
    try {
      setIsModalOpen(false);
      const res = await api.post("/orders", data);
      const created = res?.data;

      await fetchOrders();

      if (created?.id) {
        const listRes = await api.get("/orders");
        const list = normalizeOrders(listRes.data);
        const fullOrder = list.find((o) => o.id === created.id) || null;
        if (fullOrder) {
          setSelectedOrder(fullOrder);
          setDrawerOpen(true);
        }
      }
      toast.success("Comanda criada com sucesso!");
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Erro ao criar comanda.");
      setIsModalOpen(true);
    }
  };

  const handleFinishOrder = async (id) => {
    if (window.confirm("Finalizar esta comanda (sem editar pagamentos)?")) {
      const finishPromise = api.put(`/orders/${id}/finish`);
      toast.promise(finishPromise, {
        loading: "Finalizando...",
        success: async () => {
          await fetchOrders();
          return "Comanda finalizada!";
        },
        error: (err) => err?.response?.data?.message || "Erro ao finalizar comanda.",
      });
    }
  };

  const handleCancelOrder = async (id) => {
    if (window.confirm("Cancelar esta comanda? Os produtos voltarão ao estoque.")) {
      const cancelPromise = api.delete(`/orders/${id}/cancel`);
      toast.promise(cancelPromise, {
        loading: "Cancelando...",
        success: async () => {
          await fetchOrders();
          return "Comanda cancelada!";
        },
        error: (err) => err?.response?.data?.message || "Erro ao cancelar comanda.",
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
    <div className="neu-surface px-4 pt-4 pb-20 sm:px-6 md:px-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-3">
        <h1 className="text-2xl md:text-3xl font-bold text-[var(--text-color)]">Comandas</h1>
        <NeuButton
          variant="primary"
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2"
        >
          <FileText size={18} /> Nova Comanda
        </NeuButton>
      </div>

      {/* Grid/List */}
      {loading ? (
        <p className="text-[var(--text-color)] opacity-80">Carregando comandas...</p>
      ) : orders.length === 0 ? (
        <NeuCard className="p-4">
          <div className="text-sm text-[var(--text-color)] opacity-90">
            Nenhuma comanda encontrada.
          </div>
        </NeuCard>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {asArray(orders).map((order) => (
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

      {/* Modal: criar comanda */}
      {isModalOpen && (
        <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
          <OrderForm onSave={handleSave} onCancel={() => setIsModalOpen(false)} />
        </Modal>
      )}

      {/* Drawer: pagamentos/resumo */}
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
}
