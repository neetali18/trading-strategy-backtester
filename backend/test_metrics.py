
import unittest
import pandas as pd

from backtesting import run_backtest
from metrics import calculate_metrics


class BacktestingTests(unittest.TestCase):

    def setUp(self):
        self.prices = pd.DataFrame({
            "Close": [
                100, 102, 104, 103, 105,
                107, 106, 108, 110, 109,
                111, 113, 112, 115, 117,
                116, 118, 120, 119, 122,
                124, 123, 126, 128, 127,
            ]
        })

    def test_backtest_returns_equity(self):
        result = run_backtest(
            self.prices,
            short_window=3,
            long_window=5,
        )

        self.assertIn("Strategy_Return", result.columns)
        self.assertIn("Equity", result.columns)
        self.assertEqual(len(result), len(self.prices))

    def test_metrics_contains_expected_values(self):
        result = run_backtest(
            self.prices,
            short_window=3,
            long_window=5,
        )
        metrics = calculate_metrics(result)

        self.assertIn("total_return_pct", metrics)
        self.assertIn("max_drawdown_pct", metrics)
        self.assertIn("sharpe_ratio", metrics)

    def test_invalid_moving_average_windows(self):
        with self.assertRaises(ValueError):
            run_backtest(
                self.prices,
                short_window=10,
                long_window=5,
            )


if __name__ == "__main__":
    unittest.main(verbosity=2)
