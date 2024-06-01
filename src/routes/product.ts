import express from 'express';
import { deleteProduct, getAdmimProducts, getAllCategories, getAllProducts, getLatestProducts, getSingleProduct, newProduct, updateSingleProduct } from '../controllers/product.js';
import { sinlgeUpload } from '../middlewares/multer.js';
import { adminOnly } from '../middlewares/auth.js';

const app = express.Router();

app.post("/new", adminOnly, sinlgeUpload, newProduct);

// To get all products with filters
app.get("/all", getAllProducts);

// it will be used to show the products in the front page of the website.
app.get("/latest", getLatestProducts);

app.get("/admin-products", adminOnly, getAdmimProducts);

app.get("/categories", getAllCategories);

app.route("/:id").get(getSingleProduct).put(adminOnly,sinlgeUpload, updateSingleProduct).delete(adminOnly,deleteProduct);

export default app;
