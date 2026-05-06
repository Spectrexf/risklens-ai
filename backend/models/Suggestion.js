import mongoose from "mongoose";

const SuggestionSchema = new mongoose.Schema(
    {
        userId: {type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        email: {type: String, required: true},
        texto: {type: String, required: true},
        leida: {type:Boolean, default: false}
    },
    {timestamps: true}
);

export default mongoose.model("Suggestion", SuggestionSchema);