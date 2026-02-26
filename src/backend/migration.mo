import Map "mo:core/Map";
import Principal "mo:core/Principal";
import List "mo:core/List";
import Text "mo:core/Text";
import Nat "mo:core/Nat";
import Int "mo:core/Int";
import Storage "blob-storage/Storage";

module {
  type OldMessage = {
    id : Text;
    ciphertext : Text;
    senderVoidId : Text;
    timestamp : Int;
    messageType : { #text; #image; #file };
    replyTo : ?Text;
    blobId : ?Text;
  };

  type OldUserProfile = {
    voidId : Text;
    cosmicHandle : ?Text;
  };

  type OldRoom = {
    messages : List.List<OldMessage>;
    lastActive : Int;
  };

  type OldActor = {
    principalProfiles : Map.Map<Principal, OldUserProfile>;
    voidIdToPrincipal : Map.Map<Text, Principal>;
    rooms : Map.Map<Text, OldRoom>;
    blobs : Map.Map<Text, Storage.ExternalBlob>;
  };

  type NewMessage = {
    id : Text;
    ciphertext : Text;
    senderVoidId : Text;
    timestamp : Int;
    messageType : { #text; #image; #file };
    replyTo : ?Text;
    blobId : ?Text;
    keywords : [Text];
    upvotes : Nat;
  };

  type NewUserProfile = {
    voidId : Text;
    cosmicHandle : ?Text;
  };

  type NewRoom = {
    messages : List.List<NewMessage>;
    lastActive : Int;
  };

  type NewActor = {
    principalProfiles : Map.Map<Principal, NewUserProfile>;
    voidIdToPrincipal : Map.Map<Text, Principal>;
    rooms : Map.Map<Text, NewRoom>;
    inviteTokens : Map.Map<Text, Text>;
    blobs : Map.Map<Text, Storage.ExternalBlob>;
  };

  public func run(old : OldActor) : NewActor {
    let newRooms = old.rooms.map<Text, OldRoom, NewRoom>(
      func(_channel, oldRoom) {
        let newMessages = oldRoom.messages.map<OldMessage, NewMessage>(
          func(oldMsg) {
            { oldMsg with keywords = []; upvotes = 0 };
          }
        );
        { oldRoom with messages = newMessages };
      }
    );
    {
      old with
      rooms = newRooms;
      inviteTokens = Map.empty<Text, Text>();
    };
  };
};
