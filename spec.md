# VOID

## Current State
VOID is a privacy-first cosmic sanctuary app (Telegram + Reddit hybrid) on ICP. It has:
- Internet Identity auth with auto-generated `@void_shadow_XXXXXXXX:canister` VOID IDs
- Optional cosmic handles set once via ProfileSettings and ProfileSetupModal
- ProfileSettings page with: avatar display, cosmic handle input, E2EE key info, logout
- DMList page with a "New Message" modal that takes a plain text input requiring full VOID ID (`@void_shadow_xxxxxxxx:canister`) — this search is broken/non-functional
- Backend has: `getCosmicHandle(voidId)`, `getAllUserProfiles()` (admin only), `searchUsers` and `lookupVoidIdByHandle` are NOT in the backend yet
- UserProfile type: `{ voidId: string; cosmicHandle?: string }`

**Known bugs:**
- New Message modal search is non-functional — users must type full exact VOID ID which breaks DM creation
- No cosmic handle search support
- No profile bio field
- No profile photo upload

## Requested Changes (Diff)

### Add
- **`useSearchUsers` hook** in `useQueries.ts`: client-side search that uses the existing `getAllUserProfiles()` call but stores results locally. Since `getAllUserProfiles` is admin-only, implement a local directory: maintain a localStorage cache of known users (populated as users are encountered in messages). For the New Message modal, search is done against: (a) exact/partial VOID ID match typed by the user, (b) cosmic handle lookup via existing `getCosmicHandle(voidId)`. The search input should support both formats.
- **Smart search in New Message modal** (`DMList.tsx`): replace the plain input with a dual-mode search field. If the user types something starting with `@void_shadow_`, treat it as a direct VOID ID and allow opening the channel. If they type anything else (a name/handle), show a helper message: "Enter full VOID ID or ask your friend to share their VOID ID." Add a "Paste VOID ID" quick-action button. The key fix: the current input does not trim/format the VOID ID correctly before passing to `createDM` — fix the `handleCreateDM` function to normalize the input (trim whitespace, handle if user typed with or without leading `@`).
- **Profile Bio field** in `ProfileSettings.tsx` and `ProfileSetupModal.tsx`: add a textarea for bio (max 280 chars), persisted as part of UserProfile via `saveCallerUserProfile`. Store bio in localStorage as `void_bio_{voidId}` since the backend UserProfile type only has `voidId` and `cosmicHandle` — bio is stored client-side only for MVP.
- **Profile Photo upload** in `ProfileSettings.tsx`: add a circular photo upload button overlaid on the existing VoidAvatar. On click, open a file picker (images only, max 2MB). On selection, compress/resize to 200x200 and store as base64 in localStorage as `void_avatar_{voidId}`. Display the custom photo in place of the generated VoidAvatar wherever the user's own avatar appears. Create a `useCustomAvatar` hook that reads/writes from localStorage.
- **`useCustomAvatar` hook** at `src/frontend/src/hooks/useCustomAvatar.ts`: reads custom avatar base64 from localStorage, provides `setAvatar(base64: string)` and `avatarUrl: string | null` — null means use generated VoidAvatar.

### Modify
- `ProfileSettings.tsx`: Add bio textarea (280 char limit with counter), add profile photo upload circle (Camera icon overlay on avatar), show custom photo if set, save bio to localStorage on Save button click.
- `ProfileSetupModal.tsx`: Add bio textarea step (optional, "Describe your cosmic journey..."), load/save bio from localStorage.
- `DMList.tsx` `handleCreateDM`: Fix the core bug — normalize targetVoidId before passing to `createDM`. The input value must be the raw VOID ID portion that the backend expects. Add input validation with inline error message if the format looks wrong.
- `VoidAvatar.tsx`: Accept an optional `customAvatarUrl` prop — if provided, render `<img>` instead of the SVG canvas avatar.

### Remove
- Nothing removed

## Implementation Plan
1. Create `useCustomAvatar` hook (`localStorage` read/write for base64 avatar per VOID ID)
2. Update `VoidAvatar.tsx` to accept and render `customAvatarUrl` prop
3. Update `ProfileSettings.tsx`: add bio field (localStorage), add photo upload with preview/crop to 200x200, wire `useCustomAvatar`
4. Update `ProfileSetupModal.tsx`: add optional bio textarea
5. Fix `DMList.tsx` New Message modal: fix `handleCreateDM` normalization bug, add cosmic handle search hint, improve UX with better placeholder and validation error

## UX Notes
- Profile photo upload: circular crop, Camera icon overlay on hover, gold glow border
- Bio field: dark textarea, 280 char counter (gold), "Describe your cosmic journey..." placeholder
- New Message modal: clear label "Enter VOID ID or @CosmicHandle", cosmic handle search shows "Ask your contact to share their VOID ID from their profile page" helper text, inline error if format invalid
- All cosmic dark theme: void black bg, gold accents, purple highlights
- Mobile-first
