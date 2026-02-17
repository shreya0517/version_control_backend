const jwt = require("jsonwebtoken");

const authMiddleware = (req, res, next) => {
  try {
    if (!process.env.JWT_SECRET_KEY) {
      console.error("CRITICAL: JWT_SECRET_KEY is not set in environment variables");
      return res.status(500).json({
        success: false,
        message: "Server configuration error: JWT_SECRET_KEY not set",
      });
    }

    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(" ")[1];

    if (!token) {
      console.warn("Authentication failed: No token provided in Authorization header");
      return res.status(401).json({
        success: false,
        message: "No token provided. Authorization denied.",
      });
    }

    // Verify the token
    const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);

    // Attach user info to request object
    req.user = decoded;

    next();
  } catch (error) {
    console.error("Authentication error:", error.message);
    
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Token has expired.",
      });
    }

    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({
        success: false,
        message: "Invalid token.",
      });
    }

    return res.status(401).json({
      success: false,
      message: "Authentication failed.",
    });
  }
};

module.exports = authMiddleware;
