import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import './index.css';

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { err: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { err: null };
  }
  static getDerivedStateFromError(err: Error) {
    return { err };
  }
  render() {
    if (this.state.err) {
      return (
        <div className="w-screen h-screen bg-[#090B0E] text-[#E6E8EC] flex flex-col items-center justify-center p-6 text-center gap-3">
          <div className="text-sm font-semibold text-[#E5A952]">MAOTUN — Arayüz Kurtarma</div>
          <div className="font-mono-tech text-xs text-[#8E95A3] max-w-lg break-words">
            {this.state.err.message}
          </div>
          <button
            onClick={() => this.setState({ err: null })}
            className="atlas-btn atlas-btn-amber px-4 py-2 text-xs"
          >
            Ekranı Yenile
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
