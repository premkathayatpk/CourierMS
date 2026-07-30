import crypto from "crypto";

const genTrackingNum = () => {
  return `TRK-${Date.now()}-${crypto
    .randomBytes(3)
    .toString("hex")
    .toUpperCase()}`;
};

export default genTrackingNum;
