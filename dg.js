/*
Distance graph

Distance graph is a graph designed for fast neighbor lookup.

Invariance: Each node maintains links to the closest node in any direction.
Thus, starting at any node, you can reach any other node by following the child closest to the destination node.
This makes it very fast to find all the neighbors in distance order.
Simply throw the chldren on a heap.
When you take them off the heap, if the node is close enough to keep, throw its unexamined children on the heap.
You will keep taking nodes off the heap in distance order.

insertion: From close starting nodes (more on this later), go to the closest node and add the new node as a child (if necessary).
Apportion the parent's chlldren to the new node as necessary.
If a node gets displaced, it's children may need to be displaced too, but I'm not sure of this.


Deletion: Make sure that the children can reach each other.


Nearest neighbors: Throw the unseen children on the heap.
Remove the closest. If you want to include it, throw its children on the heap.
Items come off the heap in sorted order.


Getting close starting nodes: use binary search trees keyed on x, on y, and on y=x.

*/

// utility function
function set(x1, x2, x3 /* ... */ ) {
  var s = {};
  for (var i = 0; i < arguments.length; i++) s[arguments[i]] = 1;
  return s;
}

function Graph() {
  this.points = {};
  this.n = 0;
  var x = this.extremes = {};
  x.north = x.south = x.east = x.west = null;
  // this.height = this.width = 0; // not needed
}
Graph.prototype = {
  setNeighbors: function(i, j) {
    var G = this;
    G.points[i].neighbors[j] = G.points[j].neighbors[i] = 1;
  },
  deleteNeighbors: function(i, j) {
    var G = this;
    delete G.points[i].neighbors[j];
    delete G.points[j].neighbors[i];
  },
  add: function(k, x, y) {
    var G = this;
    var p = G.points[k] = {i:k, x:x, y:y, neighbors:{}};
    G.n++;
    G.setExtremes(p);
    var sources = new UniqueHeap({
      key: function(pt) {return pt.i;},
      cmp: function(pt) {return pt.d;}
    });
    // seed sources
    for (var i in G.extremes) {
      var p2 = G.extremes[i];
      p2.d = distance(p, p2);
      sources.push(p2); // {i:p2.i, d:distance(p, p2)});
    }
    // move from the sources to the point
    while (!sources.isEmpty()) {
      var p2 = sources.pop();
      if (p2.i === p.i) break; // done, we take off the points by distance
      // We want to check for two conditions:
      // 1) is p2 the closest point to p? (if so add a link p-p2)
      // 2) is p between p2 and a neighbor? (if so, account for the fact that p2 should reach its neighbor through p.)
      var closest = true;
      for (var i in p2.neighbors) {
        var p3 = G.points[i];
        p3.d = distance(p3, p);
        var d23 = distance(p2, p3);
        if (p3.d <= p2.d) { // definitely look at neighbors that are as close or closer
          sources.push(p3);
          closest = false;
        }
        if (p3.d <= d23 && p2.d < d23) { // it's better for p2 to reach p3 through p
          p.neighbors[p2.i] = p2.neighbors[p.i] = 1;
          // allow assymetric links.
          // If p2 is closer to p than to p3 but p3 is equidistant from p and p2,
          // then there may be a link from p3 to p2 but not from p2 to p3.
          delete p2.neighbors[p3.i];
          sources.push(p3); // make sure that p3 is also processed
        }
      }
      if (closest) {
        G.setNeighbors(p.i, p2.i);
        // at this point we can check if p is inside the neighbors
        if (G.isSurrounded(p.i)) break;
      }
    }
  },
  isSurrounded: function(i){
    // test if point[i] is surrounded by attempting to find
    // three neighbors whose angles with p > 60deg.
    var P = this.points;
    for (var a in P[i].neighbors) {
      var da = distance(P[a], P[i]);
      for (var b in P[i].neighbors) {
        if (a == b) continue;
        var dab = distance(P[a], P[b]);
        if (dab < da) continue;
        var db = distance(P[b], P[i]);
        if (dab < db) continue;
        for (var c in P[i].neighbors) {
          if (c == a || c == b) continue;
          var dac = distance(P[a], P[c]);
          if (dac < da) continue;
          var dc = distance(P[c], P[i]);
          if (dac < dc) continue;
          var dbc = distance(P[b], P[c]);
          if (dbc < db || dbc < dc) continue;
          return true;
        }
      }
      break; // should work for any a, therefore if it hasn't worked, we can stop.
    }
    return false;
  },
  // setHeightWidth: function(h, w) { this.height = h; this.width = w; }
  nearest: function(dest, stepFunction, start) {
    // if stepfunction is defined, it is called at each node in the search.
    // if it returns a true value, then we stop.
    var nodes = new UniqueHeap({
      key: function(n) {return n.i;},
      cmp: function(a, b) { return a.d - b.d; }
    });
    var G = this;
    var P = G.points;
    if (G.isEmpty()) return undefined;
    if (!start) {
      for (start in P) break; // grab a point to start at
    }
    nodes.push({i:start, p:P[start], d:distance(P[start], dest)});

    while (!nodes.isEmpty()){
      var x = nodes.pop();
      var p = x.p;
      var d = x.d;
      if (stepFunction) {
        var stop = stepFunction(p, G);
        if (stop) break;
      }
      var closest = true;
      for (var i in p.neighbors) {
        var p2 = P[i];
        var d2 = distance(p2, dest);
        if (d2 < d) {
          nodes.push({i:i, p:p2, d:d2});
          closest = false;
        }
      }
      if (closest) return p
    }
  },
  setExtremes: function(p) {
    var X = this.extremes, k; // eXtreme
    k='north'; if (X[k] === null || p.y < X[k].y) X[k] = p;
    k='south'; if (X[k] === null || p.y > X[k].y) X[k] = p;
    k='east'; if (X[k] === null || p.x > X[k].x) X[k] = p;
    k='west'; if (X[k] === null || p.x < X[k].x) X[k] = p;
  },
  move: function(i, x, y) {
    this.remove(i);
    this.add(i, x, y);
  },
  remove: function(i) {
    var G = this, P = G.points;
    var p = P[i];
    var ns = p.neighbors;
    for (var j in ns) delete P[j].neighbors[i];
    for (var j in ns) {
      for (var k in ns) {
        if (i == j) continue;
        var closest = true;
        var d = distance(P[j], P[k]);
        for (var l in P[j].neighbors) {
          if (distance(P[l], p[k]) < d) {
            closest = false;
            break;
          }
        }
        if (closest) {
          P[j].neighbors[k] = P[k].neighbors[j] = 1;
        }
      }
    }
  }

};

// point class = array of length two.

// distance
function distance(a, b) {
  var d = [ a[0] - b[0], a[1] - b[1] ];
  return Math.sqrt( d[0]*d[0] + d[1]*d[1] )
}

