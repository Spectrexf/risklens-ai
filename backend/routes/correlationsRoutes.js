import express                    from "express";
import { CorrelationsController } from "../controllers/CorrelationsController.js";

const router     = express.Router();
const controller = new CorrelationsController();

router.post("/", controller.getMatrix.bind(controller));

export default router;