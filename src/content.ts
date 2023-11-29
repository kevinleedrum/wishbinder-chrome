const priceRegex = /[$£€¥]([0-9]+[.,]?[0-9]*)/;
const currentPriceRegex = /Current Price[:]?\s*[$£€¥]?([0-9]+[.,]?[0-9]*)/i;
const q = (d: Document, s: string) => d.querySelector(s)?.textContent?.trim();
const qm = (d: Document, s: string) =>
  d.querySelector(s)?.getAttribute("content")?.trim();
const qPrice = (d: Document, s: string) => q(d, s)?.match(priceRegex)?.[1];
const qmPrice = (d: Document, s: string) => qm(d, s)?.match(priceRegex)?.[1];

const PriceStrategy: Record<string, (d: Document) => string | undefined> = {
  "ae.com": (d: Document) =>
    qPrice(d, ".product-sale-price, .product-list-price"),
  "amazon.com": (d: Document) =>
    qPrice(d, '[data-feature-name="corePriceDisplay_desktop"], .a-price'),
  "apple.com": (d: Document) => qPrice(d, '[data-autom="full-price"]'),
  "bestbuy.com": (d: Document) => qPrice(d, '[data-testid="customer-price"]'),
  "costco.com": (d: Document) =>
    qPrice(d, '[automation-id="productPriceOutput]'),
  "craigslist.com": (d: Document) => qPrice(d, ".price"),
  "ebay.com": (d: Document) => qPrice(d, '[data-testid="x-price-primary"]'),
  "express.com": (d: Document) => qPrice(d, ".price > .srOnly"),
  "etsy.com": (d: Document) => qPrice(d, '[data-selector="price-only"]'),
  "gap.com": (d: Document) => qPrice(d, ".pdp-pricing"),
  "homedepot.com": (d: Document) => qPrice(d, ".price"),
  "jcpenney.com": (d: Document) =>
    qPrice(d, '[data-automation-id="at-price-value"]'),
  "kohls.com": (d: Document) => qPrice(d, ".pdpprice-row2"),
  "lowes.com": (d: Document) => qPrice(d, ".main-price"),
  "macys.com": (d: Document) => qPrice(d, '[data-el="price"]'),
  "newegg.com": (d: Document) => qPrice(d, ".price-current"),
  "nike.com": (d: Document) =>
    qPrice(
      d,
      '[data-test="product-price-reduced"], [data-test="product-price"]'
    ),
  "nordstrom.com": (d: Document) =>
    d.textContent?.match(currentPriceRegex)?.[1],
  "overstock.com": (d: Document) => qPrice(d, '[data-testid="current-price"]'),
  "poshmark.com": (d: Document) =>
    qmPrice(d, 'meta[property="product:price:amount"]'),
  "sephora.com": (d: Document) => qPrice(d, '[data-comp="Price"]'),
  "target.com": (d: Document) => qPrice(d, '[data-test="product-price"]'),
  "victoriassecret.com": (d: Document) =>
    qPrice(d, '[data-testid="ProductPrice"] > :not(del)'),
  "walmart.com": (d: Document) => qPrice(d, '[itemprop="price"]'),
  "wayfair.com": (d: Document) =>
    qmPrice(d, 'meta[property="product:price:amount"]'),
  "wish.com": (d: Document) =>
    qPrice(d, '[class*="PurchaseContainer"] [data-testid="product-price"]'),
  generalClassPrice: (d: Document) => qPrice(d, '[class*="price"]'),
  generalCurrentPriceRegex: (d: Document) =>
    d.textContent?.match(currentPriceRegex)?.[1],
  generalDataTestPrice: (d: Document) =>
    qPrice(d, '[data-test*="price"], [data-testid*="price"]'),
  generalMetaProductPrice: (d: Document) =>
    qmPrice(d, 'meta[property="product:price:amount"]'),
  generalPriceRegex: (d: Document) => d.textContent?.match(priceRegex)?.[1],
};

function extractPrice() {
  const hostname = getHostname();
  let price;
  if (PriceStrategy[hostname]) price = PriceStrategy[hostname](document);
  if (!price) price = PriceStrategy["generalCurrentPriceRegex"](document);
  if (!price) price = PriceStrategy["generalMetaProductPrice"](document);
  if (!price) price = PriceStrategy["generalDataTestPrice"](document);
  if (!price) price = PriceStrategy["generalClassPrice"](document);
  if (!price) price = PriceStrategy["generalPriceRegex"](document);
  if (!price) return;
  const parsedPrice = parsePrice(price);
  if (parsedPrice) return parsedPrice / 100;
}

function extractImages() {
  const images = document.getElementsByTagName("img");
  const imageURLs = [];
  for (let i = 0; i < images.length; i++) {
    let src = images[i].src;
    if (src.endsWith("svg") || src.endsWith("gif")) continue;
    imageURLs.push(images[i].src);
  }
  return imageURLs.filter(Boolean);
}

function extractDescription() {
  let description = document.title;
  description = description.trim().substring(0, 255);
  return description;
}

function getHostname() {
  const parts = window.location.hostname.split(".").reverse();
  if (parts.length > 2 && parts[1].length === 2) {
    return `${parts[2]}.${parts[1]}.${parts[0]}`;
  }
  return `${parts[1]}.${parts[0]}`;
}

function parsePrice(value: string): number | undefined {
  if (value == null) return;
  const float = value.replace(/[^\d,.]/g, "").replace(/,/g, ".");
  if (!float) return undefined; // Not a number
  return parseFloat(float) * 100; // Convert to cents for storing as integer
}

chrome.runtime.onMessage.addListener(async function (request, _, sendResponse) {
  if (request === "getData") {
    const data = {
      images: extractImages(),
      price: extractPrice(),
      description: extractDescription(),
      url: window.location.href,
    };
    sendResponse(data);
  }
});
