import React from "react";

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, info) {
    console.error("ErrorBoundary caught:", error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", padding: "40px 24px", textAlign: "center", background: "var(--bg)" }}>
          <div style={{ fontSize: 64, marginBottom: 16 }}>😕</div>
          <div style={{ fontSize: 20, fontWeight: 600, marginBottom: 8, color: "var(--text-primary)" }}>Something went wrong</div>
          <div style={{ fontSize: 14, color: "var(--text-secondary)", marginBottom: 24, maxWidth: 300, lineHeight: 1.6 }}>
            We hit an unexpected error. Your data is safe. Please try refreshing the page.
          </div>
          <button
            className="btn-pink"
            style={{ width: "auto", padding: "12px 32px" }}
            onClick={() => { this.setState({ hasError: false, error: null }); window.location.reload(); }}
          >
            Refresh page
          </button>
          {this.state.error && (
            <div style={{ marginTop: 20, padding: 12, background: "var(--bg-card)", borderRadius: 8, fontSize: 11, color: "var(--danger)", textAlign: "left", maxWidth: 360, wordBreak: "break-all" }}>
              {this.state.error.toString()}
            </div>
          )}
        </div>
      );
    }
    return this.props.children;
  }
}

export function ErrorScreen({ message, onRetry, onHome }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "60px 24px", textAlign: "center" }}>
      <div style={{ fontSize: 48, marginBottom: 12 }}>⚠️</div>
      <div style={{ fontSize: 16, fontWeight: 500, marginBottom: 8 }}>
        {message || "Something went wrong"}
      </div>
      <div style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 20 }}>
        Please check your connection and try again.
      </div>
      <div style={{ display: "flex", gap: 10 }}>
        {onRetry && (
          <button className="btn-pink" style={{ width: "auto", padding: "10px 24px" }} onClick={onRetry}>
            Try again
          </button>
        )}
        {onHome && (
          <button className="btn-outline" style={{ width: "auto", padding: "10px 24px", marginTop: 0 }} onClick={onHome}>
            Go home
          </button>
        )}
      </div>
    </div>
  );
}

export default ErrorBoundary;
