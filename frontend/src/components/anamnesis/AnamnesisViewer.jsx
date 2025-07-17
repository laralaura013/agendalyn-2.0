import React, { useState, useEffect } from 'react';
import api from '../../services/api';

const AnamnesisViewer = ({ form, onSave, onCancel }) => {
    const [answers, setAnswers] = useState({});
    const [clientId, setClientId] = useState('');
    const [availableClients, setAvailableClients] = useState([]);
    const [loading, setLoading] = useState(true);

    // Busca os clientes para preencher o seletor
    useEffect(() => {
        api.get('/clients')
            .then(res => {
                setAvailableClients(res.data);
                setLoading(false);
            })
            .catch(err => {
                console.error("Erro ao buscar clientes:", err);
                alert("Não foi possível carregar a lista de clientes.");
                setLoading(false);
            });
    }, []);

    const handleAnswerChange = (questionId, value) => {
        setAnswers(prev => ({ ...prev, [questionId]: value }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!clientId) {
            alert("Por favor, selecione um cliente.");
            return;
        }
        onSave({ formId: form.id, clientId, answers });
    };

    if (loading) return <p>A carregar clientes...</p>;

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <h2 className="text-2xl font-bold mb-1">Preencher Ficha</h2>
            <p className="text-md text-gray-600 mb-4">Modelo: <span className="font-semibold">{form.title}</span></p>

            <div>
                <label className="block text-sm font-medium text-gray-700">Selecione o Cliente</label>
                <select value={clientId} onChange={e => setClientId(e.target.value)} className="mt-1 block w-full p-2 border rounded-md" required>
                    <option value="">-- Escolha um cliente --</option>
                    {availableClients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
            </div>
            
            <div className="space-y-4 pt-4 border-t">
                {form.questions.map((q, index) => (
                    <div key={q.id}>
                        <label className="block text-sm font-medium text-gray-900">{index + 1}. {q.text}</label>
                        <textarea
                            rows="2"
                            value={answers[q.id] || ''}
                            onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                            className="mt-1 block w-full p-2 border rounded-md"
                        />
                    </div>
                ))}
            </div>

            <div className="flex justify-end gap-4 pt-4">
                <button type="button" onClick={onCancel} className="px-4 py-2 bg-gray-200 rounded-md">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md">Salvar Respostas</button>
            </div>
        </form>
    );
};

export default AnamnesisViewer;