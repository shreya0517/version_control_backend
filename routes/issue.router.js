const express = require("express");
const issueController = require("../controllers/issueController");
const authMiddleware = require("../middleware/authMiddleware");
const authorizeMiddleware = require("../middleware/authorizeMiddleware");

const issueRouter = express.Router();

// Public routes (no authentication required)
issueRouter.get("/issue/all", issueController.getAllIssues);
issueRouter.get("/issue/:id", issueController.getIssueById);

// Protected routes (authentication required)
issueRouter.post("/issue/create", authMiddleware, issueController.createIssue);
issueRouter.put("/issue/update/:id", authMiddleware, authorizeMiddleware, issueController.updateIssueById);
issueRouter.delete("/issue/delete/:id", authMiddleware, authorizeMiddleware, issueController.deleteIssueById);

module.exports = issueRouter;