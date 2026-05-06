import Stripe   from "stripe";
import User     from "../models/User.js";
import { ENV }  from "../config/env.js";

export class StripeController {

  constructor() {
    this.stripe = new Stripe(ENV.STRIPE_SECRET_KEY);
  }

  async createCheckoutSession(req, res) {
    try {
      const user = await User.findById(req.userId);
      if (!user)
        return res.status(404).json({ ok: false, error: "Usuario no encontrado" });

      const session = await this.stripe.checkout.sessions.create({
        mode:                 "subscription",
        payment_method_types: ["card"],
        customer_email:       user.email,
        line_items: [
          {
            price:    ENV.STRIPE_PRICE_ID,
            quantity: 1
          }
        ],
        success_url: "http://localhost:3001/subscription.html?success=true",
        cancel_url:  "http://localhost:3001/subscription.html?cancelled=true",
        metadata: {
          userId: String(user._id)
        }
      });

      res.json({ ok: true, url: session.url });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  }

  async webhook(req, res) {
    const sig     = req.headers["stripe-signature"];
    const secret  = ENV.STRIPE_WEBHOOK_SECRET;

    let event;
    try {
      event = this.stripe.webhooks.constructEvent(req.body, sig, secret);
    } catch (err) {
      return res.status(400).json({ ok: false, error: "Webhook inválido: " + err.message });
    }

    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const userId  = session.metadata.userId;

      await User.findByIdAndUpdate(userId, {
        plan:               "premium",
        subscriptionStatus: "active"
      });

      console.log("✅ Usuario actualizado a Premium:", userId);
    }

    res.json({ received: true });
  }
}