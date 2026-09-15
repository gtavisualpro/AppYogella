import { Router } from "express";
import Stripe from "stripe";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { serializeMe } from "../lib/serialize.js";

export const subscriptionRouter = Router();

function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  return new Stripe(key, { apiVersion: "2026-08-26.dahlia" });
}

subscriptionRouter.get("/subscription", requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    include: { subscription: true },
  });
  res.json({ subscription: serializeMe(user!).subscription });
});

const checkoutSchema = z.object({ plan: z.enum(["MONTHLY", "ANNUAL"]) });

subscriptionRouter.post("/subscription/checkout", requireAuth, async (req, res) => {
  const stripe = getStripe();
  if (!stripe) {
    return res.status(503).json({
      error:
        "La facturation Stripe n'est pas configurée sur ce serveur (STRIPE_SECRET_KEY manquant).",
    });
  }
  const parsed = checkoutSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Formule invalide" });

  const plan = await prisma.plan.findUnique({ where: { key: parsed.data.plan } });
  if (!plan || !plan.active) return res.status(400).json({ error: "Formule indisponible" });

  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    include: { subscription: true },
  });
  if (!user) return res.status(401).json({ error: "Authentification requise" });

  let customerId = user.subscription?.stripeCustomerId ?? undefined;
  if (!customerId) {
    const customer = await stripe.customers.create({ email: user.email, name: user.name });
    customerId = customer.id;
    await prisma.subscription.update({
      where: { userId: user.id },
      data: { stripeCustomerId: customerId },
    });
  }

  const settings = await prisma.settings.findUnique({ where: { id: "singleton" } });
  const trialDays = settings?.trialDays ?? 0;

  const lineItem: Stripe.Checkout.SessionCreateParams.LineItem = plan.stripePriceId
    ? { price: plan.stripePriceId, quantity: 1 }
    : {
        price_data: {
          currency: "eur",
          unit_amount: plan.priceCents,
          recurring: { interval: plan.key === "ANNUAL" ? "year" : "month" },
          product_data: { name: `Yogella — ${plan.label}` },
        },
        quantity: 1,
      };

  const webOrigin = process.env.WEB_ORIGIN || "http://localhost:5173";
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [lineItem],
    subscription_data: trialDays > 0 ? { trial_period_days: trialDays } : undefined,
    success_url: `${webOrigin}/profil?checkout=success`,
    cancel_url: `${webOrigin}/abonnement?checkout=cancelled`,
    metadata: { userId: user.id, plan: plan.key },
  });

  res.json({ url: session.url });
});

subscriptionRouter.post("/subscription/portal", requireAuth, async (req, res) => {
  const stripe = getStripe();
  if (!stripe) {
    return res.status(503).json({ error: "La facturation Stripe n'est pas configurée." });
  }
  const sub = await prisma.subscription.findUnique({ where: { userId: req.user!.id } });
  if (!sub?.stripeCustomerId) {
    return res.status(400).json({ error: "Aucun compte de facturation associé" });
  }
  const webOrigin = process.env.WEB_ORIGIN || "http://localhost:5173";
  const session = await stripe.billingPortal.sessions.create({
    customer: sub.stripeCustomerId,
    return_url: `${webOrigin}/profil`,
  });
  res.json({ url: session.url });
});

// Raw-body webhook route — mounted separately in index.ts before json() middleware.
export async function stripeWebhookHandler(req: import("express").Request, res: import("express").Response) {
  const stripe = getStripe();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !webhookSecret) return res.status(503).end();

  let event: Stripe.Event;
  try {
    const sig = req.headers["stripe-signature"] as string;
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    return res.status(400).send(`Webhook signature verification failed`);
  }

  async function upsertFromStripeSubscription(stripeSub: Stripe.Subscription) {
    const userId = stripeSub.metadata?.userId;
    const planKey = (stripeSub.metadata?.plan as "MONTHLY" | "ANNUAL" | undefined) ?? undefined;
    if (!userId) return;
    const status =
      stripeSub.status === "active" || stripeSub.status === "trialing"
        ? stripeSub.status === "trialing"
          ? "TRIALING"
          : "ACTIVE"
        : "CANCELED";
    const periodEnd = stripeSub.items.data[0]?.current_period_end;
    await prisma.subscription.update({
      where: { userId },
      data: {
        status,
        plan: planKey,
        stripeSubscriptionId: stripeSub.id,
        currentPeriodEnd: periodEnd ? new Date(periodEnd * 1000) : null,
        trialEnd: stripeSub.trial_end ? new Date(stripeSub.trial_end * 1000) : null,
      },
    });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.subscription && typeof session.subscription === "string") {
        const stripeSub = await stripe.subscriptions.retrieve(session.subscription);
        // metadata lives on the checkout session; propagate onto the subscription object we use.
        stripeSub.metadata = { ...stripeSub.metadata, ...session.metadata };
        await upsertFromStripeSubscription(stripeSub);
      }
      break;
    }
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      await upsertFromStripeSubscription(event.data.object as Stripe.Subscription);
      break;
    }
    default:
      break;
  }

  res.json({ received: true });
}
