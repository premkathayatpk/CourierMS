import jwt from "jsonwebtoken";

const tokenGen = (userId) => {
  try {
    const token = jwt.sign(
      {
        userId,
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" },
    );

    return token;
  } catch (error) {
    console.log(error);
  }
};

export default tokenGen;
