import jwt from "jsonwebtoken";

const tokenGen = (user) => {
  try {
    const token = jwt.sign(
      {
        id: user._id,
        email: user.email,
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
