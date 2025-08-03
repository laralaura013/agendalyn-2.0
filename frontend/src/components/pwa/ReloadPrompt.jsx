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

  // ✅ Atualiza automaticamente quando houver nova versão
  if (needRefresh) {
    updateServiceWorker(true)
  }

  return null
}

export default ReloadPrompt
