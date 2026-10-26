
import pandas as pd


def generate_signals(
    prices: pd.DataFrame,
    short_window: int = 5,
    long_window: int = 20,
) -> pd.DataFrame:
    """Generate long-only moving-average crossover signals.

    Signal:
        1 = BUY when short moving average crosses above long average
       -1 = SELL when short moving average crosses below long average
        0 = No crossover
    """
    if "Close" not in prices.columns:
        raise ValueError("Input data must contain a 'Close' column.")

    if short_window <= 0 or long_window <= 0:
        raise ValueError("Moving-average windows must be positive.")

    if short_window >= long_window:
        raise ValueError("Short window must be smaller than long window.")

    if prices.empty:
        raise ValueError("Price data cannot be empty.")

    if prices["Close"].isna().any() or (prices["Close"] <= 0).any():
        raise ValueError("Closing prices must be positive and non-missing.")

    result = prices.copy()

    result["Short_MA"] = result["Close"].rolling(short_window).mean()
    result["Long_MA"] = result["Close"].rolling(long_window).mean()

    previous_short = result["Short_MA"].shift(1)
    previous_long = result["Long_MA"].shift(1)

    valid = (
        result["Short_MA"].notna()
        & result["Long_MA"].notna()
        & previous_short.notna()
        & previous_long.notna()
    )

    result["Signal"] = 0

    buy = (
        valid
        & (result["Short_MA"] > result["Long_MA"])
        & (previous_short <= previous_long)
    )

    sell = (
        valid
        & (result["Short_MA"] < result["Long_MA"])
        & (previous_short >= previous_long)
    )

    result.loc[buy, "Signal"] = 1
    result.loc[sell, "Signal"] = -1

    return result


def run_backtest(
    prices: pd.DataFrame,
    initial_capital: float = 10000.0,
    transaction_cost: float = 0.001,
    short_window: int = 5,
    long_window: int = 20,
) -> pd.DataFrame:
    """Simulate a long-only moving-average crossover strategy.

    Signals from a day's close are acted on in the following period.
    Transaction costs are charged on entries and exits.
    """
    if initial_capital <= 0:
        raise ValueError("Initial capital must be positive.")

    if not 0 <= transaction_cost < 1:
        raise ValueError("Transaction cost must be between 0 and 1.")

    result = generate_signals(
        prices,
        short_window=short_window,
        long_window=long_window,
    )

    # Hold the stock after a BUY signal until a SELL signal.
    position_after_signal = (
        result["Signal"].replace(0, float("nan")).ffill().fillna(0)
    )
    position_after_signal = position_after_signal.clip(lower=0, upper=1)

    # Apply signals one row later to avoid using today's close
    # to earn today's price movement.
    target_position = position_after_signal.shift(1).fillna(0)

    market_returns = result["Close"].pct_change().fillna(0)

    trades = target_position.diff().abs()
    trades.iloc[0] = abs(target_position.iloc[0])

    result["Market_Return"] = market_returns
    result["Target_Position"] = target_position
    result["Strategy_Return"] = (
        target_position * market_returns - trades * transaction_cost
    )

    result["Equity"] = (
        initial_capital * (1 + result["Strategy_Return"]).cumprod()
    )

    result["Buy_and_Hold_Equity"] = (
        initial_capital * (1 + market_returns).cumprod()
    )

    return result
