import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider, MutationCache } from '@tanstack/react-query'
import App from './App'
import './index.css'
import { applyTheme, loadTheme } from '@/lib/theme'
import { errorMessage } from '@/lib/errors'
import { showToast } from '@/lib/toast'

applyTheme(loadTheme())

const qc = new QueryClient({
  defaultOptions: { queries: { staleTime: 10_000 } },
  // 저장 실패를 한 곳에서 사용자에게 알린다. 개별 mutation에 onError가 있어도
  // 여기까지 함께 호출되므로, 앞으로 추가되는 mutation도 자동으로 포함된다.
  mutationCache: new MutationCache({
    onError: (error) => showToast(errorMessage(error)),
  }),
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={qc}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>,
)
