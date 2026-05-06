import Parser from "rss-parser";

export class RssService {

  constructor() {
  this.parser = new Parser({
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'application/rss+xml, application/xml, text/xml, */*'
    }
  });
  this.feeds = [
    { url: "https://feeds.marketwatch.com/marketwatch/topstories/",        source: "MarketWatch" },
    { url: "https://feeds.marketwatch.com/marketwatch/marketpulse/",       source: "MarketWatch" },
    { url: "https://feeds.marketwatch.com/marketwatch/economy-politics/",  source: "MarketWatch" },
    { url: "https://www.nasdaq.com/feed/rssoutbound?category=Markets",     source: "Nasdaq" },
    { url: "https://www.nasdaq.com/feed/rssoutbound?category=Stocks",      source: "Nasdaq" },
    { url: "https://www.nasdaq.com/feed/rssoutbound?category=Commodities", source: "Nasdaq" },
    { url: "https://www.nasdaq.com/feed/rssoutbound?category=ETFs",        source: "Nasdaq" },
    { url: "https://www.forexlive.com/feed/news",                          source: "ForexLive" },
    { url: "https://www.forexlive.com/feed/forex",                         source: "ForexLive" },
    { url: "https://www.coindesk.com/arc/outboundfeeds/rss/",              source: "CoinDesk" },
    { url: "https://cointelegraph.com/rss",                                source: "CoinTelegraph" },
    { url: "https://finance.yahoo.com/news/rssindex",                      source: "Yahoo Finance" },
    { url: "https://finance.yahoo.com/rss/topstories",                     source: "Yahoo Finance" }
  ];
}

  calcImpact(text) {
  const t = String(text || "").toLowerCase();

  if (
    t.includes("cpi")            ||
    t.includes("fed")            ||
    t.includes("fomc")           ||
    t.includes("ecb")            ||
    t.includes("inflation")      ||
    t.includes("interest rate")  ||
    t.includes("recession")      ||
    t.includes("crash")          ||
    t.includes("default")        ||
    t.includes("bank")           ||
    t.includes("earnings")       ||
    t.includes("guidance")       ||
    t.includes("gdp")            ||
    t.includes("unemployment")   ||
    t.includes("rate hike")      ||
    t.includes("rate cut")       ||
    t.includes("crisis")         ||
    t.includes("bankruptcy")     ||
    t.includes("tariff")         ||
    t.includes("sanction")       ||
    t.includes("war")            ||
    t.includes("collapse")       ||
    t.includes("surge")          ||
    t.includes("plunge")         ||
    t.includes("layoffs")        ||
    t.includes("federal reserve")||
    t.includes("powell")         ||
    t.includes("debt ceiling")   ||
    t.includes("downgrade")      ||
    t.includes("selloff")        ||
    t.includes("rally")
  ) return "high";

  if (
    t.includes("forecast")    ||
    t.includes("outlook")     ||
    t.includes("beats")       ||
    t.includes("misses")      ||
    t.includes("regulation")  ||
    t.includes("sec")         ||
    t.includes("merger")      ||
    t.includes("acquisition") ||
    t.includes("ipo")         ||
    t.includes("dividend")    ||
    t.includes("buyback")     ||
    t.includes("upgrade")     ||
    t.includes("downgrade")   ||
    t.includes("target price")||
    t.includes("analyst")     ||
    t.includes("guidance")    ||
    t.includes("stake")       ||
    t.includes("deal")        ||
    t.includes("contract")    ||
    t.includes("partnership") ||
    t.includes("launch")      ||
    t.includes("profit")      ||
    t.includes("loss")        ||
    t.includes("revenue")     ||
    t.includes("quarterly")
  ) return "medium";

  return "low";
}

  async fetchFeed(feed) {
    try {
      const result = await this.parser.parseURL(feed.url);
      const items  = [];

      for (let i = 0; i < result.items.length && i < 10; i++) {
        const it    = result.items[i];
        const title = it.title || "";
        const desc  = String(it.contentSnippet || it.content || "");

        items.push({
          title:       title,
          description: desc,
          link:        it.link    || "",
          date:        it.isoDate || it.pubDate || "",
          source:      feed.source,
          impact:      this.calcImpact(title + " " + desc)
        });
      }

      return items;
    } catch (err) {
      console.warn("⚠️ Feed " + feed.source + " no disponible:", err.message);
      return [];
    }
  }

  async fetchNews() {
    const results = await Promise.allSettled(
      this.feeds.map(function(feed) { return this.fetchFeed(feed); }.bind(this))
    );

    const items = [];
    for (let i = 0; i < results.length; i++) {
      if (results[i].status === "fulfilled") {
        for (let j = 0; j < results[i].value.length; j++) {
          items.push(results[i].value[j]);
        }
      }
    }

    const seen  = new Set();
    const dedup = [];
    for (let i = 0; i < items.length; i++) {
      if (!seen.has(items[i].title)) {
        seen.add(items[i].title);
        dedup.push(items[i]);
      }
    }

    dedup.sort(function(a, b) {
      return new Date(b.date) - new Date(a.date);
    });

    return dedup.slice(0, 80);
  }
}