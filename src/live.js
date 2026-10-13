const API = import.meta.env.VITE_API_URL || "http://localhost:5001";

const listeners = new Set();
let source = null;

export function startLive() {
  if (source || typeof EventSource === "undefined") return;
  source = new EventSource(`${API}/api/events`);
  source.onmessage = (e) => {
    let event;
    try {
      event = JSON.parse(e.data);
    } catch {
      return;
    }
    listeners.forEach((fn) => fn(event));
  };
}

export function onLive(fn) {
  startLive();
  listeners.add(fn);
  return () => listeners.delete(fn);
}
