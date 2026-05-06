import express                from "express";
import { AnalysisController } from "../controllers/AnalysisController.js";
import { AuthMiddleware }     from "../middleware/authMiddleware.js";

const router     = express.Router();
const controller = new AnalysisController();

router.get("/",        AuthMiddleware.verify, controller.list.bind(controller));
router.post("/",       AuthMiddleware.verify, controller.create.bind(controller));
router.get("/:id/pdf", AuthMiddleware.verify, controller.pdf.bind(controller));

export default router;