const puppeteer = require('puppeteer');
const cheerio = require('cheerio');
const fs = require('fs').promises;
const axios = require('axios');
const {
    parseTurkishDate,
    escapeXML
} = require('./utils');
const { humanLikeBehavior } = require('./humanBehavior');
const { USER_AGENT, SELECTORS, DATE_SELECTORS, TITLE_SELECTORS, DESC_SELECTORS } = require('./constants');

class AdvancedRSSGenerator {
    constructor(baseUrl) {
        this.baseUrl = baseUrl;
        this.browser = null;
        this.page = null;
    }

    async setupBrowser() {
        try {
            console.log('🚀 Tarayıcı başlatılıyor...');
            this.browser = await puppeteer.launch({
                headless: true,
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-accelerated-2d-canvas',
                    '--no-first-run',
                    '--no-zygote',
                    '--disable-gpu',
                    '--disable-blink-features=AutomationControlled',
                    '--disable-features=VizDisplayCompositor',
                    '--window-size=1920,1080',
                ],
                ignoreDefaultArgs: ['--enable-automation'],
                defaultViewport: {
                    width: 1920,
                    height: 1080
                }
            });
            this.page = await this.browser.newPage();
            await this.page.setUserAgent(USER_AGENT);

            await this.page.evaluateOnNewDocument(() => {
                Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
            });
            await this.page.evaluateOnNewDocument(() => {
                window.chrome = { runtime: {} };
                Object.defineProperty(navigator, 'languages', { get: () => ['tr-TR', 'tr', 'en-US', 'en'] });
                Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
            });

            console.log('✅ Tarayıcı başarıyla başlatıldı');
            return true;
        } catch (error) {
            console.error('❌ Tarayıcı başlatılamadı:', error.message);
            return false;
        }
    }

    async fetchPageWithPuppeteer(url) {
        try {
            console.log(`🌐 Sayfa yükleniyor: ${url}`);
            await this.page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
            await humanLikeBehavior(this.page);
            await new Promise(resolve => setTimeout(resolve, 3000)); // Dinamik içerik için bekle
            const content = await this.page.content();
            console.log('✅ Sayfa başarıyla yüklendi');
            return content;
        } catch (error) {
            console.error('❌ Puppeteer ile sayfa yüklenemedi:', error.message);
            return null;
        }
    }

    async fallbackAxios(url) {
        try {
            console.log('🔄 Fallback: Axios ile deneniyor...');
            const headers = { 'User-Agent': USER_AGENT, 'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8', 'Accept-Language': 'tr-TR,tr;q=0.9,en;q=0.8', 'DNT': '1', 'Connection': 'keep-alive', 'Upgrade-Insecure-Requests': '1' };
            const response = await axios.get(url, { headers, timeout: 15000, maxRedirects: 5 });

            if (response.status === 200) {
                console.log('✅ Axios ile başarılı');
                return response.data;
            } else {
                console.log(`❌ HTTP ${response.status} hatası`);
                return null;
            }
        } catch (error) {
            console.error('❌ Axios hatası:', error.message);
            return null;
        }
    }

    parseFintablesContent(htmlContent) {
        const $ = cheerio.load(htmlContent);
        const articles = [];
        console.log('📊 İçerik analiz ediliyor...');

        const foundElements = $(SELECTORS[0]);
        console.log(`📄 Toplam ${foundElements.length} element bulundu`);

        const elementsToProcess = foundElements.slice(0, 20);
        for (let i = 0; i < elementsToProcess.length; i++) {
            try {
                const article = this.extractArticleData($(elementsToProcess[i]), $);
                if (article) {
                    articles.push(article);
                    console.log(`✅ Makale ${i + 1}: ${article.title.substring(0, 50)}...`);
                }
            } catch (error) {
                console.error(`❌ Element ${i + 1} işlenirken hata:`, error.message);
                continue;
            }
        }
        return articles;
    }

    isRelevantLink(href, text) {
        const keywords = ['bülten', 'bulletin', 'research', 'analiz', 'rapor', 'araştırma'];
        const hrefLower = href.toLowerCase();
        const textLower = text.toLowerCase();
        return keywords.some(keyword => hrefLower.includes(keyword) || textLower.includes(keyword));
    }

    extractArticleData(element, $) {
        const groupHeaderAnchor = element.find('div.flex.text-body-sm-tight a').first();
        const groupTitle = groupHeaderAnchor.text().trim();

        if (!groupTitle) return null;

        let dateText = '';
        const headerDiv = element.find('div.flex.text-body-sm-tight').first();
        headerDiv.contents().each((i, el) => {
            if (el.type === 'text') {
                const text = $(el).text().trim();
                if (text.length > 0) dateText = text;
            }
        });
        const pubDate = dateText ? parseTurkishDate(dateText) : new Date();

        // Haber başlığı ve link
        const newsAnchor = element.find('a').not(groupHeaderAnchor).first();
        if (!newsAnchor.length) return null;

        const description = newsAnchor.text().trim();
        const link = new URL(newsAnchor.attr('href'), this.baseUrl).href;

        return {
            title: description,
            link,
            description,
            pubDate,
            guid: link
        };
    }

    extractDate(element) {
        for (const selector of DATE_SELECTORS) {
            const dateElement = element.find(selector);
            if (dateElement.length > 0) {
                const dateText = dateElement.text().trim();
                const parsedDate = parseTurkishDate(dateText);
                if (parsedDate) return parsedDate;
            }
        }
        // Metin içinde tarih kontrolü
        const textContent = element.text();
        const datePatterns = [
            /(\d{1,2})[\.\/\-](\d{1,2})[\.\/\-](\d{4})/,
            /(\d{1,2})\s+(Ocak|Şubat|Mart|Nisan|Mayıs|Haziran|Temmuz|Ağustos|Eylül|Ekim|Kasım|Aralık)\s+(\d{4})/i
        ];
        for (const pattern of datePatterns) {
            const match = textContent.match(pattern);
            if (match) {
                const parsedDate = parseTurkishDate(match[0]);
                if (parsedDate) return parsedDate;
            }
        }
        return null;
    }

    createRSSXML(articles) {
        const now = new Date();
        const rssDate = now.toUTCString();
        let rssXML = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:atom="http://www.w3.org/2005/Atom">
    <channel>
        <title>Fintables Araştırma Bültenleri</title>
        <link>${this.baseUrl}</link>
        <description>Fintables araştırma ve analiz bültenleri - Otomatik RSS Feed</description>
        <language>tr-TR</language>
        <lastBuildDate>${rssDate}</lastBuildDate>
        <generator>Advanced RSS Generator v2.0 (Node.js)</generator>
        <managingEditor>noreply@fintables.com (Fintables)</managingEditor>
        <webMaster>noreply@fintables.com (Fintables)</webMaster>
        <ttl>60</ttl>
        <atom:link href="${this.baseUrl}" rel="self" type="application/rss+xml" />`;

        for (const article of articles) {
            let pubDateObj = article.pubDate;
            if (!(pubDateObj instanceof Date) || isNaN(pubDateObj)) {
                pubDateObj = new Date();
            }
            const pubDate = pubDateObj.toUTCString();

            const escapedTitle = escapeXML(article.title);
            const escapedDescription = escapeXML(article.description);

            rssXML += `
        <item>
            <title>${escapedTitle}</title>
            <link>${article.link}</link>
            <description><![CDATA[${escapedDescription}]]></description>
            <pubDate>${pubDate}</pubDate>
            <guid isPermaLink="true">${article.guid}</guid>
            <source>Fintables</source>
        </item>`;
        }
        rssXML += `
    </channel>
</rss>`;
        return rssXML;
    }

    async generateRSS(outputFile = 'fintables_rss.xml') {
        try {
            console.log('============================================================');
            console.log('🤖 ADVANCED RSS GENERATOR - Node.js Edition');
            console.log('============================================================');
            console.log(`🎯 Hedef URL: ${this.baseUrl}`);

            const browserStarted = await this.setupBrowser();
            if (!browserStarted) {
                console.log('❌ Tarayıcı başlatılamadı!');
                return false;
            }

            let htmlContent = await this.fetchPageWithPuppeteer(this.baseUrl);
            if (!htmlContent) {
                console.log('🔄 Puppeteer başarısız, fallback deneniyor...');
                htmlContent = await this.fallbackAxios(this.baseUrl);
            }

            if (!htmlContent) {
                console.log('❌ Hiçbir yöntemle sayfa içeriği alınamadı!');
                return false;
            }

            const articles = this.parseFintablesContent(htmlContent);
            if (articles.length === 0) {
                console.log('❌ Hiç makale bulunamadı!');
                return false;
            }

            console.log(`✅ ${articles.length} makale bulundu`);

            const rssXML = this.createRSSXML(articles);

            await fs.writeFile(outputFile, rssXML, 'utf8');
            console.log(`🎉 RSS feed başarıyla oluşturuldu: ${outputFile}`);
            console.log(`\n📋 Özet:`);
            console.log(`   • Toplam makale: ${articles.length}`);
            console.log(`   • Dosya boyutu: ${rssXML.length} karakter`);
            console.log(`   • Son güncelleme: ${new Date().toLocaleString('tr-TR')}`);

            return true;
        } catch (error) {
            console.error('❌ RSS oluşturulurken hata:', error.message);
            return false;
        }
    }

    async close() {
        if (this.browser) {
            await this.browser.close();
            console.log('🔒 Tarayıcı kapatıldı');
        }
    }
}

module.exports = AdvancedRSSGenerator;