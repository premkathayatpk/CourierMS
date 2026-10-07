// Copy every collection (documents + indexes) from one MongoDB to another.
//
//   FROM_MONGO_URL="mongodb+srv://...atlas.../CourierMS" \
//   TO_MONGO_URL="mongodb://127.0.0.1:27017/CourierMS" \
//   npm run db:copy
//
// Refuses to write into a target that already has data unless --force is passed
// (with --force, existing target collections are dropped first).
import mongoose from "mongoose";

const { FROM_MONGO_URL, TO_MONGO_URL } = process.env;
const force = process.argv.includes("--force");

if (!FROM_MONGO_URL || !TO_MONGO_URL) {
  console.error("Set FROM_MONGO_URL and TO_MONGO_URL.");
  process.exit(1);
}

const BATCH = 500;

const run = async () => {
  const from = await mongoose.createConnection(FROM_MONGO_URL).asPromise();
  const to = await mongoose.createConnection(TO_MONGO_URL).asPromise();
  console.log(`Copying ${from.db.databaseName} -> ${to.db.databaseName}`);

  const collections = (await from.db.listCollections().toArray()).filter(
    (c) => c.type === "collection" && !c.name.startsWith("system."),
  );

  for (const { name } of collections) {
    const existing = await to.db.collection(name).countDocuments();
    if (existing > 0 && !force) {
      throw new Error(
        `Target collection "${name}" already has ${existing} documents. Re-run with --force to replace it.`,
      );
    }
  }

  for (const { name } of collections) {
    const src = from.db.collection(name);
    const dest = to.db.collection(name);
    if (force) await dest.drop().catch(() => {});

    let batch = [];
    let copied = 0;
    for await (const doc of src.find()) {
      batch.push(doc);
      if (batch.length === BATCH) {
        await dest.insertMany(batch, { ordered: false });
        copied += batch.length;
        batch = [];
      }
    }
    if (batch.length) {
      await dest.insertMany(batch, { ordered: false });
      copied += batch.length;
    }

    // Recreate indexes (unique email, unique trackingNumber, ...)
    const indexes = (await src.indexes()).filter((i) => i.name !== "_id_");
    for (const { key, name: indexName, v, ns, ...options } of indexes) {
      await dest.createIndex(key, { name: indexName, ...options });
    }

    const total = await dest.countDocuments();
    console.log(`  ${name}: ${copied} copied, ${total} in target, ${indexes.length} indexes`);
  }

  await from.close();
  await to.close();
  console.log("Done.");
};

run().catch((err) => {
  console.error("Copy failed:", err.message);
  process.exit(1);
});
