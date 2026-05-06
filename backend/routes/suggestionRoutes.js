import express                  from "express";
import { SuggestionController } from "../controllers/SuggestionController.js";
import { AuthMiddleware }       from "../middleware/authMiddleware.js";

const router     = express.Router();
const controller = new SuggestionController();

router.post("/",           AuthMiddleware.verify, controller.create.bind(controller));
router.get("/",            AuthMiddleware.verify, controller.list.bind(controller));
router.patch("/:id/leer",  AuthMiddleware.verify, controller.marcarLeida.bind(controller));

export default router;