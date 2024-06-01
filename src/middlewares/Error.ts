import { NextFunction, Request, Response } from "express"
import ErrorHandler from "../utils/utility-class.js";
import { ControllerType } from "../types/types.js";

export const errorMiddleware = (err: ErrorHandler, req: Request, res: Response, next: NextFunction) => {
    err.message = err.message || "Internal Server Error";
    err.statusCode = err.statusCode || 500;

    if(err.name === "CastError") {
        err.message = "Invalid Id";
    }

    return res.status(err.statusCode).json({
        success: false,
        message: err.message
    });
};

//Custom function which returning a arrow function. Basically it is a custom try catch block.
export const TryCatch = (func: ControllerType) => (req: Request, res: Response, next: NextFunction) => {
    return Promise.resolve(func(req, res, next)).catch(next);
}
