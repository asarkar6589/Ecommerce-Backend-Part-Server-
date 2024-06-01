import mongoose from "mongoose";

const productSchema = new mongoose.Schema({
    shippingInfo: {
        address: {
            type: String,
            required: [true, "Please enter address"]
        },
        city: {
            type: String,
            required: [true, "Please enter city"]
        },
        country: {
            type: String,
            required: [true, "Please enter country"]
        },
        pinCode: {
            type: Number,
            required: [true, "Please enter pin code"]
        },
    },
    user: {
        type: String,
        ref: "User",
        required: [true, "Please enter the user id"]
    },
    subTotal: {
        type: Number,
        required: [true, "Please enter subtotal amount"]
    },
    tax: {
        type: Number,
        required: [true, "Please enter subtotal tax"]
    },
    shippingCharges: {
        type: Number,
        required: [true, "Please enter shippingCharges"],
        default: 0
    },
    discount: {
        type: Number,
        required: [true, "Please enter subtotal discount"],
        default: 0
    },
    total: {
        type: Number,
        required: [true, "Please enter total amount"]
    },
    status: {
        type: String,
        enum: ["Processing", "Shipped", "Deliverd"],
        default: "Processing"
    },
    orderItems: [{
        name: String,
        photo: String,
        price: Number,
        quantity: Number,
        productId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Product",
        }
    }]
}, {
    timestamps: true
});

export const Order = mongoose.model("Order", productSchema);
