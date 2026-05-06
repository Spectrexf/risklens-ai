import express            from "express";
import { NewsController } from "../controllers/NewsController.js";

const router     = express.Router();
const controller = new NewsController();

router.get("/", controller.list.bind(controller));

export default router;