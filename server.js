import http from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("./public/", import.meta.url));
const port = Number(process.env.PORT || 3000);
const mime = { ".html":"text/html; charset=utf-8", ".css":"text/css; charset=utf-8", ".js":"text/javascript; charset=utf-8", ".json":"application/json; charset=utf-8", ".svg":"image/svg+xml" };

async function getYahoo(symbol, range="1d", interval="5m") {
  const allowedRanges = new Set(["1d","5d","1mo","3mo","6mo","1y"]);
  const allowedIntervals = new Set(["1m","5m","15m","30m","1h","1d","1wk"]);
  if (!/^[A-Z0-9.^=-]{1,18}$/i.test(symbol) || !allowedRanges.has(range) || !allowedIntervals.has(interval)) {
    throw new Error("Invalid symbol or chart range.");
  }
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=${range}&interval=${interval}`;
  const response = await fetch(url, { headers: { "User-Agent":"Mozilla/5.0 StockMarketPro/1.0", "Accept":"application/json" }, signal: AbortSignal.timeout(9000) });
  if (!response.ok) throw new Error(`Market data provider returned ${response.status}.`);
  const payload = await response.json();
  const result = payload?.chart?.result?.[0];
  if (!result) throw new Error(payload?.chart?.error?.description || "No market data was returned.");
  const q = result.indicators?.quote?.[0] || {};
  const adj = result.indicators?.adjclose?.[0]?.adjclose || [];
  const points = (result.timestamp || []).map((t,i)=>({
    time:t*1000, open:q.open?.[i] ?? null, high:q.high?.[i] ?? null,
    low:q.low?.[i] ?? null, close:adj[i] ?? q.close?.[i] ?? null,
    volume:q.volume?.[i] ?? 0
  })).filter(p=>Number.isFinite(p.close));
  return { symbol:result.meta?.symbol || symbol, currency:result.meta?.currency || "USD",
    exchange:result.meta?.exchangeName || "", price:result.meta?.regularMarketPrice ?? points.at(-1)?.close ?? null,
    previousClose:result.meta?.chartPreviousClose ?? result.meta?.previousClose ?? null,
    points, fetchedAt:Date.now(), provider:"Yahoo Finance chart endpoint", delayed:true };
}

const server = http.createServer(async (req,res)=>{
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  res.setHeader("X-Content-Type-Options","nosniff");
  res.setHeader("Referrer-Policy","no-referrer");
  res.setHeader("X-Frame-Options","DENY");
  if (url.pathname.startsWith("/api/")) {
    res.setHeader("Content-Type","application/json; charset=utf-8");
    res.setHeader("Cache-Control","no-store");
    if (req.method !== "GET") { res.writeHead(405); return res.end(JSON.stringify({error:"Method not allowed"})); }
    try {
      if (url.pathname === "/api/health") {
        res.writeHead(200); return res.end(JSON.stringify({ok:true, service:"StockMarket Pro", marketData:"Yahoo Finance chart endpoint"}));
      }
      if (url.pathname === "/api/quote" || url.pathname === "/api/chart") {
        const symbol = (url.searchParams.get("symbol") || "AAPL").toUpperCase();
        const range = url.searchParams.get("range") || "1d";
        const interval = url.searchParams.get("interval") || (range === "1d" ? "5m" : "1d");
        const data = await getYahoo(symbol,range,interval);
        res.writeHead(200); return res.end(JSON.stringify(data));
      }
      res.writeHead(404); return res.end(JSON.stringify({error:"Unknown API endpoint"}));
    } catch (e) {
      res.writeHead(502); return res.end(JSON.stringify({error:e.message || "Market data unavailable", hint:"Try again later or use simulation mode."}));
    }
  }
  let path = decodeURIComponent(url.pathname === "/" ? "/index.html" : url.pathname);
  path = normalize(path).replace(/^(\.\.[/\\])+/, "");
  const full = join(root,path);
  try {
    const body = await readFile(full);
    res.writeHead(200,{"Content-Type":mime[extname(full)] || "application/octet-stream","Cache-Control":path.endsWith(".html")?"no-cache":"public, max-age=3600"});
    res.end(body);
  } catch {
    res.writeHead(404,{"Content-Type":"text/plain; charset=utf-8"}); res.end("Not found");
  }
});
server.listen(port,()=>console.log(`StockMarket Pro running at http://localhost:${port}`));