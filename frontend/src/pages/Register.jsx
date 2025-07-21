import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';

const Register = () => {
    const [formData, setFormData] = useState({
        companyName: '',
        name: '',
        email: '',
        password: '',
    });
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const { login } = useAuth();

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prevState => ({
            ...prevState,
            [name]: value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const response = await api.post('/auth/register', formData);
            
            const { token, user } = response.data;
            login(token, user);
            
            toast.success('Registo bem-sucedido! Bem-vindo(a)!');
            navigate('/dashboard');

        } catch (error) {
            const errorMessage = error.response?.data?.message || 'Não foi possível completar o registo. Tente novamente.';
            toast.error(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center p-4">
            <div className="w-full max-w-md">
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-bold text-gray-800">Crie a sua Conta</h1>
                    <p className="text-gray-500 mt-2">Comece a gerir o seu negócio de forma eficiente.</p>
                </div>
                
                <div className="bg-white p-8 rounded-lg shadow-md">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Nome do Estabelecimento</label>
                            <input type="text" name="companyName" value={formData.companyName} onChange={handleChange} className="mt-1 block w-full p-3 border rounded-md" required />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Seu Nome</label>
                            <input type="text" name="name" value={formData.name} onChange={handleChange} className="mt-1 block w-full p-3 border rounded-md" required />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Seu Melhor Email</label>
                            <input type="email" name="email" value={formData.email} onChange={handleChange} className="mt-1 block w-full p-3 border rounded-md" required />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Crie uma Senha</label>
                            <input type="password" name="password" value={formData.password} onChange={handleChange} className="mt-1 block w-full p-3 border rounded-md" required />
                        </div>
                        <div>
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-3 bg-purple-700 text-white font-semibold rounded-lg hover:bg-purple-800 disabled:bg-gray-400"
                            >
                                {loading ? 'A criar conta...' : 'Criar Conta Gratuita (14 dias)'}
                            </button>
                        </div>
                    </form>
                </div>
                <div className="text-center mt-6">
                    <p className="text-sm">
                        Já tem uma conta? <Link to="/login" className="font-medium text-purple-600 hover:underline">Faça login</Link>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Register;