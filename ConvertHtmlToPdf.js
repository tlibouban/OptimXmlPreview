/*
 * @fileoverview Conversion silencieuse HTML => PDF via Puppeteer
 */

const fs = require('node:fs/promises');
const path = require('node:path');
const puppeteer = require('puppeteer');

/**
 * Convertit un fichier HTML en PDF dans le dossier indiqué.
 * @param {string} htmlPath Chemin du fichier HTML source
 * @param {string} pdfDir Dossier de sortie des PDF (./pdf par défaut)
 * @returns {Promise<string>} Chemin du PDF généré
 */
async function convertHtmlToPdf(htmlPath, pdfDir = './pdf') {
  // Créer le répertoire s'il n'existe pas
  await fs.mkdir(pdfDir, { recursive: true });

  const fileName = `${path.parse(htmlPath).name}.pdf`;
  const pdfPath = path.join(pdfDir, fileName);

  let browser;
  try {
    browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();

    // Charge le HTML localement
    await page.goto(`file://${path.resolve(htmlPath)}`, {
      waitUntil: 'networkidle0',
    });

    await page.pdf({
      path: pdfPath,
      format: 'A4',
      printBackground: true,
      margin: { top: '15mm', bottom: '15mm', left: '10mm', right: '10mm' },
    });
  } finally {
    if (browser) await browser.close();
  }

  return pdfPath;
}

module.exports = {
  convertHtmlToPdf,
};
