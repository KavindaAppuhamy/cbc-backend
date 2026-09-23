// OTP generation helpers are kept in this utility for backwards compatibility.
// Email delivery itself is handled by controllers/otpController.js through Brevo SMTP.
import crypto from "crypto";

export const OTP_LENGTH = 6;
export const OTP_TTL_MS = 10 * 60 * 1000;

export function generateOtp() {
    return crypto.randomInt(100000, 1000000).toString();
}

export function hashOtp(otp) {
    return crypto.createHash("sha256").update(String(otp)).digest("hex");
}

export function getOtpExpiry() {
    return new Date(Date.now() + OTP_TTL_MS);
}
