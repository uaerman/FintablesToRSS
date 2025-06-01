const express = require('express');
const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const AdvancedRSSGenerator = require('./AdvancedRSSGenerator'); // Sizin RSS classınız
const cron = require('node-cron');

const app = express();
const PORT = 3000;
const RSS_FILE = path.join(__dirname, '..', 'fintables_rss.xml');

const url = 'https://fintables.com/arastirma/bultenler/';
const generator = new AdvancedRSSGenerator(url);

async function generateRSSFile() {
    console.log(`[${new Date().toLocaleTimeString()}] RSS üretim başladı...`);
    const success = await generator.generateRSS(RSS_FILE);
    if (success) {
        console.log(`[${new Date().toLocaleTimeString()}] RSS başarıyla güncellendi.`);
    } else {
        console.error(`[${new Date().toLocaleTimeString()}] RSS güncelleme başarısız!`);
    }
}

// İlk üretim
generateRSSFile();

// Her 58 dakikada bir güncelleme (cron ile)
cron.schedule('*/58 * * * *', () => {
    generateRSSFile();
});

// RSS endpoint
app.get(['/rss.xml', '/'], async (req, res) => {
    try {
        // Dosyanın varlığını kontrol et
        await fs.access(RSS_FILE);

        res.set({
            'Content-Type': 'application/rss+xml; charset=utf-8',
            'Cache-Control': 'no-cache'
        });

        const readStream = fsSync.createReadStream(RSS_FILE);
        readStream.pipe(res);
        readStream.on('error', err => {
            console.error('Dosya okuma hatası:', err);
            res.status(500).send('RSS okunurken hata oluştu');
        });
    } catch (err) {
        console.error('RSS dosyası bulunamadı:', err);
        res.status(404).send('RSS dosyası bulunamadı');
    }
});

app.listen(PORT, () => {
    console.log(`Sunucu ${PORT} portunda başladı.`);
});

// İşlem sonunda
process.on('SIGINT', async () => {
    console.log('\nSunucu kapatılıyor...');
    await generator.close();
    process.exit(0);
});