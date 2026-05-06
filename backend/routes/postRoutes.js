import express            from "express";
import { PostController } from "../controllers/PostController.js";
import { AuthMiddleware } from "../middleware/authMiddleware.js";
import { upload }         from "../middleware/upload.js";

const router     = express.Router();
const controller = new PostController();

router.post("/upload-image",  AuthMiddleware.verify, upload.single("imagen"), controller.uploadImage.bind(controller));
router.get("/",               AuthMiddleware.verify, controller.list.bind(controller));
router.post("/",              AuthMiddleware.verify, controller.create.bind(controller));
router.patch("/:id/publicar", AuthMiddleware.verify, controller.togglePublicar.bind(controller));
router.delete("/:id",         AuthMiddleware.verify, controller.eliminar.bind(controller));

export default router;