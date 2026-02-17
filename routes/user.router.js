const express = require("express");
const userController = require("../controllers/userController");
const authMiddleware = require("../middleware/authMiddleware");
const authorizeMiddleware = require("../middleware/authorizeMiddleware");

const userRouter = express.Router();

// Public routes (no authentication required)
userRouter.get("/allUsers", userController.getAllUsers);
userRouter.post("/signup", userController.signup);
userRouter.post("/login", userController.login);

// Protected routes (authentication required)
userRouter.get("/userProfile/:id", authMiddleware, userController.getUserProfile);
userRouter.put("/updateProfile/:id", authMiddleware, authorizeMiddleware, userController.updateUserProfile);
userRouter.delete("/deleteProfile/:id", authMiddleware, authorizeMiddleware, userController.deleteUserProfile);

module.exports = userRouter;