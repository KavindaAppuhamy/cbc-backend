import express from "express";
import {
    createReview,
    getProductReviews,
    deleteReview,
    updateReview,
    getAllReviews,
    moderateReviewStatus,
    replyToReview,
    getPendingReviews,
    getPublishedReviewStats
} from "../controllers/reviewController.js";

const reviewRouter = express.Router();

reviewRouter.post("/", createReview);
reviewRouter.get("/", getAllReviews);
reviewRouter.get("/:productId", getProductReviews);
reviewRouter.delete("/:reviewId", deleteReview);
reviewRouter.put("/:reviewId", updateReview);
reviewRouter.put("/:reviewId/status", moderateReviewStatus);
reviewRouter.put("/:reviewId/reply", replyToReview);  
reviewRouter.get("/pending", getPendingReviews);
reviewRouter.get("/stats/:productId", getPublishedReviewStats);

export default reviewRouter;