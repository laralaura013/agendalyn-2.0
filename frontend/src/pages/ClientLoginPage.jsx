import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';

const ClientLoginPage = () => {
    const { companyId } = useParams();
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage('');
        try {
            await api.post('/portal/request-login', { email, companyId });
            setMessage("Quase lá! Se este email estiver registado, você receberá um link de acesso em breve. Verifique a sua caixa de entrada e de spam.");
            toast.success("Link de acesso enviado!");
        } catch (error) {
            toast.error("Ocorreu um erro. Tente novamente.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center p-4">
            <div className="w-full max-w-md">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-gray-800">Portal do Cliente</h1>
                    <p className="text-gray-500">Aceda aos seus agendamentos e pacotes.</p>
                </div>
                
                <div className="bg-white p-8 rounded-lg shadow-md">
                    {message ? (
                        <div className="text-center">
                            <p className="text-green-700">{message}</p>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div>
                                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                                    Seu Email de Cadastro
                                </label>
                                <input
                                    type="email"
                                    id="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="mt-1 block w-full p-3 border rounded-md"
                                    placeholder="seu.email@exemplo.com"
                                    required
                                />
                            </div>
                            <div>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full py-3 bg-purple-700 text-white font-semibold rounded-lg hover:bg-purple-800 disabled:bg-gray-400"
                                >
                                    {loading ? 'A enviar...' : 'Enviar Link de Acesso'}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
                <div className="text-center mt-4">
                    <Link to="/" className="text-sm text-purple-600 hover:underline">Voltar à página inicial</Link>
                </div>
            </div>
        </div>
    );
};

export default ClientLoginPage;