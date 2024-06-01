import mongoose, { Document, Error } from "mongoose";
import { myCache } from "../app.js";
import { Product } from "../models/product.js";
import { InvalidateCacheProps, OrderItemType } from "../types/types.js";

export const connectDataBase = (uri: string) => {
    mongoose.connect(uri, {
        dbName: "ECommerce_2024"
    }).then(() => {
        console.log("Database Connected");
    }).catch((e: Error) => {
        console.log(e.message);
    })
};

export const invalidateCache = ({product, order, admin, userId, orderId, productId} : InvalidateCacheProps) => {
    if (product) {
        const productKeys : string[] = [
            "latest-products", "categories", "all-products"
        ];

        if (typeof productId === "string") {
            productKeys.push(`product - ${productId}`);
        }

        if (typeof productId === "object") {
            productId.forEach((i) => productKeys.push(`product - ${i}`));
        }

        myCache.del(productKeys);
    }

    if (order) {
        const orderKeys : string[] = [
            "all-orders", `my-orders-${userId}`, `order - ${orderId}`
        ]

        myCache.del(orderKeys);
    }

    if (admin) {
        myCache.del(["admin-stats", "admin-pie-charts", "admin-bar-charts", "admin-line-chart"]);
    }
}

export const reduceStockAfterOrder = async(orderItems: OrderItemType[]) => {
    for (let i = 0; i < orderItems.length; i++) {
        const orderItem = orderItems[i];
        const productId = orderItem.productId;
        const product = await Product.findById(productId);

        if (!product) {
            throw new Error("Product Not Fount");
        }

        const quantity = orderItem.quantity;
        const reducedStockAfterOrder: number = product.stock - quantity;

        if (reducedStockAfterOrder < 0) {
            product.stock = 0;
        }
        else {
            product.stock = reducedStockAfterOrder;
        }

        await product.save();
    }
};

export const calculatePercentage = (thisMonth: number, lastMonth: number) => {
    if (lastMonth === 0) {
        return thisMonth * 100;
    }

    const percent = ((thisMonth - lastMonth) / lastMonth) * 100;

    return Number(percent.toFixed(0));
};

export const getInventories = async({categories, productsCount} : {categories: string[], productsCount: number}) => {
    const categoriesCountPromise = categories.map((category) => Product.countDocuments({category}));

    const categoriesCount = await Promise.all(categoriesCountPromise);

    /*
           
        Now here we will make key value pair.

        const categoryCount = [
            {
                "laptop" : 1
            }
        ]

        We have to make the array just like this. We have the categories array and categoriesCount array.
            
    */

    const categoryCount:Record<string, number>[] = [];

    categories.forEach((category, i) => {
        categoryCount.push({
            [category]: Math.round((categoriesCount[i] / productsCount) * 100)
        })
    });

    return categoryCount;
}

interface MyDocument extends Document {
    createdAt: Date,
    discount?: number,
    total?: number
}

type FuncProps = {
    length: number,
    docArr: MyDocument[],
    today: Date,
    property?: "discount" | "total"
}
export const getChartData = ({length, docArr, today, property} : FuncProps) => {
    const data: number[] = new Array(length).fill(0);

    docArr.forEach((i) => {
        const creationDate = i.createdAt;

        /*
                
            There is a small bug in defining monthDifference. Lets understand this with an example.

            1 - Suppose creating date is 12 Nov 2023 and current date is 15 Jan 2024. Now we can see that there is a 1 month gap between the two dates but if we see according to this formula then the ans is different, that is (0 - 11) which is -11, but the ans should be 1. So what we can do is, we have to add 12 after all of this calculation.

            2 - Now we have added 12 in our formula, but it will not work for other cases. For eg if creation date is 12 Aug 2023 and today date is 1 nov 2023, then the month difference is of 3 months, but in the formula, we have added 12, so it will give the ans as 15 months which is not the correct ans. So to fix this, we have to take modulo of the whole thing with 12. Now 15 % 12 is 3

            So basically we have to do 2 mandetory things : 
            1 - Add 12
            2 - Take modulo with 12.    
                
        */
        const monthDifference = (today.getMonth() - creationDate.getMonth() + 12) % 12;

        if (monthDifference < length) {
            if (property) {
                data[length - monthDifference - 1] += i[property]!;
            }
            else {
                data[length - monthDifference - 1] += 1;
            }
        }
    });

    return data;
}
