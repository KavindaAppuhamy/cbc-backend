import Product from "../models/product.js";
import Review from "../models/review.js"; // import Review model
import { isAdmin } from "./userController.js";

// Utility to enrich product with rating & review count (ONLY PUBLISHED REVIEWS)
async function enrichProductWithReviews(product) {
    // Only count published reviews for public display
    const publishedReviews = await Review.find({ 
        productId: product.productId, 
        status: "published" 
    });
    
    const totalReviews = publishedReviews.length;
    const rating = totalReviews > 0 
        ? publishedReviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews
        : 0;

    return {
        ...product._doc,
        rating: parseFloat(rating.toFixed(1)),
        totalReviews
    };
}

export async function getProducts(req, res) {
    try {
        const baseQuery = isAdmin(req) ? {} : { isAvailable: true };
        const products = await Product.find(baseQuery);

        // Enrich each product with dynamic review data
        const enrichedProducts = await Promise.all(
            products.map(enrichProductWithReviews)
        );

        res.json(enrichedProducts);
    } catch (err) {
        res.status(500).json({ 
            message: "Failed to get products",
            error: err 
        });
    }
}

export function saveProduct(req, res) {
    if (!isAdmin(req)) {
        return res.status(403).json({
            message: "You are not authorized to add a product"
        });
    }

    const product = new Product(req.body);

    product.save()
        .then(() => {
            res.json({ message: "Product added successfully" });
        })
        .catch((err) => {
            res.status(500).json({
                message: "Failed to add product",
                error: err
            });
        });
}

export async function deleteProduct(req, res) {
    if (!isAdmin(req)) {
        return res.status(403).json({
            message: "You are not authorized to delete a product"
        });
    }

    try {
        await Product.deleteOne({ productId: req.params.productId });

        res.json({ message: "Product deleted successfully" });
    } catch (err) {
        res.status(500).json({
            message: "Failed to delete product",
            error: err
        });
    }
}

export async function updateProduct(req, res) {
    if (!isAdmin(req)) {
        return res.status(403).json({
            message: "You are not authorized to update a product"
        });
    }

    try {
        await Product.updateOne(
            { productId: req.params.productId },
            req.body
        );

        res.json({ message: "Product updated successfully" });
    } catch (err) {
        res.status(500).json({
            message: "Internal server error",
            error: err
        });
    }
}

export async function getProductById(req, res) {
    try {
        const product = await Product.findOne({ productId: req.params.productId });

        if (!product) {
            return res.status(404).json({ message: "Product not found" });
        }

        if (!product.isAvailable && !isAdmin(req)) {
            return res.status(404).json({ message: "Product not found" });
        }

        const enrichedProduct = await enrichProductWithReviews(product);
        res.json(enrichedProduct);

    } catch (err) {
        res.status(500).json({
            message: "Internal server error",
            error: err
        });
    }
}