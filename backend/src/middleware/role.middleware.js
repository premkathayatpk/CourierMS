const authorize = (...roles) => {
  return (req, res, next) => {
    // protect middleware must run first
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized.",
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "You don't have permission to access this resource.",
      });
    }

    next();
  };
};

export default authorize;
