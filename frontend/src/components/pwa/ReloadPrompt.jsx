import React from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'

function ReloadPrompt() {
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      console.log('Service Worker registado com sucesso:', r)
    },
    onRegisterError(error) {
      console.error('Erro no registo do Service Worker:', error)
    },
  })

  const close = () => {
    setOfflineReady(false)
    setNeedRefresh(false)
  }

  // Este componente é mais para o futuro, para mostrar um pop-up de atualização.
  // Por agora, a sua principal função é simplesmente existir e chamar o useRegisterSW(),
  // que faz o registo do service worker automaticamente.
  // Não vamos renderizar nada visualmente por enquanto.

  return null
}

export default ReloadPrompt