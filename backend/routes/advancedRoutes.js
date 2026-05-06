import express                        from "express";
import { AdvancedAnalysisController } from "../controllers/AdvancedAnalysisController.js";
import { AuthMiddleware }             from "../middleware/authMiddleware.js";

const router     = express.Router();
const controller = new AdvancedAnalysisController();

router.get("/search",  AuthMiddleware.verify, controller.search.bind(controller));
router.post("/analyze", AuthMiddleware.verify, controller.analyze.bind(controller));

export default router;