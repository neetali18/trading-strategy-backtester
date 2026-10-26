
import pandas as pd
from backtesting import run_backtest
from metrics import calculate_metrics

prices = pd.DataFrame({
    "Close": [
        100, 102, 104, 103, 105,
        107, 106, 108, 110, 109,
        111, 113, 112, 115, 117,
        116, 118, 120, 119, 122,
        124, 123, 126, 128, 127,
    ]
})

results = run_backtest(
    prices,
    initial_capital=10000,
    transaction_cost=0.001,
    short_window=3,
    long_window=5,
)

metrics = calculate_metrics(results, initial_capital=10000)

print("Backtest completed successfully!")
print("\nPerformance and Risk Metrics:")

for name, value in metrics.items():
    print(f"{name}: {value}")
