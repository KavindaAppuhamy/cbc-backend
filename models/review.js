import mongoose from "mongoose";

const reviewSchema = mongoose.Schema({
    productId: {
        type: String,
        required: true,
        ref: "products"
    },
    userId: {
        type: String,
        required: true,
        ref: "users"
    },
    userName: {
        type: String,
        required: true
    },
    rating: {
        type: Number,
        required: true,
        min: 1,
        max: 5
    },
    comment: {
        type: String,
        required: true
    }, 
    date: {
        type: Date,
        default: Date.now
    },
    status: { 
        type: String,
        enum: ['published', 'unpublished', 'pending'],
        default: 'pending'
    },
    adminReply: { 
        type: String, 
        default: '' 
    },
})

const Review = mongoose.model("reviews", reviewSchema);
export default Review;