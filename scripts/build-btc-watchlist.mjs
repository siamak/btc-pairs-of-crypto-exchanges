// Build BTC-quoted spot pairs for TradingView watchlists.
// Outputs plain text files (one symbol per line): EXCHANGE:BASEBTC
// Usage: node scripts/build-btc-watchlist.mjs

import ccxt from "ccxt";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const OUT_DIR = path.join(__dirname, "..", "lists");
const EXCHANGES = ["binance", "okx", "mexc", "kucoin", "coinbase"];
const QUOTE = "BTC";

const BINANCE_HOSTS = ["data-api.binance.vision", process.env.BINANCE_HOST?.trim()].filter(Boolean);

function makeExchange(id, opts = {}) {
	const Exchange = ccxt[id];
	if (!Exchange) throw new Error(`Exchange not found in ccxt: ${id}`);
	return new Exchange({
		enableRateLimit: true,
		timeout: 30000,
		...opts,
	});
}

async function loadBtcPairs(exchange, id) {
	const markets = await exchange.loadMarkets();
	const up = id.toUpperCase();
	return Object.values(markets)
		.filter((m) => m.spot && m.quote === QUOTE && m.active !== false)
		.map((m) => `${up}:${m.base}${QUOTE}`);
}

async function fetchBinancePairs() {
	const errors = [];
	for (const host of BINANCE_HOSTS) {
		try {
			const binance = makeExchange("binance");

			// Force override base URL for both public and private endpoints
			binance.urls.api = {
				public: `https://${host}/api/v3`,
				private: `https://${host}/api/v3`,
			};

			const lines = await loadBtcPairs(binance, "binance");

			if (lines.length === 0) {
				errors.push(`Host ${host} returned 0 pairs`);
				console.warn(`[BINANCE] ${host}: returned 0 pairs, trying next host...`);
				continue;
			}

			console.log(`[BINANCE] using host: ${host} (${lines.length} pairs)`);
			return Array.from(new Set(lines)).sort();
		} catch (e) {
			const msg = e?.message || String(e);
			errors.push(`Host ${host} error: ${msg}`);
			console.warn(`[BINANCE] ${host}: ${msg} — trying next host...`);
		}
	}
	console.error("[BINANCE] All hosts failed:\n" + errors.map((x) => "- " + x).join("\n"));
	return [];
}

async function fetchGenericPairs(id) {
	const ex = makeExchange(id);
	const lines = await loadBtcPairs(ex, id);
	return Array.from(new Set(lines)).sort();
}

async function fetchExchangePairs(id) {
	if (id === "binance") return fetchBinancePairs();
	return fetchGenericPairs(id);
}

async function main() {
	if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

	/** @type {Record<string, string[]>} */
	const byExchange = {};
	const metaFiles = [];

	for (const id of EXCHANGES) {
		const up = id.toUpperCase();
		try {
			const lines = await fetchExchangePairs(id);

			if (lines.length > 0) {
				byExchange[up] = lines;
				const file = path.join(OUT_DIR, `${up}_BTC_PAIRS.txt`);
				fs.writeFileSync(file, lines.join("\n") + "\n", "utf8");
				metaFiles.push(`lists/${up}_BTC_PAIRS.txt`);
				console.log(`[${up}] wrote file with ${lines.length} symbols`);
			} else {
				console.warn(`[${up}] skipped — no pairs found`);
				byExchange[up] = [];
			}
		} catch (e) {
			console.error(`[${up}] failed:`, e?.message || e);
			byExchange[up] = [];
		}
	}

	// Combined file: only from exchanges that had results
	const combined = EXCHANGES.map((id) => byExchange[id.toUpperCase()])
		.flat()
		.filter(Boolean);

	if (combined.length > 0) {
		const allFile = path.join(OUT_DIR, "ALL_BTC_PAIRS.txt");
		fs.writeFileSync(allFile, combined.join("\n") + "\n", "utf8");
		metaFiles.unshift("lists/ALL_BTC_PAIRS.txt");
		console.log(`Wrote ${allFile} (${combined.length} symbols)`);
	} else {
		console.warn("No pairs found for any exchange — skipping ALL_BTC_PAIRS.txt");
	}

	// Metadata
	const meta = {
		generatedAt: new Date().toISOString(),
		exchanges: EXCHANGES.map((e) => e.toUpperCase()),
		files: metaFiles,
		binanceHostsTried: BINANCE_HOSTS,
	};
	fs.writeFileSync(path.join(__dirname, "..", "META.json"), JSON.stringify(meta, null, 2));
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
