# BTC Pairs of Crypto Exchanges

![Refresh cadence](https://img.shields.io/badge/refresh-weekly-brightgreen)
![Last commit](https://img.shields.io/github/last-commit/siamak/btc-pairs-of-crypto-exchanges)
![GitHub Workflow Status](https://img.shields.io/github/actions/workflow/status/siamak/btc-pairs-of-crypto-exchanges/update.yml?label=update%20workflow)
![License](https://img.shields.io/github/license/siamak/btc-pairs-of-crypto-exchanges)
![Stars](https://img.shields.io/github/stars/siamak/btc-pairs-of-crypto-exchanges?style=social)

**BTC Pairs of Crypto Exchanges** is an open-source project that automatically fetches and updates **TradingView-importable** watchlists of BTC-quoted **spot** pairs from:

-   **BINANCE**
-   **OKX**
-   **MEXC**
-   **KUCOIN**

The lists are refreshed **weekly** using [ccxt](https://github.com/ccxt/ccxt) and GitHub Actions.

---

## 📂 Outputs

| File                          | Description                                | Link                                  |
| ----------------------------- | ------------------------------------------ | ------------------------------------- |
| `lists/ALL_BTC_PAIRS.txt`     | Combined list, grouped by exchange         | [View](./lists/ALL_BTC_PAIRS.txt)     |
| `lists/BINANCE_BTC_PAIRS.txt` | BINANCE BTC pairs                          | [View](./lists/BINANCE_BTC_PAIRS.txt) |
| `lists/OKX_BTC_PAIRS.txt`     | OKX BTC pairs                              | [View](./lists/OKX_BTC_PAIRS.txt)     |
| `lists/MEXC_BTC_PAIRS.txt`    | MEXC BTC pairs                             | [View](./lists/MEXC_BTC_PAIRS.txt)    |
| `lists/KUCOIN_BTC_PAIRS.txt`  | KUCOIN BTC pairs                           | [View](./lists/KUCOIN_BTC_PAIRS.txt)  |
| `META.json`                   | Metadata (timestamp, exchanges, file list) | [View](./META.json)                   |

---

## ✨ Features

-   **Weekly auto-updates** via GitHub Actions
-   **Multiple exchanges** (BINANCE, OKX, MEXC, KUCOIN)
-   **TradingView-ready format** (`EXCHANGE:BASEBTC`)
-   **Plain text output** (no JSON/CSV parsing needed)
-   **Open source** & easy to extend
-   **Metadata file** for programmatic use

---

## 📥 How to import into TradingView

1. Open TradingView → **Watchlist** panel.
2. Click **⋮** (More) → **Import watchlist**, or use **Add symbol → Paste**.
3. Paste the contents of one of the files in [`lists/`](./lists/), e.g., [`ALL_BTC_PAIRS.txt`](./lists/ALL_BTC_PAIRS.txt).
4. Confirm.

---

## 🛠 Local build

```bash
git clone https://github.com/siamak/btc-pairs-of-crypto-exchanges.git
cd btc-pairs-of-crypto-exchanges
pnpm install
pnpm run generate
# Outputs in lists/*.txt
```
