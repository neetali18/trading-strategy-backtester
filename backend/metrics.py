
import numpy as np
import pandas as pd


def calculate_metrics(
    backtest: pd.DataFrame,
    initial_capital: float = 10000.0,
    periods_per_year: int = 252,
) -> dict:
    """
    Calculate performance and risk metrics from backtest results.
    Assumes daily trading data for the default annualization.
    """
    required_columns = {"Strategy_Return", "Equity"}

    if not required_columns.issubset(backtest.columns):
        raise ValueError(
            "Backtest data must contain Strategy_Return and Equity."
        )

    if backtest.empty:
        raise ValueError("Backtest data cannot be empty.")

    if initial_capital <= 0 or periods_per_year <= 0:
        raise ValueError("Capital and periods_per_year must be positive.")

    returns = backtest["Strategy_Return"].astype(float)
    equity = backtest["Equity"].astype(float)

    if returns.isna().any() or equity.isna().any():
        raise ValueError("Returns and equity values cannot contain missing data.")

    if (equity < 0).any():
        raise ValueError("Equity values cannot be negative.")

    final_equity = float(equity.iloc[-1])
    total_return = (final_equity / initial_capital) - 1

    running_peak = equity.cummax()
    drawdown = equity / running_peak - 1
    max_drawdown = float(drawdown.min())

    daily_volatility = float(returns.std(ddof=1)) if len(returns) > 1 else 0.0
    annualized_volatility = daily_volatility * np.sqrt(periods_per_year)

    if daily_volatility > 0:
        sharpe_ratio = (
            float(returns.mean()) / daily_volatility
        ) * np.sqrt(periods_per_year)
    else:
        sharpe_ratio = 0.0

    return {
        "initial_capital": round(float(initial_capital), 2),
        "final_equity": round(final_equity, 2),
        "total_return_pct": round(total_return * 100, 2),
        "max_drawdown_pct": round(max_drawdown * 100, 2),
        "annualized_volatility_pct": round(
            annualized_volatility * 100, 2
        ),
        "sharpe_ratio": round(sharpe_ratio, 3),
    }
