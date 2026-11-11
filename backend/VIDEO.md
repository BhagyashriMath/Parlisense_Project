# Chamber video

Member and Speaker dashboards use the shared Chamber Video Feeds card. Sign in
through the login form, start a parliamentary session, and click Start Cam.
Camera permission is requested only on that click. Everyone connected to the
session receives enabled cameras even if they decline permission or keep their
own camera off. Video stays available during a pause and stops when the session
ends. Microphone controls continue to use the existing audio system.

The frontend now signs in through `/api/auth/login`, retaining the returned token
in sessionStorage. Existing browser-only logins must sign out and sign in once.
`/ws/video` requires that token in its first message within five seconds. Identity
comes from the verified token, and the backend restricts signaling to the active
session. A second video tab for the same member replaces the first connection.
The service relays SDP/ICE and publication/disconnection events; it does not store
camera recordings. Camera-off users still join as receivers.

Deployment:

- Serve the frontend over HTTPS (localhost also supports camera capture).
- Proxy `/ws/video` to the same persistent backend as `/ws/session`; existing
  Vite `/ws` proxy and VITE_WS_URL settings cover both endpoints.
- Set `VITE_RTC_ICE_SERVERS` in the frontend build environment to a JSON array of
  RTCIceServer objects. The default is a public STUN server. For reliable access
  across restrictive networks, include your TURN relay with client credentials,
  for example `[{"urls":"turn:relay.example.org:3478","username":"client",
  "credential":"client-credential"}]`. Values are visible in the browser; use
  appropriately scoped credentials. No TURN infrastructure is provisioned here.
- Signaling rooms are in memory and require one backend instance. This initial
  implementation sends one video stream per publisher/viewer pair (mesh); upload
  bandwidth grows with room size. A full chamber deployment needs capacity testing
  and an SFU media service before supporting hundreds of simultaneous cameras.

Verification: `node --test backend/tests/video-room.test.cjs` from the repository
root covers two publishers plus a camera-off late viewer, camera-off/disconnect,
session isolation, identity spoofing and duplicate-tab replacement.
`node --test backend/tests/video-browser.test.cjs` runs the real card in three
headless Chrome pages with synthetic camera input, covering video playback,
spotlight, reconnect, denied permission, camera restart and session end. Set
`CHROME_PATH` if Chrome is not in the default Windows installation location.
The browser test uses an isolated signaling server and never touches the app database.

WebRTC signaling and ICE handling follow the browser APIs documented in
[MDN's signaling guide](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Signaling_and_video_calling).
