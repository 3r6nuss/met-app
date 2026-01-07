import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { DeveloperConsoleProvider } from './context/DeveloperConsoleContext';

import ErrorBoundary from './components/ErrorBoundary.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <DeveloperConsoleProvider>
        <App />
      </DeveloperConsoleProvider>
    </ErrorBoundary>
  </StrictMode>,
)
