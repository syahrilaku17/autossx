const express = require('express');
const puppeteer = require('puppeteer');
const Jimp = require('jimp');

const app = express();
const port = 3000;

// Endpoint untuk mengambil screenshot dari elemen tertentu
app.get('/screenshot', async (req, res) => {
  const url = req.query.url;
  const selector = req.query.selector;

  // Logging untuk memastikan parameter diterima
  console.log('URL:', url);
  console.log('Selector:', selector);

  if (!url || !selector) {
    return res.status(400).send('URL and selector are required');
  }

  try {
    // Luncurkan browser
    const browser = await puppeteer.launch({
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    const page = await browser.newPage();

    // Setel ukuran viewport seperti layar PC
    await page.setViewport({ width: 1920, height: 1080 });

    // Navigasikan ke URL yang diberikan
    await page.goto(url, { waitUntil: 'networkidle2' });

    // Tunggu hingga elemen yang diinginkan muncul
    await page.waitForSelector(selector, { visible: true });

    // Temukan elemen dengan selector yang diberikan
    const element = await page.$(selector);

    if (!element) {
      await browser.close();
      return res.status(404).send('Element not found');
    }

    // Dapatkan ukuran elemen
    const boundingBox = await element.boundingBox();
    if (!boundingBox) {
      await browser.close();
      return res.status(500).send('Failed to get element bounding box');
    }

    const { width, height } = boundingBox;

    // Setel ukuran tampilan halaman sesuai dengan ukuran elemen jika elemen lebih besar dari viewport
    const newWidth = Math.max(1920, Math.ceil(width));
    const newHeight = Math.max(1080, Math.ceil(height));
    await page.setViewport({ width: newWidth, height: newHeight });

    // Ambil screenshot dari elemen
    const screenshot = await element.screenshot();

    // Tutup browser
    await browser.close();

    // Baca gambar menggunakan Jimp
    const image = await Jimp.read(screenshot);

    // Tambahkan teks di atas gambar
    await image.print(
      await Jimp.loadFont(Jimp.FONT_SANS_16_BLACK),
      0, 0, // Koordinat teks (x, y)
      {
        text: 'SS ITOS TO3', // Teks yang akan ditambahkan
        alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER, // Pusatkan teks horizontal
        alignmentY: Jimp.VERTICAL_ALIGN_MIDDLE // Pusatkan teks vertikal
      },
      newWidth, newHeight // Lebar dan tinggi gambar
    );


    // Konversi kembali ke format Buffer
    const editedScreenshot = await image.getBufferAsync(Jimp.MIME_PNG);

    // Kirim screenshot yang telah diedit sebagai respons
    res.set('Content-Type', 'image/png');
    res.send(editedScreenshot);
  } catch (error) {
    console.error('Error taking screenshot:', error);
    res.status(500).send('Error taking screenshot');
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
