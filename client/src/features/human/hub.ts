import { API_BASE_URL } from "../../services/api";

type Handler = (msg: any) => void;

// The realtime connection to the server (the same port as the API, path /ws).
// It authenticates with the signed-in user's token as its first message, keeps
// itself alive, and reconnects on its own if the network drops. Handlers are
// re-attached automatically because they are kept here, not on the socket.
export class Hub {
  private ws: WebSocket | null = null;
  private handlers = new Map<string, Set<Handler>>();
  private closed = false;
  private attempts = 0;
  private pingTimer: number | null = null;
  private reconnectTimer: number | null = null;
  private queue: string[] = [];
  private authed = false;
  /** Called after every (re)connection has authenticated, e.g. to re-open the desk or re-join a call. */
  onReady: (() => void) | null = null;

  private token: string;

  constructor(token: string) {
    this.token = token;
    this.connect();
  }

  static url() {
    const u = new URL(API_BASE_URL);
    u.protocol = u.protocol === "https:" ? "wss:" : "ws:";
    u.pathname = "/ws";
    u.search = "";
    return u.toString();
  }

  private connect() {
    if (this.closed) return;
    this.authed = false;
    const ws = new WebSocket(Hub.url());
    this.ws = ws;

    ws.onopen = () => ws.send(JSON.stringify({ type: "auth", token: this.token }));
    ws.onmessage = (e) => {
      let msg: any;
      try {
        msg = JSON.parse(e.data);
      } catch {
        return;
      }
      if (msg.type === "auth.ok") {
        this.authed = true;
        this.attempts = 0;
        this.queue.splice(0).forEach((m) => ws.send(m));
        this.onReady?.();
      }
      this.handlers.get(msg.type)?.forEach((h) => h(msg));
      this.handlers.get("*")?.forEach((h) => h(msg));
    };
    ws.onclose = (e) => {
      this.authed = false;
      if (this.pingTimer) window.clearInterval(this.pingTimer);
      this.handlers.get("disconnected")?.forEach((h) => h({ type: "disconnected", code: e.code }));
      // 4401 = the token was rejected: retrying with the same token cannot help.
      if (this.closed || e.code === 4401) return;
      const delay = Math.min(15000, 500 * 2 ** this.attempts++);
      this.reconnectTimer = window.setTimeout(() => this.connect(), delay);
    };
    ws.onerror = () => undefined;
    this.pingTimer = window.setInterval(() => this.send({ type: "ping" }), 20000);
  }

  on(type: string, fn: Handler) {
    if (!this.handlers.has(type)) this.handlers.set(type, new Set());
    this.handlers.get(type)!.add(fn);
    return () => {
      this.handlers.get(type)?.delete(fn);
    };
  }

  send(msg: object) {
    const text = JSON.stringify(msg);
    if (this.ws?.readyState === WebSocket.OPEN && this.authed) this.ws.send(text);
    else if (!this.closed) this.queue.push(text);
  }

  get connected() {
    return this.authed;
  }

  close() {
    this.closed = true;
    if (this.pingTimer) window.clearInterval(this.pingTimer);
    if (this.reconnectTimer) window.clearTimeout(this.reconnectTimer);
    this.ws?.close();
  }
}
