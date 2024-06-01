import express from 'express'
import { allCoupons, applyDiscount, createPayementIntent, deleteCoupon, newCoupon } from '../controllers/payement.js';
import { adminOnly } from '../middlewares/auth.js';

const app = express.Router();

// for payement
app.post("/create", createPayementIntent);

app.post("/coupon/new", adminOnly, newCoupon);

app.get("/discount", applyDiscount);

app.get("/coupon/all", adminOnly, allCoupons);

app.delete("/coupon/:id", adminOnly, deleteCoupon);

export default app;
