
import { useEffect, useState } from 'react';
import './App.css';

const API = 'http://127.0.0.1:8000';

const PERIOD_LABELS = {
  '1mo': '1 MONTH',

  '3mo': '3 MONTHS',
  '6mo': '6 MONTHS',
  '1y': '1 YEAR',
  '2y': '2 YEARS',
  '5y': '5 YEARS',
};

function App() {
  const [symbol, setSymbol] = useState('AAPL');
  const [period, setPeriod] = useState('1y');
  const [shortWindow, setShortWindow] = useState(5);
  const [longWindow, setLongWindow] = useState(20);

  const [stock, setStock] = useState(null);
  const [prediction, setPrediction] = useState(null);
  const [backtest, setBacktest] = useState(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function loadData(
    selectedSymbol = symbol,
    selectedPeriod = period,
    short = shortWindow,
    long = longWindow
  ) {
    const ticker = selectedSymbol.trim().toUpperCase();
    const shortValue = Number(short);
    const longValue = Number(long);

    if (!ticker) {
      setError('Please enter a stock symbol.');
      return;
    }

    if (
      !Number.isInteger(shortValue) ||
      !Number.isInteger(longValue) ||
      shortValue <= 0 ||
      longValue <= shortValue
    ) {
      setError(
        'Use positive whole-number windows. The short window must be smaller than the long window.'
      );
      return;
    }

    setLoading(true);
    setError('');
    setStock(null);
    setPrediction(null);
    setBacktest(null);

    try {
      const urls = [
        `${API}/stock/${encodeURIComponent(ticker)}?period=${encodeURIComponent(selectedPeriod)}`,
        `${API}/predict/${encodeURIComponent(ticker)}`,
        `${API}/backtest/${encodeURIComponent(ticker)}?period=${encodeURIComponent(selectedPeriod)}&initial_capital=10000&short_window=${shortValue}&long_window=${longValue}`,
      ];

      const responses = await Promise.all(
        urls.map(url => fetch(url))
      );

      const results = await Promise.all(
        responses.map(response => response.json())
      );

      const failedIndex = responses.findIndex(
        response => !response.ok
      );

      if (failedIndex !== -1) {
        throw new Error(
          results[failedIndex].detail ||
          'Could not load all results.'
        );
      }

      setStock(results[0]);
      setPrediction(results[1]);
      setBacktest(results[2]);

      setSymbol(ticker);
      setPeriod(selectedPeriod);
      setShortWindow(shortValue);
      setLongWindow(longValue);
    } catch (err) {
      setError(
        err.message ||
        'Could not connect to the backend. Check that the server is running.'
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData('AAPL', '1y', 5, 20);
  }, []);

  const prices = stock?.data || [];
  const metrics = backtest?.metrics;
  const equityData = backtest?.equity_curve || [];

  const periodLabel = PERIOD_LABELS[period] || period.toUpperCase();

  const latestPrice = prediction?.latest_close;
  const estimatedPrice = prediction?.predicted_next_close;

  const change =
    Number.isFinite(latestPrice) &&
    Number.isFinite(estimatedPrice)
      ? estimatedPrice - latestPrice
      : 0;

  function money(value) {
  if (!Number.isFinite(Number(value))) {
    return '—';
  }

  const isIndianStock =
    symbol.toUpperCase().endsWith('.NS') ||
    symbol.toUpperCase().endsWith('.BO');

  return Number(value).toLocaleString(
    isIndianStock ? 'en-IN' : 'en-US',
    {
      style: 'currency',
      currency: isIndianStock ? 'INR' : 'USD',
      maximumFractionDigits: 2,
    }
  );
}

  // Prepare historical price chart coordinates.
  const chartWidth = 700;
  const chartHeight = 240;
  const chartPadding = 18;

  const priceValues = prices.map(item => item.close);
  const minPrice = priceValues.length
    ? Math.min(...priceValues)
    : 0;
  const maxPrice = priceValues.length
    ? Math.max(...priceValues)
    : 1;
  const priceRange = maxPrice - minPrice || 1;

  const pricePoints = priceValues
    .map((price, index) => {
      const x =
        chartPadding +
        (index / Math.max(priceValues.length - 1, 1)) *
          (chartWidth - chartPadding * 2);

      const y =
        chartHeight -
        chartPadding -
        ((price - minPrice) / priceRange) *
          (chartHeight - chartPadding * 2);

      return `${x},${y}`;
    })
    .join(' ');

  // Prepare strategy vs buy-and-hold chart.
  const equityValues = equityData.flatMap(item => [
    item.strategy_equity,
    item.buy_and_hold_equity,
  ]);

  const minEquity = equityValues.length
    ? Math.min(...equityValues)
    : 0;
  const maxEquity = equityValues.length
    ? Math.max(...equityValues)
    : 1;
  const equityRange = maxEquity - minEquity || 1;

  function makeEquityPoints(key) {
    return equityData
      .map((item, index) => {
        const x =
          18 +
          (index / Math.max(equityData.length - 1, 1)) * 664;

        const y =
          222 -
          ((item[key] - minEquity) / equityRange) * 204;

        return `${x},${y}`;
      })
      .join(' ');
  }

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon">T</div>
          <div>
            <h2>TradeLab</h2>
            <p>Strategy Analytics</p>
          </div>
        </div>

        <p className="menu-label">WORKSPACE</p>
        <div className="nav-item active">
          ▦ &nbsp; Dashboard
        </div>
        <div className="nav-item">
          ↗ &nbsp; Strategy Backtest
        </div>
        <div className="nav-item">
          ◷ &nbsp; Historical Data
        </div>

        <div className="sidebar-bottom">
          <div className="status-dot"></div>
          <div>
            <strong>Backtest Prototype</strong>
            <p>Historical simulation</p>
          </div>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div>
            <p className="eyebrow">
              TRADING STRATEGY ANALYTICS
            </p>
            <h1>Strategy Backtesting Dashboard</h1>
            <p className="subtitle">
              Test a moving-average strategy against historical market data.
            </p>
          </div>

          <div className="live-badge">
            <span></span> API connection
          </div>
        </header>

        <section className="search-panel">
          <div>
            <label htmlFor="symbol">STOCK SYMBOL</label>
            <p>Example: AAPL or RELIANCE.NS</p>
          </div>

          <form
            className="search-form"
            onSubmit={event => {
              event.preventDefault();
              loadData();
            }}
          >
            <input
              id="symbol"
              type="text"
              value={symbol}
              onChange={(event) => setSymbol(event.target.value)}
              placeholder="Enter stock ticker"
             />

            <select
              aria-label="Historical period"
              value={period}
              onChange={event => setPeriod(event.target.value)}
            >
              <option value="1mo">1 month</option>
              <option value="3mo">3 months</option>
              <option value="6mo">6 months</option>
              <option value="1y">1 year</option>
              <option value="2y">2 years</option>
              <option value="5y">5 years</option>
            </select>

            <input
              aria-label="Short moving average window"
              type="number"
              min="1"
              value={shortWindow}
              onChange={event =>
                setShortWindow(event.target.value)
              }
            />

            <input
              aria-label="Long moving average window"
              type="number"
              min="2"
              value={longWindow}
              onChange={event =>
                setLongWindow(event.target.value)
              }
            />

            <button type="submit" disabled={loading}>
              {loading ? 'Running...' : 'Run Backtest →'}
            </button>
          </form>

          <p className="stat-note">
  Moving-average windows: short first, long second.
  Starting capital: {money(10000)}.
</p>
        </section>

        {error && (
          <div className="error-message">{error}</div>
        )}

        {loading && (
          <div className="loading-message">
            Loading data and running historical simulation...
          </div>
        )}

        {backtest && metrics && !loading && (
          <>
            <section className="stats-grid">
              <div className="stat-card">
                <p>INITIAL CAPITAL</p>
                <h2>{money(metrics.initial_capital)}</h2>
                <span className="stat-note">
                  Starting portfolio value
                </span>
              </div>

              <div className="stat-card">
                <p>FINAL STRATEGY EQUITY</p>
                <h2>{money(metrics.final_equity)}</h2>
                <span className="stat-note">
                  After simulated costs
                </span>
              </div>

              <div className="stat-card">
                <p>TOTAL STRATEGY RETURN</p>
                <h2
                  className={
                    metrics.total_return_pct >= 0
                      ? 'positive'
                      : 'negative'
                  }
                >
                  {metrics.total_return_pct > 0 ? '+' : ''}
                  {metrics.total_return_pct}%
                </h2>
                <span className="stat-note">
                  Across selected period
                </span>
              </div>

              <div className="stat-card">
                <p>MAXIMUM DRAWDOWN</p>
                <h2 className="negative">
                  {metrics.max_drawdown_pct}%
                </h2>
                <span className="stat-note">
                  Largest peak-to-trough decline
                </span>
              </div>
            </section>

            <section className="stats-grid">
              <div className="stat-card">
                <p>ANNUALIZED VOLATILITY</p>
                <h2>{metrics.annualized_volatility_pct}%</h2>
                <span className="stat-note">
                  Annualized return variability
                </span>
              </div>

              <div className="stat-card">
                <p>SHARPE RATIO</p>
                <h2>{metrics.sharpe_ratio}</h2>
                <span className="stat-note">
                  Uses a zero risk-free rate
                </span>
              </div>

              <div className="stat-card">
                <p>STRATEGY</p>
                <h2>
                  {backtest.short_window}/{backtest.long_window}
                </h2>
                <span className="stat-note">
                  Short/long moving-average windows
                </span>
              </div>

              <div className="stat-card">
                <p>TRANSACTION COST</p>
                <h2>{backtest.transaction_cost_pct}%</h2>
                <span className="stat-note">
                  Per position change
                </span>
              </div>
            </section>

            <section className="chart-card">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">
                    PORTFOLIO PERFORMANCE
                  </p>
                  <h2>
                    {backtest.symbol} — Strategy vs Buy and Hold
                  </h2>
                </div>

                <span className="period-badge">
                  {periodLabel}
                </span>
              </div>

              {equityData.length > 1 ? (
                <>
                  <div className="chart-summary">
                    <strong>
                      {money(
                        equityData[equityData.length - 1]
                          .strategy_equity
                      )}
                    </strong>
                    <span>Final strategy equity</span>
                  </div>

                  <div className="chart">
                    <svg
                      viewBox="0 0 700 240"
                      role="img"
                      aria-label="Strategy equity compared with buy-and-hold equity"
                    >
                      {[0, 1, 2, 3].map(line => (
                        <line
                          key={line}
                          x1="10"
                          y1={20 + line * 65}
                          x2="690"
                          y2={20 + line * 65}
                          className="grid-line"
                        />
                      ))}

                      <polyline
                        points={makeEquityPoints('strategy_equity')}
                        className="price-line"
                      />

                      <polyline
                        points={makeEquityPoints('buy_and_hold_equity')}
                        fill="none"
                        stroke="#9a8cff"
                        strokeWidth="2.5"
                        strokeLinejoin="round"
                        strokeLinecap="round"
                      />
                    </svg>
                  </div>

                  <div className="chart-labels">
                    <span>{equityData[0].date}</span>
                    <span>
                      {equityData[equityData.length - 1].date}
                    </span>
                  </div>

                  <div className="chart-summary">
                    <span>━ Strategy equity</span>
                    <span style={{ color: '#9a8cff' }}>
                      ━ Buy-and-hold equity
                    </span>
                  </div>
                </>
              ) : (
                <p>Not enough equity data to draw the chart.</p>
              )}
            </section>

            <section className="chart-card">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">MARKET HISTORY</p>
                  <h2>
                    {stock?.symbol} — Closing Prices
                  </h2>
                </div>

                <span className="period-badge">
                  {periodLabel}
                </span>
              </div>

              {prices.length > 1 ? (
                <>
                  <div className="chart-summary">
                    <strong>
                      {money(prices[prices.length - 1].close)}
                    </strong>
                    <span>Most recent available close</span>
                  </div>

                  <div className="chart">
                    <svg
                      viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                      role="img"
                      aria-label="Historical closing prices"
                    >
                      {[0, 1, 2, 3].map(line => (
                        <line
                          key={line}
                          x1="10"
                          y1={20 + line * 65}
                          x2="690"
                          y2={20 + line * 65}
                          className="grid-line"
                        />
                      ))}

                      <polyline
                        points={pricePoints}
                        className="price-line"
                      />
                    </svg>
                  </div>

                  <div className="chart-labels">
                    <span>{prices[0].date}</span>
                    <span>{prices[prices.length - 1].date}</span>
                  </div>
                </>
              ) : (
                <p>No closing-price chart data available.</p>
              )}
            </section>

            {prediction && (
              <section className="note-card">
                <div className="note-icon">i</div>
                <div>
                  <h3>
                    Experimental Linear Regression estimate
                  </h3>
                  <p>
                    Latest close: {money(latestPrice)}.
                    Experimental estimated next close:{' '}
                    {money(estimatedPrice)}.
                    This model has not been validated for predictive
                    accuracy and is separate from the backtesting strategy.
                  </p>
                </div>
              </section>
            )}

            <section className="note-card">
              <div className="note-icon">i</div>
              <div>
                <h3>How to interpret this backtest</h3>
                <p>
                  This is a historical simulation of a long-only
                  moving-average crossover strategy. Signals are
                  applied in the following period. The simulation
                  models a transaction cost of{' '}
                  {backtest.transaction_cost_pct}% per entry or exit.
                  Actual trading can involve additional fees, taxes,
                  slippage and other constraints. Past performance does
                  not guarantee future results. This is an educational
                  tool, not financial advice.
                </p>
              </div>
            </section>
          </>
        )}

        <footer>
          TRADELAB <span>•</span> TRADING STRATEGY BACKTESTING
        </footer>
      </main>
    </div>
  );
}

export default App;
