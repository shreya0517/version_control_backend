const express = require("express");
const repoController = require("../controllers/repoController");
const authMiddleware = require("../middleware/authMiddleware");
const authorizeMiddleware = require("../middleware/authorizeMiddleware");

const repoRouter = express.Router();

// Public routes (no authentication required)
repoRouter.get("/repo/all", repoController.getAllRepositories);
repoRouter.get("/repo/name/:name", repoController.fetchRepositoryByName);

// Protected routes (authentication required)
repoRouter.post("/repo/create", authMiddleware, repoController.createRepository);
repoRouter.get("/repo/user/:userID", authMiddleware, repoController.fetchRepositoriesForCurrentUser);
repoRouter.put("/repo/update/:id", authMiddleware, authorizeMiddleware, repoController.updateRepositoryById);
repoRouter.delete("/repo/delete/:id", authMiddleware, authorizeMiddleware, repoController.deleteRepositoryById);
repoRouter.patch("/repo/toggle/:id", authMiddleware, authorizeMiddleware, repoController.toggleVisibilityById);

// Generic get by ID (least specific, should be last)
repoRouter.get("/repo/:id", repoController.fetchRepositoryById);

module.exports = repoRouter;