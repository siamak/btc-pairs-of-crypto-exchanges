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

async function fetchExchangePairs(id) {
	const Cls = ccxt[id];
	if (!Cls) throw new Error(`Exchange not found in ccxt: ${id}`);
	const ex = new Cls({ enableRateLimit: true, timeout: 30000 });

	const markets = await ex.loadMarkets();

	// Filter: spot only, active (if known), quoted in BTC
	const lines = Object.values(markets)
		.filter((m) => m.spot && m.quote === QUOTE && m.active !== false)
		.map((m) => `${id.toUpperCase()}:${m.base}${QUOTE}`);

	// Unique + sorted for stability
	return Array.from(new Set(lines)).sort();
}

async function main() {
	if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

	/** @type {Record<string, string[]>} */
	const byExchange = {};

	const settled = await Promise.allSettled(EXCHANGES.map(fetchExchangePairs));

	EXCHANGES.forEach((id, idx) => {
		const up = id.toUpperCase();
		const result = settled[idx];
		if (result.status === "fulfilled") {
			byExchange[up] = result.value;
		} else {
			console.error(`[${up}] failed:`, result.reason?.message || result.reason);
			byExchange[up] = [];
		}
	});

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
	};
	fs.writeFileSync(path.join(__dirname, "..", "META.json"), JSON.stringify(meta, null, 2));
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
