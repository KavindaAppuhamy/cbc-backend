import Order from "../models/order.js";
import Product from "../models/product.js";
import { isAdmin } from "./userController.js";

const STATUS = ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled"];

export async function createOrder(req, res) {
    if (!req.user?.userId) return res.status(401).json({ message: "Please login and try again" });
    try {
        const orderInfo = req.body || {};
        if (!Array.isArray(orderInfo.products) || orderInfo.products.length === 0) return res.status(400).json({ message: "Your cart is empty" });
        if (!orderInfo.address || !orderInfo.phone) return res.status(400).json({ message: "Delivery address and phone number are required" });

        let orderId = "CBC00001";
        const lastOrder = await Order.findOne().sort({ date: -1, _id: -1 }).lean();
        if (lastOrder?.orderId) {
            const n = parseInt(String(lastOrder.orderId).replace("CBC", ""), 10);
            if (!Number.isNaN(n)) orderId = "CBC" + String(n + 1).padStart(5, "0");
        }

        let total = 0;
        let labelledTotal = 0;
        const products = [];

        for (const requested of orderInfo.products) {
            const qty = Math.max(1, Math.floor(Number(requested.qty ?? requested.quantity ?? 1)));
            const item = await Product.findOne({ productId: requested.productId });
            if (!item) return res.status(404).json({ message: `Product ${requested.productId} not found` });
            if (!item.isAvailable || item.stock < qty) return res.status(409).json({ message: `${item.name} has only ${item.stock} item(s) available` });

            products.push({
                productInfo: { productId: item.productId, name: item.name, altNames: item.altNames, description: item.description, images: item.images, labelledPrice: item.labelledPrice, price: item.price },
                quantity: qty,
            });
            total += item.price * qty;
            labelledTotal += item.labelledPrice * qty;
        }

        for (const line of products) {
            await Product.updateOne({ productId: line.productInfo.productId, stock: { $gte: line.quantity } }, { $inc: { stock: -line.quantity } });
        }

        const order = await Order.create({
            orderId,
            email: req.user.email,
            name: orderInfo.name || `${req.user.firstName || ""} ${req.user.lastName || ""}`.trim(),
            address: String(orderInfo.address).trim(),
            phone: String(orderInfo.phone).trim(),
            products,
            labelledTotal,
            total,
            status: "pending",
        });

        res.status(201).json({ message: "Order created successfully", order });
    } catch (error) {
        res.status(500).json({ message: "Failed to create order", error: error.message });
    }
}

export async function getOrders(req, res) {
    if (!isAdmin(req)) return res.status(403).json({ message: "Only admins can access all orders" });
    const orders = await Order.find().sort({ date: -1 }).lean();
    res.json({ orders });
}

export async function getMyOrders(req, res) {
    if (!req.user?.email) return res.status(401).json({ message: "Please login" });
    const orders = await Order.find({ email: req.user.email }).sort({ date: -1 }).lean();
    res.json({ orders });
}

export async function updateOrderStatus(req, res) {
    if (!isAdmin(req)) return res.status(403).json({ message: "Only admins can update orders" });
    const { orderId } = req.params;
    const { status } = req.body;
    if (!STATUS.includes(status)) return res.status(400).json({ message: `Invalid status. Use: ${STATUS.join(", ")}` });
    const query = String(orderId).startsWith("CBC") ? { orderId } : { _id: orderId };
    const order = await Order.findOneAndUpdate(query, { status }, { new: true });
    if (!order) return res.status(404).json({ message: "Order not found" });
    res.json({ message: "Order status updated", order });
}
