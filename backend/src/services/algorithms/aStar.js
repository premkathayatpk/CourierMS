import { MinHeap } from "./priorityQueue.js";

/**
 * A* shortest-path search.
 *
 * Explores nodes in order of f(n) = g(n) + h(n):
 *   g(n) = cheapest known cost from the start to n
 *   h(n) = heuristic estimate of the remaining cost from n to the goal
 * If h never overestimates (admissible) the first complete path found is
 * optimal. With h = 0 this is exactly Dijkstra's algorithm; a good h makes A*
 * expand far fewer nodes because it is pulled towards the goal.
 *
 * This implementation supports several entry points and exit points, each with
 * an extra cost. The road router needs that because a pickup point usually
 * lies part-way along a road: the search starts at both ends of that road with
 * the partial cost of reaching them, and finishes at either end of the
 * destination road plus the partial cost to the exact drop-off point.
 *
 * Time:  O(E log V) in the worst case (binary heap), typically much less.
 * Space: O(V) for the cost / parent arrays.
 *
 * @param {object}   p
 * @param {number}   p.nodeCount  number of nodes (ids are 0..nodeCount-1)
 * @param {{node:number,cost:number}[]} p.sources  entry nodes and their starting cost
 * @param {Map<number,number>} p.targets  exit nodes -> extra cost to reach the goal from them
 * @param {(node:number)=>number} p.heuristic  admissible estimate to the goal
 * @param {(node:number, relax:(to:number, cost:number, edgeRef:number)=>void)=>void} p.expand
 *        calls relax() for every outgoing edge of node
 * @param {number}   [p.maxExpansions] safety limit
 * @returns {{cost:number, nodes:number[], edges:number[], expansions:number}|null}
 */
export const aStar = ({
  nodeCount,
  sources,
  targets,
  heuristic,
  expand,
  maxExpansions = Infinity,
}) => {
  const g = new Float64Array(nodeCount).fill(Infinity);
  const parent = new Int32Array(nodeCount).fill(-1);
  const parentEdge = new Int32Array(nodeCount).fill(-1);
  const closed = new Uint8Array(nodeCount);
  const open = new MinHeap();

  for (const { node, cost } of sources) {
    if (cost < g[node]) {
      g[node] = cost;
      open.push(node, cost + heuristic(node));
    }
  }

  let bestCost = Infinity;
  let bestNode = -1;
  let expansions = 0;

  while (open.size > 0) {
    // Every remaining path costs at least the smallest f in the queue, so once
    // that is no better than the best complete path we can stop.
    if (open.peekPriority() >= bestCost) break;

    const u = open.pop();
    if (closed[u]) continue; // stale heap entry (lazy deletion)
    closed[u] = 1;
    if (++expansions > maxExpansions) break;

    const exitCost = targets.get(u);
    if (exitCost !== undefined && g[u] + exitCost < bestCost) {
      bestCost = g[u] + exitCost;
      bestNode = u;
    }

    const gu = g[u];
    expand(u, (v, cost, edgeRef) => {
      const candidate = gu + cost;
      if (candidate < g[v]) {
        g[v] = candidate;
        parent[v] = u;
        parentEdge[v] = edgeRef;
        open.push(v, candidate + heuristic(v));
      }
    });
  }

  if (bestNode < 0) return null;

  // Walk parent pointers back to an entry node
  const nodes = [];
  const edges = [];
  for (let v = bestNode; v !== -1; v = parent[v]) {
    nodes.push(v);
    if (parent[v] !== -1) edges.push(parentEdge[v]);
  }
  nodes.reverse();
  edges.reverse();

  return { cost: bestCost, nodes, edges, expansions };
};
