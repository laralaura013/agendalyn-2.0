import React, { useState, useEffect } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Package } from 'lucide-react';

const ClientPackagesPage = () => {
    const [packages, setPackages] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchPackages = async () => {
            try {
                const clientToken = localStorage.getItem('clientToken');
                const response = await api.get('/portal/my-packages', {
                    headers: { Authorization: `Bearer ${clientToken}` }
                });
                setPackages(response.data);
            } catch (error) {
                toast.error("Não foi possível carregar os seus pacotes.");
            } finally {
                setLoading(false);
            }
        };
        fetchPackages();
    }, []);

    return (
        <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4">Meus Pacotes</h2>
            {loading ? (
                <p>A carregar pacotes...</p>
            ) : packages.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {packages.map(p => (
                        <div key={p.id} className="p-4 border rounded-md">
                            <div className="flex items-center gap-3 mb-2">
                                <Package className="text-purple-700" />
                                <h3 className="font-bold text-lg">{p.package.name}</h3>
                            </div>
                            <p className="text-gray-700">
                                <span className="font-semibold text-2xl">{p.sessionsRemaining}</span> sessões restantes
                            </p>
                            <p className="text-sm text-gray-500 mt-1">
                                Expira em: {format(new Date(p.expiresAt), "dd/MM/yyyy", { locale: ptBR })}
                            </p>
                        </div>
                    ))}
                </div>
            ) : (
                <p className="text-gray-500">Você ainda não comprou nenhum pacote.</p>
            )}
        </div>
    );
};

export default ClientPackagesPage;