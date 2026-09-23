import express from "express";
import { createReview, getProductReviews, deleteReview, updateReview, getAllReviews, moderateReviewStatus, replyToReview, getPendingReviews, getPublishedReviewStats } from "../controllers/reviewController.js";

const reviewRouter = express.Router();
reviewRouter.post("/", createReview);
reviewRouter.get("/", getAllReviews);
reviewRouter.get("/search", async (req, res) => {
    try {
        const Review = (await import("../models/review.js")).default;
        const q = String(req.query.q || "").trim();
        const filter = q ? { $or: [{ comment: { $regex: q, $options: "i" } }, { productId: { $regex: q, $options: "i" } }, { userId: { $regex: q, $options: "i" } }] } : {};
        res.json(await Review.find(filter).sort({ date: -1 }));
    } catch (error) { res.status(500).json({ message: "Failed to search reviews", error: error.message }); }
});
reviewRouter.get("/pending", getPendingReviews);
reviewRouter.get("/stats/:productId", getPublishedReviewStats);
reviewRouter.get("/:productId", getProductReviews);
reviewRouter.delete("/:reviewId", deleteReview);
reviewRouter.put("/:reviewId", updateReview);
reviewRouter.put("/:reviewId/status", moderateReviewStatus);
reviewRouter.put("/:reviewId/reply", replyToReview);
reviewRouter.put("/:reviewId/admin-reply", replyToReview);

export default reviewRouter;
