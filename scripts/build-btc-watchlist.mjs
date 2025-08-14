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
const EXCHANGES = ["binance", "okx", "mexc", "kucoin"];
const QUOTE = "BTC";

// Prefer configurable host via env, otherwise try a list of fallbacks
const BINANCE_HOSTS = [
	process.env.BINANCE_HOST?.trim(),
	"api1.binance.com",
	"api-gcp.binance.com",
	"api4.binance.com",
	"api.binance.com",
].filter(Boolean);

/**
 * Create an exchange instance with optional URL overrides.
 * For Binance, we can pass { hostname } to ccxt to switch hosts.
 */
function makeExchange(id, opts = {}) {
	const Exchange = ccxt[id];
	if (!Exchange) throw new Error(`Exchange not found in ccxt: ${id}`);
	return new Exchange({
		enableRateLimit: true,
		timeout: 30000,
		...opts,
	});
}

/**
 * Load spot markets with quote=BTC from an exchange instance,
 * returning an array of "EXCHANGE:BASEBTC".
 */
async function loadBtcPairs(exchange, id) {
	const markets = await exchange.loadMarkets();
	const up = id.toUpperCase();
	return Object.values(markets)
		.filter((m) => m.spot && m.quote === QUOTE && m.active !== false)
		.map((m) => `${up}:${m.base}${QUOTE}`);
}

/**
 * Robust Binance fetch with multiple host fallbacks.
 */
async function fetchBinancePairs() {
	const errors = [];
	for (const host of BINANCE_HOSTS) {
		try {
			// ccxt supports "hostname" for Binance
			const binance = makeExchange("binance", { hostname: host });
			const lines = await loadBtcPairs(binance, "binance");

			if (lines.length === 0) {
				// Could be a blocked IP response that "succeeds" but returns no data.
				errors.push(`Host ${host} returned 0 pairs`);
				console.warn(`[BINANCE] ${host}: returned 0 pairs, trying next host...`);
				continue;
			}

			console.log(`[BINANCE] using host: ${host} (${lines.length} pairs)`);
			// Unique + sorted
			return Array.from(new Set(lines)).sort();
		} catch (e) {
			const msg = e && e.message ? e.message : String(e);
			errors.push(`Host ${host} error: ${msg}`);
			console.warn(`[BINANCE] ${host}: ${msg} — trying next host...`);
		}
	}
	console.error("[BINANCE] All hosts failed:\n" + errors.map((x) => "- " + x).join("\n"));
	return []; // fail gracefully so the build still produces other exchanges
}

/**
 * Generic fetch for non-Binance exchanges.
 */
async function fetchGenericPairs(id) {
	const ex = makeExchange(id);
	const lines = await loadBtcPairs(ex, id);
	return Array.from(new Set(lines)).sort();
}

async function fetchExchangePairs(id) {
	if (id === "binance") {
		return fetchBinancePairs();
	}
	return fetchGenericPairs(id);
}

async function main() {
	if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

	/** @type {Record<string, string[]>} */
	const byExchange = {};

	// Fetch sequentially so logs are easier to read in Actions
	for (const id of EXCHANGES) {
		const up = id.toUpperCase();
		try {
			const lines = await fetchExchangePairs(id);
			byExchange[up] = lines;
			console.log(`[${up}] fetched ${lines.length} symbols`);
		} catch (e) {
			console.error(`[${up}] failed:`, e?.message || e);
			byExchange[up] = [];
		}
	}

	// Write per-exchange files
	for (const up of EXCHANGES.map((x) => x.toUpperCase())) {
		const file = path.join(OUT_DIR, `${up}_BTC_PAIRS.txt`);
		const lines = byExchange[up] || [];
		fs.writeFileSync(file, lines.join("\n") + "\n", "utf8");
		console.log(`Wrote ${file} (${lines.length} symbols)`);
	}

	// Combined file: grouped by exchange in EXCHANGES order
	const combined = EXCHANGES.map((id) => byExchange[id.toUpperCase()]).flat();

	const allFile = path.join(OUT_DIR, "ALL_BTC_PAIRS.txt");
	fs.writeFileSync(allFile, combined.join("\n") + "\n", "utf8");
	console.log(`Wrote ${allFile} (${combined.length} symbols)`);

	// Metadata for visibility/badges
	const meta = {
		generatedAt: new Date().toISOString(),
		exchanges: EXCHANGES.map((e) => e.toUpperCase()),
		files: [
			"lists/ALL_BTC_PAIRS.txt",
			"lists/BINANCE_BTC_PAIRS.txt",
			"lists/OKX_BTC_PAIRS.txt",
			"lists/MEXC_BTC_PAIRS.txt",
			"lists/KUCOIN_BTC_PAIRS.txt",
		],
		binanceHostsTried: BINANCE_HOSTS,
	};
	fs.writeFileSync(path.join(__dirname, "..", "META.json"), JSON.stringify(meta, null, 2));
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
