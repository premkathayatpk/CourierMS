import jwt from "jsonwebtoken";

const tokenGen = (userOrId) => {
  const userId = userOrId?._id ? userOrId._id.toString() : userOrId?.toString();

  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: "7d" });
};

export default tokenGen;
