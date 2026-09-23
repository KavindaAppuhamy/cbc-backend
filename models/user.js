import mongoose from "mongoose";

const userSchema = mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    firstName: {
        type: String,
        required: true
    },
    lastName: {
        type: String,
        required: true
    },
    password: {
        type: String,
        required: true
    },
    role: {
        type: String,
        required: true,
        default: "customer",
        enum: ["customer", "admin"]
    },
    isBlocked: {
        type: Boolean,
        required: true,
        default: false
    },
    // Existing accounts are treated as verified so this security update does not
    // lock out users already stored in MongoDB. New registrations explicitly set false.
    isEmailVerified: {
        type: Boolean,
        required: true,
        default: true
    },
    emailOtpHash: {
        type: String,
        default: null
    },
    emailOtpExpiresAt: {
        type: Date,
        default: null
    },
    emailOtpPurpose: {
        type: String,
        default: null
    },
    img: {
        type: String,
        required: false,
        default: 'https://www.w3schools.com/howto/img_avatar.png'
    },
}, { timestamps: true });

const User = mongoose.model("users", userSchema);

export default User;
