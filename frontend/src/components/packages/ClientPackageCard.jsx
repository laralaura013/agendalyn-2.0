import React from 'react';

const ClientPackageCard = ({ clientPackage }) => {
  // clientPackage: { name, sessionsRemaining, totalSessions, expiresAt }
  const progress = (clientPackage.sessionsRemaining / clientPackage.totalSessions) * 100;

  return (
    <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
      <h4 className="font-bold text-gray-800">{clientPackage.name}</h4>
      <p className="text-sm text-gray-600 mt-1">
        Sessões restantes: <span className="font-semibold">{clientPackage.sessionsRemaining}</span> de {clientPackage.totalSessions}
      </p>
      <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2">
        <div className="bg-green-600 h-2.5 rounded-full" style={{ width: `${progress}%` }}></div>
      </div>
      <p className="text-xs text-right text-gray-500 mt-1">
        Expira em: {new Date(clientPackage.expiresAt).toLocaleDateString()}
      </p>
    </div>
  );
};

export default ClientPackageCard;
