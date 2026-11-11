import { useCallback, useEffect, useRef, useState } from "react";
import { API_BASE } from "../../infrastructure/api/api";

type Peer = { id: string; memberId: string; publishing: boolean };
type Connection = { pc: RTCPeerConnection; publisher: string; peer: string; candidates: RTCIceCandidateInit[] };

function videoUrl() {
  const base = import.meta.env.VITE_WS_URL || API_BASE || window.location.origin;
  const url = new URL(`${base.replace(/\/+$/, "")}/ws/video`);
  url.protocol = ["https:", "wss:"].includes(url.protocol) ? "wss:" : "ws:";
  return url.toString();
}

export function useChamberVideo(sessionId: string | undefined, enabled: boolean, memberId?: string, micEnabled = false) {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Record<string, MediaStream>>({});
  const [publishers, setPublishers] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState("Waiting for session");
  const [cameraPending, setCameraPending] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);
  const generation = useRef(0);
  const publish = useRef<(stream: MediaStream | null) => void>(() => {});

  const stopCamera = useCallback(() => {
    generation.current++;
    streamRef.current?.getTracks().forEach(track => track.stop());
    streamRef.current = null;
    setLocalStream(null);
    setCameraPending(false);
    publish.current(null);
  }, []);

  const startCamera = useCallback(async () => {
    if (!enabled || streamRef.current || cameraPending) return;
    const request = ++generation.current;
    setCameraPending(true);
    setError(null);
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error("Camera access requires HTTPS or localhost.");
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 360 }, frameRate: { ideal: 15, max: 24 } }, audio: true
      });
      if (generation.current !== request) { stream.getTracks().forEach(track => track.stop()); return; }
      streamRef.current = stream;
      stream.getAudioTracks().forEach(track => { track.enabled = false; });
      stream.getVideoTracks().forEach(track => { track.onended = stopCamera; });
      setLocalStream(stream);
      publish.current(stream);
    } catch (err) {
      if (generation.current === request) setError(err instanceof Error ? err.message : "Camera unavailable");
    } finally {
      if (generation.current === request) setCameraPending(false);
    }
  }, [enabled, cameraPending, stopCamera]);

  // Keep the shared chamber audio track in sync with the single mic control.
  // When mic is turned on, ensure an audio track is published even if camera is off.
  useEffect(() => {
    if (micEnabled) {
      if (streamRef.current) {
        streamRef.current.getAudioTracks().forEach(track => { track.enabled = true; });
      } else if (navigator.mediaDevices?.getUserMedia) {
        navigator.mediaDevices.getUserMedia({ audio: true })
          .then((aStream) => {
            if (!streamRef.current && micEnabled) {
              streamRef.current = aStream;
              publish.current(aStream);
            }
          })
          .catch(() => {});
      }
    } else {
      if (streamRef.current) {
        streamRef.current.getAudioTracks().forEach(track => { track.enabled = false; });
        if (!localStream) {
          streamRef.current.getTracks().forEach(t => t.stop());
          streamRef.current = null;
          publish.current(null);
        }
      }
    }
  }, [micEnabled, localStream]);

  useEffect(() => {
    // Speaker sessions restored from older logins can omit memberId. The
    // backend resolves identity from the verified token when joining the room.
    if (!enabled || !sessionId) { stopCamera(); setStatus("Waiting for session"); return; }
    const token = sessionStorage.getItem("parlisense_token");
    if (!token) { setStatus("Sign out and sign in again to connect chamber video"); return; }
    let disposed = false;
    let socket: WebSocket;
    let retry: ReturnType<typeof setTimeout>;
    let self = "";
    const peers = new Map<string, Peer>();
    const connections = new Map<string, Connection>();
    let queue = Promise.resolve();
    let rtcConfig: RTCConfiguration;
    try {
      rtcConfig = { iceServers: JSON.parse(import.meta.env.VITE_RTC_ICE_SERVERS || '[{"urls":"stun:stun.l.google.com:19302"}]') };
    } catch { setStatus("Invalid video network configuration"); return; }
    const send = (message: object) => {
      if (!disposed && socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify(message));
    };
    const remove = (key: string) => {
      const connection = connections.get(key);
      if (!connection) return;
      connection.pc.close();
      connections.delete(key);
      if (connection.publisher !== self) {
        const id = peers.get(connection.publisher)?.memberId;
        if (id) setRemoteStreams(previous => { const next = { ...previous }; delete next[id]; return next; });
      }
    };
    const clear = () => {
      for (const key of connections.keys()) remove(key);
      peers.clear(); self = "";
      setRemoteStreams({}); setPublishers([]);
    };
    const refresh = () => setPublishers([...peers.values()].filter(p => p.publishing).map(p => p.memberId));
    const create = (peer: string, publisher: string) => {
      const key = `${publisher}:${peer}`;
      remove(key);
      const pc = new RTCPeerConnection(rtcConfig);
      const connection: Connection = { pc, publisher, peer, candidates: [] };
      connections.set(key, connection);
      pc.onicecandidate = event => {
        if (event.candidate) send({ type: "signal", to: peer, publisher, data: { candidate: event.candidate.toJSON() } });
      };
      pc.ontrack = event => {
        const id = peers.get(peer)?.memberId;
        if (id && publisher !== self && connections.get(key) === connection) {
          setRemoteStreams(previous => ({ ...previous, [id]: event.streams[0] || new MediaStream([event.track]) }));
        }
      };
      pc.onconnectionstatechange = () => {
        if (pc.connectionState === "failed") {
          setError("A camera connection failed. Reconnecting video…");
          socket.close();
        }
      };
      return connection;
    };
    const offer = async (peer: string) => {
      const stream = streamRef.current;
      if (!stream || !self || !peers.has(peer)) return;
      const publisher = self;
      const { pc } = create(peer, publisher);
      stream.getTracks().forEach(track => pc.addTrack(track, stream));
      await pc.setLocalDescription(await pc.createOffer());
      if (pc.signalingState !== "closed") send({ type: "signal", to: peer, publisher, data: { description: pc.localDescription } });
    };
    const enqueue = (action: () => Promise<void>) => {
      queue = queue.then(() => disposed ? undefined : action()).catch(() => {
        if (!disposed) {
          setError("Unable to connect a camera feed. Retrying…");
          socket?.close();
        }
      });
    };
    publish.current = stream => {
      if (!self) return;
      send({ type: "publish", enabled: !!stream });
      for (const [key, connection] of connections) if (connection.publisher === self) remove(key);
      if (stream) for (const peer of peers.keys()) enqueue(() => offer(peer));
    };
    const connect = () => {
      if (disposed) return;
      setStatus("Connecting chamber video…");
      socket = new WebSocket(videoUrl());
      const activeSocket = socket;
      socket.onopen = () => send({ type: "join", token, sessionId });
      socket.onmessage = event => enqueue(async () => {
        if (socket !== activeSocket || activeSocket.readyState !== WebSocket.OPEN) return;
        const message = JSON.parse(event.data);
        if (message.type === "welcome") {
          self = message.id;
          for (const peer of message.peers) peers.set(peer.id, peer);
          refresh(); setStatus("Connected"); setError(null);
          publish.current(streamRef.current);
        } else if (message.type === "peer") {
          const isNew = !peers.has(message.peer.id);
          peers.set(message.peer.id, message.peer); refresh();
          if (!message.peer.publishing) {
            for (const [key, connection] of connections) if (connection.publisher === message.peer.id) remove(key);
          }
          if (isNew && streamRef.current) await offer(message.peer.id);
        } else if (message.type === "left") {
          for (const [key, connection] of connections) if (connection.peer === message.id) remove(key);
          peers.delete(message.id); refresh();
        } else if (message.type === "signal" && peers.has(message.from)) {
          const { from, publisher, data } = message;
          const key = `${publisher}:${from}`;
          let connection = connections.get(key);
          if (data.description?.type === "offer") connection = create(from, publisher);
          if (!connection) return;
          const { pc } = connection;
          if (data.description) {
            await pc.setRemoteDescription(data.description);
            for (const candidate of connection.candidates.splice(0)) await pc.addIceCandidate(candidate);
            if (data.description.type === "offer") {
              await pc.setLocalDescription(await pc.createAnswer());
              send({ type: "signal", to: from, publisher, data: { description: pc.localDescription } });
            }
          } else if (data.candidate) {
            if (pc.remoteDescription) await pc.addIceCandidate(data.candidate);
            else connection.candidates.push(data.candidate);
          }
        }
      });
      socket.onerror = () => socket.close();
      socket.onclose = event => {
        if (disposed || socket !== activeSocket) return;
        clear();
        if ([4001, 4003, 4009].includes(event.code)) {
          stopCamera(); setStatus(event.reason); return;
        }
        setStatus("Video disconnected. Reconnecting…");
        retry = setTimeout(connect, 2000);
      };
    };
    connect();
    return () => {
      disposed = true; clearTimeout(retry); publish.current = () => {};
      stopCamera(); socket?.close(); clear();
    };
  }, [sessionId, enabled, memberId, stopCamera]);

  return { localStream, remoteStreams, publishers, error, status, cameraPending, startCamera, stopCamera };
}
