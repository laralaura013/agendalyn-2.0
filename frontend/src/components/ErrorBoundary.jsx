import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  componentDidCatch(error, info) {
    console.error('UI error boundary:', error, info);
  }
  render() {
    if (this.state.error) {
      return (
        <div className="p-4">
          <h2 className="text-lg font-semibold mb-2">Ops, algo deu errado nesta página.</h2>
          <p className="text-sm text-gray-600 mb-3">
            Recarregue a página. Se persistir, abra o Console (F12) para ver o erro detalhado.
          </p>
          <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto">
            {String(this.state.error)}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}
