export function LoadingScreen({ message = "Loading…" }: { message?: string }): JSX.Element {
  return (
    <div className="loading-screen">
      <div className="spinner" />
      <p className="muted">{message}</p>
    </div>
  );
}
