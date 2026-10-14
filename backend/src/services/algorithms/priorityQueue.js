
export class MinHeap {
  constructor() {
    this.items = [];
    this.priorities = [];
  }

  get size() {
    return this.items.length;
  }

  push(item, priority) {
    const items = this.items;
    const pr = this.priorities;
    let i = items.length;
    items.push(item);
    pr.push(priority);
    // Sift up
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (pr[parent] <= priority) break;
      items[i] = items[parent];
      pr[i] = pr[parent];
      i = parent;
    }
    items[i] = item;
    pr[i] = priority;
  }

  /** Removes and returns the item with the lowest priority (undefined if empty). */
  pop() {
    const items = this.items;
    const pr = this.priorities;
    if (items.length === 0) return undefined;
    const top = items[0];
    const lastItem = items.pop();
    const lastPr = pr.pop();
    const n = items.length;
    if (n > 0) {
      // Sift down
      let i = 0;
      while (true) {
        const left = 2 * i + 1;
        if (left >= n) break;
        const right = left + 1;
        const child = right < n && pr[right] < pr[left] ? right : left;
        if (pr[child] >= lastPr) break;
        items[i] = items[child];
        pr[i] = pr[child];
        i = child;
      }
      items[i] = lastItem;
      pr[i] = lastPr;
    }
    return top;
  }

  peekPriority() {
    return this.priorities[0];
  }
}
