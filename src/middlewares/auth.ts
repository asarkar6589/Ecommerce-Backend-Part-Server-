import { User } from "../models/user.js";
import ErrorHandler from "../utils/utility-class.js";
import { TryCatch } from "./Error.js";

// Middleware to make sure only admin is allowed.
export const adminOnly = TryCatch(
    async(req, res, next) => {
        const {id} = req.query;

        if (!id) {
            return next(new ErrorHandler("Please Login First", 401));
        }

        const user = await User.findById(id);

        if (!user) {
            return next(new ErrorHandler("Invalid user", 401));
        }

        if (user.role !== "admin") {
            return next(new ErrorHandler("You are not an Admin", 403));
        }

        next();
    }
);

/*

Difference between req.params and req.key

"api/v1/users/2202" -> Now 2202 is the id, if we write req.params then we will get this object : {id : 2202}

"api/v1/users/2202?key=20" -> Now here after the ?, the whole thing is query. Now here the query object is {key:20}

*/