import User from "../models/user.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { issueEmailOtp } from "./otpController.js";

function publicUser(user) {
    if (!user) return null;
    return {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        isBlocked: user.isBlocked,
        isEmailVerified: user.isEmailVerified,
        img: user.img,
        createdAt: user.createdAt,
    };
}

function isValidEmail(email) {
    // Syntax validation is combined with OTP ownership verification: an email
    // is not considered valid for an account until the code is delivered and entered.
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(email);
}


function createToken(user) {
    return jwt.sign(
        { userId: user._id.toString(), email: user.email, firstName: user.firstName, lastName: user.lastName, role: user.role, img: user.img },
        process.env.JWT_KEY,
        { expiresIn: "7d" }
    );
}

export async function createUser(req, res) {
    try {
        const requestedRole = req.body.role || "customer";
        if (requestedRole === "admin" && !isAdmin(req)) {
            return res.status(403).json({ message: "You are not authorized to create admin accounts" });
        }

        const { firstName, lastName, email, password } = req.body;
        if (!firstName || !lastName || !email || !password) {
            return res.status(400).json({ message: "First name, last name, email and password are required" });
        }
        if (password.length < 6) return res.status(400).json({ message: "Password must be at least 6 characters" });

        const normalizedEmail = email.trim().toLowerCase();
        if (!isValidEmail(normalizedEmail)) {
            return res.status(400).json({ message: "Please enter a valid email address" });
        }

        let user = await User.findOne({ email: normalizedEmail });
        if (user) {
            if (user.isEmailVerified) {
                return res.status(409).json({ message: "An account with this email already exists" });
            }

            // Allow an unfinished registration to be restarted without creating duplicates.
            user.firstName = firstName.trim();
            user.lastName = lastName.trim();
            user.password = await bcrypt.hash(password, 10);
            user.role = requestedRole;
            await issueEmailOtp(user, "register");
            return res.status(200).json({
                message: "A new verification code has been sent to your email",
                requiresOtp: true,
                purpose: "register",
                email: user.email,
            });
        }

        user = await User.create({
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            email: normalizedEmail,
            password: await bcrypt.hash(password, 10),
            role: requestedRole,
            isEmailVerified: false,
        });

        await issueEmailOtp(user, "register");

        res.status(201).json({
            message: "Verification code sent to your email",
            requiresOtp: true,
            purpose: "register",
            email: user.email,
        });
    } catch (error) {
        res.status(500).json({ message: error.message?.includes("Brevo SMTP is not configured") ? error.message : "Failed to create user", error: error.message });
    }
}

export async function loginUser(req, res) {
    try {
        const email = String(req.body.email || "").trim().toLowerCase();
        const password = req.body.password || "";
        if (!isValidEmail(email)) return res.status(400).json({ message: "Please enter a valid email address" });

        const user = await User.findOne({ email });
        if (!user) return res.status(404).json({ message: "User not found" });
        if (user.isBlocked) return res.status(403).json({ message: "This account has been blocked. Please contact support." });

        // The admin login page explicitly requests an admin session. Do this
        // check before sending an OTP so customer accounts cannot enter the
        // admin verification flow.
        if (req.body.adminLogin === true && user.role !== "admin") {
            return res.status(403).json({ message: "This account does not have admin access" });
        }

        const isPasswordCorrect = await bcrypt.compare(password, user.password);
        if (!isPasswordCorrect) return res.status(401).json({ message: "Invalid password" });

        try {
            await issueEmailOtp(user, "login");
        } catch (emailError) {
            return res.status(503).json({ message: emailError.message || "Could not send the login verification code" });
        }

        res.status(202).json({
            message: "A verification code has been sent to your email",
            requiresOtp: true,
            purpose: "login",
            email: user.email,
        });
    } catch (error) {
        res.status(500).json({ message: "Login failed", error: error.message });
    }
}



export async function getCurrentUser(req, res) {
    if (!req.user?.userId) return res.status(401).json({ message: "Please login" });
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json({ user: publicUser(user) });
}

export async function updateCurrentUser(req, res) {
    if (!req.user?.userId) return res.status(401).json({ message: "Please login" });
    const allowed = ["firstName", "lastName", "img"];
    const updates = {};
    for (const key of allowed) if (req.body[key] !== undefined) updates[key] = String(req.body[key]).trim();
    if (updates.firstName === "" || updates.lastName === "") return res.status(400).json({ message: "First name and last name cannot be empty" });

    const user = await User.findByIdAndUpdate(req.user.userId, { $set: updates }, { new: true, runValidators: true });
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json({ message: "Profile updated successfully", user: publicUser(user) });
}

export async function getUsers(req, res) {
    if (!isAdmin(req)) return res.status(403).json({ message: "Only admins can access users" });
    const users = await User.find().select("-password -emailOtpHash -emailOtpExpiresAt -emailOtpPurpose").sort({ createdAt: -1, _id: -1 }).lean();
    res.json({ users });
}

export async function updateUserStatus(req, res) {
    if (!isAdmin(req)) return res.status(403).json({ message: "Only admins can update users" });
    const { userId } = req.params;
    const { isBlocked } = req.body;
    const user = await User.findByIdAndUpdate(userId, { isBlocked: Boolean(isBlocked) }, { new: true }).select("-password -emailOtpHash -emailOtpExpiresAt -emailOtpPurpose");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json({ message: "User status updated", user });
}

export async function updateUserRole(req, res) {
    if (!isAdmin(req)) return res.status(403).json({ message: "Only admins can update user roles" });
    const { userId } = req.params;
    const { role } = req.body;
    if (!["customer", "admin"].includes(role)) return res.status(400).json({ message: "Role must be customer or admin" });

    const user = await User.findByIdAndUpdate(
        userId,
        { role },
        { new: true, runValidators: true }
    ).select("-password -emailOtpHash -emailOtpExpiresAt -emailOtpPurpose");

    if (!user) return res.status(404).json({ message: "User not found" });
    res.json({ message: "User role updated successfully", user });
}

export function isAdmin(req) {
    return req.user?.role === "admin";
}
