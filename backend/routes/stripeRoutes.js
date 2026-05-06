import express              from "express";
import { StripeController } from "../controllers/StripeController.js";
import { AuthMiddleware }   from "../middleware/authMiddleware.js";

const router     = express.Router();
const controller = new StripeController();

router.post("/create-checkout", AuthMiddleware.verify, controller.createCheckoutSession.bind(controller));
router.post("/webhook",         express.raw({ type: "application/json" }), controller.webhook.bind(controller));

export default router;