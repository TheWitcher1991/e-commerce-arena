from decimal import Decimal, ROUND_CEILING, ROUND_FLOOR, ROUND_HALF_UP
from typing import Any

MODEL_VERSION = "1.0"
BASE_COST = Decimal("1450")
BASE_CR = Decimal("0.03")
BASE_CPC = {"ads_search": Decimal("18"), "ads_social": Decimal("22")}
CENT = Decimal("0.01")


def calculate_round(decision: dict[str, Any], crisis_types: set[str]) -> tuple[dict[str, Any], dict[str, Any]]:
    price = int(decision["price"])
    budget = int(decision["marketing_budget"])
    channel = str(decision["marketing_channel"])
    cms = str(decision["cms_option"])
    payment = str(decision["payment_option"])
    delivery = str(decision["delivery_option"])

    cpc = BASE_CPC[channel]
    if "ads_cpc_spike_40" in crisis_types and channel == "ads_search":
        cpc = (cpc * Decimal("1.40")).quantize(CENT, rounding=ROUND_HALF_UP)

    conversion = BASE_CR
    conversion += Decimal("0.004") if cms == "platform_extended" else Decimal("0")
    conversion += {2700: Decimal("0.004"), 3000: Decimal("0"), 3300: Decimal("-0.004")}[price]
    conversion += Decimal("0.002") if delivery == "delivery_express" else Decimal("0")

    delivery_cost = 320 if delivery == "delivery_express" else 200
    payment_rate = Decimal("0.027") if payment == "payment_reserve" else Decimal("0.02")
    successful_payment_rate = Decimal("1")

    conversion = min(Decimal("0.12"), max(Decimal("0.005"), conversion))
    visits = int((Decimal(budget) / cpc).to_integral_value(rounding=ROUND_FLOOR))
    paid_orders = int((Decimal(visits) * conversion * successful_payment_rate).to_integral_value(rounding=ROUND_FLOOR))
    fixed_cost = 13000 if cms == "platform_extended" else 10000
    unit_contribution = (Decimal(price) - BASE_COST - Decimal(delivery_cost) - Decimal(price) * payment_rate - Decimal("30")).quantize(CENT, rounding=ROUND_HALF_UP)
    contribution_total = paid_orders * unit_contribution
    revenue = paid_orders * price
    profit = contribution_total - budget - fixed_cost
    cac = (Decimal(budget) / paid_orders).quantize(CENT, rounding=ROUND_HALF_UP) if paid_orders > 0 else None
    sales_margin = (profit / revenue * Decimal("100")).quantize(CENT, rounding=ROUND_HALF_UP) if revenue > 0 else None
    break_even_orders = int((Decimal(budget + fixed_cost) / unit_contribution).to_integral_value(rounding=ROUND_CEILING)) if unit_contribution > 0 else None

    metrics = {
        "visits": visits,
        "paid_orders": paid_orders,
        "revenue": revenue,
        "unit_contribution": float(unit_contribution),
        "contribution_total": float(contribution_total),
        "marketing_cost": budget,
        "fixed_cost": fixed_cost,
        "profit": float(profit),
        "cac": float(cac) if cac is not None else None,
        "sales_margin_percent": float(sales_margin) if sales_margin is not None else None,
        "break_even_orders": break_even_orders,
    }
    trace = {
        "model_version": MODEL_VERSION,
        "cpc": float(cpc),
        "conversion_rate": float(conversion.quantize(Decimal("0.00001"), rounding=ROUND_HALF_UP)),
        "payment_success_rate": float(successful_payment_rate),
        "product_cost": int(BASE_COST),
        "delivery_cost_per_order": delivery_cost,
        "payment_fee_rate": float(payment_rate),
        "other_fee_per_order": 30,
        "formula": "profit = paid_orders * unit_contribution - marketing_budget - fixed_cost",
    }
    return metrics, trace
