import { Request } from "express";
import { TryCatch } from "../middlewares/Error.js";
import { newOrderRequestBody } from "../types/types.js";
import { Order } from "../models/order.js";
import { invalidateCache, reduceStockAfterOrder } from "../utils/features.js";
import ErrorHandler from "../utils/utility-class.js";
import { User } from "../models/user.js";
import { myCache } from "../app.js";

export const newOrder = TryCatch(
    async (req:Request<{}, {}, newOrderRequestBody>, res, next) => {
        const {shippingInfo, orderItems, user, subTotal, tax, shippingCharges, discount, total} = req.body;

        if (!shippingInfo || !orderItems || !user || !subTotal || !tax || !total) {
            return next(new ErrorHandler("Please provide the necessary information", 404));
        }

        const order = await Order.create({
            shippingInfo, orderItems, user, subTotal, tax, shippingCharges, discount, total
        });

        // now since we have placed an order of any product, so we have to reduce the stock. for that we will make a function in the features file.
        await reduceStockAfterOrder(orderItems);

        invalidateCache({product: true, order: true, admin: true, userId: user, productId: order.orderItems.map(i => String(i.productId))});
        /*
        
            Suppose the product that is there in the cache is ordered and after beign orderd, it's stock becomes 0. So as a result, we have to empty the cache. Also we have to do it for order because data of the order is changed.
        
        */

        return res.status(201).json({
            success: true,
            message: 'Order placed successfully'
        })
    }
);

export const myOrders = TryCatch(
    async(req, res, next) => {
        const {id} = req.query;
        const key = `my-orders-${id}`;
        
        let orders = [];

        if (myCache.has(key)) {
            orders = JSON.parse(myCache.get(key) as string);
        }
        else {
            orders = await Order.find({user : id});
            myCache.set(key, JSON.stringify(orders));
        }

        return res.status(200).json({
            success: true,
            orders
        });
    }
);

export const allOrders = TryCatch(
    async(req, res, next) => {
        let orders = [];

        if (myCache.has("all-orders")) {
            orders = JSON.parse(myCache.get("all-orders") as string);
        }
        else {
            // here we also need the info of the user, so we will use populate() method. So it will give all the info about user, but we don't want that many info, we only want name, so as a second parameter are 
            orders = await Order.find({}).populate("user", "name");
            myCache.set("all-orders", JSON.stringify(orders));
        }

        return res.status(200).json({
            success: true,
            orders
        });
    }
);

export const getSingleOrder = TryCatch(
    async(req, res, next) => {
        const {id} = req.params;
        const key = `order - ${id}`;

        let order;

        if (myCache.has(key)) {
            order = JSON.parse(myCache.get(key) as string);
        }
        else {
            order = await Order.findById(id).populate("user", "name");

            if (!order) {
                return next(new ErrorHandler("Order not found !", 404));
            }

            myCache.set(key, JSON.stringify(order));
        }

        return res.status(200).json({
            success: true,
            order
        })
    }
);

export const processOrder = TryCatch(
    async(req, res, next) => {
        const {id} = req.params;

        const order = await Order.findById(id);

        if (!order) {
            return next(new ErrorHandler("Order not found !", 404));
        }

        switch (order.status) {
            case "Processing":
                order.status = "Shipped";
                break;
            case "Shipped":
                order.status = "Deliverd";
                break;
        
            default:
                order.status = "Deliverd";
                break;
        }

        await order.save();

        invalidateCache({product: false, order: true, admin: true, userId: order.user, orderId: String(order._id)});

        return res.status(200).json({
            success: true,
            message: "Order Processed Successfully."
        });
    }
);

export const deleteOrder = TryCatch(
    async(req, res, next) => {
        const {id} = req.params;

        const order = await Order.findById(id);

        if (!order) {
            return next(new ErrorHandler("Order not found !", 404));
        }

        await order.deleteOne();

        invalidateCache({product: false, order: true, admin: true, userId: order.user, orderId: String(order._id)});

        return res.status(200).json({
            success: true,
            message: "Order Deleted Successfully."
        });
    }
);

