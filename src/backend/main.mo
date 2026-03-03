import Map "mo:core/Map";
import Text "mo:core/Text";
import Array "mo:core/Array";
import List "mo:core/List";
import Blob "mo:core/Blob";
import Time "mo:core/Time";
import Order "mo:core/Order";
import Iter "mo:core/Iter";
import Principal "mo:core/Principal";
import Runtime "mo:core/Runtime";

import Int "mo:core/Int";
import Nat "mo:core/Nat";

import Storage "blob-storage/Storage";
import MixinAuthorization "authorization/MixinAuthorization";
import AccessControl "authorization/access-control";
import MixinStorage "blob-storage/Mixin";


actor {
  include MixinStorage();

  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);

  public type MessageType = {
    #text;
    #image;
    #file;
  };

  public type Message = {
    id : Text;
    ciphertext : Text;
    senderVoidId : Text;
    timestamp : Int;
    messageType : MessageType;
    replyTo : ?Text;
    blobId : ?Text;
    keywords : [Text];
    upvotes : Nat;
  };

  public type Room = {
    messages : List.List<Message>;
    lastActive : Int;
  };

  public type UserProfile = {
    voidId : Text;
    cosmicHandle : ?Text;
  };

  public type ChannelType = {
    #lightRoom;
    #darkRoom;
    #dm : Text;
    #group : Text;
  };

  public type GroupInfo = {
    id : Text;
    name : Text;
    members : [Text];
    createdBy : Text;
    createdAt : Int;
  };

  public type NFTCategory = {
    #lightWisdom;
    #deepShadow;
    #guidedBreathwork;
    #sageReflection;
  };

  public type CosmicNFT = {
    id : Nat;
    creator : Principal;
    creatorVoidId : Text;
    postText : Text;
    wisdomScore : Nat;
    mintedAt : Int;
    metadataJson : Text;
    isForSale : Bool;
    priceVoid : Nat;
    category : NFTCategory;
    resonanceCount : Nat;
    lineage : [Text];
    rareTrait : ?Text;
  };

  public type OfferingType = {
    #oneOnOne;
    #breathwork;
    #art;
    #wisdom;
  };

  public type ValueOffering = {
    id : Text;
    creatorVoidId : Text;
    title : Text;
    description : Text;
    priceVoid : Nat;
    offeringType : OfferingType;
    isActive : Bool;
    createdAt : Int;
  };

  // Persistent state
  let principalProfiles = Map.empty<Principal, UserProfile>();
  let voidIdToPrincipal = Map.empty<Text, Principal>();
  let rooms = Map.empty<Text, Room>();
  let inviteTokens = Map.empty<Text, Text>();
  let blobs = Map.empty<Text, Storage.ExternalBlob>();
  let groups = Map.empty<Text, GroupInfo>();

  // NFT state
  var nftCounter : Nat = 0;
  let nfts = Map.empty<Nat, CosmicNFT>();
  let nftOwnership = Map.empty<Nat, Principal>();
  let royaltiesEarned = Map.empty<Text, Nat>();

  // Value Offerings state
  var offeringCounter : Nat = 0;
  let valueOfferings = Map.empty<Text, ValueOffering>();

  // Creator Portal state
  var dailyReflection : ?Text = null;
  let pinnedMessages = Map.empty<Text, Text>();

  func generateMessageId() : Text {
    Time.now().toText();
  };

  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can get their profile");
    };
    principalProfiles.get(caller);
  };

  public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
    if (caller != user and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Can only view your own profile");
    };
    principalProfiles.get(user);
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can save profiles");
    };

    voidIdToPrincipal.add(profile.voidId, caller);
    principalProfiles.add(caller, profile);
  };

  public shared ({ caller }) func setCosmicHandle(voidId : Text, handle : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can set a cosmic handle");
    };

    switch (voidIdToPrincipal.get(voidId)) {
      case (?owner) {
        if (owner != caller) {
          Runtime.trap("Unauthorized: Cannot set handle for another user's VOID ID");
        };
      };
      case (null) {
        Runtime.trap("Unauthorized: VOID ID not registered to any user");
      };
    };

    let existingProfile = principalProfiles.get(caller);
    let updatedProfile : UserProfile = switch (existingProfile) {
      case (null) {
        { voidId; cosmicHandle = ?handle };
      };
      case (?p) {
        { voidId = p.voidId; cosmicHandle = ?handle };
      };
    };
    principalProfiles.add(caller, updatedProfile);
  };

  public query func getCosmicHandle(voidId : Text) : async ?Text {
    switch (voidIdToPrincipal.get(voidId)) {
      case (null) { null };
      case (?owner) {
        switch (principalProfiles.get(owner)) {
          case (null) { null };
          case (?profile) { profile.cosmicHandle };
        };
      };
    };
  };

  func checkUserOwnership(caller : Principal, voidId : Text) {
    switch (voidIdToPrincipal.get(voidId)) {
      case (?owner) {
        if (owner != caller) {
          Runtime.trap("Unauthorized: You do not own this VOID ID");
        };
      };
      case (null) {
        Runtime.trap("Unauthorized: VOID ID not registered");
      };
    };
  };

  func updateRoom(channel : Text, message : Message) {
    let messages = switch (rooms.get(channel)) {
      case (null) { List.empty<Message>() };
      case (?room) { room.messages };
    };

    messages.add(message);
    let updatedRoom : Room = {
      messages;
      lastActive = Time.now();
    };

    rooms.add(channel, updatedRoom);
  };

  func filterByKeyword(messages : [Message], keyword : Text) : [Message] {
    messages.filter(
      func(msg) {
        msg.keywords.any(
          func(k) { k.toUpper().contains(#text(keyword.toUpper())) }
        );
      }
    );
  };

  public shared ({ caller }) func postMessage(
    channel : Text,
    ciphertext : Text,
    senderVoidId : Text,
    messageType : MessageType,
    replyTo : ?Text,
    blobId : ?Text,
  ) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can post messages");
    };

    checkUserOwnership(caller, senderVoidId);

    let message : Message = {
      id = generateMessageId();
      ciphertext;
      senderVoidId;
      timestamp = Time.now();
      messageType;
      replyTo;
      blobId;
      keywords = [];
      upvotes = 0;
    };

    updateRoom(channel, message);
  };

  public shared ({ caller }) func postMessageWithKeywords(
    channel : Text,
    ciphertext : Text,
    senderVoidId : Text,
    messageType : MessageType,
    replyTo : ?Text,
    blobId : ?Text,
    keywords : [Text],
  ) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can post messages");
    };

    checkUserOwnership(caller, senderVoidId);

    let message : Message = {
      id = generateMessageId();
      ciphertext;
      senderVoidId;
      timestamp = Time.now();
      messageType;
      replyTo;
      blobId;
      keywords = keywords.sliceToArray(0, if (keywords.size() > 5) { 5 } else { keywords.size() });
      upvotes = 0;
    };

    updateRoom(channel, message);
  };

  public query ({ caller }) func getMessages(channel : Text, count : Nat) : async [Message] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can read messages");
    };

    switch (rooms.get(channel)) {
      case (null) { [] };
      case (?room) { room.messages.sliceToArray(0, count) };
    };
  };

  public query ({ caller }) func loadOlderMessages(channel : Text, start : Int, count : Nat) : async [Message] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can load messages");
    };
    if (start < 0) { return [] };
    let s = Int.abs(start);
    switch (rooms.get(channel)) {
      case (null) { [] };
      case (?room) {
        let messages = room.messages.toArray();
        let end = if (s + count >= messages.size()) {
          messages.size();
        } else {
          s + count;
        };
        messages.sliceToArray(s, end);
      };
    };
  };

  public query ({ caller }) func getMessagesByKeyword(channel : Text, keyword : Text, count : Nat) : async [Message] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can search messages by keyword");
    };
    let messages = switch (rooms.get(channel)) {
      case (null) { [] };
      case (?room) { room.messages.toArray() };
    };
    let filtered = filterByKeyword(messages, keyword);
    filtered.sliceToArray(0, count);
  };

  public shared ({ caller }) func upvoteMessage(channel : Text, messageId : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can upvote messages");
    };

    switch (rooms.get(channel)) {
      case (null) {
        Runtime.trap("Channel not found");
      };
      case (?room) {
        let messages = room.messages.toArray();
        let updatedMessages = messages.map(
          func(msg) {
            if (msg.id == messageId) { { msg with upvotes = msg.upvotes + 1 } } else { msg };
          }
        );

        let messageList = List.empty<Message>();
        for (msg in updatedMessages.values()) { messageList.add(msg) };

        let updatedRoom : Room = { messages = messageList; lastActive = room.lastActive };
        rooms.add(channel, updatedRoom);
      };
    };
  };

  public query func getWisdomScore(voidId : Text) : async Nat {
    let messages = List.empty<Message>();

    for ((_, room) in rooms.entries()) {
      let roomMessages = room.messages.toArray();
      for (msg in roomMessages.values()) {
        if (msg.senderVoidId == voidId) {
          messages.add(msg);
        };
      };
    };

    let allMessages = messages.values();
    var totalUpvotes = 0;
    for (msg in allMessages) { totalUpvotes += msg.upvotes };
    totalUpvotes;
  };

  public query ({ caller }) func listChannels() : async [ChannelType] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can list channels");
    };

    let channelTypes = List.empty<ChannelType>();

    channelTypes.add(#lightRoom);
    channelTypes.add(#darkRoom);

    for ((channel, _) in rooms.entries()) {
      if (channel.startsWith(#text("DM-"))) {
        channelTypes.add(#dm(channel));
      } else if (channel.startsWith(#text("GROUP-"))) {
        channelTypes.add(#group(channel));
      };
    };

    channelTypes.toArray();
  };

  public query ({ caller }) func getSortedDMs() : async [ChannelType] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can list DMs");
    };

    let dmEntries = List.empty<{ channel : Text; lastActive : Int }>();

    for ((channel, room) in rooms.entries()) {
      if (channel.startsWith(#text("DM-"))) {
        dmEntries.add({ channel; lastActive = room.lastActive });
      };
    };

    let sorted = dmEntries.toArray().sort(
      func(a, b) { Int.compare(b.lastActive, a.lastActive) }
    );

    sorted.map(func(entry) { #dm(entry.channel) });
  };

  public shared ({ caller }) func createDM(voidId1 : Text, voidId2 : Text) : async Text {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can create DM channels");
    };

    // Verify caller owns at least one of the VOID IDs
    let ownsVoidId1 = switch (voidIdToPrincipal.get(voidId1)) {
      case (?owner) { owner == caller };
      case (null) { false };
    };

    let ownsVoidId2 = switch (voidIdToPrincipal.get(voidId2)) {
      case (?owner) { owner == caller };
      case (null) { false };
    };

    if (not (ownsVoidId1 or ownsVoidId2)) {
      Runtime.trap("Unauthorized: You must own at least one of the VOID IDs to create a DM");
    };

    let channelId = createDMChannelId(voidId1, voidId2);

    switch (rooms.get(channelId)) {
      case (null) {
        let newRoom : Room = { messages = List.empty<Message>(); lastActive = Time.now() };
        rooms.add(channelId, newRoom);
      };
      case (?_) {};
    };

    channelId;
  };

  public shared ({ caller }) func associateBlobWithMessage(blobId : Text, messageId : Text, channel : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can associate blobs");
    };

    switch (rooms.get(channel)) {
      case (null) { Runtime.trap("Channel not found") };
      case (?room) {
        let messages = room.messages.toArray();
        let updatedMessages = messages.map(
          func(msg) {
            if (msg.id == messageId) { { msg with blobId = ?blobId } } else { msg };
          }
        );

        let messageList = List.empty<Message>();
        for (msg in updatedMessages.values()) { messageList.add(msg) };

        let updatedRoom : Room = { messages = messageList; lastActive = room.lastActive };
        rooms.add(channel, updatedRoom);
      };
    };
  };

  public shared ({ caller }) func generateInviteToken(voidId : Text) : async Text {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can generate invite tokens");
    };

    checkUserOwnership(caller, voidId);

    let alphabet : [Char] = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789".toArray();
    let tokenChars = List.empty<Char>();
    for (i in Nat.range(0, 16)) {
      let index = i % 62;
      tokenChars.add(alphabet[index]);
    };

    let token = tokenChars.toArray();
    let tokenText = token.toText();

    inviteTokens.add(tokenText, voidId);
    tokenText;
  };

  public query func resolveInviteToken(token : Text) : async ?Text {
    inviteTokens.get(token);
  };

  func createDMChannelId(voidId1 : Text, voidId2 : Text) : Text {
    let prefix = "DM-";
    if (voidId1 < voidId2) {
      prefix # voidId1 # "_" # voidId2;
    } else {
      prefix # voidId2 # "_" # voidId1;
    };
  };

  // Daily Reflection
  public shared ({ caller }) func setDailyReflection(text : Text) : async () {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only admins can set daily reflection");
    };
    dailyReflection := ?text;
  };

  public query func getDailyReflection() : async ?Text {
    dailyReflection;
  };

  // User Directory
  public query ({ caller }) func getAllUserProfiles() : async [UserProfile] {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only admins can get all user profiles");
    };
    principalProfiles.values().toArray();
  };

  // Pinned Messages
  public shared ({ caller }) func pinMessage(channel : Text, messageId : Text) : async () {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only admins can pin messages");
    };
    pinnedMessages.add(channel, messageId);
  };

  public query func getPinnedMessage(channel : Text) : async ?Message {
    switch (pinnedMessages.get(channel)) {
      case (null) { null };
      case (?messageId) {
        switch (rooms.get(channel)) {
          case (null) { null };
          case (?room) {
            let messages = room.messages.toArray();
            messages.find(func(msg) { msg.id == messageId });
          };
        };
      };
    };
  };

  // Group Chat Functions

  public shared ({ caller }) func createGroup(name : Text, creatorVoidId : Text) : async Text {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can create groups");
    };

    checkUserOwnership(caller, creatorVoidId);

    let groupId = "GROUP-" # Time.now().toText();
    let members = [creatorVoidId];

    let groupInfo : GroupInfo = {
      id = groupId;
      name;
      members;
      createdBy = creatorVoidId;
      createdAt = Time.now();
    };

    let newRoom : Room = {
      messages = List.empty<Message>();
      lastActive = Time.now();
    };

    groups.add(groupId, groupInfo);
    rooms.add(groupId, newRoom);

    groupId;
  };

  public shared ({ caller }) func addGroupMember(groupId : Text, memberVoidId : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can add group members");
    };

    switch (groups.get(groupId)) {
      case (null) {
        Runtime.trap("Group not found");
      };
      case (?group) {
        let callerProfile = principalProfiles.get(caller);
        let callerVoidId = switch (callerProfile) {
          case (null) { "" };
          case (?profile) { profile.voidId };
        };

        let isCreator = group.createdBy == callerVoidId;
        let isMember = group.members.any(func(m) { m == callerVoidId });

        if (not (isCreator or isMember)) {
          Runtime.trap("Unauthorized: Only group creator or members can add new members");
        };

        let alreadyMember = group.members.any(func(m) { m == memberVoidId });
        if (alreadyMember) {
          return ();
        };

        let newMembers = group.members.concat([memberVoidId]);
        let updatedGroup : GroupInfo = { group with members = newMembers };
        groups.add(groupId, updatedGroup);
      };
    };
  };

  public shared ({ caller }) func removeGroupMember(groupId : Text, memberVoidId : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can remove group members");
    };

    switch (groups.get(groupId)) {
      case (null) {
        Runtime.trap("Group not found");
      };
      case (?group) {
        let callerProfile = principalProfiles.get(caller);
        let callerVoidId = switch (callerProfile) {
          case (null) { "" };
          case (?profile) { profile.voidId };
        };

        if (group.createdBy != callerVoidId) {
          Runtime.trap("Unauthorized: Only group creator can remove members");
        };

        let newMembers = group.members.filter(func(m) { m != memberVoidId });
        let updatedGroup : GroupInfo = { group with members = newMembers };
        groups.add(groupId, updatedGroup);
      };
    };
  };

  public query ({ caller }) func getGroupInfo(groupId : Text) : async ?GroupInfo {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can get group info");
    };
    groups.get(groupId);
  };

  public query ({ caller }) func getGroupsForVoidId(voidId : Text) : async [GroupInfo] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can get groups for a VOID ID");
    };

    let matchingGroups = List.empty<GroupInfo>();
    for ((_, group) in groups.entries()) {
      let isMember = group.members.any(func(m) { m == voidId });
      if (isMember) {
        matchingGroups.add(group);
      };
    };
    matchingGroups.toArray();
  };

  public query ({ caller }) func getAllGroups() : async [GroupInfo] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can get all groups");
    };
    groups.values().toArray();
  };

  // NFT Marketplace Functions

  public shared ({ caller }) func mintNFT(
    postText : Text,
    wisdomScore : Nat,
    metadataJson : Text,
    category : NFTCategory,
    creatorVoidId : Text,
    rareTrait : ?Text,
  ) : async Nat {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can mint NFTs");
    };

    checkUserOwnership(caller, creatorVoidId);

    if (wisdomScore < 500) {
      Runtime.trap("Insufficient wisdom score: Must have at least 500 to mint NFT");
    };

    let nftId = nftCounter;
    nftCounter += 1;

    let nft : CosmicNFT = {
      id = nftId;
      creator = caller;
      creatorVoidId;
      postText;
      wisdomScore;
      mintedAt = Time.now();
      metadataJson;
      isForSale = false;
      priceVoid = 0;
      category;
      resonanceCount = 0;
      lineage = [];
      rareTrait;
    };

    nfts.add(nftId, nft);
    nftOwnership.add(nftId, caller);

    nftId;
  };

  public shared ({ caller }) func listNFTForSale(nftId : Nat, priceVoid : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can list NFTs for sale");
    };

    switch (nftOwnership.get(nftId)) {
      case (?owner) {
        if (owner != caller) {
          Runtime.trap("Unauthorized: You do not own this NFT");
        };
      };
      case (null) {
        Runtime.trap("NFT not found");
      };
    };

    switch (nfts.get(nftId)) {
      case (?nft) {
        let updatedNFT : CosmicNFT = {
          nft with
          isForSale = true;
          priceVoid;
        };
        nfts.add(nftId, updatedNFT);
      };
      case (null) {
        Runtime.trap("NFT not found");
      };
    };
  };

  public shared ({ caller }) func buyNFT(nftId : Nat, buyerVoidId : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can buy NFTs");
    };

    checkUserOwnership(caller, buyerVoidId);

    switch (nfts.get(nftId)) {
      case (?nft) {
        if (not nft.isForSale) {
          Runtime.trap("NFT is not for sale");
        };

        let royalty = nft.priceVoid / 10;
        let currentRoyalties = switch (royaltiesEarned.get(nft.creatorVoidId)) {
          case (?amount) { amount };
          case (null) { 0 };
        };
        royaltiesEarned.add(nft.creatorVoidId, currentRoyalties + royalty);

        nftOwnership.add(nftId, caller);

        let updatedNFT : CosmicNFT = {
          nft with
          isForSale = false;
          priceVoid = 0;
        };
        nfts.add(nftId, updatedNFT);
      };
      case (null) {
        Runtime.trap("NFT not found");
      };
    };
  };

  public shared ({ caller }) func resonateNFT(nftId : Nat, resonatorVoidId : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can resonate with NFTs");
    };

    checkUserOwnership(caller, resonatorVoidId);

    switch (nfts.get(nftId)) {
      case (?nft) {
        let newLineage = nft.lineage.concat([resonatorVoidId]);
        let updatedNFT : CosmicNFT = {
          nft with
          resonanceCount = nft.resonanceCount + 1;
          lineage = newLineage;
        };
        nfts.add(nftId, updatedNFT);
      };
      case (null) {
        Runtime.trap("NFT not found");
      };
    };
  };

  public query func getNFT(nftId : Nat) : async ?CosmicNFT {
    nfts.get(nftId);
  };

  public query func getNFTsByCreator(creatorVoidId : Text) : async [CosmicNFT] {
    let creatorNFTs = List.empty<CosmicNFT>();
    for ((_, nft) in nfts.entries()) {
      if (nft.creatorVoidId == creatorVoidId) {
        creatorNFTs.add(nft);
      };
    };
    creatorNFTs.toArray();
  };

  public query func getMarketplaceListings(category : ?NFTCategory) : async [CosmicNFT] {
    let listings = List.empty<CosmicNFT>();
    for ((_, nft) in nfts.entries()) {
      let matchesCategory = switch (category) {
        case (null) { true };
        case (?cat) { nft.category == cat };
      };
      if (nft.isForSale and matchesCategory) {
        listings.add(nft);
      };
    };
    listings.toArray();
  };

  public query ({ caller }) func getUserNFTs(voidId : Text) : async [CosmicNFT] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can get user NFTs");
    };

    switch (voidIdToPrincipal.get(voidId)) {
      case (?owner) {
        let userNFTs = List.empty<CosmicNFT>();
        for ((nftId, nftOwner) in nftOwnership.entries()) {
          if (nftOwner == owner) {
            switch (nfts.get(nftId)) {
              case (?nft) { userNFTs.add(nft) };
              case (null) {};
            };
          };
        };
        userNFTs.toArray();
      };
      case (null) { [] };
    };
  };

  public query func getRoyaltiesEarned(voidId : Text) : async Nat {
    switch (royaltiesEarned.get(voidId)) {
      case (?amount) { amount };
      case (null) { 0 };
    };
  };

  public query func getMintablePost(wisdomScore : Nat) : async Bool {
    wisdomScore >= 500;
  };

  // Value Offerings Marketplace

  public shared ({ caller }) func createValueOffering(
    title : Text,
    description : Text,
    priceVoid : Nat,
    offeringType : OfferingType,
    creatorVoidId : Text,
  ) : async Text {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can create value offerings");
    };

    checkUserOwnership(caller, creatorVoidId);

    let offeringId = "OFFERING-" # offeringCounter.toText();
    offeringCounter += 1;

    let offering : ValueOffering = {
      id = offeringId;
      creatorVoidId;
      title;
      description;
      priceVoid;
      offeringType;
      isActive = true;
      createdAt = Time.now();
    };

    valueOfferings.add(offeringId, offering);
    offeringId;
  };

  public query func getValueOfferings() : async [ValueOffering] {
    let activeOfferings = List.empty<ValueOffering>();
    for ((_, offering) in valueOfferings.entries()) {
      if (offering.isActive) {
        activeOfferings.add(offering);
      };
    };
    activeOfferings.toArray();
  };

  public query func getOfferingsByCreator(creatorVoidId : Text) : async [ValueOffering] {
    let creatorOfferings = List.empty<ValueOffering>();
    for ((_, offering) in valueOfferings.entries()) {
      if (offering.creatorVoidId == creatorVoidId) {
        creatorOfferings.add(offering);
      };
    };
    creatorOfferings.toArray();
  };

  public shared ({ caller }) func deactivateOffering(offeringId : Text, callerVoidId : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can deactivate offerings");
    };

    checkUserOwnership(caller, callerVoidId);

    switch (valueOfferings.get(offeringId)) {
      case (?offering) {
        if (offering.creatorVoidId != callerVoidId) {
          Runtime.trap("Unauthorized: Only the creator can deactivate this offering");
        };

        let updatedOffering : ValueOffering = {
          offering with isActive = false;
        };
        valueOfferings.add(offeringId, updatedOffering);
      };
      case (null) {
        Runtime.trap("Offering not found");
      };
    };
  };
};
