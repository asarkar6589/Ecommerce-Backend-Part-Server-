import { stripe } from "../app.js";
import { TryCatch } from "../middlewares/Error.js";
import { Coupon } from "../models/coupon.js";
import ErrorHandler from "../utils/utility-class.js";

export const createPayementIntent = TryCatch(
    async (req, res, next) => {
        const {amount} = req.body;

        if (!amount) {
            return next(new ErrorHandler("Please enter the amount", 401));
        }

        const payementIntent = await stripe.paymentIntents.create({
            amount: Number(amount) * 100,
            currency: "inr"
        })

        return res.status(201).json({
            sucess: true,
            clientSecret: payementIntent.client_secret // we will use this on frontend
        });
    }
);

export const newCoupon = TryCatch(
    async (req, res, next) => {
        const {coupon, amount} = req.body;

        if (!coupon || !amount) {
            return next(new ErrorHandler("Please enter all the details", 401));
        }

        await Coupon.create({
            code:coupon,
            amount
        })

        return res.status(201).json({
            sucess: true,
            message: `Coupon ${coupon} created successfully`
        })
    }
);

export const applyDiscount = TryCatch(
    async (req, res, next) => {
        const {coupon} = req.query;

        const discount = await Coupon.findOne({
            code: coupon
        });

        if (!discount) {
            return next(new ErrorHandler("Invalid coupon code",400));
        }

        return res.status(200).json({
            sucess: true,
            discount: discount.amount
        })
    }
);

export const allCoupons = TryCatch(
    async (req, res, next) => {
        const coupons = await Coupon.find({});

        if (!coupons) {
            return next(new ErrorHandler("No Coupons Available", 400));
        }

        return res.status(200).json({
            sucess: true,
            coupons
        })
    }
);

export const deleteCoupon = TryCatch(
    async (req, res, next) => {
        const {id} = req.params;

        const coupon = await Coupon.findByIdAndDelete(id);

        if (!coupon) {
            return next(new ErrorHandler("Invalid Coupon Id", 400));
        }

        return res.status(200).json({
            sucess: true,
            message: "Coupon deleted successfully"
        })
    }
);
