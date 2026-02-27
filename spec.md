# VOID – The Light & Dark Encrypted Wisdom Network

## Current State

The app is a full-stack ICP (Motoko + React) PWA combining Telegram-style private messaging and Reddit-style public rooms. Core features exist:

- Cosmic black/dark blue theme with gold dust particles, shooting stars, animated nebula background
- Internet Identity auth, VOID ID generation (`@void_shadow_XXXX:canister`), optional cosmic handle
- Light Room & Dark Room (threaded messages, keyword filter, upvotes)
- 1-on-1 DM list and DM view
- Creator Portal (admin: daily reflection, user management, pin messages)
- Mining teaser page
- Invite system with QR codes
- Client-side E2EE via Web Crypto API (AES-GCM), keys in localStorage
- Messages encrypted before sending; canister stores ciphertext blobs
- 2.5s polling for near-real-time updates

**Current bugs:**
1. Light Room and Dark Room do not fill the device screen — the `flex-col h-full` container in `ChatView.tsx` is not properly constrained to the available viewport height, causing messages to overflow or the chat to appear collapsed/white on some devices.
2. Messages appear as "🔒 Encrypted" or "🔒 Encrypted message" even for the sender — because each device generates its own AES-GCM key in `localStorage`, the sender's key is used to encrypt but upon page refresh or on another device (or even the same device after state reset), the `decryptedMap` state is empty and the fallback displays the "Encrypted" placeholder. The core issue: `decryptedMap` is populated only after `useEffect` runs after `isReady` becomes true, but during the loading window, the fallback shows. Also, newly posted messages are not immediately added to the local `decryptedMap` after send, so they flash "Encrypted" until the next poll returns.
3. Chats not visible: the `decryptedMap` starts empty and the async decryption loop races against the render. If the key loads but messages are already in the query cache, the effect may fire before `isReady` is `true`, leaving all messages showing the encrypted fallback permanently.

## Requested Changes (Diff)

### Add
- Immediate local decryption of sent messages (optimistic plaintext update to `decryptedMap` right after `encryptForSend` so the sender sees their own message text instantly without waiting for the poll round-trip)
- `useLayoutEffect` or synchronous-on-ready decryption trigger to guarantee the decryption effect fires as soon as both `isReady === true` AND `messages.length > 0`
- Full-height layout fix: the `main` element in `App.tsx` and the `ChatView` wrapper must use `h-[calc(100dvh-...)]` or proper flex constraints so the chat fills the screen on all device sizes (mobile 320px to 4K desktop)
- Graceful empty state while decryption is in progress (show a subtle "Decrypting..." shimmer on each bubble instead of a static "🔒 Encrypted" icon)
- Responsive improvements throughout: ensure no horizontal overflow, message bubbles cap at `max-w-[85%]` on mobile and `max-w-[70%]` on desktop, input bar always anchored to bottom

### Modify
- `ChatView.tsx`: fix `h-full` container so it respects the full available height; add a `decryptionReady` derived state that triggers immediate decryption of all loaded messages the moment `isReady` flips to `true`; ensure `decryptedMap` is seeded optimistically for sent messages
- `MessageBubble.tsx`: replace static "🔒 Encrypted" text with an animated shimmer/pulse placeholder while `decryptedText === null` (decryption pending) vs a lock icon with "Encrypted" only when decryption definitively fails (returns `null` after key is ready)
- `MessageInput.tsx` → `handleSend`: after sending, immediately update a shared/lifted `decryptedMap` or call a callback with `{ id: tempId, text }` so the sender sees their message instantly; use optimistic invalidation pattern
- `App.tsx` `<main>`: change `min-h-screen` to `h-[calc(100dvh)]` with proper overflow handling; ensure `flex-col` fills remaining height after nav

### Remove
- Nothing removed — only fixes and improvements to existing components

## Implementation Plan

1. **Fix ChatView full-height layout** — change the outermost `div` from `flex flex-col h-full` to `flex flex-col h-full overflow-hidden` and ensure the messages scroll area uses `flex-1 min-h-0 overflow-y-auto` (the `min-h-0` on flex children is critical for flex overflow to work correctly in all browsers)
2. **Fix App.tsx main layout** — change `<main>` to use `h-dvh md:h-screen` with `overflow-hidden` at the root and `flex-1 min-h-0 flex flex-col` on the main content area so ChatView gets a bounded height
3. **Fix decryption race condition** — in `ChatView`, change the decryption `useEffect` dependency array to `[messages, isReady, decryptReceived]` and add an early return only when `!isReady` (current code already does this, but ensure the effect also re-fires when `isReady` changes from `false` to `true` while messages are already loaded)
4. **Optimistic send decryption** — in `MessageInput.handleSend`, after computing `ciphertext = await encryptForSend(text)`, also compute a local preview: store `{ tempId, text }` in a parent-provided callback or a module-level store so `ChatView` can pre-populate `decryptedMap` before the server response arrives
5. **MessageBubble decryption pending state** — show `<span className="animate-pulse text-white/30 text-sm">Decrypting...</span>` when `decryptedText === null && isDecryptionReady` and `🔒 Encrypted` only as a definitive failure state
6. **Responsive fixes** — audit all pages (LightRoom, DarkRoom, DMView, DMList, ProfileSettings, MiningPage, CreatorPortal) ensuring `w-full max-w-full overflow-x-hidden` and mobile-safe padding
