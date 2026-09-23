import crypto from "crypto";
import dotenv from "dotenv";
import nodemailer from "nodemailer";
import User from "../models/user.js";
import jwt from "jsonwebtoken";

dotenv.config();

const OTP_LENGTH = 6;
const OTP_TTL_MS = 10 * 60 * 1000;

const SMTP_HOST =
    process.env.BREVO_SMTP_HOST || "smtp-relay.brevo.com";

const SMTP_PORT =
    Number(process.env.BREVO_SMTP_PORT) || 587;

const SMTP_USER = process.env.BREVO_SMTP_USER;
const SMTP_KEY = process.env.BREVO_SMTP_KEY;

const FROM_EMAIL = process.env.BREVO_FROM_EMAIL;
const FROM_NAME =
    process.env.BREVO_FROM_NAME || "Crystal Beauty Clear";

/* =========================================================
   BREVO SMTP
========================================================= */

const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465,
    auth: {
        user: SMTP_USER,
        pass: SMTP_KEY,
    },
});

/* Optional SMTP startup verification.
   This appears in Render logs and helps diagnose SMTP issues.
*/
transporter.verify((error) => {
    if (error) {
        console.error(
            "Brevo SMTP verification failed:",
            error.message
        );
    } else {
        console.log("Brevo SMTP connection is ready");
    }
});

/* =========================================================
   OTP HELPERS
========================================================= */

function generateOtp() {
    return crypto.randomInt(100000, 1000000).toString();
}

function hashOtp(otp) {
    return crypto
        .createHash("sha256")
        .update(String(otp))
        .digest("hex");
}

function getOtpExpiry() {
    return new Date(Date.now() + OTP_TTL_MS);
}

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(email);
}

/* =========================================================
   USER HELPERS
========================================================= */

function publicUser(user) {
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

function createToken(user) {
    return jwt.sign(
        {
            userId: user._id.toString(),
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
            img: user.img,
        },
        process.env.JWT_KEY,
        {
            expiresIn: "7d",
        }
    );
}

function escapeHtml(value) {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

/* =========================================================
   SMTP CONFIG VALIDATION
========================================================= */

function smtpConfigError() {
    const missing = [];

    if (!SMTP_USER) {
        missing.push("BREVO_SMTP_USER");
    }

    if (!SMTP_KEY) {
        missing.push("BREVO_SMTP_KEY");
    }

    if (!FROM_EMAIL) {
        missing.push("BREVO_FROM_EMAIL");
    }

    return missing.length
        ? `Brevo SMTP is not configured. Missing: ${missing.join(", ")}`
        : null;
}

/* =========================================================
   SEND EMAIL
========================================================= */

export async function sendOtpEmail({
    to,
    firstName,
    otp,
    purpose,
}) {
    const configError = smtpConfigError();

    if (configError) {
        throw new Error(configError);
    }

    const isRegistration = purpose === "register";

    const subject = isRegistration
        ? "Your Crystal Beauty Clear verification code"
        : "Your Crystal Beauty Clear login code";

    const heading = isRegistration
        ? "Verify your email"
        : "Complete your login";

    const intro = isRegistration
        ? "Thank you for creating your Crystal Beauty Clear account. Enter the verification code below to confirm your email address."
        : "We received a request to sign in to your Crystal Beauty Clear account. Enter the verification code below to continue.";

    const safeFirstName = escapeHtml(firstName || "there");
    const safeOtp = escapeHtml(otp);

    const text = [
        `Hello ${firstName || "there"},`,
        "",
        intro,
        "",
        `Your one-time verification code is: ${otp}`,
        "",
        "This code expires in 10 minutes. Never share it with anyone.",
        "",
        "If you did not request this code, you can safely ignore this email.",
    ].join("\n");

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>

<body
style="
margin:0;
padding:0;
background:#F5F3EC;
font-family:Arial,Helvetica,sans-serif;
color:#1C1B18;
">

<div
style="
display:none;
max-height:0;
overflow:hidden;
opacity:0;
">
Your Crystal Beauty Clear verification code is ${safeOtp}.
</div>

<table
role="presentation"
width="100%"
cellspacing="0"
cellpadding="0"
border="0"
style="
background:#F5F3EC;
width:100%;
">

<tr>
<td
align="center"
style="padding:36px 16px;"
>

<table
role="presentation"
width="100%"
cellspacing="0"
cellpadding="0"
border="0"
style="
max-width:580px;
background:#FFFFFF;
border:1px solid #E3DCCC;
border-radius:18px;
overflow:hidden;
">

<tr>
<td
style="
height:5px;
background:#A6803D;
font-size:0;
line-height:0;
">
&nbsp;
</td>
</tr>

<tr>
<td
align="center"
style="padding:30px 30px 18px;"
>

<div
style="
font-size:11px;
line-height:16px;
letter-spacing:3px;
text-transform:uppercase;
color:#8A867E;
font-weight:700;
">
CRYSTAL BEAUTY CLEAR
</div>

<div
style="
margin-top:12px;
font-size:26px;
line-height:34px;
font-weight:700;
color:#1C1B18;
">
${heading}
</div>

<div
style="
width:46px;
height:2px;
background:#A6803D;
margin:16px auto 0;
">
</div>

</td>
</tr>

<tr>
<td
style="padding:4px 34px 32px;"
>

<p
style="
margin:0 0 18px;
font-size:16px;
line-height:26px;
color:#4A463F;
">
Hello ${safeFirstName},
</p>

<p
style="
margin:0 0 24px;
font-size:15px;
line-height:25px;
color:#6E6A62;
">
${intro}
</p>

<table
role="presentation"
width="100%"
cellspacing="0"
cellpadding="0"
border="0"
style="
background:#F6EFE0;
border:1px solid #D9CBA6;
border-radius:14px;
">

<tr>
<td
align="center"
style="padding:23px 16px 20px;"
>

<div
style="
font-size:11px;
line-height:16px;
letter-spacing:2.5px;
text-transform:uppercase;
color:#8A7B5C;
font-weight:700;
margin-bottom:10px;
">
YOUR ONE-TIME CODE
</div>

<div
style="
font-size:34px;
line-height:42px;
letter-spacing:9px;
font-weight:700;
color:#1C1B18;
padding-left:9px;
">
${safeOtp}
</div>

<div
style="
margin-top:10px;
font-size:12px;
line-height:18px;
color:#8A867E;
">
Expires in 10 minutes
</div>

</td>
</tr>

</table>

<p
style="
margin:24px 0 0;
font-size:13px;
line-height:21px;
color:#8A867E;
">
For your security, never share this code with anyone.
Crystal Beauty Clear will never ask you to send your
verification code by phone, chat, or email.
</p>

<div
style="
margin-top:24px;
padding-top:20px;
border-top:1px solid #E9E5DC;
">

<p
style="
margin:0;
font-size:13px;
line-height:21px;
color:#8A867E;
">
If you did not request this code, you can safely ignore
this email. Your account remains secure.
</p>

</div>

</td>
</tr>

<tr>
<td
style="
background:#1C1B18;
padding:22px 30px;
text-align:center;
">

<div
style="
font-size:12px;
line-height:18px;
letter-spacing:1.5px;
text-transform:uppercase;
color:#D9CBA6;
font-weight:700;
">
Crystal Beauty Clear
</div>

<div
style="
margin-top:6px;
font-size:11px;
line-height:17px;
color:#B4AFA5;
">
Secure account verification
</div>

</td>
</tr>

</table>

<div
style="
max-width:580px;
padding:16px 20px 0;
font-size:11px;
line-height:17px;
color:#8A867E;
text-align:center;
">
This is an automated security email. Please do not reply
to this message.
</div>

</td>
</tr>

</table>

</body>
</html>
`;

    await transporter.sendMail({
        from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
        to,
        subject,
        text,
        html,
    });
}

/* =========================================================
   ISSUE OTP
========================================================= */

export async function issueEmailOtp(user, purpose) {
    const otp = generateOtp();

    user.emailOtpHash = hashOtp(otp);
    user.emailOtpExpiresAt = getOtpExpiry();
    user.emailOtpPurpose = purpose;

    await user.save();

    try {
        await sendOtpEmail({
            to: user.email,
            firstName: user.firstName,
            otp,
            purpose,
        });
    } catch (error) {
        // Remove OTP if email delivery failed
        user.emailOtpHash = null;
        user.emailOtpExpiresAt = null;
        user.emailOtpPurpose = null;

        await user.save().catch(() => {});

        console.error(
            "OTP email sending failed:",
            error.message
        );

        throw error;
    }
}

/* =========================================================
   SEND OTP
========================================================= */

export async function sendOtp(req, res) {
    try {
        const email = String(
            req.body.email || ""
        )
            .trim()
            .toLowerCase();

        const purpose =
            req.body.purpose === "register"
                ? "register"
                : "login";

        if (!isValidEmail(email)) {
            return res.status(400).json({
                message:
                    "Please enter a valid email address",
            });
        }

        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({
                message: "User not found",
            });
        }

        if (user.isBlocked) {
            return res.status(403).json({
                message:
                    "This account has been blocked. Please contact support.",
            });
        }

        if (
            purpose === "register" &&
            user.isEmailVerified
        ) {
            return res.status(409).json({
                message:
                    "This email is already verified. Please log in.",
            });
        }

        await issueEmailOtp(user, purpose);

        return res.status(200).json({
            message:
                "Verification code sent successfully",
            requiresOtp: true,
            purpose,
            email: user.email,
        });
    } catch (error) {
        console.error(
            "Send OTP error:",
            error.message
        );

        return res.status(503).json({
            message:
                error.message ||
                "Could not send verification code",
        });
    }
}

/* =========================================================
   RESEND OTP
========================================================= */

export async function resendOtp(req, res) {
    return sendOtp(req, res);
}

/* =========================================================
   VERIFY OTP
========================================================= */

export async function verifyOtp(req, res) {
    try {
        const email = String(
            req.body.email || ""
        )
            .trim()
            .toLowerCase();

        const otp = String(
            req.body.otp || ""
        ).trim();

        const purpose =
            req.body.purpose === "register"
                ? "register"
                : "login";

        if (!isValidEmail(email)) {
            return res.status(400).json({
                message:
                    "Please enter a valid email address",
            });
        }

        if (!/^\d{6}$/.test(otp)) {
            return res.status(400).json({
                message:
                    "Enter the 6-digit verification code",
            });
        }

        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({
                message: "User not found",
            });
        }

        if (user.isBlocked) {
            return res.status(403).json({
                message:
                    "This account has been blocked. Please contact support.",
            });
        }

        if (
            !user.emailOtpHash ||
            !user.emailOtpExpiresAt ||
            user.emailOtpExpiresAt.getTime() <
                Date.now()
        ) {
            return res.status(400).json({
                message:
                    "This verification code has expired. Please request a new code.",
            });
        }

        if (
            user.emailOtpPurpose !== purpose
        ) {
            return res.status(400).json({
                message:
                    "This verification code is no longer valid. Please request a new code.",
            });
        }

        if (
            hashOtp(otp) !== user.emailOtpHash
        ) {
            return res.status(400).json({
                message:
                    "Incorrect verification code",
            });
        }

        user.isEmailVerified = true;

        user.emailOtpHash = null;
        user.emailOtpExpiresAt = null;
        user.emailOtpPurpose = null;

        await user.save();

        const token = createToken(user);

        return res.status(200).json({
            message:
                purpose === "register"
                    ? "Email verified and account created"
                    : "Login successful",

            token,

            role: user.role,

            user: publicUser(user),
        });
    } catch (error) {
        console.error(
            "OTP verification error:",
            error.message
        );

        return res.status(500).json({
            message: "OTP verification failed",
            error: error.message,
        });
    }
}

export { OTP_LENGTH };