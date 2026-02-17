const { MongoClient } = require("mongodb");
const { ObjectId } = require("mongodb");
const dotenv = require("dotenv");

dotenv.config();
const uri = process.env.MONGODB_URI;

let client;

async function connectClient() {
  if (!client) {
    client = new MongoClient(uri);
    await client.connect();
  }
}

/**
 * Middleware to authorize resource ownership
 * Checks if the authenticated user is the owner of the resource
 * Usage: router.delete("/:id", authMiddleware, authorizeMiddleware, controller)
 */
const authorizeMiddleware = async (req, res, next) => {
  try {
    // Ensure user is authenticated
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: "User not authenticated.",
      });
    }

    const userId = String(req.user.id);
    const resourceId = req.params.id;

    if (!resourceId) {
      return res.status(400).json({
        success: false,
        message: "Resource ID is required.",
      });
    }

    if (!ObjectId.isValid(resourceId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid resource ID.",
      });
    }

    await connectClient();
    const db = client.db("githubClone");

    // Determine which collection to check based on the route
    let collection = db.collection("repositories");
    let resourceQuery = { _id: new ObjectId(resourceId) };

    // For user profile operations
    if (req.path.includes("Profile")) {
      collection = db.collection("users");
      resourceQuery = { _id: new ObjectId(resourceId) };
    }

    const resource = await collection.findOne(resourceQuery);

    if (!resource) {
      return res.status(404).json({
        success: false,
        message: "Resource not found.",
      });
    }

    // Users are self-owned resources; repositories are owned by owner/userId.
    const ownerCandidates = [];
    if (resource._id) ownerCandidates.push(String(resource._id));
    if (resource.owner) ownerCandidates.push(String(resource.owner));
    if (resource.userId) ownerCandidates.push(String(resource.userId));

    const isOwner = ownerCandidates.includes(userId);

    if (!isOwner) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to perform this action.",
      });
    }

    // Attach resource to request object for use in controller
    req.resource = resource;

    next();
  } catch (error) {
    console.error("Authorization error:", error);
    return res.status(500).json({
      success: false,
      message: "Authorization check failed.",
    });
  }
};

module.exports = authorizeMiddleware;
