import { NextFunction, Request, Response } from "express";
import { User } from "../models/user.js";
import { NewUserRequestBody } from "../types/types.js";
import { TryCatch } from "../middlewares/Error.js";
import ErrorHandler from "../utils/utility-class.js";

// we have customized request, but it is not mandetory.
export const newUser = TryCatch(
    async(req: Request<{}, {}, NewUserRequestBody>, res: Response, next:NextFunction) => {
        /*
            
            Working of next(). So in the routes folder, for a particular route, we havea function, now there can be multiple functions.
    
            For eg : app.post("/new", newUser, newUser2, newUser3); Now if I call next()function here, then it will call the newUser2() function. 
                
            For the time being, we have only one function, so as a result, if we callnext() function, then it will be used to call middlewares. We are making ancustom error middleware and we will call it using next().
    
            Even if we have newUser2() and newUser3() functions, we can write next(NewError("Alal")) and it will call the error middleware.
            
            return next(new ErrorHandler("Mera Custom Error", 402));
        */
    
        // collecting data of the user.
        const {name, email, photo, gender, _id, dob} = req.body;

        let user = await User.findById(_id);

        if (user) {
            return res.status(200).json({
                success: true,
                message: `Welcome ${name}`
            })
        }

        if (!name || !email || !photo || !gender || !_id || !dob) {
            return next(new ErrorHandler("Please add all the fields", 400));
        }
    
        user = await User.create({
            name, email, photo, gender, _id, dob: new Date(dob),
        })

        return res.status(201).json({
            success: true,
            message: `Welcome ${user.name}`,
        });
    }
);

export const getAllUsers = TryCatch(
    async (req, res, next) => {
        const users = await User.find({}); // we want all users, so we send empty obj

        res.status(200).json({
            success: true,
            users
        });
    }
);

export const getUserById = TryCatch(
    async (req, res, next) => {
        const id = req?.params?.id;

        const user = await User.findById(id); // we want all users, so we send empty obj

        if (!user) {
            return next(new ErrorHandler("Invalid User Id", 400));
        }

        res.status(200).json({
            success: true,
            user
        });
    }
);

export const deleteUserById = TryCatch(
    async (req, res, next) => {
        const id = req?.params?.id;

        const user = await User.findById(id); // we want all users, so we send empty obj

        if (!user) {
            return next(new ErrorHandler("Invalid User Id", 400));
        }
        
        await user.deleteOne(); // user deleted

        res.status(200).json({
            success: true,
            message: "User deleted successfully"
        });
    }
);

