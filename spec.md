# VOID v15 — The Light & Dark Encrypted Wisdom Network

## Current State
Full-stack ICP app with Motoko backend (User canister, Room canister, NFT marketplace, Value Offerings, Group chat, Creator Portal) and React/TypeScript/Tailwind frontend. Has CosmicBackground, Navigation, VoidSage, ProfileSetupModal, all room/DM/group pages, NFT marketplace, mining page, and creator portal.

Known issues from conversation history:
- SplashScreen lacks a proper landing page (no "Enter the Void" hero section with child-friendly copy)
- Messages sometimes show "Sealed Wisdom" even for participants (E2EE key mismatch)
- Cosmic Handle not consistently shown as primary title (VOID ID leaking as main title)
- Light/Dark Rooms: hashtag filter chips sometimes duplicated
- Single upvote per user not enforced (no per-user vote tracking)
- Bookmark/save post feature missing
- Users cannot delete only their own posts
- VOID Sage is not draggable
- Admin portal lacks: live user list with last-active, one-click delete, newsletter send, bookmark/report view
- Star dust particles need to be more consistent and visible across all screens
- No notification permission toggle in Profile

## Requested Changes (Diff)

### Add
- **Landing Page**: Pre-login full-screen hero with child-friendly VOID copy, "Enter the Void" glowing CTA button, "Learn more" expandable section, cosmic stars + floating VOID logo animation
- **Draggable VoidSage orb**: position persisted in localStorage, drag anywhere on screen
- **Single upvote enforcement**: per-user vote set stored in localStorage + backend upvote dedup (track by channel+messageId+voidId)
- **Bookmark/save post**: heart icon on every room post → saved to localStorage per user; bookmarks view in Profile
- **Delete own posts**: trash icon visible only on user's own messages; calls backend deleteMessage
- **Cosmic Handle as primary in all lists**: DM list, group list, search results always show handle first
- **Tap Cosmic Handle → profile card**: profile card modal with photo, bio, Wisdom Score, Polarity Garden preview, "Start DM" button
- **Green E2EE dot**: on every chat header and room header
- **Empty states**: exact — "Decrypting the void…" in rooms, "Sealed wisdom" purple lock icon with glowing star avatar
- **Hashtag chips dedup**: render each keyword chip exactly once per room
- **Notification permission toggle**: in Profile settings, persisted in localStorage
- **Admin portal upgrades**: live user list with last-active timestamp, one-click delete with confirm dialog, newsletter send to opted-in users, bookmarks + reports view
- **Backend**: `deleteMessage`, `upvoteMessageOnce` (dedup by voidId), `reportMessage` endpoints; `userBookmarks` map; `userLastActive` timestamp tracking
- **Star dust**: 80 persistent tiny gold particles floating upward on every screen in CosmicBackground

### Modify
- **SplashScreen**: replace current with full landing page hero (keep cosmic bg, add hero text, CTA, learn more)
- **VoidSage**: make orb draggable via pointer events, persist position
- **CosmicBackground**: add star dust layer (80 upward-floating gold particles)
- **Message E2EE**: fix channel-shared key derivation so all participants decrypt correctly; display green E2EE dot in headers
- **LightRoom/DarkRoom**: deduplicate keyword chips; add bookmark heart icon; add delete (own posts only); add single-upvote logic
- **DMList**: Cosmic Handle as big bold title, VOID ID as tiny gray subtitle; tapping handle opens profile card modal
- **ProfileSettings**: add Notification permission toggle, bookmarks section showing saved posts
- **Navigation**: ensure Creator Portal crown badge only shows for admin users
- **MiningPage**: keep as-is, minor polish
- **NFTMarketplace**: keep as-is

### Remove
- Nothing removed; only additions and fixes

## Implementation Plan
1. Update Motoko backend: add `deleteMessage`, `upvoteMessageOnce`, `reportMessage`, `getUserLastActive`, `setUserLastActive`, `getBookmarks`, `saveBookmark`, `removeBookmark` endpoints; add `lastActive` map; add `upvoteRegistry` map for dedup; add `bookmarks` map
2. Update `backend.d.ts` with new method signatures
3. Rebuild `SplashScreen.tsx` as full landing page hero with child-friendly copy and "Enter the Void" / "Learn more" sections
4. Update `CosmicBackground.tsx`: add star dust (80 upward-floating gold particles) using canvas or absolute-positioned divs
5. Make `VoidSage.tsx` draggable with pointer events + localStorage position persistence
6. Fix `ChatView.tsx` / `DMView.tsx` E2EE: ensure channel-shared key is derived consistently so all participants can decrypt
7. Update `LightRoom.tsx` and `DarkRoom.tsx`: deduplicate keyword chips, add bookmark heart, add delete (own only), single-upvote from localStorage
8. Update `DMList.tsx`: Cosmic Handle bold title, VOID ID subtitle, tap → profile card modal
9. Update `ProfileSettings.tsx`: notification toggle, bookmarks section
10. Upgrade `CreatorPortal.tsx`: live user list with last-active, one-click delete with confirm, newsletter send UI, bookmark/report view
11. Add `UserProfileCard.tsx` modal (already exists — ensure full fields including Polarity Garden preview and Start DM button)
12. Add green E2EE dot component and apply to all room/chat headers
13. Deploy
