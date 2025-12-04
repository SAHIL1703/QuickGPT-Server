import Stripe from "stripe";
import Transaction from "../models/Transaction.js";
import User from "../models/User.js";

export const stripeWebHook = async (request, response) => {
  // Create Stripe client
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

  // Stripe signature header
  const sig = request.headers["stripe-signature"];

  let event;
  try {
    // IMPORTANT: request.body must be the raw body (Buffer/string).
    event = stripe.webhooks.constructEvent(request.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error("Stripe signature verification failed:", err.message);
    return response.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    // Only handle the events you care about
    switch (event.type) {
      case "payment_intent.succeeded": {
        const paymentIntent = event.data.object;

        // Find checkout session(s) associated with this payment intent
        const sessionList = await stripe.checkout.sessions.list({
          payment_intent: paymentIntent.id,
          limit: 1,
        });

        const session = sessionList.data && sessionList.data[0];
        if (!session) {
          console.warn("No checkout session found for payment_intent:", paymentIntent.id);
          // Respond 200 so Stripe doesn't retry endlessly (or choose 400 if you prefer a retry)
          return response.json({ received: true, message: "No session found" });
        }

        const { transactionId, appId } = session.metadata || {};

        if (appId !== "quickgpt") {
          return response.json({ received: true, message: "Ignored Event: Invalid App" });
        }

        // Find the transaction and ensure it's unpaid
        const transaction = await Transaction.findOne({ _id: transactionId, isPaid: false });

        if (!transaction) {
          console.warn("Transaction not found or already paid:", transactionId);
          return response.json({ received: true, message: "Transaction not found or already paid" });
        }

        // Increment user's credits atomically
        await User.updateOne({ _id: transaction.userId }, { $inc: { credits: transaction.credits } });

        // Mark transaction as paid
        transaction.isPaid = true;
        await transaction.save();

        // Respond success for this event
        return response.json({ success: true, received: true });
      }

      default:
        console.log("Unhandled event type:", event.type);
        return response.json({ received: true, message: "Event ignored" });
    }
  } catch (err) {
    console.error("Webhook processing error:", err);
    return response.status(500).send("Internal Server Error");
  }
};
