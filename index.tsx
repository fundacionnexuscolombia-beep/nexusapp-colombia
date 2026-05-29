
import "./sentry";
import './index.css';
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { initializePushNotifications } from './services/pushNotifications';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    } as ErrorBoundaryState;
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("React Error Boundary caught:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '40px 20px', background: '#0f172a', minHeight: '100vh', color: 'white', fontFamily: 'sans-serif', textAlign: 'center' }}>
          <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', borderRadius: '20px', padding: '30px' }}>
            <h1 style={{ color: '#ef4444', fontWeight: '900', fontSize: '24px', marginBottom: '16px' }}>ALGO SALIÓ MAL</h1>
            <p style={{ color: '#cbd5e1', marginBottom: '24px' }}>La aplicación encontró un error crítico de renderizado.</p>
            <pre style={{ background: '#020617', padding: '16px', borderRadius: '12px', fontSize: '12px', overflow: 'auto', textAlign: 'left', marginBottom: '24px', border: '1px solid rgba(255,255,255,0.1)' }}>
              {this.state.error?.message}
              {'\n\n'}
              {this.state.error?.stack}
            </pre>
            <button 
              onClick={() => window.location.reload()}
              style={{ background: '#7f13ec', color: 'white', border: 'none', padding: '12px 24px', borderRadius: '12px', fontWeight: 'bold' }}
            >
              Reintentar
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error("Could not find root element to mount to");

//initializePushNotifications();

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
