import mongoose from "mongoose";

const PostSchema = new mongoose.Schema(
    {
        titulo:    {type: String, required: true},
        contenido: {type:String, required: true},
        imagen:    {type:String, default: null},
        publicado: {type: Boolean, default: false},
        autorId:   {type: mongoose.Schema.Types.ObjectId, ref: "user", required: true }
    },
    {timestamps:true }
);

export default mongoose.model("Post", PostSchema);