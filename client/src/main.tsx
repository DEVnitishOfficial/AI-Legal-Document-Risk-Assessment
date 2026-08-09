import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { store } from './app/store.ts'
import { Provider } from 'react-redux'
import { ThemeProvider } from './app/ThemeProvider.tsx'

createRoot(document.getElementById('root')!).render(
  <Provider store={store}>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </Provider>
)
