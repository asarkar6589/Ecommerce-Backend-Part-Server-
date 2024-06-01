import express from 'express'; 
import userRouter from "./routes/user.js";
import productRouter from "./routes/product.js";
import orderRouter from "./routes/orders.js";
import payementRouter from "./routes/payment.js";
import adminRouter from "./routes/stats.js";
import { connectDataBase } from './utils/features.js';
import { errorMiddleware } from './middlewares/Error.js';
import NodeCache from "node-cache";
import { config } from 'dotenv';
import morgan from 'morgan';
import Stripe from 'stripe';
import cors from 'cors';

/*

it cannot indentifiy what is express, so we have to install it's types. So we will put them in the dev dependencies. Because in production, dist folder will go, i.e all the javascript files will go rather than typescript files and js files doesnot require any types, so we will add them to the dev dependencies.

command : npm i --save-dev @types/express @types/typescript

*/

config({
    path: "./.env"
});

const port:number = Number(process.env.PORT) || 3000;
const mongoURI = process.env.MONGO_URL! || "";
const stripeKey = process.env.STRIPE_KEY || "";

connectDataBase(mongoURI);

export const stripe = new Stripe(stripeKey);

// it means our data will store in ram or memory. Created an instance of NodeCache.
export const myCache = new NodeCache();

const app = express();

app.use(express.json()); // so that we can take value from req.body()
app.use(morgan("dev")) // it will give us the information about what kind of request we are making.
app.use(cors());

app.get("/", (req, res) => {
    res.status(200).json({
        success: true,
        message: "Hello World!"
    })
});

// using routes
app.use("/api/v1/user", userRouter);
app.use("/api/v1/product", productRouter);
app.use("/api/v1/order", orderRouter);
app.use("/api/v1/payment", payementRouter);
app.use("/api/v1/dashboard", adminRouter);

app.use("/uploads", express.static("uploads"));
/*

So we have successfully uploaded our image using multer in our folder, but there is one problem, the link to the image is :
"http://localhost:3000/uploads/macbook-air-midnight-gallery1-20220606.jpg"

When we write this url in our browser, it shows error that is cannot get request. So we have to make this folder static so that the browser doesnot treat this as an API.

*/

// middleware for error handeling, and we will put it in the last.
app.use(errorMiddleware)

app.listen(port, () => {
    console.log(`The Server is working on http://localhost:${port}`);
});
