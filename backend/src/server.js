import dotenv from "dotenv";
import app from "./app.js";
import connect from "./config/db.js";
dotenv.config();

connect();

const PORT = process.env.PORT;

app.listen(PORT, () => {
  console.log(`Server running in ${PORT}`);
});
