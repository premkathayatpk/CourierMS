// Must be the first import: ES imports are hoisted, so env vars have to be
// loaded before app.js (which reads CLIENT_URL) is evaluated.
import "dotenv/config";
import app from "./app.js";
import connect from "./config/db.js";
import { warmUpRouter } from "./services/roadRouter.js";
import { startPendingSweep } from "./services/autoAssign.js";

const PORT = process.env.PORT || 8000;

const start = async () => {
  if (!process.env.JWT_SECRET) {
    console.error("JWT_SECRET is not set. Add it to backend/.env");
    process.exit(1);
  }

  await connect();
  warmUpRouter(); // load the A* road graph before the first request
  startPendingSweep(); // retry parcels still waiting for a driver

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
};

start();
