import dotenv from "dotenv";
dotenv.config();

export const ENV = {
    PORT:                   process.env.PORT                   || 3001,
    MONGO_URI:              process.env.MONGO_URI              || "mongodb://localhost:27017/risklens",
    JWT_SECRET:             process.env.JWT_SECRET             || "clave_secreta",
    GROQ_API_KEY:           process.env.GROQ_API_KEY           || "",
    GROQ_MODEL:             process.env.GROQ_MODEL             || "llama-3.3-70b-versatile",
    STRIPE_SECRET_KEY:      process.env.STRIPE_SECRET_KEY      || "",
    STRIPE_PUBLISHABLE_KEY: process.env.STRIPE_PUBLISHABLE_KEY || "",
    STRIPE_PRICE_ID:        process.env.STRIPE_PRICE_ID        || "",
    STRIPE_WEBHOOK_SECRET:  process.env.STRIPE_WEBHOOK_SECRET  || "",
    RESEND_API_KEY:         process.env.RESEND_API_KEY         || ""
};