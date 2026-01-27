"""
Stripe Integration for AutoBookd SaaS
- Subscription management
- Webhook handling
- Trial management
"""
import os
import stripe
from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, Any

stripe.api_key = os.environ.get("STRIPE_SECRET_KEY")

PRICE_AMOUNT = 2999  # $29.99 in cents
TRIAL_DAYS = 1  # 24-hour trial


async def create_stripe_customer(email: str, name: str) -> str:
    """Create a Stripe customer"""
    customer = stripe.Customer.create(
        email=email,
        name=name,
        metadata={"source": "autobookd"}
    )
    return customer.id


async def create_checkout_session(customer_id: str, user_id: str, success_url: str, cancel_url: str) -> str:
    """Create Stripe checkout session for subscription"""
    price_id = os.environ.get("STRIPE_PRICE_ID")
    
    # If no price ID exists, create one dynamically
    if not price_id or price_id == "price_autobookd_monthly":
        # Check if product exists
        products = stripe.Product.list(limit=1, active=True)
        if products.data:
            product_id = products.data[0].id
        else:
            product = stripe.Product.create(
                name="AutoBookd Pro",
                description="AI-Powered Lead Automation Platform - Full Access"
            )
            product_id = product.id
        
        # Create price
        price = stripe.Price.create(
            product=product_id,
            unit_amount=PRICE_AMOUNT,
            currency="usd",
            recurring={"interval": "month"}
        )
        price_id = price.id
    
    session = stripe.checkout.Session.create(
        customer=customer_id,
        payment_method_types=["card"],
        line_items=[{
            "price": price_id,
            "quantity": 1
        }],
        mode="subscription",
        subscription_data={
            "trial_period_days": TRIAL_DAYS,
            "metadata": {"user_id": user_id}
        },
        success_url=success_url,
        cancel_url=cancel_url,
        metadata={"user_id": user_id}
    )
    return session.url


async def create_portal_session(customer_id: str, return_url: str) -> str:
    """Create Stripe billing portal session"""
    session = stripe.billing_portal.Session.create(
        customer=customer_id,
        return_url=return_url
    )
    return session.url


async def cancel_subscription(subscription_id: str) -> bool:
    """Cancel a subscription at period end"""
    try:
        stripe.Subscription.modify(
            subscription_id,
            cancel_at_period_end=True
        )
        return True
    except Exception as e:
        print(f"Error cancelling subscription: {e}")
        return False


async def get_subscription_status(subscription_id: str) -> Dict[str, Any]:
    """Get subscription details"""
    try:
        sub = stripe.Subscription.retrieve(subscription_id)
        return {
            "status": sub.status,
            "current_period_end": datetime.fromtimestamp(sub.current_period_end, tz=timezone.utc).isoformat(),
            "cancel_at_period_end": sub.cancel_at_period_end,
            "trial_end": datetime.fromtimestamp(sub.trial_end, tz=timezone.utc).isoformat() if sub.trial_end else None
        }
    except Exception as e:
        print(f"Error getting subscription: {e}")
        return None


def handle_webhook_event(payload: bytes, sig_header: str) -> Dict[str, Any]:
    """Handle Stripe webhook events"""
    webhook_secret = os.environ.get("STRIPE_WEBHOOK_SECRET")
    
    try:
        event = stripe.Webhook.construct_event(payload, sig_header, webhook_secret)
        return event
    except ValueError:
        raise ValueError("Invalid payload")
    except stripe.error.SignatureVerificationError:
        raise ValueError("Invalid signature")


async def get_all_subscriptions(limit: int = 100) -> list:
    """Get all subscriptions for admin dashboard"""
    subscriptions = stripe.Subscription.list(limit=limit)
    return [{
        "id": sub.id,
        "customer": sub.customer,
        "status": sub.status,
        "current_period_start": datetime.fromtimestamp(sub.current_period_start, tz=timezone.utc).isoformat(),
        "current_period_end": datetime.fromtimestamp(sub.current_period_end, tz=timezone.utc).isoformat(),
        "cancel_at_period_end": sub.cancel_at_period_end,
        "created": datetime.fromtimestamp(sub.created, tz=timezone.utc).isoformat()
    } for sub in subscriptions.data]


async def get_payment_history(customer_id: str, limit: int = 10) -> list:
    """Get payment history for a customer"""
    payments = stripe.PaymentIntent.list(customer=customer_id, limit=limit)
    return [{
        "id": p.id,
        "amount": p.amount / 100,
        "currency": p.currency,
        "status": p.status,
        "created": datetime.fromtimestamp(p.created, tz=timezone.utc).isoformat()
    } for p in payments.data]
