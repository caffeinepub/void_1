# VOID – The Light & Dark Encrypted Wisdom Network

## Current State

VOID is a privacy-first, E2EE messaging app built on ICP (Internet Computer) with:
- Internet Identity authentication → auto-generated anonymous @void_shadow_XXXX VOID IDs
- Optional persistent cosmic handle (set once)
- Light Room (gold theme) + Dark Room (purple theme) — public threaded rooms
- 1-on-1 DMs with polling
- Threaded replies (Reddit-style nested under messages)
- Max 50 visible messages, load older on scroll
- Mock E2EE via client-side encryption (tweetnacl)
- Cosmic UI: void black + deep dark blue + glowing gold + purple accents + nebula gradients
- Nebula procedural avatars (sacred geometry SVG)
- PWA with offline support
- Splash screen with VOID manifesto

Backend: Motoko canister with User, Room, DM, and blob-storage components.
Frontend: React + TypeScript + Tailwind + TanStack Router + TanStack Query.

## Requested Changes (Diff)

### Add

1. **VOID Token Mining Teaser (Future Phase)**
   - New `/mining` route with a full-page "Mining Coming Soon" teaser
   - Cosmic animated section: pulsing nebula orb, glowing "VOID Token" text
   - Message: "Mine VOID tokens by sharing wisdom and staying present in Light & Dark rooms."
   - Placeholder stats panel (locked/coming soon): tokens earned, wisdom score, daily mining rate
   - "Notify Me" action (stores a flag locally, shows confirmed state)
   - Navigation item added to sidebar and mobile nav

2. **Invite Friends & Family System**
   - Invite button in Navigation sidebar and DM List page
   - Per-DM invite button in DM header (for existing DMs and new connections)
   - Invite modal with:
     - Shareable link (e.g., `https://app.void.chat/invite/<voidId>`)
     - QR code generated client-side (qrcode library)
     - One-tap share buttons: WhatsApp, Telegram, copy link
     - Pre-filled message: "Join me in VOID – a private space for truth and wisdom."
   - Backend: `generateInviteToken` and `resolveInviteToken` functions to map invite tokens to voidIds
   - Frontend invite landing page at `/invite/:token` that prompts login then opens DM

3. **Keyword-Powered Rooms (Tags System)**
   - Backend: `keywords` field added to Message type (array of Text)
   - `postMessageWithKeywords` endpoint (or extend `postMessage`) to accept keywords
   - `getMessagesByKeyword(channel, keyword, count)` query for filtering
   - Frontend: keyword chip selector in MessageInput for Light Room / Dark Room
     - Light Room keywords: truth, mindset, clarity, omnism, wisdom, consciousness, unity, love
     - Dark Room keywords: maya, illusion, matrix, shadow, ego, deception, deconstruction, fear
   - Keyword filter bar at top of ChatView (horizontal scrollable pill row)
   - Active filter highlights only matching messages, others dimmed
   - Tags displayed on MessageBubble as small colored pills

### Modify

- `main.mo`: Add `keywords` field to Message type; add invite token storage; add keyword filtering query
- `Navigation.tsx`: Add Mining nav item + Invite button
- `ChatView.tsx`: Add keyword filter bar (for lightRoom/darkRoom only)
- `MessageInput.tsx`: Add keyword chip selector (for lightRoom/darkRoom only)
- `MessageBubble.tsx`: Add keyword pill display
- `App.tsx`: Add `/mining` and `/invite/:token` routes
- `DMList.tsx`: Add Invite button in header
- `DMView.tsx`: Add Invite button in DM header

### Remove

- Nothing removed

## Implementation Plan

1. Update Motoko `main.mo`:
   - Add `keywords: [Text]` to Message type
   - Add invite token map (`inviteTokens: Map<Text, Text>`) — token → voidId
   - Add `postMessage` signature to accept keywords array
   - Add `getMessagesByKeyword(channel, keyword, count)` query
   - Add `generateInviteToken(voidId)` → returns token (Text)
   - Add `resolveInviteToken(token)` → returns ?voidId

2. Regenerate backend via `generate_motoko_code`

3. Frontend changes (via frontend subagent):
   a. New `MiningPage.tsx` — full cosmic teaser page with animations
   b. New `InviteModal.tsx` — QR code + share buttons modal
   c. New `InviteLanding.tsx` — `/invite/:token` landing page
   d. Update `Navigation.tsx` — add Mining nav item + Invite button
   e. Update `ChatView.tsx` — keyword filter bar for public rooms
   f. Update `MessageInput.tsx` — keyword chip picker for public rooms
   f. Update `MessageBubble.tsx` — show keyword pills on messages
   g. Update `App.tsx` — add new routes
   h. Update `DMList.tsx` + `DMView.tsx` — invite buttons
   i. Install `qrcode` npm package for QR generation

## UX Notes

- Mining page should feel like entering a sacred vault — pulsing cosmic orb animation, dark nebula background, gold glowing text, no corporate feel
- Invite flow must be dead-simple: one tap to copy, one tap to share on WhatsApp/Telegram — no forms, no complexity
- Keyword pills in MessageInput should be selectable chips that glow when active (gold for Light Room, purple for Dark Room)
- Keyword filter bar is a horizontal scroll row at top of chat — active filter pill glows, inactive ones are dimmed
- Keep the "digital temple" feel throughout: every new element should feel like it belongs in the cosmic void aesthetic
- Mobile-first layout for all new screens
