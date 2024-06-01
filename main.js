const express = require('express');
const axios = require('axios');
const puppeteer = require('puppeteer');

const app = express();
const port = 3000;

// Endpoint untuk mengambil screenshot dari elemen tertentu
app.get('/screenshot', async (req, res) => {
  const url = req.query.url;
  const selector = req.query.selector;

  // Data formulir statis
  const formData = "H1=2024-05-27&H2=2024-06-03&Chek=";

  // Logging untuk memastikan parameter diterima
  // console.log('URL:', url);
  // console.log('Selector:', selector);
  // console.log('Form Data:', formData);

  if (!url || !selector) {
    return res.status(400).send('URL and selector are required');
  }

  try {
    // Kirim permintaan POST dengan data formulir menggunakan Axios
    const response = await axios.post(`${url}`, formData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    // Lakukan sesuatu dengan respons, misalnya mengambil tangkapan layar
    console.log('Response:', response.data);

    // Luncurkan browser
    const browser = await puppeteer.launch({
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    const page = await browser.newPage();
    console.log('Browser launched', page);
    // Setel ukuran viewport seperti layar PC
    await page.setViewport({ width: 1920, height: 1080 });

    // Navigasikan ke URL yang diberikan
    await page.setContent(response.data);

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

    // Kirim screenshot sebagai respons
    res.set('Content-Type', 'image/png');
    res.send(screenshot);
  } catch (error) {
    console.error('Error taking screenshot:', error);
    res.status(500).send('Error taking screenshot');
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
