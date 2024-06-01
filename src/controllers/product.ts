import { NextFunction, Request, Response } from "express";
import { TryCatch } from "../middlewares/Error.js";
import { BaseQueryType, NewProductRequestBody, SearchRequest } from "../types/types.js";
import { Product } from "../models/product.js";
import ErrorHandler from "../utils/utility-class.js";
import { rm } from "fs";
import { myCache } from "../app.js";
import { invalidateCache } from "../utils/features.js";
// import {faker} from "@faker-js/faker";

// While testing this API in postman, we have to give form data instead of sending json data
export const newProduct = TryCatch(
    async(req: Request<{}, {}, NewProductRequestBody>, res: Response, next: NextFunction) => {
        const {name, category, price, stock} = req.body;
        const photo = req.file; // we can get the access of all the photos.

        if (!photo) {
            return next(new ErrorHandler("Please add photo", 400));
        }

        if (!name || !category || !price || !stock) {
            rm(photo.path, () => {
                console.log("Photo Deleted");
            })
            return next(new ErrorHandler("Please enter all fileds", 400));
        }

        await Product.create({
            name, 
            category: category.toLowerCase(), 
            price, 
            stock, 
            photo: photo?.path
        });

        invalidateCache({product: true, admin: true});
        /*
        
            So we have something stored in the cache, now the moment we create a new product, or update or delete it, the cache should be cleared because it may possible that the thing we deleted or updated may be stored in the cache which should not be there.
        
        */

        return res.status(201).json({
            success: true,
            message: 'Product created successfully'
        })
    }
);

// revalidate caching on new, update, delete of products & new order.
export const getLatestProducts = TryCatch(
    async(req: Request<{}, {}, NewProductRequestBody>, res: Response, next: NextFunction) => {
        let products;

        if (myCache.has("latest-products")) {
            products = JSON.parse(myCache.get("latest-products") as string);
        }
        else {
            products = await Product.find({}).sort({
                createdAt: -1 // means we want to sort it in desending order
            }).limit(5); // means only latest 5 products will come.

            myCache.set("latest-products", JSON.stringify(products));
            /*
        
                Now the moment this function will be called, after finding the products, we will store it in the cache. For the first time it will be empty.

                Again when the function is called, we will first check in the chache, if the products exist in the cache, then we will return the products from the cache instead of quering from the database, because querying from database is much  much smaller slower than caching.
        
            */
        }

        return res.status(200).json({
            success: true,
            products
        })
    }
);

// revalidate caching on new, update, delete of products & new order.
export const getAllCategories = TryCatch(
    async(req: Request<{}, {}, NewProductRequestBody>, res: Response, next: NextFunction) => {
        let categories;

        if (myCache.has("categories")) {
            categories = JSON.parse(myCache.get("categories") as string);
        }
        else {
            categories = await Product.distinct("category"); // will find all the unique cateogory.
            myCache.set("categories", JSON.stringify(categories));
        }

        return res.status(200).json({
            success: true,
            categories
        })
    }
);

// revalidate caching on new, update, delete of products & new order.
export const getAdmimProducts = TryCatch(
    async(req: Request<{}, {}, NewProductRequestBody>, res: Response, next: NextFunction) => {
        let products;

        if (myCache.has("all-products")) {
            products = JSON.parse(myCache.get("all-products") as string);
        }
        else {
            products = await Product.find({});
            myCache.set("all-products", JSON.stringify(products));
        }

        return res.status(200).json({
            success: true,
            products
        })
    }
);

// revalidate caching on new, update, delete of products & new order.
export const getSingleProduct = TryCatch(
    async(req, res, next) => {
        const {id} = req.params;
        let product;

        if (myCache.has(`product - ${id}`)) {
            product = JSON.parse(myCache.get(`product - ${id}`) as string);
        }
        else {
            product = await Product.findById(id);

            if (!product) {
                return next(new ErrorHandler("No Product with given id", 404));
            }

            myCache.set(`product - ${id}`, JSON.stringify(product));
        }

        return res.status(200).json({
            success: true,
            product
        })
    }
);

export const deleteProduct = TryCatch(
    async(req, res, next) => {
        const product = await Product.findById(req.params.id);

        if (!product) {
            return next(new ErrorHandler("No Product with given id", 404));
        }
        
        // deleting the photo of the product.
        rm(product.photo, () => {
            console.log("Product Photo Deleted");
        });

        // deleting the product itself.
        await product.deleteOne();

        invalidateCache({product: true, productId: String(product._id), admin: true});

        return res.status(200).json({
            success: true,
            message: "Product deleted successfully"
        });
    }
);

export const updateSingleProduct = TryCatch(
    async(req, res, next) => {
        const {id} = req.params;
        const {name, category, price, stock} = req.body;
        const photo = req.file;
        const product = await Product.findById(id);

        if (!product) {
            return next(new ErrorHandler("No Product with given id", 404));
        }

        if (photo) {
            // deleting the old photo, for that we have to give the old path.
            rm(product?.photo, () => {
                console.log("Old Photo Deleted");
            })
            
            product.photo = photo.path;
        }

        if (name) {
            product.name = name;
        }
        if (price) {
            product.price = price;
        }
        if (stock) {
            product.stock = stock;
        }
        if (category) {
            product.category = category;
        }

        await product.save();

        invalidateCache({product: true, productId: String(product._id), admin: true});

        return res.status(201).json({
            success: true,
            message: 'Product updated successfully'
        })
    }
);

export const getAllProducts = TryCatch(
    async(req: Request<{}, {}, {}, SearchRequest>, res: Response, next: NextFunction) => {
        const {search, sort, category, price} = req.query;

        const page = Number(req.query.page) || 1;

        const limit = Number(process.env.PRODUCT_PAGE) || 8;

        const skip = (page - 1) * limit;

        const BaseQuery: BaseQueryType = {};

        if (search) {
            BaseQuery.name = {
                $regex: search,
                $options: "i"
            }
        }

        if (price) {
            BaseQuery.price = {
                $lte: Number(price),
            }
        }

        if (category) {
            BaseQuery.category = category;
        }

        /*
        
            Now here we have 2 await, so we can use Promise.all() so that all the 2 awaits
            will run simultaneously.
        
        */

        const ProductQuery = await Product.find(BaseQuery).sort(sort ? {
            price: sort === "asc" ? 1 : -1
        } : undefined).limit(limit).skip(skip)

        const [products, filteredOnlyProducts] = await Promise.all([
            ProductQuery,
            await Product.find(BaseQuery)
        ])
        /*
            await 1
        
            const products = await Product.find(BaseQuery).sort(sort ? {
                price: sort === "asc" ? 1 : -1
            } : undefined).limit(limit).skip(skip);
        
        */

        /*
        
            Now if we write name: "lol", it will find all the products that have the name as "lol". It will not search the product with name "maclol". We dont want this. We want whatever we write that should be the part of the name. So we will use regex
            regex finds pattern.

            limit and skip are basically used for pagination. limit means how many products will be shown in the first page. Skip means how many products we have to skip if we go to the 2nd page.
        
        */

        /*
        
            await 2
            const filteredOnlyProducts = await Product.find(BaseQuery);
        
        */

        const totalPage = Math.ceil(filteredOnlyProducts.length / limit);
        /*
        
            Suppose we have 101 products and the limit is 10. Now if we divide 101/10 then we have 10.1

            Now we cannot have 10.1 pages, and 0.1 is comming for that one single product. Now we want 1 extra page for that one extra product. So we want the floor value of the 10.1 i.e 11

            Why we are using filteredOnlyProducts instead of products -> we want that the pagination should be in the filteredOnlyProducts only. If we use products, then pagination will be done only in 8 products, but we want that pagination should be done in all the filtered products, so we used filteredOnlyProducts.
        
        */


        return res.status(200).json({
            success: true,
            products,
            totalPage
        })
    }
);

/*

dummy function to generate 100 products

const generateRandomProducts = async(count: number = 10) => {
    const products = [];

    for (let i = 0; i < count; i++) {
        const product = {
            name: faker.commerce.productName(),
            photo: "uploads\\8f1e562e-d830-4d23-ae88-f16189e70484.jpg",
            price: faker.commerce.price({min: 1500, max: 80000, dec: 0}),
            stock: faker.commerce.price({min: 0, max: 100, dec: 0}),
            category: faker.commerce.department(),
            createdAt: new Date(faker.date.past()),
            updatedAt: new Date(faker.date.recent()),
            __v: 0
        };

        products.push(product);
    }

    await Product.create(products);

    console.log({
        sucess: true,
    });
};

dummy function to delete dummy products

const deleteRandomProducts = async(count: number = 10) => {
    const products = await Product.find({}).skip(2); // first 2 will be skipped

    for(let i = 0; i < products.length; i++) {
        const product = products[i];
        await product.deleteOne();
    }

    console.log({
        sucess: true,
    });
}

deleteRandomProducts(78);

*/
