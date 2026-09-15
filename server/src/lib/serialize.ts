import type { Subscription, User } from "@prisma/client";
import { isSubscriptionActive } from "../middleware/auth.js";

type UserWithSub = User & { subscription: Subscription | null };

export function serializeMe(user: UserWithSub) {
  const sub = user.subscription;
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    initial: user.name.slice(0, 1).toUpperCase(),
    isAdmin: user.isAdmin,
    createdAt: user.createdAt,
    hasAccess: isSubscriptionActive(sub?.status),
    subscription: sub
      ? {
          plan: sub.plan,
          status: sub.status,
          currentPeriodEnd: sub.currentPeriodEnd,
          trialEnd: sub.trialEnd,
        }
      : { plan: null, status: "NONE", currentPeriodEnd: null, trialEnd: null },
  };
}
