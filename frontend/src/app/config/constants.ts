export const API_BASE =
  import.meta?.env?.VITE_API_BASE ||
  process.env.REACT_APP_API_BASE ||
  "localhost:8000";

export const HTTP_API_BASE = `http://${API_BASE}/api`;
export const WS_API_BASE = `ws://${API_BASE}`;
