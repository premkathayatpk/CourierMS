import mongoose from "mongoose";

const connect = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URL);

    console.log("DB connected!");
  } catch (error) {
    // The API is useless without a database, so fail fast instead of
    // serving requests that will all error out.
    console.error("DB connection failed:", error.message);
    process.exit(1);
  }
};
export default connect;
