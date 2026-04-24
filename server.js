const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static("public"));

app.post("/bfhl", (req, res) => {
  const data = req.body.data || [];

  const validEdgeRegex = /^[A-Z]->[A-Z]$/;
  const invalidEntries = [];
  const duplicateEdges = [];
  const seenEdges = new Set();
  const seenDuplicates = new Set();

  const children = new Map();
  const parentOf = new Map();
  const allNodes = new Set();

  for (let raw of data) {
    const entry = typeof raw === "string" ? raw.trim() : String(raw).trim();

    if (!validEdgeRegex.test(entry)) {
      invalidEntries.push(raw);
      continue;
    }

    const [parent, child] = entry.split("->");

    if (parent === child) {
      invalidEntries.push(raw);
      continue;
    }

    const edgeKey = `${parent}->${child}`;

    if (seenEdges.has(edgeKey)) {
      if (!seenDuplicates.has(edgeKey)) {
        duplicateEdges.push(edgeKey);
        seenDuplicates.add(edgeKey);
      }
      continue;
    }

    seenEdges.add(edgeKey);

    if (parentOf.has(child)) {
      continue;
    }

    parentOf.set(child, parent);
    allNodes.add(parent);
    allNodes.add(child);

    if (!children.has(parent)) children.set(parent, []);
    children.get(parent).push(child);
  }

  const visited = new Set();
  const groups = [];

  function getGroup(startNode) {
    const group = new Set();
    const queue = [startNode];
    while (queue.length > 0) {
      const node = queue.shift();
      if (group.has(node)) continue;
      group.add(node);
      if (children.has(node)) {
        for (const child of children.get(node)) queue.push(child);
      }
      for (const [n, p] of parentOf.entries()) {
        if (p === node && !group.has(n)) queue.push(n);
      }
    }
    return group;
  }

  for (const node of allNodes) {
    if (!visited.has(node)) {
      const group = getGroup(node);
      for (const n of group) visited.add(n);
      groups.push(group);
    }
  }

  function hasCycle(node, visitedSet, recStack) {
    visitedSet.add(node);
    recStack.add(node);
    for (const child of children.get(node) || []) {
      if (!visitedSet.has(child)) {
        if (hasCycle(child, visitedSet, recStack)) return true;
      } else if (recStack.has(child)) {
        return true;
      }
    }
    recStack.delete(node);
    return false;
  }

  function buildTree(node) {
    const obj = {};
    for (const child of children.get(node) || []) {
      obj[child] = buildTree(child);
    }
    return obj;
  }

  function calcDepth(node) {
    const kids = children.get(node) || [];
    if (kids.length === 0) return 1;
    return 1 + Math.max(...kids.map(calcDepth));
  }

  const hierarchies = [];

  for (const group of groups) {
    const nodesInGroup = Array.from(group);

    const childNodes = new Set();
    for (const node of nodesInGroup) {
      for (const child of children.get(node) || []) {
        if (group.has(child)) childNodes.add(child);
      }
    }

    const possibleRoots = nodesInGroup.filter((n) => !childNodes.has(n));
    let root;
    if (possibleRoots.length > 0) {
      root = possibleRoots.sort()[0];
    } else {
      root = nodesInGroup.sort()[0];
    }

    const cycleVisited = new Set();
    const cycleStack = new Set();
    let cycleFound = false;

    for (const node of nodesInGroup) {
      if (!cycleVisited.has(node)) {
        if (hasCycle(node, cycleVisited, cycleStack)) {
          cycleFound = true;
          break;
        }
      }
    }

    if (cycleFound) {
      hierarchies.push({ root, tree: {}, has_cycle: true });
    } else {
      const tree = { [root]: buildTree(root) };
      const depth = calcDepth(root);
      hierarchies.push({ root, tree, depth });
    }
  }

  hierarchies.sort((a, b) => a.root.localeCompare(b.root));

  const nonCyclicTrees = hierarchies.filter((h) => !h.has_cycle);
  const totalTrees = nonCyclicTrees.length;
  const totalCycles = hierarchies.filter((h) => h.has_cycle).length;

  let largestTreeRoot = "";
  let maxDepth = -1;
  for (const h of nonCyclicTrees) {
    if (
      h.depth > maxDepth ||
      (h.depth === maxDepth && h.root < largestTreeRoot)
    ) {
      maxDepth = h.depth;
      largestTreeRoot = h.root;
    }
  }

  res.json({
    user_id: "aditya_24112005",
    email_id: "at4420@srmist.edu.in",
    college_roll_number: "RA2311043010020",
    hierarchies,
    invalid_entries: invalidEntries,
    duplicate_edges: duplicateEdges,
    summary: {
      total_trees: totalTrees,
      total_cycles: totalCycles,
      largest_tree_root: largestTreeRoot,
    },
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
