import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';

const ClientVerifyPage = () => {
    const { token } = useParams();
    const navigate = useNavigate();
    const [message, setMessage] = useState('A validar o seu acesso...');
    const [error, setError] = useState(false);

    useEffect(() => {
        const verifyToken = async () => {
            if (!token) {
                setError(true);
                setMessage("Token de acesso não encontrado. Por favor, solicite um novo link.");
                return;
            }
            try {
                const response = await api.post('/portal/verify-login', { token });
                localStorage.setItem('clientToken', response.data.sessionToken);
                localStorage.setItem('clientData', JSON.stringify(response.data.client));
                
                setMessage("Login bem-sucedido! A redirecionar para o seu portal...");
                setTimeout(() => {
                    navigate('/portal/dashboard');
                }, 2000);

            } catch (err) {
                setError(true);
                setMessage(err.response?.data?.message || "Ocorreu um erro. Por favor, solicite um novo link.");
            }
        };

        verifyToken();
    }, [token, navigate]);

    return (
        <div className="min-h-screen bg-gray-50 flex justify-center items-center p-4">
            <div className="w-full max-w-md text-center">
                <div className="bg-white p-8 rounded-lg shadow-md">
                    <h1 className={`text-2xl font-bold ${error ? 'text-red-600' : 'text-gray-800'}`}>
                        {message}
                    </h1>
                </div>
            </div>
        </div>
    );
};

export default ClientVerifyPage;