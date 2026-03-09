import Text "mo:core/Text";
import Float "mo:core/Float";
import Iter "mo:core/Iter";
import Order "mo:core/Order";
import Map "mo:core/Map";
import Runtime "mo:core/Runtime";

actor {
  // Point Type and Auto-Increment
  type Point = {
    id : Nat;
    name : Text;
    x : Float;
    y : Float;
  };

  module Point {
    public func compare(point1 : Point, point2 : Point) : Order.Order {
      Float.compare(point1.x, point2.x);
    };

    public func compareByY(point1 : Point, point2 : Point) : Order.Order {
      Float.compare(point1.y, point2.y);
    };

    public func compareById(point1 : Point, point2 : Point) : Order.Order {
      Nat.compare(point1.id, point2.id);
    };
  };

  var nextPointId = 0;
  func getNextPointId() : Nat {
    let id = nextPointId;
    nextPointId += 1;
    id;
  };

  // Region Type and Auto-Increment
  type Region = {
    id : Nat;
    name : Text;
    x : Float;
    y : Float;
    width : Float;
    height : Float;
  };

  module Region {
    public func compare(region1 : Region, region2 : Region) : Order.Order {
      Float.compare(region1.x, region2.x);
    };

    public func compareByY(region1 : Region, region2 : Region) : Order.Order {
      Float.compare(region1.y, region2.y);
    };

    public func compareById(region1 : Region, region2 : Region) : Order.Order {
      Nat.compare(region1.id, region2.id);
    };
  };

  var nextRegionId = 0;
  func getNextRegionId() : Nat {
    let id = nextRegionId;
    nextRegionId += 1;
    id;
  };

  // Persistent Storage
  let points = Map.empty<Nat, Point>();
  let regions = Map.empty<Nat, Region>();

  // Point Management
  public shared ({ caller }) func addPoint(name : Text, x : Float, y : Float) : async Nat {
    let id = getNextPointId();
    let point : Point = { id; name; x; y };
    points.add(id, point);
    id;
  };

  public query ({ caller }) func getPoints() : async [Point] {
    points.values().toArray().sort(Point.compareById);
  };

  public shared ({ caller }) func deletePoint(id : Nat) : async () {
    if (not points.containsKey(id)) {
      Runtime.trap("Point does not exist");
    };
    points.remove(id);
  };

  // Region Management
  public shared ({ caller }) func addRegion(
    name : Text,
    x : Float,
    y : Float,
    width : Float,
    height : Float,
  ) : async Nat {
    let id = getNextRegionId();
    let region : Region = { id; name; x; y; width; height };
    regions.add(id, region);
    id;
  };

  public query ({ caller }) func getRegions() : async [Region] {
    regions.values().toArray().sort(Region.compareById);
  };

  public shared ({ caller }) func deleteRegion(id : Nat) : async () {
    if (not regions.containsKey(id)) {
      Runtime.trap("Region does not exist");
    };
    regions.remove(id);
  };
};
