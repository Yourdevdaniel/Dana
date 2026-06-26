from decimal import Decimal

from .models import Investment

ASSET_TYPE_LABELS = {
    "renda_fixa": "Renda fixa",
    "acoes": "Ações",
    "fundos": "Fundos",
    "cripto": "Cripto",
    "exterior": "Exterior",
    "outros": "Outros",
}


def get_summary(user):
    qs = Investment.objects.filter(user=user)

    total_invested = Decimal("0")
    total_current = Decimal("0")
    monthly_contribution = Decimal("0")
    by_type: dict[str, Decimal] = {}

    for inv in qs:
        total_invested += inv.invested_amount
        total_current += inv.current_amount
        monthly_contribution += inv.monthly_contribution
        by_type[inv.asset_type] = by_type.get(inv.asset_type, Decimal("0")) + inv.current_amount

    result = total_current - total_invested
    profitability_percent = (
        (result / total_invested * 100) if total_invested > 0 else Decimal("0")
    )

    return {
        "total_invested": str(total_invested.quantize(Decimal("0.01"))),
        "total_current": str(total_current.quantize(Decimal("0.01"))),
        "result": str(result.quantize(Decimal("0.01"))),
        "profitability_percent": str(profitability_percent.quantize(Decimal("0.01"))),
        "monthly_contribution": str(monthly_contribution.quantize(Decimal("0.01"))),
        "by_type": [
            {"name": ASSET_TYPE_LABELS.get(k, k), "value": str(v.quantize(Decimal("0.01")))}
            for k, v in by_type.items()
        ],
        "evolution": _build_evolution(qs),
    }


def _build_evolution(qs):
    from collections import defaultdict

    by_date: dict = defaultdict(lambda: {"invested": Decimal("0"), "current": Decimal("0")})
    for inv in qs:
        key = str(inv.purchase_date)
        by_date[key]["invested"] += inv.invested_amount
        by_date[key]["current"] += inv.current_amount

    return [
        {
            "date": date,
            "invested": str(vals["invested"].quantize(Decimal("0.01"))),
            "current": str(vals["current"].quantize(Decimal("0.01"))),
        }
        for date, vals in sorted(by_date.items())
    ]
