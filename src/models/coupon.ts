import mongoose from "mongoose";

const schema = new mongoose.Schema({
    code: {
        type: String,
        required: [true, "Please Enter the Coupon Code"],
        unique: true,
    },
    amount: {
        type: Number,
        required: [true, "Please Enter the discount amount"],
    }
});

export const Coupon = mongoose.model("Coupon", schema);
