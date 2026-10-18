# StockMarket Pro

A professional-looking browser stock market game / paper-trading simulator. It uses virtual funds only. It does not place real orders or connect to a brokerage.

## Features
- Responsive dark trading-terminal UI
- $100,000 starting virtual balance
- Buy and sell paper positions, weighted-average cost basis, cash/portfolio P&L
- Market and basic pending-limit order flows
- Watchlist, interactive price chart, simulated price ticks and fictional market events
- Order history and CSV exports
- Browser localStorage persistence
- Optional delayed market-data mode via a server-side Yahoo Finance chart endpoint

## Requirements
- Node.js 20 or newer
- Internet access for the optional market-data mode

## Run locally
1. Extract the project ZIP.
2. Open a terminal in the `stockmarket-pro` folder.
3. Run `npm start`.
4. Open `http://localhost:3000`.

No npm packages are required. The app uses Node's built-in HTTP server.

## Market data notes
Select **Market data** in the app to request a quote and chart for the currently selected ticker. The server fetches Yahoo Finance chart data, where available. This endpoint is unofficial and may be throttled, blocked, delayed, or changed by the provider. It is not guaranteed to be real-time. When the request fails, switch back to Simulation. The game does not provide a guaranteed real-time feed, official exchange feed, financial-news feed, or brokerage integration.

The default game values are fictional demonstration values. Simulation mode changes them randomly and should not be interpreted as actual market prices. In market-data mode, fetched quotes update the displayed valuation for any holdings in that symbol.

## Deployment
Deploy to a Node.js host that supports a long-running server (for example, a suitable VPS or Node hosting platform). Static-only hosting such as GitHub Pages cannot run `server.js`, so the market-data proxy endpoint will not work there. You can deploy the static `public/` folder to a static host for simulation-only play, but configure a backend proxy before enabling live market data in production.

## Important production improvements
Before a public launch, add authentication, server-side portfolios and order validation, rate limiting, a licensed market-data provider, automated tests, CSP/security headers, persistent database storage, and multiplayer/leaderboards if required. Browser localStorage is per-browser and can be edited by the user, so it is not suitable for competitive rankings or valuable accounts.