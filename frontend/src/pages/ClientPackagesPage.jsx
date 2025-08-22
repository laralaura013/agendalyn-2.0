import React, { useEffect, useState } from 'react';
import { getMyPackages } from '../services/clientService';
import { format, parseISO } from 'date-fns';
import toast from 'react-hot-toast';


import { asArray } from '../utils/asArray';
const ClientPackagesPage = () => {
  const [packages, setPackages] = useState([]);

  useEffect(() => {
    const fetchPackages = async () => {
      try {
        const data = await getMyPackages();
        setPackages(data);
      } catch {
        toast.error('Erro ao carregar pacotes.');
      }
    };
    fetchPackages();
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4 text-purple-700">Meus Pacotes</h1>
      {packages.length === 0 ? (
        <p className="text-gray-500 text-sm">Você não possui pacotes ativos.</p>
      ) : (
        <ul className="space-y-4">
          {asArray(packages).map((pkg) => (
            <li key={pkg.id} className="p-4 bg-white rounded-lg shadow">
              <p className="font-semibold">{pkg.package.name}</p>
              <p className="text-xs text-gray-500">
                Ativado em {format(parseISO(pkg.createdAt), 'dd/MM/yyyy')}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default ClientPackagesPage;
