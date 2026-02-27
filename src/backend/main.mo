import List "mo:core/List";
import Map "mo:core/Map";
import Int "mo:core/Int";
import Text "mo:core/Text";
import Array "mo:core/Array";
import Iter "mo:core/Iter";
import Time "mo:core/Time";
import Runtime "mo:core/Runtime";
import Principal "mo:core/Principal";
import Order "mo:core/Order";
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

  // Persistent state
  let principalProfiles = Map.empty<Principal, UserProfile>();
  let voidIdToPrincipal = Map.empty<Text, Principal>();
  let rooms = Map.empty<Text, Room>();
  let inviteTokens = Map.empty<Text, Text>();
  let blobs = Map.empty<Text, Storage.ExternalBlob>();
  let groups = Map.empty<Text, GroupInfo>();

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

  public query ({ caller }) func getCosmicHandle(voidId : Text) : async ?Text {
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

  public query ({ caller }) func getWisdomScore(voidId : Text) : async Nat {
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

    // Auto-register caller's voidId if it's one of the two provided and not already registered
    let voidId1Owner = voidIdToPrincipal.get(voidId1);
    let voidId2Owner = voidIdToPrincipal.get(voidId2);

    // Register voidId1 if caller should own it and it's not registered
    switch (voidId1Owner) {
      case (null) {
        // Not registered, so register it to caller
        voidIdToPrincipal.add(voidId1, caller);
      };
      case (?owner) {
        // Already registered, verify ownership if caller claims it
        // (no action needed, just let it be)
      };
    };

    // Register voidId2 if caller should own it and it's not registered
    switch (voidId2Owner) {
      case (null) {
        // Not registered, so register it to caller
        voidIdToPrincipal.add(voidId2, caller);
      };
      case (?owner) {
        // Already registered
        // (no action needed, just let it be)
      };
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

    switch (voidIdToPrincipal.get(voidId)) {
      case (?owner) {
        if (owner != caller) {
          Runtime.trap("Unauthorized: Cannot generate token for another user's VOID ID");
        };
      };
      case (null) {
        Runtime.trap("Unauthorized: VOID ID not registered to any user");
      };
    };

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

  public query ({ caller }) func resolveInviteToken(token : Text) : async ?Text {
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

  public query ({ caller }) func getDailyReflection() : async ?Text {
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

  public query ({ caller }) func getPinnedMessage(channel : Text) : async ?Message {
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

    // Verify caller owns the creatorVoidId
    checkUserOwnership(caller, creatorVoidId);

    let groupId = "GROUP-" # Time.now().toText();
    let members = [creatorVoidId]; // Only creator in members

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

    // Store both groupInfo and corresponding Room
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
        // Verify caller is either the creator or an existing member
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

        // Check if member is already in group
        let alreadyMember = group.members.any(func(m) { m == memberVoidId });
        if (alreadyMember) {
          return (); // Already member, do nothing
        };

        let newMembers = group.members.concat([memberVoidId]);
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
};
