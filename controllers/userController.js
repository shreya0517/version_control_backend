const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { MongoClient } = require("mongodb");
const dotenv = require("dotenv");
var ObjectId = require("mongodb").ObjectId;

dotenv.config();
const uri = process.env.MONGODB_URI;

let client;

async function connectClient() {
  if (!client) {
    client = new MongoClient(uri);
    await client.connect();
  }
}

async function signup(req, res) {
  try {
    const { username, password, email } = req.body;

    // Input validation
    if (!username || !password || !email) {
      return res.status(400).json({ 
        message: "Missing required fields", 
        required: ["username", "password", "email"]
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: "Invalid email format" });
    }

    // Validate password length
    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    // Validate username
    if (username.length < 3 || !/^[a-zA-Z0-9_-]+$/.test(username)) {
      return res.status(400).json({ message: "Username must be 3+ characters and contain only letters, numbers, _, -" });
    }

    await connectClient();
    const db = client.db("githubClone");
    const usersCollection = db.collection("users");

    // Check if username already exists
    const userByUsername = await usersCollection.findOne({ username });
    if (userByUsername) {
      return res.status(400).json({ message: "Username already exists!" });
    }

    // Check if email already exists
    const userByEmail = await usersCollection.findOne({ email });
    if (userByEmail) {
      return res.status(400).json({ message: "Email already registered!" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = {
      username,
      password: hashedPassword,
      email,
      profilePicture: "",
      repositories: [],
      followedUsers: [],
      starRepos: [],
    };

    const result = await usersCollection.insertOne(newUser);

    if (!process.env.JWT_SECRET_KEY) {
      console.error("JWT_SECRET_KEY not set in environment");
      return res.status(500).json({ message: "Server configuration error" });
    }

    const token = jwt.sign(
      { id: result.insertedId },
      process.env.JWT_SECRET_KEY,
      { expiresIn: "7d" }
    );

    res.status(201).json({ 
      success: true,
      message: "User created successfully",
      token, 
      userId: result.insertedId.toString() 
    });
  } catch (err) {
    console.error("Error during signup : ", err);
    const errorMessage = err.message || "Server error";
    res.status(500).json({ 
      success: false,
      message: "Signup failed", 
      error: errorMessage 
    });
  }
}

async function login(req, res) {
  const { email, password } = req.body;
  try {
    await connectClient();
    const db = client.db("githubClone");
    const usersCollection = db.collection("users");

    const user = await usersCollection.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "Invalid credentials!" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials!" });
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET_KEY, {
      expiresIn: "7d",
    });
    res.json({ 
      success: true,
      token, 
      userId: user._id.toString() 
    });
  } catch (err) {
    console.error("Error during login : ", err.message);
    res.status(500).json({ message: "Server error", error: err.message });
  }
}

async function getAllUsers(req, res) {
  try {
    await connectClient();
    const db = client.db("githubClone");
    const usersCollection = db.collection("users");

    const users = await usersCollection.find({}, { projection: { password: 0 } }).toArray();
    res.json(users);
  } catch (err) {
    console.error("Error during fetching : ", err.message);
    res.status(500).json({ message: "Server error", error: err.message });
  }
}

async function getUserProfile(req, res) {
  const currentID = req.params.id;

  try {
    await connectClient();
    const db = client.db("githubClone");
    const usersCollection = db.collection("users");

    const user = await usersCollection.findOne(
      { _id: new ObjectId(currentID) },
      { projection: { password: 0 } }
    );

    if (!user) {
      return res.status(404).json({ message: "User not found!" });
    }

    res.json(user);
  } catch (err) {
    console.error("Error during fetching : ", err.message);
    res.status(500).json({ message: "Server error", error: err.message });
  }
}

async function updateUserProfile(req, res) {
  const currentID = req.params.id;
  const { email, password, username, profilePicture } = req.body;

  try {
    await connectClient();
    const db = client.db("githubClone");
    const usersCollection = db.collection("users");

    const userId = new ObjectId(currentID);
    const existingUser = await usersCollection.findOne({ _id: userId });
    if (!existingUser) {
      return res.status(404).json({ message: "User not found!" });
    }

    const updateFields = {};

    if (typeof email === "string") {
      const normalizedEmail = email.trim().toLowerCase();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(normalizedEmail)) {
        return res.status(400).json({ message: "Invalid email format" });
      }

      if (normalizedEmail !== existingUser.email) {
        const duplicateEmail = await usersCollection.findOne({
          email: normalizedEmail,
          _id: { $ne: userId },
        });
        if (duplicateEmail) {
          return res.status(400).json({ message: "Email already registered!" });
        }
      }

      updateFields.email = normalizedEmail;
    }

    if (typeof username === "string") {
      const normalizedUsername = username.trim();
      if (normalizedUsername.length < 3 || !/^[a-zA-Z0-9_-]+$/.test(normalizedUsername)) {
        return res.status(400).json({
          message: "Username must be 3+ characters and contain only letters, numbers, _, -",
        });
      }

      if (normalizedUsername !== existingUser.username) {
        const duplicateUsername = await usersCollection.findOne({
          username: normalizedUsername,
          _id: { $ne: userId },
        });
        if (duplicateUsername) {
          return res.status(400).json({ message: "Username already exists!" });
        }
      }

      updateFields.username = normalizedUsername;
    }

    if (typeof profilePicture === "string") {
      updateFields.profilePicture = profilePicture.trim();
    }

    if (typeof password === "string" && password.trim()) {
      if (password.trim().length < 6) {
        return res.status(400).json({ message: "Password must be at least 6 characters" });
      }

      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password.trim(), salt);
      updateFields.password = hashedPassword;
    }

    if (Object.keys(updateFields).length === 0) {
      return res.status(400).json({ message: "No valid fields provided to update." });
    }

    await usersCollection.updateOne({ _id: userId }, { $set: updateFields });

    const updatedUser = await usersCollection.findOne(
      { _id: userId },
      { projection: { password: 0 } }
    );

    res.json(updatedUser);
  } catch (err) {
    console.error("Error during updating : ", err.message);
    res.status(500).json({ message: "Server error", error: err.message });
  }
}

async function deleteUserProfile(req, res) {
  const currentID = req.params.id;

  try {
    await connectClient();
    const db = client.db("githubClone");
    const usersCollection = db.collection("users");

    const result = await usersCollection.deleteOne({
      _id: new ObjectId(currentID),
    });

    if (result.deletedCount == 0) {
      return res.status(404).json({ message: "User not found!" });
    }

    res.json({ message: "User Profile Deleted!" });
  } catch (err) {
    console.error("Error during updating : ", err.message);
    res.status(500).json({ message: "Server error", error: err.message });
  }
}

module.exports = {
  getAllUsers,
  signup,
  login,
  getUserProfile,
  updateUserProfile,
  deleteUserProfile,
};
