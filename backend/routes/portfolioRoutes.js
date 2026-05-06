import express                 from "express";
import { PortfolioController } from "../controllers/PortfolioController.js";
import { AuthMiddleware }      from "../middleware/authMiddleware.js";

const router     = express.Router();
const controller = new PortfolioController();

router.post("/optimize", AuthMiddleware.verify, controller.optimizar.bind(controller));

export default router;