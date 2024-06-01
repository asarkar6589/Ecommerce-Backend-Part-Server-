import { myCache } from "../app.js";
import { TryCatch } from "../middlewares/Error.js";
import { Order } from "../models/order.js";
import { Product } from "../models/product.js";
import { User } from "../models/user.js";
import { calculatePercentage, getChartData, getInventories } from "../utils/features.js";

export const getDashboardStats = TryCatch(
    async(req, res, next) => {
        let stats = {};

        const key = "admin-stats"

        if (myCache.has(key)) {
            stats = JSON.parse(myCache.get(key)as string);
        }
        else {
            /*
            
                Here basically we have to calculate the percentage of products, users transcations in the last and present month.
            
            */

            // last date
            const today = new Date();

            const thisMonth = {
                // starting day of the present month
                start: new Date(today.getFullYear(), today.getMonth(), 1),
                // end of this month
                end: today
            }

            const lastMonth = {
                // starting day of the previous month
                start: new Date(today.getFullYear(), today.getMonth() - 1, 1),
                // end of last month.
                end: new Date(today.getFullYear(), today.getMonth(), 0)
            }

            // here we are finding how many products are created on the present month
            const thisMonthProductsPromise = Product.find({
                createdAt: {
                    $gte: thisMonth.start,
                    $lte: thisMonth.end
                }
            });
            
            // here we are finding how many products are created on the last month
            const lastMonthProductsPromise = Product.find({
                createdAt: {
                    $gte: lastMonth.start,
                    $lte: lastMonth.end
                }
            });

            // here we are finding how many users are created on the present month
            const thisMonthUsersPromise = User.find({
                createdAt: {
                    $gte: thisMonth.start,
                    $lte: thisMonth.end
                }
            });
            
            // here we are finding how many users are created on the last month
            const lastMonthUsersPromise = User.find({
                createdAt: {
                    $gte: lastMonth.start,
                    $lte: lastMonth.end
                }
            });

            // here we are finding how many orders are created on the present month
            const thisMonthOrdersPromise = Order.find({
                createdAt: {
                    $gte: thisMonth.start,
                    $lte: thisMonth.end
                }
            });
            
            // here we are finding how many orders are created on the last month
            const lastMonthOrdersPromise = Order.find({
                createdAt: {
                    $gte: lastMonth.start,
                    $lte: lastMonth.end
                }
            });

            // Revenue & Transactions
            const sixMonthsago = new Date();
            sixMonthsago.setMonth(sixMonthsago.getMonth() - 6);

            const lastSixMonthsOrderPromise = Order.find({
                createdAt: {
                    $gte: sixMonthsago,
                    $lte: today
                }
            });

            const latestTransactionsPromise = Order.find({}).select(["orderItems", "discount", "total", "status"]).limit(4);

            // now we will resolve all the promises together, instead of doing it simultaneously.
            const [
                thisMonthProducts, 
                thisMonthUsers,
                thisMonthOrders,
                lastMonthProducts,
                lastMonthUsers,
                lastMonthOrders,
                productsCount,
                usersCount,
                allOrders,
                lastSixMonthsOrder,
                categories,
                femaleUsers,
                latestTransactions
            ] = await Promise.all([
                thisMonthProductsPromise, 
                thisMonthUsersPromise, 
                thisMonthOrdersPromise, 
                lastMonthProductsPromise, 
                lastMonthUsersPromise, 
                lastMonthOrdersPromise,
                Product.countDocuments(),
                User.countDocuments(),
                Order.find({}).select("total"),
                lastSixMonthsOrderPromise,
                Product.distinct("category"),
                User.countDocuments({gender: "female"}),
                latestTransactionsPromise
            ]);

            const thisMonthRevenue = thisMonthOrders.reduce((total, order) => total + (order.total || 0), 0);

            const lastMonthRevenue = lastMonthOrders.reduce((total, order) => total + (order.total || 0), 0);

            const changePercent = {
                revenue: calculatePercentage(thisMonthRevenue, lastMonthRevenue),

                product: calculatePercentage(thisMonthProducts.length, lastMonthProducts.length),

                user: calculatePercentage(thisMonthUsers.length, lastMonthUsers.length),

                order: calculatePercentage(thisMonthOrders.length, lastMonthOrders.length)
            }

            const revenue = allOrders.reduce((total, order) => total + (order.total || 0), 0);

            const count = {
                revenue,
                user: usersCount,
                product: productsCount,
                order: allOrders.length
            };

            const orderMonthCounts = new Array(6).fill(0);
            const orderMonthlyRevenue = new Array(6).fill(0);

            lastSixMonthsOrder.forEach((order) => {
                const creationDate = order.createdAt;

                /*
                
                    There is a small bug in defining monthDifference. Lets understand this with an example.

                    1 - Suppose creating date is 12 Nov 2023 and current date is 15 Jan 2024. Now we can see that there is a 1 month gap between the two dates but if we see according to this formula then the ans is different, that is (0 - 11) which is -11, but the ans should be 1. So what we can do is, we have to add 12 after all of this calculation.

                    2 - Now we have added 12 in our formula, but it will not work for other cases. For eg if creation date is 12 Aug 2023 and today date is 1 nov 2023, then the month difference is of 3 months, but in the formula, we have added 12, so it will give the ans as 15 months which is not the correct ans. So to fix this, we have to take modulo of the whole thing with 12. Now 15 % 12 is 3

                    So basically we have to do 2 mandetory things : 
                    1 - Add 12
                    2 - Take modulo with 12.
                
                */
                const monthDifference = (today.getMonth() - creationDate.getMonth() + 12) % 12;

                if (monthDifference < 6) {
                    orderMonthCounts[6 - monthDifference - 1] ++;
                    orderMonthlyRevenue[6 - monthDifference - 1] = order.total;
                }
            });

            const categoryCount = await getInventories({
                categories,
                productsCount
            });

            const userRatio = {
                male: usersCount - femaleUsers,
                female: femaleUsers
            }

            const modifiedLatestTransaction = latestTransactions.map(i => ({
                _id: i._id,
                discount: i.discount,
                amount: i.total,
                quantity: i.orderItems.length,
                status: i.status
            }))

            stats = {
                categoryCount,
                changePercent,
                count,
                chart: {
                    order: orderMonthCounts,
                    revenue: orderMonthlyRevenue
                },
                userRatio,
                latestTransactions: modifiedLatestTransaction
            };

            myCache.set(key, JSON.stringify(stats));
        }

        return res.status(200).json({
            success: true,
            stats
        });
    }
);

export const getPieCharts = TryCatch(
    async(req, res, next) => {
        let charts;
        const key = "admin-pie-charts";

        if (myCache.has(key)) {
            charts = JSON.parse(myCache.get(key) as string);
        }
        else {
            // we need count of shipping, proccessed and deliverd products.
            const shippingStatusCountPromise = Order.countDocuments({
                status: "Shipped"
            });

            const processingStatusCountPromise = Order.countDocuments({
                status: "Processing"
            });

            const deliverdStatusCountPromise = Order.countDocuments({
                status: "Deliverd"
            });

            const allOrderPromise = Order.find({}).select(["total", "discount", "subtotal", "tax", "shippingCharges"]);

            const [
                shippingStatusCount,
                processingStatusCount,
                deliverdStatusCount,
                categories,
                productsCount,
                productOutOfStock,
                allOrders,
                allUsers,
                adminUsers,
                customerUsers
            ] = await Promise.all([
                shippingStatusCountPromise,
                processingStatusCountPromise,
                deliverdStatusCountPromise,
                Product.distinct("category"),
                Product.countDocuments(),
                Product.countDocuments({
                    stock: 0
                }),
                allOrderPromise,
                User.find({}).select("dob"),
                User.countDocuments({
                    role: "admin"
                }),
                User.countDocuments({
                    role: "user"
                }),
            ]);

            const orderFullfillment = {
                processing: processingStatusCount,
                shipped: shippingStatusCount,
                delivered: deliverdStatusCount
            }

            const productCategories = await getInventories({
                categories,
                productsCount
            });

            const stockAvailability = {
                inStock: productsCount - productOutOfStock,
                outOfStock: productOutOfStock
            }

            // Revenue distribution.
            const grossIncome = allOrders.reduce((prev, order) => prev + (order.total || 0), 0);

            const discount = allOrders.reduce((prev, order) => prev + (order.discount || 0), 0);

            const productionCost = allOrders.reduce((prev, order) => prev + (order.shippingCharges || 0), 0);

            const burnt = allOrders.reduce((prev, order) => prev + (order.tax || 0), 0);

            const marketingCost = Math.round(grossIncome * (30 / 100)); // assumed 30%

            const netMargin = grossIncome - discount - productionCost - burnt - marketingCost;

            const revenueDistribution = {
                netMargin,
                discount,
                productionCost,
                burnt, // loss of money
                marketingCost
            }

            const adminCustomer = {
                admin: adminUsers,
                customer: customerUsers
            }

            const usersAgeGroup = {
                teen: allUsers.filter((i) => i.age < 20).length,
                adult: allUsers.filter((i) => i.age >= 20 && i.age < 40).length,
                old: allUsers.filter((i) => i.age >= 40).length
            }

            charts = {
                orderFullfillment, 
                productCategories,
                stockAvailability,
                revenueDistribution,
                adminCustomer,
                usersAgeGroup
            }

            myCache.set(key, JSON.stringify(charts));
        }

        return res.status(200).json({
            success: true,
            charts
        });
    }
);

export const getBarCharts = TryCatch(
    async(req, res, next) => {
        let charts;

        const key = "admin-bar-charts";

        if (myCache.has(key)) {
            charts = JSON.parse(myCache.get(key) as string);
        }
        else {
            const today = new Date();

            const sixMonthsAgo = new Date();
            sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

            const twelveMonthsAgo = new Date();
            twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

            const sixMonthsProductPromise = Product.find({
                createdAt: {
                    $gte: sixMonthsAgo,
                    $lte: today
                }
            }).select("createdAt");

            const sixMonthsUsersPromise = User.find({
                createdAt: {
                    $gte: sixMonthsAgo,
                    $lte: today
                }
            }).select("createdAt");

            const twelveMonthsOrderPromise = Order.find({
                createdAt: {
                    $gte: twelveMonthsAgo,
                    $lte: today
                }
            }).select("createdAt");

            const [
                products,
                users,
                orders
            ] = await Promise.all([
                sixMonthsProductPromise,
                sixMonthsUsersPromise,
                twelveMonthsOrderPromise
            ]);

            const productCounts = getChartData({
                length: 6,
                today,
                docArr: products
            });

            const userCounts = getChartData({
                length: 6,
                today,
                docArr: users
            });
            const orderCounts = getChartData({
                length: 12,
                today,
                docArr: orders
            });

            charts = {
                users: userCounts,
                products: productCounts,
                order: orderCounts,
                x:products,
                y:users,
                z: orders
            };

            myCache.set(key, JSON.stringify(charts));
        }

        return res.status(200).json({
            success: true,
            charts
        });
    }
);

export const getLineCharts = TryCatch(
    async(req, res, next) => {
        let chart;

        const key = "admin-line-chart";

        if (myCache.has(key)) {
            chart = JSON.parse(myCache.get(key) as string);
        }
        else {
            const today = new Date();

            const twelveMonthsAgo = new Date();
            twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

            const baseQuery = {
                createdAt: {
                    $gte: twelveMonthsAgo,
                    $lte: today
                }
            }

            const [
                products,
                users,
                orders
            ] = await Promise.all([
                Product.find(baseQuery).select("createdAt"),
                User.find(baseQuery).select("createdAt"),
                Order.find(baseQuery).select(["createdAt", "discount", "total"])
            ]);

            const productCounts = getChartData({
                length: 12,
                today,
                docArr: products
            });

            const userCounts = getChartData({
                length: 12,
                today,
                docArr: users
            });

            const discount = getChartData({
                length: 12,
                today,
                docArr: orders,
                property: "discount"
            });

            const revenue = getChartData({
                length: 12,
                today,
                docArr: orders,
                property: "total"
            });

            chart = {
                users: userCounts,
                products: productCounts,
                discount,
                revenue
            };

            myCache.set(key, JSON.stringify(chart));
        }

        return res.status(200).json({
            success: true,
            chart
        });
    }
);
