import express from "express";
import { deleteUserById, getAllUsers, getUserById, newUser } from "../controllers/user.js";
import { adminOnly } from "../middlewares/auth.js";

const app = express.Router();

// route - localhost:4000/api/v1/user/new
app.post("/new", newUser);

// route - localhost:4000/api/v1/user/all. So only admin can see all the registered users. So first adminOnly middleware will run, if the current user is admin, then only the next function will run.
app.get("/all", adminOnly, getAllUsers);

// route - localhost:4000/api/v1/user/dynamic_id -> This route should be at the last, because it is a dynamic route, anything after "/" will be treated as id.
app.route("/:id").get(getUserById).delete(adminOnly, deleteUserById);

export default app;
