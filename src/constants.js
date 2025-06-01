const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

const SELECTORS = [
    'div.flex.flex-col.px-4.pt-4.pb-2\\.5.bg-fill-01.rounded-md.h-full'
];

const DATE_SELECTORS = ['.date', '.time', '.published', '[class*="date"]', '[class*="time"]'];

const TITLE_SELECTORS = ['h1', 'h2', 'h3', 'h4', 'h5', '.title', '.headline', '.card-title'];

const DESC_SELECTORS = ['.summary', '.excerpt', '.description', '.card-text', 'p'];

module.exports = { USER_AGENT, SELECTORS, DATE_SELECTORS, TITLE_SELECTORS, DESC_SELECTORS };