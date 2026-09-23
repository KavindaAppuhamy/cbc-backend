import express from "express";
import { createOrder, getOrders, getMyOrders, updateOrderStatus } from "../controllers/orderController.js";

const orderRouter = express.Router();
orderRouter.post("/", createOrder);
orderRouter.get("/mine", getMyOrders);
orderRouter.get("/", getOrders);
orderRouter.put("/:orderId", updateOrderStatus);

export default orderRouter;
