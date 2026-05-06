import mongoose from "mongoose";

const AnalysisSchema = new mongoose.Schema(
  {
    userId:      { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    companyName: { type: String, required: true },
    inputData:   { type: Object, required: true },
    ratios:      { type: Object, required: true },
    aiReport:    { type: String, default: "" },
  },
  { timestamps: true }
);

export default mongoose.model("Analysis", AnalysisSchema);