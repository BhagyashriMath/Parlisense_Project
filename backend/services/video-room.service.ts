import { randomUUID } from "node:crypto";

interface Client {
  socket: any;
  id: string;
  memberId: string;
  sessionId: string;
  publishing: boolean;
}

/** Signaling only: media travels between browsers, never through telemetry. */
export class VideoRoomService {
  private clients = new Map<string, Client>();
  constructor(private session: () => { sessionId: string; isActive: boolean }) {}

  private send(client: Client, message: object) {
    if (client.socket.readyState === 1) client.socket.send(JSON.stringify(message));
  }
  private broadcast(client: Client, message: object) {
    for (const other of this.clients.values()) {
      if (other.sessionId === client.sessionId && other.id !== client.id) this.send(other, message);
    }
  }
  private info(client: Client) {
    return { id: client.id, memberId: client.memberId, publishing: client.publishing };
  }
  join(socket: any, memberId: string, sessionId: string) {
    const state = this.session();
    if (!state.isActive || state.sessionId !== sessionId) {
      socket.close(4003, "Session is not active");
      return;
    }
    // One video connection per member. Replacement avoids duplicate camera tiles.
    for (const old of this.clients.values()) {
      if (old.memberId === memberId) {
        this.leave(old.id);
        old.socket.close(4009, "Camera opened in another tab");
      }
    }
    const client: Client = { socket, id: randomUUID(), memberId, sessionId, publishing: false };
    this.clients.set(client.id, client);
    this.send(client, { type: "welcome", id: client.id, peers: [...this.clients.values()]
      .filter(p => p.id !== client.id && p.sessionId === sessionId).map(p => this.info(p)) });
    this.broadcast(client, { type: "peer", peer: this.info(client) });
    socket.on("message", (raw: any) => {
      try {
        if (!this.clients.has(client.id)) return;
        const current = this.session();
        if (!current.isActive || current.sessionId !== sessionId) {
          this.leave(client.id);
          socket.close(4003, "Session ended");
          return;
        }
        const message = JSON.parse(raw.toString());
        if (message.type === "publish" && typeof message.enabled === "boolean") {
          client.publishing = message.enabled;
          this.broadcast(client, { type: "peer", peer: this.info(client) });
        } else if (message.type === "signal") {
          const target = this.clients.get(message.to);
          if (!target || target.id === client.id || target.sessionId !== sessionId) return;
          // Each publisher owns a unidirectional connection to each viewer.
          const publisher = this.clients.get(message.publisher);
          if (!publisher?.publishing || ![client.id, target.id].includes(publisher.id)) return;
          const data = message.data;
          if (!data || typeof data !== "object") return;
          if (data.description) {
            if (typeof data.description.sdp !== "string") return;
            if (data.description.type !== (publisher.id === client.id ? "offer" : "answer")) return;
          } else if (!data.candidate || typeof data.candidate.candidate !== "string") return;
          this.send(target, { type: "signal", from: client.id, publisher: publisher.id, data });
        }
      } catch { /* Ignore malformed signaling messages. */ }
    });
    socket.on("close", () => this.leave(client.id));
    socket.on("error", () => this.leave(client.id));
  }
  leave(id: string) {
    const client = this.clients.get(id);
    if (!client) return;
    this.clients.delete(id);
    this.broadcast(client, { type: "left", id });
  }
  sweep() {
    const state = this.session();
    for (const client of this.clients.values()) {
      if (!state.isActive || state.sessionId !== client.sessionId) {
        this.leave(client.id);
        client.socket.close(4003, "Session ended");
      }
    }
  }
}
