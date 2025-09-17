import { useClientContext } from "../context/ClientContext";

export function ClientSelector(): JSX.Element {
  const { memberships, activeClientId, selectClient, loading } = useClientContext();

  if (loading) {
    return <span className="muted">Loading workspaces…</span>;
  }

  if (!memberships.length) {
    return <span className="muted">No workspaces available</span>;
  }

  return (
    <label className="client-selector">
      <span>Workspace</span>
      <select
        className="client-select"
        value={activeClientId ?? memberships[0].clientId}
        onChange={(event) => selectClient(event.target.value)}
      >
        {memberships.map((membership) => (
          <option key={membership.clientId} value={membership.clientId}>
            {membership.clientId}
            {membership.role ? ` · ${membership.role}` : ""}
          </option>
        ))}
      </select>
    </label>
  );
}
