import express               from "express";
import { AuthController }    from "../controllers/AuthController.js";
import { AuthMiddleware }    from "../middleware/authMiddleware.js";

const router     = express.Router();
const controller = new AuthController();

router.post("/register", controller.register.bind(controller));
router.post("/login",    controller.login.bind(controller));
router.get("/me",        AuthMiddleware.verify, controller.getMe.bind(controller));
router.post("/upgrade", AuthMiddleware.verify, controller.upgradePlan.bind(controller));
router.post("/forgot-password", controller.forgotPassword.bind(controller));
router.post("/reset-password",  controller.resetPassword.bind(controller));

export default router;