/**
 * @fileoverview Serveur simple et fiable pour OptimXmlPreview v2.0
 * @description Serveur Express.js minimal pour servir l'interface refactorisée
 * @author OptimXmlPreview
 * @version 2.0.0
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs').promises;
const { spawn } = require('child_process');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('.', { index: false }));

// Middleware pour filtrer les erreurs d'extensions navigateur
app.use((req, res, next) => {
  // Filtrer UNIQUEMENT les requêtes d'extensions de navigateur (pas l'API de l'app)
  const userAgent = req.get('User-Agent') || '';
  const extensionUrls = [
    '/_next/',
    '/chrome-extension/',
    '/moz-extension/',
    '/extension/',
    '/__webpack',
    '/hot-update',
  ];

  // Si c'est une requête d'extension et que l'endpoint n'existe pas, ignorer silencieusement
  if (
    extensionUrls.some((url) => req.url.includes(url)) &&
    (userAgent.includes('Chrome') || userAgent.includes('Firefox'))
  ) {
    // Log minimal pour debug si nécessaire
    console.log(`[DEBUG] Extension request filtered: ${req.method} ${req.url}`);
  }

  next();
});

// Logger simple avec couleurs
const Logger = {
  success: (msg) => console.log(`\x1b[32m✓ ${msg}\x1b[0m`),
  error: (msg) => console.error(`\x1b[31m✗ ${msg}\x1b[0m`),
  info: (msg) => console.log(`\x1b[36mℹ ${msg}\x1b[0m`),
  warning: (msg) => console.log(`\x1b[33m⚠ ${msg}\x1b[0m`),
};

/**
 * Route principale
 */
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

/**
 * API de conversion utilisant le module refactorisé
 */
app.post('/api/convert', async (req, res) => {
  Logger.info('Démarrage conversion avec module refactorisé...');

  try {
    const conversionProcess = spawn('node', ['convert-with-refactored.js'], {
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    conversionProcess.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    conversionProcess.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    conversionProcess.on('close', (code) => {
      if (code === 0 && stdout.includes('CONVERSION_SUCCESS')) {
        const successMatch = stdout.match(/(\d+) succès/);
        const converted = successMatch ? parseInt(successMatch[1]) : 0;

        res.json({
          success: true,
          message: 'Conversion terminée avec succès',
          details: { converted, output: stdout },
        });

        Logger.success(`Conversion réussie: ${converted} fichiers`);
      } else {
        res.status(500).json({
          success: false,
          error: 'Échec de la conversion',
          details: { code, stderr, stdout },
        });

        Logger.error(`Conversion échouée (code: ${code})`);
      }
    });

    conversionProcess.on('error', (error) => {
      res.status(500).json({
        success: false,
        error: error.message,
      });

      Logger.error(`Erreur processus: ${error.message}`);
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });

    Logger.error(`Erreur inattendue: ${error.message}`);
  }
});

/**
 * API de statut
 */
app.get('/api/status', (req, res) => {
  res.json({
    success: true,
    server: 'OptimXmlPreview v2.0',
    architecture: 'Module refactorisé',
    timestamp: new Date().toISOString(),
  });
});

/**
 * API de recherche full-text dans les emails
 */
app.get('/api/search', async (req, res) => {
  try {
    const searchTerm = req.query.q;

    if (!searchTerm) {
      return res.json({
        success: true,
        results: [],
        message: 'Aucun terme de recherche fourni',
      });
    }

    // Lire tous les fichiers HTML du dossier Output
    const outputFiles = await fs.readdir('./Output');
    const htmlFiles = outputFiles.filter((file) => file.endsWith('.html') && file !== 'index.html');

    const searchResults = [];
    const searchTermLower = searchTerm.toLowerCase();

    for (const file of htmlFiles) {
      try {
        const filePath = path.join('./Output', file);
        const htmlContent = await fs.readFile(filePath, 'utf8');

        // Extraire les données du fichier HTML
        const emailData = extractEmailDataFromHTML(htmlContent, file);

        // Rechercher dans tous les champs
        const matches = findMatches(emailData, searchTermLower);

        if (matches.length > 0) {
          searchResults.push({
            file: file,
            fileName: path.basename(file, '.html'),
            emailData: emailData,
            matches: matches,
            relevanceScore: calculateRelevanceScore(matches, searchTermLower),
          });
        }
      } catch (error) {
        Logger.warning(`Erreur lors de la lecture de ${file}: ${error.message}`);
      }
    }

    // Trier par score de pertinence
    searchResults.sort((a, b) => b.relevanceScore - a.relevanceScore);

    res.json({
      success: true,
      results: searchResults,
      totalResults: searchResults.length,
      searchTerm: searchTerm,
    });
  } catch (error) {
    Logger.error(`Erreur lors de la recherche: ${error.message}`);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Extrait les données d'un fichier HTML d'email
 */
function extractEmailDataFromHTML(htmlContent, fileName) {
  const data = {
    fileName: fileName,
    subject: '',
    from: '',
    to: '',
    date: '',
    body: '',
    attachments: [],
  };

  try {
    // Extraire le titre (sujet)
    const titleMatch = htmlContent.match(/<title>(.*?)<\/title>/i);
    if (titleMatch) {
      data.subject = titleMatch[1].replace(' - OptimXmlPreview', '').trim();
    }

    // Extraire les détails de l'en-tête
    const fromMatch = htmlContent.match(
      /<span class="header-label">De:<\/span>\s*<span class="header-value">(.*?)<\/span>/i
    );
    if (fromMatch) {
      data.from = fromMatch[1].trim();
    }

    const toMatch = htmlContent.match(
      /<span class="header-label">À:<\/span>\s*<span class="header-value">(.*?)<\/span>/i
    );
    if (toMatch) {
      data.to = toMatch[1].trim();
    }

    const dateMatch = htmlContent.match(
      /<span class="header-label">Date:<\/span>\s*<span class="header-value">(.*?)<\/span>/i
    );
    if (dateMatch) {
      data.date = dateMatch[1].trim();
    }

    // Extraire le corps du message
    const bodyMatch = htmlContent.match(/<div class="email-body">(.*?)<\/div>/s);
    if (bodyMatch) {
      data.body = bodyMatch[1].replace(/<[^>]*>/g, '').trim();
    }

    // Extraire les pièces jointes
    const attachmentMatches = htmlContent.matchAll(/<span class="attachment-name">(.*?)<\/span>/g);
    for (const match of attachmentMatches) {
      data.attachments.push(match[1].trim());
    }
  } catch (error) {
    Logger.warning(`Erreur lors de l'extraction des données pour ${fileName}: ${error.message}`);
  }

  return data;
}

/**
 * Trouve les correspondances dans les données d'email
 */
function findMatches(emailData, searchTerm) {
  const matches = [];

  // Recherche dans le sujet
  if (emailData.subject.toLowerCase().includes(searchTerm)) {
    matches.push({
      field: 'subject',
      value: emailData.subject,
      type: 'Sujet',
    });
  }

  // Recherche dans l'expéditeur
  if (emailData.from.toLowerCase().includes(searchTerm)) {
    matches.push({
      field: 'from',
      value: emailData.from,
      type: 'Expéditeur',
    });
  }

  // Recherche dans le destinataire
  if (emailData.to.toLowerCase().includes(searchTerm)) {
    matches.push({
      field: 'to',
      value: emailData.to,
      type: 'Destinataire',
    });
  }

  // Recherche dans le corps du message
  if (emailData.body.toLowerCase().includes(searchTerm)) {
    // Extraire un contexte autour de la correspondance
    const index = emailData.body.toLowerCase().indexOf(searchTerm);
    const start = Math.max(0, index - 50);
    const end = Math.min(emailData.body.length, index + searchTerm.length + 50);
    const context = emailData.body.substring(start, end);

    matches.push({
      field: 'body',
      value: context,
      type: 'Corps du message',
      fullText: emailData.body,
    });
  }

  // Recherche dans les pièces jointes
  emailData.attachments.forEach((attachment) => {
    if (attachment.toLowerCase().includes(searchTerm)) {
      matches.push({
        field: 'attachment',
        value: attachment,
        type: 'Pièce jointe',
      });
    }
  });

  // Recherche dans le nom de fichier
  if (emailData.fileName.toLowerCase().includes(searchTerm)) {
    matches.push({
      field: 'fileName',
      value: emailData.fileName,
      type: 'Nom de fichier',
    });
  }

  return matches;
}

/**
 * Calcule un score de pertinence pour les résultats
 */
function calculateRelevanceScore(matches, searchTerm) {
  let score = 0;

  matches.forEach((match) => {
    switch (match.field) {
      case 'subject':
        score += 10; // Priorité haute pour le sujet
        break;
      case 'from':
      case 'to':
        score += 8; // Priorité haute pour expéditeur/destinataire
        break;
      case 'fileName':
        score += 6; // Priorité moyenne pour le nom de fichier
        break;
      case 'attachment':
        score += 5; // Priorité moyenne pour les pièces jointes
        break;
      case 'body':
        score += 3; // Priorité plus faible pour le corps
        break;
    }

    // Bonus si le terme correspond exactement
    if (match.value.toLowerCase() === searchTerm) {
      score += 5;
    }
  });

  return score;
}

/**
 * Démarrage du serveur
 */
app.listen(PORT, () => {
  console.log('\n' + '='.repeat(60));
  Logger.success('🚀 OptimXmlPreview v2.0 - Serveur démarré');
  Logger.info(`🌐 Interface: http://localhost:${PORT}`);
  Logger.info('🏗️ Architecture: Module refactorisé');
  Logger.info('📁 Ressources: Externalisées dans ./assets/');
  Logger.info('🔧 Mode: Serveur simplifié et fiable');
  console.log('='.repeat(60));
});

// Gestion gracieuse de l'arrêt
process.on('SIGINT', () => {
  Logger.info('\n🔴 Arrêt du serveur...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  Logger.info('\n🔴 Arrêt du serveur...');
  process.exit(0);
});
