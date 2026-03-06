# VOID — Cosmic Spiritual Sanctuary v17

## Current State
Fresh build from scratch. No existing frontend or backend code.

## Requested Changes (Diff)

### Add

**Backend — 5 Motoko Canisters:**

1. **UserCanister** — stable HashMap (principal → UserProfile)
   - Fields: voidId, cosmicHandle (unique), bio, avatar (Blob), wisdomScore, lastActive, e2eePublicKey, pushSubscription (optional)
   - Functions: registerUser, claimCosmicHandle (uniqueness enforced), updateProfile, getProfile, storePublicKey, storePushSubscription, updateLastActive, bookmarkPost, removeBookmark, getBookmarks

2. **RoomCanister** — two stable HashMaps: lightMessages + darkMessages (messageId → Message)
   - Message type: id, senderVoidId, senderHandle, text, image(?Blob), video(?Blob), timestamp, upvotes, isDeleted, threadReplies([Nat])
   - Functions: postMessage, getMessages(channel, page), toggleUpvote, deleteMessage (owner only), replyToMessage, uploadChunk

3. **PrivateChatCanister** — stable HashMap (chatId → [EncryptedMessage])
   - chatId format: "dm_voidId1_voidId2" or "group_xxx"
   - EncryptedMessage: chatId, senderVoidId, encryptedBlob, nonce, tag, timestamp, metadata
   - Functions: sendEncryptedMessage, getMessages(chatId), markChatRead, getUnreadCount, notifyRecipients, getChatsForUser

4. **NFTCanister** — ICRC-7 + royalty extension
   - Fields: tokenId, owner, creator, metadata, price, royaltyPercent(3%), adminRoyalty(1%), transferHistory
   - Functions: mint (500+ WS), transfer (auto-deduct royalties), listForSale, buy, getTokens, getTokenById

5. **AdminCanister** — founder code hash, moderation, active users
   - Functions: storeFounderCodeHash, verifyFounderCode, getActiveUsers, moderateMessage, deleteAccount, getDailyReflection, setDailyReflection, sendNewsletter, getModerationFlags

**Frontend — Vite + React + TypeScript + Tailwind + Framer Motion:**

- Landing page (cosmic, pre-login)
- Internet Identity login flow
- VOID ID auto-generation + Cosmic Handle claim prompt
- Bottom nav: Sun (Light Room), Moon (Dark Room), Speech Bubble (Messages + badge), Lightning (Mining), Person (Profile)
- Hamburger drawer: NFT Marketplace, invite, bookmarks, founder/creator portal
- Light Room — Reddit-style threaded posts, 5 hashtags, upvote, bookmark, delete, media upload
- Dark Room — same as Light Room with dark theme variant
- Messages — chat list, DM chat, group chat, E2EE per-pair key exchange, gold/purple bubbles, typing indicators, read receipts
- NFT Marketplace — gallery, filters, mint, buy, lineage history
- Mining page — teaser UI with wisdom score progress
- Profile — avatar, bio, E2EE fingerprint, bookmarks, notifications toggle, Polarity Garden, founder mode section
- Creator Portal — live users, moderation, daily reflection editor, newsletter
- VOID Sage — draggable glowing orb, E2EE chat, Grok+Sadhguru wisdom
- Global cosmic canvas: 160 stars + shooting stars + nebula blobs
- RoomStarDust: 40 extra golden particles in rooms/chats
- Gold dust send explosion: 25-particle canvas overlay, 800ms
- Service Worker + Web Push (VAPID) for notifications
- PWA manifest + offline cache

### Modify
- Nothing (fresh build)

### Remove
- Nothing (fresh build)

## Implementation Plan

1. Generate 5 Motoko canisters with all types, stable variables, functions, and guards
2. Build frontend scaffolding: Vite + React + TypeScript + Tailwind + Framer Motion
3. Implement CosmicCanvas (stars, nebula, shooting stars) as global background layer
4. Build Landing page with cosmic hero, CTA, "Learn more" section
5. Build auth flow: Internet Identity login, VOID ID generation, Cosmic Handle claim
6. Build AppShell: bottom nav (mobile), left sidebar (desktop), hamburger drawer
7. Build Light Room + Dark Room with Reddit-style threading, upvotes, bookmarks, media upload
8. Build Messages: chat list, E2EE DM chat, group chat, bubbles, typing indicator, read receipts
9. Build NFT Marketplace: gallery, mint, buy, royalty display
10. Build Mining page teaser
11. Build Profile: avatar, bio, bookmarks, notifications, Polarity Garden, Founder Mode
12. Build Creator Portal (founder-only)
13. Build VOID Sage draggable orb + chat
14. Implement Service Worker + Push notification subscription
15. Wire all backend actor calls to frontend
16. Apply deterministic data-ocid markers throughout
17. Validate, fix errors, and deploy
