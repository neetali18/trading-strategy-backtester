
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sklearn.linear_model import LinearRegression
import yfinance as yf

from backtesting import run_backtest
from metrics import calculate_metrics

app = FastAPI(title="Trading Strategy Backtesting Engine")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def home():
    return {"message": "Trading Strategy Backtesting Engine is running!"}


@app.get("/stock/{symbol}")
def get_stock_data(symbol: str, period: str = "1mo"):
    try:
        allowed_periods = {"1mo", "3mo", "6mo", "1y", "2y", "5y"}

        if period not in allowed_periods:
            raise HTTPException(
                status_code=400,
                detail="Choose period: 1mo, 3mo, 6mo, 1y, 2y, or 5y."
            )

        history = yf.Ticker(symbol).history(period=period)

        if history.empty:
            raise HTTPException(
                status_code=404,
                detail="No stock data found. Check the symbol."
            )

        history = history.reset_index()

        return {
            "symbol": symbol.upper(),
            "period": period,
            "data": [
                {
                    "date": row["Date"].strftime("%Y-%m-%d"),
                    "close": round(float(row["Close"]), 2),
                }
                for _, row in history.iterrows()
            ],
        }

    except HTTPException:
        raise
    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=f"Could not fetch stock data: {error}"
        )


@app.get("/predict/{symbol}")
def predict_stock(symbol: str):
    try:
        history = yf.Ticker(symbol).history(period="1y")

        if len(history) < 30:
            raise HTTPException(
                status_code=404,
                detail="Not enough historical data for prediction."
            )

        prices = history["Close"].dropna().reset_index(drop=True)

        X = []
        y = []

        for i in range(5, len(prices)):
            X.append(prices.iloc[i - 5:i].tolist())
            y.append(float(prices.iloc[i]))

        model = LinearRegression()
        model.fit(X, y)

        latest_five = prices.iloc[-5:].tolist()
        predicted_price = float(model.predict([latest_five])[0])

        return {
            "symbol": symbol.upper(),
            "latest_close": round(float(prices.iloc[-1]), 2),
            "predicted_next_close": round(predicted_price, 2),
            "note": "Experimental estimate, not financial advice.",
        }

    except HTTPException:
        raise
    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=f"Could not calculate estimate: {error}"
        )


@app.get("/backtest/{symbol}")
def backtest_stock(
    symbol: str,
    period: str = "1y",
    initial_capital: float = 10000,
    short_window: int = 5,
    long_window: int = 20,
):
    try:
        if initial_capital <= 0:
            raise HTTPException(
                status_code=400,
                detail="Initial capital must be positive."
            )

        if short_window <= 0 or long_window <= 0:
            raise HTTPException(
                status_code=400,
                detail="Moving-average windows must be positive."
            )

        if short_window >= long_window:
            raise HTTPException(
                status_code=400,
                detail="Short window must be smaller than long window."
            )

        allowed_periods = {"1mo", "3mo", "6mo", "1y", "2y", "5y"}

        if period not in allowed_periods:
            raise HTTPException(
                status_code=400,
                detail="Choose period: 1mo, 3mo, 6mo, 1y, 2y, or 5y."
            )

        history = yf.Ticker(symbol).history(period=period)

        if history.empty or "Close" not in history.columns:
            raise HTTPException(
                status_code=404,
                detail="No historical stock data found for this symbol."
            )

        prices = history[["Close"]].dropna()

        if len(prices) < long_window + 2:
            raise HTTPException(
                status_code=400,
                detail="Not enough historical data for these moving-average windows."
            )

        results = run_backtest(
            prices,
            initial_capital=initial_capital,
            transaction_cost=0.001,
            short_window=short_window,
            long_window=long_window,
        )

        metrics = calculate_metrics(
            results,
            initial_capital=initial_capital,
        )

        return {
            "symbol": symbol.upper(),
            "period": period,
            "strategy": "Moving Average Crossover",
            "short_window": short_window,
            "long_window": long_window,
            "transaction_cost_pct": 0.1,
            "metrics": metrics,
            "equity_curve": [
                {
                    "date": date.strftime("%Y-%m-%d"),
                    "strategy_equity": round(float(row["Equity"]), 2),
                    "buy_and_hold_equity": round(
                        float(row["Buy_and_Hold_Equity"]), 2
                    ),
                }
                for date, row in results.iterrows()
            ],
            "note": (
                "Historical simulation only. Results do not predict "
                "future performance and do not include every real-world cost."
            ),
        }

    except HTTPException:
        raise
    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=f"Backtest failed: {error}"
        )
