async function humanLikeBehavior(page) {
    try {
        const delay = Math.random() * 3000 + 2000; // 2-5 saniye
        await new Promise(resolve => setTimeout(resolve, delay));

        await page.mouse.move(
            Math.random() * 1920,
            Math.random() * 1080
        );

        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 4));
        await new Promise(resolve => setTimeout(resolve, 1000));
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 2));
        await new Promise(resolve => setTimeout(resolve, 1000));
        await page.evaluate(() => window.scrollTo(0, 0));
        await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
        console.log('⚠️ İnsan benzeri davranış simülasyonunda hata:', error.message);
    }
}

module.exports = { humanLikeBehavior };