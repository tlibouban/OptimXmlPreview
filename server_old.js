/**
 * @fileoverview Serveur web local pour OptimXmlPreview
 * @description Serveur Express.js qui sert l'interface et expose une API de conversion
 * @author OptimXmlPreview
 * @version 2.0.0
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs').promises;
const fsSync = require('fs');
const { spawn } = require('child_process');
const multer = require('multer');
const { Logger, COLORS } = require('./utils/logger');

const app = express();
const PORT = 3000;
const CONFIG_PATH = path.join(__dirname, 'email-config.json');

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('.', { index: false })); // Servir tous les fichiers statiques

// Création d'un fichier de configuration par défaut si absent
async function ensureDefaultEmailConfig() {
  try {
    await fs.access(CONFIG_PATH);
  } catch (_) {
    const defaultConfig = {
      subjectTemplate: 'OptimXmlPreview – documents',
      bodyTemplate:
        'Bonjour,\n\nVeuillez trouver ci-joint le(s) document(s) suivant(s) :\n{{fileList}}\n\nCordialement.',
    };
    await fs.writeFile(CONFIG_PATH, JSON.stringify(defaultConfig, null, 2), 'utf8');
    Logger.info('Fichier email-config.json créé avec la configuration par défaut');
  }
}

ensureDefaultEmailConfig();

// Configuration Multer (upload vers ./Data en conservant le nom original)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, 'Data'));
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 Mo
  fileFilter: (req, file, cb) => {
    const ok = /\.x?xml$/i.test(file.originalname);
    cb(ok ? null : new Error('Type de fichier non supporté'), ok);
  },
});

/**
 * Route principale - Sert la page d'index
 */
app.get('/', async (req, res) => {
  try {
    // Vérifier si index.html existe
    if (fsSync.existsSync('index.html')) {
      res.sendFile(path.join(__dirname, 'index.html'));
    } else {
      // Créer une page d'index basique si elle n'existe pas
      Logger.info("Création d'une page d'index basique...");
      const basicIndexHTML = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>OptimXmlPreview - Configuration requise</title>
  <style>
    body { font-family: Arial, sans-serif; text-align: center; padding: 2rem; }
    .message { max-width: 600px; margin: 0 auto; }
  </style>
</head>
<body>
  <div class="message">
    <h1>OptimXmlPreview</h1>
    <p>Veuillez d'abord convertir des emails XML pour accéder à l'interface.</p>
    <p>Utilisez : <code>node src/convert/ConvertXmlToHtml.js -o ./Output -i ./Data</code></p>
  </div>
</body>
</html>`;
      await fs.writeFile('index.html', basicIndexHTML);
      res.sendFile(path.join(__dirname, 'index.html'));
    }
  } catch (error) {
    Logger.error(`Erreur lors du service de l'index: ${error.message}`);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

/**
 * API - Upload de fichiers XML puis conversion
 */
app.post('/api/upload-xml', upload.array('files'), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, error: 'Aucun fichier reçu' });
    }

    Logger.info(`Upload reçu: ${req.files.length} fichier(s) – démarrage de la conversion...`);

    const conversionProcess = spawn(
      'node',
      ['src/convert/ConvertXmlToHtml.js', '--output', './Output', '--input-dir', './Data'],
      {
        shell: true,
        stdio: ['pipe', 'pipe', 'pipe'],
      }
    );

    let stdout = '';
    let stderr = '';

    conversionProcess.stdout.on('data', (d) => (stdout += d.toString()));
    conversionProcess.stderr.on('data', (d) => (stderr += d.toString()));

    conversionProcess.on('close', (code) => {
      if (code === 0) {
        Logger.success('Conversion après upload terminée');
        res.json({ success: true, converted: req.files.length });
      } else {
        Logger.error(`Conversion échouée après upload (code: ${code})`);
        res.status(500).json({ success: false, error: 'Erreur conversion', stderr });
      }
    });
  } catch (error) {
    Logger.error(`Erreur /api/upload-xml: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * API - Conversion des emails
 */
app.post('/api/convert', async (req, res) => {
  Logger.info('Démarrage de la conversion des emails...');

  try {
    // Vérifier si Node.js est disponible
    const nodeProcess = spawn('node', ['--version'], { shell: true });

    nodeProcess.on('error', (error) => {
      Logger.error(`Node.js non disponible: ${error.message}`);
      return res.status(500).json({
        success: false,
        error: 'Node.js non disponible',
      });
    });

    // Lancer la conversion
    const conversionProcess = spawn(
      'node',
      [
        'src/convert/ConvertXmlToHtml.js',
        '--output',
        './Output',
        '--input-dir',
        './Data',
        '--clear-data-folder',
      ],
      {
        shell: true,
        stdio: ['pipe', 'pipe', 'pipe'],
      }
    );

    let stdout = '';
    let stderr = '';

    conversionProcess.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    conversionProcess.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    conversionProcess.on('close', (code) => {
      if (code === 0) {
        Logger.success('Conversion terminée avec succès');

        // Extraire les informations de la sortie
        const successMatch = stdout.match(/(\d+) succès/);
        const errorMatch = stdout.match(/(\d+) échecs/);

        res.json({
          success: true,
          message: 'Conversion terminée avec succès',
          details: {
            converted: successMatch ? parseInt(successMatch[1]) : 0,
            errors: errorMatch ? parseInt(errorMatch[1]) : 0,
            output: stdout,
          },
        });
      } else {
        Logger.error(`Conversion échouée avec le code: ${code}`);
        res.status(500).json({
          success: false,
          error: 'Échec de la conversion',
          details: {
            code,
            stderr,
            stdout,
          },
        });
      }
    });

    conversionProcess.on('error', (error) => {
      Logger.error(`Erreur lors de la conversion: ${error.message}`);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    });
  } catch (error) {
    Logger.error(`Erreur inattendue: ${error.message}`);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * API - Status de l'application
 */
app.get('/api/status', async (req, res) => {
  try {
    // Compter les fichiers XML et HTML
    let xmlCount = 0;
    let htmlCount = 0;

    try {
      const dataFiles = await fs.readdir('./Data');
      xmlCount = dataFiles.filter((file) =>
        ['.xml', '.xeml'].includes(path.extname(file).toLowerCase())
      ).length;
    } catch (error) {
      // Dossier Data inexistant
    }

    try {
      const outputFiles = await fs.readdir('./Output');
      htmlCount = outputFiles.filter(
        (file) => file.endsWith('.html') && file !== 'index.html'
      ).length;
    } catch (error) {
      // Dossier Output inexistant
    }

    res.json({
      success: true,
      xmlFiles: xmlCount,
      htmlFiles: htmlCount,
      serverTime: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * API - Recherche full-text dans les emails
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
 * API - Envoi d'email avec pièces jointes (Windows + Outlook)
 */
app.post('/api/send-email', async (req, res) => {
  try {
    const files = req.body?.files;
    if (!Array.isArray(files) || files.length === 0) {
      return res.status(400).json({ success: false, error: 'Aucun fichier à envoyer' });
    }

    // Seulement Windows (PowerShell + Outlook COM)
    if (process.platform !== 'win32') {
      return res
        .status(501)
        .json({ success: false, error: 'Fonctionnalité disponible uniquement sous Windows' });
    }

    // Lecture configuration d'email
    let subjectTemplate = 'OptimXmlPreview – documents';
    let bodyTemplate = '';
    try {
      const rawCfg = await fs.readFile(CONFIG_PATH, 'utf8');
      const cfg = JSON.parse(rawCfg);
      subjectTemplate = cfg.subjectTemplate || subjectTemplate;
      bodyTemplate = cfg.bodyTemplate || bodyTemplate;
    } catch (e) {
      Logger.warning('Impossible de lire email-config.json : ' + e.message);
    }

    const fileNames = files.map((f) => path.basename(f));
    // Génère \r\n\r\n entre chaque nom de fichier pour un "saut de paragraphe"
    const fileList = fileNames.join('\r\n\r\n');

    const firstFile = fileNames[0];

    // Extraction de tous les numéros encadrés par des crochets dans toutes les PJ
    const roles = fileNames
      .map((fn) => {
        const m = fn.match(/\[(.*?)\]/);
        if (!m) return null;
        // Remplacement de l'espace par un slash, ex: "25 00326" -> "25/00326"
        return m[1].replace(/\s+/g, '/');
      })
      .filter(Boolean);

    // Concatène avec " - " si plusieurs, sinon garde le seul élément ou chaîne vide
    const role = roles.length > 1 ? roles.join(' - ') : roles[0] || '';

    const subject = subjectTemplate
      .replace(/{{fileName}}/g, firstFile)
      .replace(/{{fileList}}/g, fileList)
      .replace(/{{Role}}/g, role);

    const body = bodyTemplate
      .replace(/{{fileName}}/g, firstFile)
      .replace(/{{fileList}}/g, fileList)
      .replace(/{{Role}}/g, role);

    const psSubject = subject.replace(/'/g, "''");
    const psBody = body.replace(/'/g, "''").replace(/\r?\n/g, '<br>');

    // Construction de la commande PowerShell encodée (UTF16-LE → Base64)
    const escaped = files
      .map((f) => path.resolve(f).replace(/'/g, "''"))
      .map((f) => `'${f}'`)
      .join(',');

    const psScript = `
      $files = @(${escaped});
      $outlook = New-Object -ComObject Outlook.Application;
      $mail = $outlook.CreateItem(0);
      $mail.Subject = '${psSubject}';
      $mail.HTMLBody = '${psBody}';
      foreach ($f in $files) { $mail.Attachments.Add($f) }
      $mail.Display();
      try { $mail.GetInspector().Activate() } catch {}
    `;

    const encoded = Buffer.from(psScript, 'utf16le').toString('base64');

    const pwsh = spawn('powershell.exe', ['-NoProfile', '-EncodedCommand', encoded], {
      shell: true,
      stdio: 'ignore',
      detached: true,
    });

    pwsh.on('error', (err) => {
      Logger.error(`Erreur PowerShell: ${err.message}`);
    });

    // On ne bloque pas la réponse HTTP ; on répond immédiatement
    res.json({ success: true });
  } catch (error) {
    Logger.error(`Erreur /api/send-email: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * API - Lecture configuration d'email
 */
app.get('/api/email-config', async (req, res) => {
  try {
    const raw = await fs.readFile(CONFIG_PATH, 'utf8');
    res.json({ success: true, config: JSON.parse(raw) });
  } catch (error) {
    Logger.error(`Erreur lecture email-config: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * API - Mise à jour configuration d'email
 */
app.post('/api/email-config', async (req, res) => {
  try {
    const { subjectTemplate, bodyTemplate } = req.body || {};
    if (typeof subjectTemplate !== 'string' || typeof bodyTemplate !== 'string') {
      return res.status(400).json({ success: false, error: 'Champs manquants ou invalides' });
    }
    await fs.writeFile(
      CONFIG_PATH,
      JSON.stringify({ subjectTemplate, bodyTemplate }, null, 2),
      'utf8'
    );
    res.json({ success: true });
  } catch (error) {
    Logger.error(`Erreur écriture email-config: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Favicon – sert l'icône SVG afin d'éviter l'erreur 404 dans le navigateur
app.get('/favicon.ico', (req, res) => {
  const faviconPath = path.join(__dirname, 'img', 'icon-com.svg');
  res.type('image/svg+xml');
  res.sendFile(faviconPath);
});

/**
 * Gestion des erreurs 404
 */
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route non trouvée',
  });
});

/**
 * Démarrage du serveur
 */
app.listen(PORT, () => {
  console.log(`
${COLORS.BLUE}┌─────────────────────────────────────────────┐${COLORS.RESET}
${COLORS.BLUE}│           OptimXmlPreview Server            │${COLORS.RESET}
${COLORS.BLUE}├─────────────────────────────────────────────┤${COLORS.RESET}
${COLORS.GREEN}│ ✓ Serveur démarré avec succès              │${COLORS.RESET}
${COLORS.CYAN}│ 🌐 URL: http://localhost:${PORT}                │${COLORS.RESET}
${COLORS.YELLOW}│ 📁 Fichiers servis depuis: ${__dirname.split('\\').pop()}         │${COLORS.RESET}
${COLORS.BLUE}├─────────────────────────────────────────────┤${COLORS.RESET}
${COLORS.GREEN}│ API Endpoints:                              │${COLORS.RESET}
${COLORS.CYAN}│ • POST /api/convert - Conversion d'emails   │${COLORS.RESET}
${COLORS.CYAN}│ • GET  /api/status  - Status de l'app       │${COLORS.RESET}
${COLORS.CYAN}│ • GET  /api/search  - Recherche full-text   │${COLORS.RESET}
${COLORS.CYAN}│ • POST /api/send-email - Envoi d'email       │${COLORS.RESET}
${COLORS.CYAN}│ • GET  /api/email-config - Lecture config   │${COLORS.RESET}
${COLORS.CYAN}│ • POST /api/email-config - Mise à jour config│${COLORS.RESET}
${COLORS.CYAN}│ • POST /api/upload-xml - Upload XML + convert │${COLORS.RESET}
${COLORS.BLUE}└─────────────────────────────────────────────┘${COLORS.RESET}

${COLORS.GREEN}Ouvrez votre navigateur à: ${COLORS.CYAN}http://localhost:${PORT}${COLORS.RESET}
`);
});
