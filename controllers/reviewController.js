import Review from "../models/review.js";
import { isAdmin } from "./userController.js";

// ✅ Create a review (default status = "pending")
export async function createReview(req, res) {
  try {
    const { productId, userId, userName, rating, comment } = req.body;

    const newReview = new Review({
      productId,
      userId,
      userName,
      rating,
      comment
    });

    await newReview.save();

    res.json({
      message: "Review submitted and pending approval",
      review: newReview
    });
  } catch (err) {
    res.status(500).json({
      message: "Failed to add review",
      error: err
    });
  }
}

// ✅ Get all reviews (Admin access)
export async function getAllReviews(req, res) {
  try {
    const reviews = await Review.find().sort({ date: -1 });
    res.json(reviews);
  } catch (err) {
    res.status(500).json({
      message: "Failed to fetch reviews",
      error: err
    });
  }
}

// ✅ Get reviews for a specific product
export async function getProductReviews(req, res) {
  const { productId } = req.params;

  try {
    const reviews = await Review.find({ productId }).sort({ date: -1 });

    const visibleReviews = isAdmin(req)
      ? reviews
      : reviews.filter(r => r.status === "published");

    res.json(visibleReviews);
  } catch (err) {
    res.status(500).json({
      message: "Failed to fetch reviews",
      error: err
    });
  }
}

// ✅ Delete a review (only owner or admin)
export async function deleteReview(req, res) {
  const { reviewId } = req.params;

  try {
    const review = await Review.findById(reviewId);

    if (!review) {
      return res.status(404).json({ message: "Review not found" });
    }

    const isOwner = req.user?.userId === review.userId;
    if (!isOwner && !isAdmin(req)) {
      return res.status(403).json({
        message: "You are not authorized to delete this review"
      });
    }

    await Review.findByIdAndDelete(reviewId);

    res.json({ message: "Review deleted successfully" });
  } catch (err) {
    res.status(500).json({
      message: "Failed to delete review",
      error: err
    });
  }
}

// ✅ Update review (comment or rating by owner, status/adminReply by admin)
export async function updateReview(req, res) {
  const { reviewId } = req.params;
  const { rating, comment, status, adminReply } = req.body;

  try {
    const review = await Review.findById(reviewId);
    if (!review) {
      return res.status(404).json({ message: "Review not found" });
    }

    const isOwner = req.user?.userId === review.userId;
    const admin = isAdmin(req);

    // Owner can only update rating and comment
    if (!admin && !isOwner) {
      return res.status(403).json({
        message: "You are not authorized to update this review"
      });
    }

    if (isOwner) {
      if (rating) review.rating = rating;
      if (comment) review.comment = comment;
      review.status = "pending"; // Any edit by user resets status
    }

    if (admin) {
      if (status) review.status = status;
      if (adminReply !== undefined) review.adminReply = adminReply;
    }

    await review.save();

    res.json({
      message: "Review updated successfully",
      review
    });
  } catch (err) {
    res.status(500).json({
      message: "Failed to update review",
      error: err
    });
  }
}

export async function moderateReviewStatus(req, res) {
  if (!isAdmin(req)) {
    return res.status(403).json({ message: "Only admins can moderate reviews" });
  }

  const { reviewId } = req.params;
  const { status } = req.body;

  if (!["published", "unpublished", "pending"].includes(status)) {
    return res.status(400).json({ message: "Invalid status value" });
  }

  try {
    const review = await Review.findById(reviewId);
    if (!review) {
      return res.status(404).json({ message: "Review not found" });
    }

    review.status = status;
    await review.save();

    res.json({
      message: `Review ${status}`,
      review,
    });
  } catch (err) {
    res.status(500).json({
      message: "Failed to moderate review",
      error: err,
    });
  }
}

export async function replyToReview(req, res) {
  if (!isAdmin(req)) {
    return res.status(403).json({ message: "Only admins can reply to reviews" });
  }

  const { reviewId } = req.params;
  const { adminReply } = req.body;

  try {
    const review = await Review.findById(reviewId);
    if (!review) {
      return res.status(404).json({ message: "Review not found" });
    }

    review.adminReply = adminReply;
    await review.save();

    res.json({
      message: "Admin reply added",
      review,
    });
  } catch (err) {
    res.status(500).json({
      message: "Failed to add admin reply",
      error: err,
    });
  }
}

export async function getPendingReviews(req, res) {
  if (!isAdmin(req)) {
    return res.status(403).json({ message: "Only admins can access pending reviews" });
  }

  try {
    const pendingReviews = await Review.find({ status: "pending" }).sort({ date: -1 });

    res.json(pendingReviews);
  } catch (err) {
    res.status(500).json({
      message: "Failed to fetch pending reviews",
      error: err,
    });
  }
}

// Get average rating and total published review count for a product
export async function getPublishedReviewStats(req, res) {
  const { productId } = req.params;

  try {
    const publishedReviews = await Review.find({ productId, status: "published" });

    const totalReviews = publishedReviews.length;
    const averageRating = totalReviews
      ? (publishedReviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews).toFixed(1)
      : 0;

    res.json({ averageRating: parseFloat(averageRating), totalReviews });
  } catch (err) {
    res.status(500).json({
      message: "Failed to get review stats",
      error: err,
    });
  }
}

