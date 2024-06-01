import mongoose from "mongoose";

const productSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, "Please Enter the Name of the Product"]
    }, 
    photo: {
        type: String,
        required: [true, "Please Enter Photo"]
    }, 
    price: {
        type: Number,
        required: [true, "Please Enter the price"]
    }, 
    stock: {
        type: Number,
        required: [true, "Please Enter the stock"]
    }, 
    category: {
        type: String,
        required: [true, "Please Enter the category"],
        trim: true,
    }, 
    
}, {
    timestamps: true
});

export const Product = mongoose.model("Product", productSchema);
