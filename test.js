const express = require('express');
const puppeteer = require('puppeteer');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');

const app = express();
const port = 3000;

// Endpoint untuk mengambil screenshot dari elemen tertentu
app.get('/screenshot', async (req, res) => {
  const url = req.query.url;
  const selector = req.query.selector;
  const text = req.query.text || ''; // Parameter text yang bisa dimodifikasi

  // Data formulir statis
  const formData = "H1=2024-05-27&H2=2024-06-03&Chek=";

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

    // Luncurkan browser
    const browser = await puppeteer.launch({
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    const page = await browser.newPage();

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

    // Ambil screenshot dari elemen
    const screenshotBuffer = await element.screenshot();

    // Simpan screenshot ke file sementara
    const screenshotPath = path.join(__dirname, 'temp_screenshot.png');
    fs.writeFileSync(screenshotPath, screenshotBuffer);

    // Tutup browser
    await browser.close();

    // Buat PDF dengan teks dan gambar
    const pdfPath = path.join(__dirname, 'temp_document.pdf');
    const doc = new PDFDocument();
    
    doc.pipe(fs.createWriteStream(pdfPath));
    
    doc.fontSize(25).text('Data Tahunan', { align: 'center' });
    doc.text(text, { align: 'center', lineGap: 10 });
    doc.image(screenshotPath, {
      fit: [500, 400],
      align: 'center',
      valign: 'center'
    });

    doc.end();

    // Kirim respons HTML dengan tautan unduhan PDF
    res.send(`
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Screenshot Result</title>
        </head>
        <body>
          <h1>Data Tahunan</h1>
          <p>${text}</p>
          <img src="data:image/png;base64,${screenshotBuffer.toString('base64')}" alt="Screenshot">
          <br />
          <a href="/download?path=${encodeURIComponent(pdfPath)}" download="document.pdf">
            <button>Download PDF</button>
          </a>
        </body>
      </html>
    `);
  } catch (error) {
    console.error('Error taking screenshot:', error);
    res.status(500).send('Error taking screenshot');
  }
});

// Endpoint untuk mengunduh file
app.get('/download', (req, res) => {
  const filePath = req.query.path;
  res.download(filePath, filePath.endsWith('.pdf') ? 'document.pdf' : 'screenshot.png', (err) => {
    if (err) {
      console.error('Error during file download:', err);
      res.status(500).send('Error during file download');
    } else {
      // Hapus file sementara setelah diunduh
      fs.unlink(filePath, (unlinkErr) => {
        if (unlinkErr) {
          console.error('Error deleting temporary file:', unlinkErr);
        }
      });
    }
  });
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});