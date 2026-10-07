// Fixed-window rate limit keyed by client IP: each IP gets `max` requests per
// `windowMs`, then 429 until the window resets.
// In-memory: fine for a single process; use a shared store (e.g. Redis) if
// the API is ever scaled horizontally.
const rateLimit = ({ windowMs, max, message }) => {
  const windows = new Map(); // ip -> { count, resetAt }

  // Periodically drop expired windows so memory doesn't grow forever
  const sweeper = setInterval(() => {
    const now = Date.now();
    for (const [key, w] of windows) if (w.resetAt <= now) windows.delete(key);
  }, windowMs);
  sweeper.unref?.();

  return (req, res, next) => {
    const now = Date.now();
    let w = windows.get(req.ip);
    if (!w || w.resetAt <= now) {
      w = { count: 0, resetAt: now + windowMs };
      windows.set(req.ip, w);
    }
    w.count += 1;
    if (w.count > max) {
      res.set("Retry-After", Math.ceil((w.resetAt - now) / 1000));
      return res.status(429).json({ success: false, message });
    }
    next();
  };
};

export default rateLimit;
