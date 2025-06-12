/**
 * @fileoverview Convertisseur de fichiers XML d'emails RPVA vers HTML
 * @description Ce module convertit les fichiers XML contenant des emails juridiques
 * au format HTML avec une mise en page structurée et responsive.
 * @author OptimXmlPreview
 * @version 2.0.0
 */

const fs = require('node:fs/promises');
const fsSync = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { DOMParser } = require('xmldom');
const { JSDOM } = require('jsdom');
const { convertHtmlToPdf } = require('./ConvertHtmlToPdf');

/**
 * @typedef {Object} ProcessingOptions
 * @property {string} outputDir - Répertoire de sortie pour les fichiers HTML
 * @property {string} [sourceFile] - Fichier XML spécifique à traiter
 * @property {string} [inputDir] - Répertoire contenant les fichiers XML à traiter
 * @property {boolean} [deleteSource=false] - Supprimer les fichiers sources après conversion
 * @property {boolean} [clearDataFolder=false] - Vider le dossier Data après conversion
 */

/**
 * @typedef {Object} EmailMetadata
 * @property {string} subject - Objet de l'email
 * @property {string} from - Expéditeur
 * @property {string} to - Destinataire
 * @property {string} date - Date d'envoi
 * @property {Array<string>} attachments - Liste des pièces jointes
 */

// Import de la configuration centralisée
const CONFIG_FILE = require('./assets/templates/config.js');

// Configuration par défaut avec chemins ajustés
const CONFIG = {
  ...CONFIG_FILE,
  LOGO_SOURCE_PATH: path.join('img', 'logo-blanc.png'),
  FAVICON_SOURCE_PATH: path.join('img', 'icon-com.svg'),
  PDF_OUTPUT_DIR: CONFIG_FILE.PDF_OUTPUT_DIR || './pdf',
};

// Codes de couleur ANSI pour l'affichage console
const COLORS = Object.freeze({
  RESET: '\x1b[0m',
  BRIGHT: '\x1b[1m',
  RED: '\x1b[31m',
  GREEN: '\x1b[32m',
  YELLOW: '\x1b[33m',
  BLUE: '\x1b[34m',
  CYAN: '\x1b[36m',
});

/**
 * Classe pour gérer l'affichage d'un loader animé dans la console
 */
class ConsoleLoader {
  /**
   * @param {string} message - Message à afficher avec le loader
   */
  constructor(message = 'Traitement...') {
    this.message = message;
    this.frames = ['-', '\\', '|', '/'];
    this.currentFrame = 0;
    this.interval = null;
  }

  /**
   * Démarre l'animation du loader
   */
  start() {
    if (this.interval) return; // Éviter les loaders multiples

    process.stdout.write(`${COLORS.YELLOW}${this.message} ${COLORS.RESET}`);
    this.interval = setInterval(() => {
      process.stdout.write(
        `\r${COLORS.YELLOW}${this.message} ${this.frames[this.currentFrame]}${COLORS.RESET}`
      );
      this.currentFrame = (this.currentFrame + 1) % this.frames.length;
    }, 150);
  }

  /**
   * Arrête l'animation du loader
   * @param {boolean} clearLine - Effacer la ligne du loader
   */
  stop(clearLine = true) {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }

    if (clearLine) {
      const columns = process.stdout.columns || 80;
      process.stdout.write('\r' + ' '.repeat(columns - 1) + '\r');
    }
  }
}

/**
 * Charge le contenu CSS depuis le fichier externe
 * @returns {string} Contenu CSS pour la mise en page HTML
 */
function loadEmailViewerCSS() {
  try {
    return fsSync.readFileSync(CONFIG.ASSETS.CSS.EMAIL_VIEWER, 'utf8');
  } catch (error) {
    Logger.warning(`Impossible de charger le CSS externe: ${error.message}`);
    // CSS de secours minimal
    return `
body { font-family: Arial, sans-serif; margin: 2rem; }
.container { max-width: 1024px; margin: 0 auto; }
.email-container { background: white; padding: 1rem; border: 1px solid #ddd; }
.email-header { border-bottom: 1px solid #ccc; padding: 1rem; }
.email-body { padding: 1rem; }
.footer { text-align: center; padding: 1rem; color: #666; }
`;
  }
}

/**
 * Utilitaires pour la gestion des logs avec couleurs
 */
const Logger = {
  /**
   * @param {string} message - Message à afficher
   */
  success: (message) => console.log(`${COLORS.GREEN}✓ ${message}${COLORS.RESET}`),

  /**
   * @param {string} message - Message d'erreur à afficher
   */
  error: (message) => console.error(`${COLORS.RED}✗ ${message}${COLORS.RESET}`),

  /**
   * @param {string} message - Message d'avertissement à afficher
   */
  warning: (message) => console.log(`${COLORS.YELLOW}⚠ ${message}${COLORS.RESET}`),

  /**
   * @param {string} message - Message d'information à afficher
   */
  info: (message) => console.log(`${COLORS.CYAN}ℹ ${message}${COLORS.RESET}`),
};

/**
 * Formate une date ISO en format français lisible
 * @param {string} isoDate - Date au format ISO
 * @returns {string} Date formatée en français
 */
function formatDate(isoDate) {
  try {
    const date = new Date(isoDate);
    if (isNaN(date.getTime())) {
      return isoDate; // Retourner la date originale si invalide
    }
    return date.toLocaleString('fr-FR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch (error) {
    Logger.warning(`Erreur lors du formatage de la date: ${error.message}`);
    return isoDate;
  }
}

/**
 * Détermine l'icône Font Awesome appropriée selon l'extension du fichier
 * @param {string} fileName - Nom du fichier
 * @returns {string} Classe Font Awesome représentant le type de fichier
 */
function getFileIcon(fileName) {
  const ext = path.extname(fileName).toLowerCase();
  const iconMap = {
    '.pdf': 'fas fa-file-pdf', // Icône PDF Font Awesome
    '.doc': 'fas fa-file-word',
    '.docx': 'fas fa-file-word',
    '.jpg': 'fas fa-file-image',
    '.jpeg': 'fas fa-file-image',
    '.png': 'fas fa-file-image',
    '.gif': 'fas fa-file-image',
    '.xml': 'fas fa-file-code', // Icône XML/Code
    '.txt': 'fas fa-file-alt',
    '.zip': 'fas fa-file-archive',
    '.rar': 'fas fa-file-archive',
    '.xlsx': 'fas fa-file-excel',
    '.xls': 'fas fa-file-excel',
    '.ppt': 'fas fa-file-powerpoint',
    '.pptx': 'fas fa-file-powerpoint',
    '.xeml': 'fas fa-file-code', // Icône XEML/Code
  };

  return iconMap[ext] || 'fas fa-file'; // Icône générique pour fichiers inconnus
}

/**
 * Extrait les métadonnées d'un fichier XML
 * @param {string} xmlContent - Contenu XML
 * @returns {EmailMetadata|null} Métadonnées extraites ou null en cas d'erreur
 */
function extractEmailMetadata(xmlContent) {
  try {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlContent, 'text/xml');

    const envelope = xmlDoc.getElementsByTagName('envelope')[0];
    if (!envelope) {
      Logger.warning('Aucune enveloppe trouvée dans le XML');
      return null;
    }

    // Extraction sécurisée des données
    const getTextContent = (tagName) => {
      const element = envelope.getElementsByTagName(tagName)[0];
      return element?.textContent?.trim() || '';
    };

    // Extraction des pièces jointes depuis les balises <attachment>
    const attachmentsXml = xmlDoc.getElementsByTagName('attachment');
    const attachments = [];

    for (let i = 0; i < attachmentsXml.length; i++) {
      const name = attachmentsXml[i].getAttribute('name');
      if (name) {
        attachments.push(name);
      }
    }

    // Si pas de balises <attachment>, chercher dans le corps du message
    if (attachments.length === 0) {
      const bodyElement = xmlDoc.getElementsByTagName('body')[0];
      if (bodyElement?.textContent) {
        const bodyText = bodyElement.textContent;

        // Regex pour détecter les noms de fichiers (extensions courantes)
        const fileRegex =
          /([^\s]+\.(pdf|doc|docx|xls|xlsx|ppt|pptx|jpg|jpeg|png|gif|zip|rar|txt|xml|xeml))/gi;
        const matches = bodyText.match(fileRegex);

        if (matches) {
          // Nettoyer et ajouter les fichiers trouvés
          matches.forEach((match) => {
            const cleanMatch = match.trim().replace(/[^\w\s.-]/g, ''); // Supprimer caractères spéciaux
            if (cleanMatch && !attachments.includes(cleanMatch)) {
              attachments.push(cleanMatch);
            }
          });
        }
      }
    }

    return {
      subject: getTextContent('Subject') || 'Sans objet',
      from: getTextContent('From') || 'Expéditeur inconnu',
      to: getTextContent('To') || '',
      date: getTextContent('Date') || '',
      attachments,
    };
  } catch (error) {
    Logger.error(`Erreur lors de l'extraction des métadonnées: ${error.message}`);
    return null;
  }
}

/**
 * Convertit un fichier XML en HTML
 * @param {string} xmlContent - Contenu du fichier XML
 * @param {string} outputHtmlPath - Chemin de sortie du fichier HTML
 * @param {string} sourceFilePath - Chemin du fichier source
 * @param {string} outputDir - Répertoire de sortie
 * @returns {Promise<boolean>} true si la conversion a réussi
 */
async function convertXmlToHtml(xmlContent, outputHtmlPath, sourceFilePath, _outputDir) {
  try {
    const metadata = extractEmailMetadata(xmlContent);
    if (!metadata) {
      return false;
    }

    // Créer le titre de la page
    const pageTitle =
      metadata.subject.length > 50
        ? `${metadata.subject.substring(0, 50)}... - OptimXmlPreview`
        : `${metadata.subject} - OptimXmlPreview`;

    // Créer le document HTML
    const dom = new JSDOM(`<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${pageTitle}</title>
</head>
<body></body>
</html>`);

    const document = dom.window.document;

    // Ajouter le favicon
    const faviconExists = fsSync.existsSync(CONFIG.FAVICON_SOURCE_PATH);
    if (faviconExists) {
      const favicon = document.createElement('link');
      favicon.rel = 'icon';
      favicon.type = 'image/svg+xml';
      favicon.href = CONFIG.FAVICON_RELATIVE_PATH;
      document.head.appendChild(favicon);
    }

    // Ajouter les styles CSS
    const style = document.createElement('style');
    style.textContent = loadEmailViewerCSS();
    document.head.appendChild(style);

    // Ajouter Font Awesome CDN
    const fontAwesome = document.createElement('link');
    fontAwesome.rel = 'stylesheet';
    fontAwesome.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css';
    fontAwesome.crossOrigin = 'anonymous';
    fontAwesome.referrerPolicy = 'no-referrer';
    document.head.appendChild(fontAwesome);

    // Conteneur principal
    const container = document.createElement('div');
    container.className = 'container';
    document.body.appendChild(container);

    // Conteneur de l'email
    const emailContainer = document.createElement('div');
    emailContainer.className = 'email-container';
    container.appendChild(emailContainer);

    // En-tête de l'email
    const header = document.createElement('div');
    header.className = 'email-header';
    emailContainer.appendChild(header);

    // Conteneur pour le titre avec la nouvelle classe
    const titleContainer = document.createElement('div');
    titleContainer.className = 'email-header-h2';
    header.appendChild(titleContainer);

    // Titre (objet)
    const title = document.createElement('h2');
    title.textContent = metadata.subject;
    titleContainer.appendChild(title);

    // Détails de l'en-tête
    const headerFields = [
      { label: 'De', value: metadata.from },
      { label: 'À', value: metadata.to },
      { label: 'Date', value: formatDate(metadata.date) },
    ].filter((field) => field.value); // Filtrer les champs vides

    headerFields.forEach((field) => {
      const detail = document.createElement('div');
      detail.className = 'header-detail';

      const label = document.createElement('span');
      label.className = 'header-label';
      label.textContent = `${field.label}:`;
      detail.appendChild(label);

      const value = document.createElement('span');
      value.className = 'header-value';
      value.textContent = field.value;
      detail.appendChild(value);

      header.appendChild(detail);
    });

    // Corps de l'email
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlContent, 'text/xml');
    const bodyElement = xmlDoc.getElementsByTagName('body')[0];

    if (bodyElement?.textContent) {
      // Section Corps du message
      const messageSection = document.createElement('div');
      messageSection.className = 'message-section';

      const messageTitle = document.createElement('h3');
      messageTitle.className = 'section-title';
      messageTitle.textContent = 'Corps du message';
      messageSection.appendChild(messageTitle);

      // Nettoyer le corps du message en supprimant les mentions de pièces jointes
      let cleanBodyText = bodyElement.textContent;

      // Supprimer les lignes qui mentionnent des pièces jointes
      if (metadata.attachments.length > 0) {
        // Supprimer les lignes contenant "Avec les pièces jointes :"
        cleanBodyText = cleanBodyText.replace(/Avec les pièces jointes\s*:\s*/gi, '');

        // Supprimer les lignes qui ne contiennent que des noms de fichiers
        metadata.attachments.forEach((attachment) => {
          const escapedFilename = attachment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const fileRegex = new RegExp(`^\\s*${escapedFilename}\\s*$`, 'gmi');
          cleanBodyText = cleanBodyText.replace(fileRegex, '');
        });

        // Supprimer les lignes avec uniquement des espaces
        cleanBodyText = cleanBodyText.replace(/^\s*\n/gm, '');

        // Supprimer les espaces multiples à la fin
        cleanBodyText = cleanBodyText.trim();
      }

      const emailBody = document.createElement('div');
      emailBody.className = 'email-body';
      emailBody.textContent = cleanBodyText;
      messageSection.appendChild(emailBody);

      emailContainer.appendChild(messageSection);
    }

    // Pièces jointes
    if (metadata.attachments.length > 0) {
      const attachmentsContainer = document.createElement('div');
      attachmentsContainer.className = 'attachments';

      const attachmentsTitle = document.createElement('h3');
      attachmentsTitle.className = 'section-title';
      attachmentsTitle.textContent = `Pièces jointes (${metadata.attachments.length})`;
      attachmentsContainer.appendChild(attachmentsTitle);

      metadata.attachments.forEach((attachmentName) => {
        const attachmentEl = document.createElement('div');
        attachmentEl.className = 'attachment';

        const icon = document.createElement('i');
        icon.className = `attachment-icon ${getFileIcon(attachmentName)}`;
        attachmentEl.appendChild(icon);

        const name = document.createElement('span');
        name.className = 'attachment-name';
        name.textContent = attachmentName;
        attachmentEl.appendChild(name);

        attachmentsContainer.appendChild(attachmentEl);
      });

      emailContainer.appendChild(attachmentsContainer);
    }

    // Footer
    const footer = document.createElement('div');
    footer.className = 'footer';

    // Créer le contenu du footer avec logo et texte
    const footerContent = document.createElement('div');
    footerContent.className = 'footer-content';

    // Logo CNB
    const cnbLogo = document.createElement('img');
    cnbLogo.src = '../img/logo.jpg';
    cnbLogo.alt = 'Logo CNB';
    cnbLogo.className = 'footer-logo';
    cnbLogo.onerror = function () {
      // Masquer le logo si l'image n'existe pas
      this.style.display = 'none';
    };

    // Texte du footer
    const footerText = document.createElement('span');
    footerText.className = 'footer-text';
    footerText.textContent = "OptimXmlPreview v2.0 - Visualisation d'emails eBarreau";

    footerContent.appendChild(cnbLogo);
    footerContent.appendChild(footerText);
    footer.appendChild(footerContent);
    container.appendChild(footer);

    // Sauvegarder le fichier HTML
    const htmlContent = dom.serialize();
    await fs.writeFile(outputHtmlPath, htmlContent, 'utf8');

    // Génération silencieuse du PDF
    try {
      await convertHtmlToPdf(outputHtmlPath, CONFIG.PDF_OUTPUT_DIR);
    } catch (err) {
      Logger.warning(`PDF non généré pour ${path.basename(outputHtmlPath)}: ${err.message}`);
    }

    return true;
  } catch (error) {
    Logger.error(`Erreur lors de la conversion de ${sourceFilePath}: ${error.message}`);
    return false;
  }
}

/**
 * Ouvre un fichier HTML dans le navigateur par défaut
 * Utilise un nom d'onglet spécifique pour grouper les ouvertures
 * @param {string} filePath - Chemin du fichier HTML à ouvrir
 * @returns {Promise<void>}
 * @deprecated Fonction actuellement non utilisée, conservée pour usage futur
 */
// eslint-disable-next-line no-unused-vars
async function openInBrowser(filePath) {
  return new Promise((resolve) => {
    const platform = process.platform;
    let command, args;

    if (platform === 'win32') {
      // Sur Windows, utiliser start avec la syntaxe correcte
      // start "" "filepath" - le premier "" est pour le titre de la fenêtre
      command = 'cmd';
      args = ['/c', 'start', '', `"${filePath}"`];
    } else if (platform === 'darwin') {
      command = 'open';
      args = [filePath];
    } else {
      command = 'xdg-open';
      args = [filePath];
    }

    const child = spawn(command, args, {
      detached: true,
      shell: platform === 'win32',
      stdio: 'ignore',
    });

    child.on('error', (err) => {
      Logger.error(`Erreur lors de l'ouverture du fichier: ${err.message}`);
    });

    child.unref();
    resolve();
  });
}

/**
 * Vide le contenu du dossier Data (supprime tous les fichiers XML)
 * @param {string} dataFolder - Chemin du dossier Data à vider
 * @returns {Promise<boolean>} true si le dossier a été vidé avec succès
 */
async function clearDataFolder(dataFolder) {
  try {
    // Vérifier que le dossier existe
    await fs.access(dataFolder);

    // Lire le contenu du dossier
    const files = await fs.readdir(dataFolder);
    const xmlFiles = files.filter((file) =>
      CONFIG.SUPPORTED_EXTENSIONS.includes(path.extname(file).toLowerCase())
    );

    if (xmlFiles.length === 0) {
      Logger.info('Aucun fichier XML à supprimer dans le dossier Data');
      return true;
    }

    Logger.info(`Suppression de ${xmlFiles.length} fichier(s) XML du dossier Data...`);
    // Supprimer chaque fichier XML
    const deletePromises = xmlFiles.map(async (file) => {
      const filePath = path.join(dataFolder, file);
      try {
        await fs.unlink(filePath);
        Logger.success(`Supprimé: ${file}`);
        return true;
      } catch (error) {
        Logger.error(`Erreur lors de la suppression de ${file}: ${error.message}`);
        return false;
      }
    });

    const results = await Promise.all(deletePromises);
    const successCount = results.filter((success) => success).length;

    if (successCount === xmlFiles.length) {
      Logger.success(`Dossier Data vidé avec succès (${successCount} fichiers supprimés)`);
      return true;
    } else {
      Logger.warning(
        `Dossier Data partiellement vidé (${successCount}/${xmlFiles.length} fichiers supprimés)`
      );
      return false;
    }
  } catch (error) {
    if (error.code === 'ENOENT') {
      Logger.warning("Le dossier Data n'existe pas");
      return true; // Pas d'erreur si le dossier n'existe pas
    } else {
      Logger.error(`Erreur lors du vidage du dossier Data: ${error.message}`);
      return false;
    }
  }
}

/**
 * Traite un fichier XML spécifique
 * @param {string} inputXmlPath - Chemin du fichier XML d'entrée
 * @param {string} outputDir - Répertoire de sortie
 * @returns {Promise<string|false>} Chemin du fichier HTML généré ou false en cas d'erreur
 */
async function processSpecificFile(inputXmlPath, outputDir) {
  const loader = new ConsoleLoader(`Traitement de ${path.basename(inputXmlPath)}...`);
  loader.start();

  try {
    // Vérifier l'existence du fichier source
    await fs.access(inputXmlPath);

    // Créer le chemin de sortie
    const outputHtmlFileName = path.parse(inputXmlPath).name + CONFIG.OUTPUT_FILE_EXTENSION;
    const outputHtmlPath = path.join(outputDir, outputHtmlFileName);

    // Lire et convertir le fichier
    const content = await fs.readFile(inputXmlPath, 'utf8');
    const success = await convertXmlToHtml(content, outputHtmlPath, inputXmlPath, outputDir);

    loader.stop();

    if (success) {
      Logger.success(
        `Converti: ${path.basename(inputXmlPath)} -> ${path.basename(outputHtmlPath)}`
      );

      return outputHtmlPath;
    } else {
      Logger.error(`Échec de conversion: ${inputXmlPath}`);
      return false;
    }
  } catch (error) {
    loader.stop();

    if (error.code === 'ENOENT') {
      Logger.error(`Le fichier ${inputXmlPath} n'existe pas`);
    } else {
      Logger.error(`Erreur lors du traitement de ${inputXmlPath}: ${error.message}`);
    }
    return false;
  }
}

/**
 * Traite tous les fichiers XML d'un répertoire
 * @param {string} inputDir - Répertoire d'entrée
 * @param {string} outputDir - Répertoire de sortie
 * @returns {Promise<{success: boolean, generatedFiles: string[]}>} Résultat du traitement et liste des fichiers générés
 */
async function processAllFiles(inputDir, outputDir) {
  try {
    // Vérifier l'existence du répertoire d'entrée
    await fs.access(inputDir);

    // Lire le contenu du répertoire
    const files = await fs.readdir(inputDir);
    const xmlFiles = files.filter((file) =>
      CONFIG.SUPPORTED_EXTENSIONS.includes(path.extname(file).toLowerCase())
    );

    if (xmlFiles.length === 0) {
      Logger.warning(`Aucun fichier XML trouvé dans ${inputDir}`);
      // Générer quand même l'interface pour afficher les fichiers existants
      Logger.info("Génération de la page d'index avec menu de navigation...");
      const indexGenerated = await generateIndexPage(outputDir, []);

      if (indexGenerated) {
        Logger.success("Page d'index générée avec succès - Interface de navigation disponible");
      }

      return { success: true, generatedFiles: [] }; // Pas d'erreur, juste aucun fichier à traiter
    }

    Logger.info(`Traitement de ${xmlFiles.length} fichier(s) XML depuis ${inputDir}...`);

    const loader = new ConsoleLoader('Conversion en cours...');
    loader.start();

    let successCount = 0;
    let errorCount = 0;
    const generatedFiles = [];

    // Traiter les fichiers en parallèle avec une limite de concurrence
    const CONCURRENCY_LIMIT = 5;

    for (let i = 0; i < xmlFiles.length; i += CONCURRENCY_LIMIT) {
      const batch = xmlFiles.slice(i, i + CONCURRENCY_LIMIT);

      const batchPromises = batch.map(async (file) => {
        const inputXmlPath = path.join(inputDir, file);
        const outputHtmlFileName = path.parse(file).name + CONFIG.OUTPUT_FILE_EXTENSION;
        const outputHtmlPath = path.join(outputDir, outputHtmlFileName);

        try {
          const content = await fs.readFile(inputXmlPath, 'utf8');
          const success = await convertXmlToHtml(content, outputHtmlPath, inputXmlPath, outputDir);

          return { file, success, outputPath: success ? outputHtmlPath : null };
        } catch (error) {
          Logger.error(`Erreur lors de la lecture de ${file}: ${error.message}`);
          return { file, success: false, outputPath: null };
        }
      });

      const results = await Promise.all(batchPromises);

      results.forEach(({ file: _file, success, outputPath }) => {
        if (success) {
          successCount++;
          if (outputPath) {
            generatedFiles.push(outputPath);
          }
        } else {
          errorCount++;
        }
      });
    }

    loader.stop();

    // Afficher le résumé
    console.log(
      `\n${COLORS.BRIGHT}${COLORS.BLUE}Conversion terminée:${COLORS.RESET} ` +
        `${COLORS.GREEN}${successCount} succès${COLORS.RESET}, ` +
        `${COLORS.RED}${errorCount} échecs${COLORS.RESET}`
    );

    // Générer la page d'index avec menu de navigation (toujours)
    Logger.info("Génération de la page d'index avec menu de navigation...");
    const indexGenerated = await generateIndexPage(outputDir, generatedFiles);

    if (indexGenerated) {
      Logger.success("Page d'index générée avec succès - Interface de navigation disponible");
    }

    // Retourner le résultat et la liste des fichiers générés
    return {
      success: errorCount === 0,
      generatedFiles: generatedFiles,
    };
  } catch (error) {
    if (error.code === 'ENOENT') {
      Logger.error(`Le répertoire ${inputDir} n'existe pas`);
    } else {
      Logger.error(`Erreur lors du traitement du répertoire ${inputDir}: ${error.message}`);
    }
    return { success: false, generatedFiles: [] };
  }
}

/**
 * Analyse et valide les arguments de ligne de commande
 * @param {string[]} args - Arguments de ligne de commande
 * @returns {ProcessingOptions|null} Options de traitement ou null si invalides
 */
function parseArguments(args) {
  const options = {};

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--output':
      case '-o':
        options.outputDir = args[++i];
        break;
      case '--source-file':
      case '-s':
        options.sourceFile = args[++i];
        break;
      case '--input-dir':
      case '-i':
        options.inputDir = args[++i];
        break;
      case '--delete-source':
        options.deleteSource = true;
        break;
      case '--clear-data-folder':
        options.clearDataFolder = true;
        break;
      case '--help':
      case '-h':
        displayHelp();
        return null;
      default:
        if (args[i].startsWith('-')) {
          Logger.error(`Option inconnue: ${args[i]}`);
          return null;
        }
        break;
    }
  }

  // Validation des options requises
  if (!options.outputDir) {
    Logger.error('Le répertoire de sortie est requis (--output)');
    displayHelp();
    return null;
  }

  if (!options.sourceFile && !options.inputDir) {
    Logger.error('Source requise: --source-file ou --input-dir');
    displayHelp();
    return null;
  }

  return options;
}

/**
 * Affiche l'aide d'utilisation
 */
function displayHelp() {
  console.log(`
${COLORS.BRIGHT}OptimXmlPreview v2.0 - Convertisseur XML vers HTML${COLORS.RESET}

${COLORS.CYAN}UTILISATION:${COLORS.RESET}
  node ConvertXmlToHtml.js [options]

${COLORS.CYAN}OPTIONS:${COLORS.RESET}
  -o, --output <dir>        Répertoire de sortie (requis)
  -s, --source-file <file>  Fichier XML spécifique à convertir
  -i, --input-dir <dir>     Répertoire contenant les fichiers XML
  --delete-source           Supprimer les fichiers source après conversion
  --clear-data-folder       Vider le dossier Data après conversion
  -h, --help                Afficher cette aide

${COLORS.CYAN}EXEMPLES:${COLORS.RESET}
  node ConvertXmlToHtml.js -o ./Output -s ./Data/email.xml
  node ConvertXmlToHtml.js -o ./Output -i ./Data
  node ConvertXmlToHtml.js --output ./Output --input-dir ./Data --delete-source
`);
}

/**
 * Fonction principale
 * @returns {Promise<void>}
 */
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    displayHelp();
    return;
  }

  const options = parseArguments(args);
  if (!options) {
    return;
  }

  try {
    // Créer le répertoire de sortie
    await fs.mkdir(options.outputDir, { recursive: true });
    Logger.success(`Répertoire de sortie créé: ${options.outputDir}`);

    // Traitement selon le type de source
    if (options.sourceFile) {
      const result = await processSpecificFile(options.sourceFile, options.outputDir);

      if (result && options.deleteSource) {
        try {
          await fs.unlink(options.sourceFile);
          Logger.success(`Fichier source supprimé: ${options.sourceFile}`);
        } catch (error) {
          Logger.warning(`Impossible de supprimer le fichier source: ${error.message}`);
        }
      }
    } else if (options.inputDir) {
      const result = await processAllFiles(options.inputDir, options.outputDir);

      if (options.deleteSource) {
        Logger.warning(
          'Suppression des fichiers sources non implémentée pour le traitement par lot'
        );
      }

      // Vider le dossier Data après conversion si l'option est activée
      if (options.clearDataFolder && result.success && result.generatedFiles.length > 0) {
        Logger.info('Vidage du dossier Data après conversion...');
        const clearSuccess = await clearDataFolder(options.inputDir);
        if (!clearSuccess) {
          Logger.warning('Échec partiel du vidage du dossier Data');
        }
      }

      if (!result.success) {
        Logger.error('Échec de la conversion de tous les fichiers');
        process.exit(1);
      }
    }

    Logger.success('Traitement terminé avec succès!');

    // Message simple pour détection batch (sans caractères Unicode)
    console.log('CONVERSION_SUCCESS');

    // Sortie explicite avec code de succès
    process.exit(0);
  } catch (error) {
    Logger.error(`Erreur fatale: ${error.message}`);
    process.exit(1);
  }
}

// Point d'entrée du script
if (require.main === module) {
  main().catch((error) => {
    Logger.error(`Erreur inattendue: ${error.message}`);
    process.exit(1);
  });
}

// Exports pour les tests unitaires (si nécessaire)
module.exports = {
  convertXmlToHtml,
  extractEmailMetadata,
  formatDate,
  getFileIcon,
  processSpecificFile,
  processAllFiles,
  generateIndexPage,
  clearDataFolder,
};

/**
 * Génère une page d'index avec menu latéral pour naviguer entre les emails convertis
 * @param {string} outputDir - Répertoire contenant les fichiers HTML
 * @param {string[]} recentFiles - Liste des fichiers HTML récemment générés
 * @returns {Promise<boolean>} true si l'index a été généré avec succès
 */
async function generateIndexPage(outputDir, recentFiles = []) {
  try {
    const indexPath = path.join('.', 'index.html'); // Créer à la racine du projet

    // Scanner tous les fichiers HTML existants dans le dossier Output
    let allHtmlFiles = [];
    try {
      const outputFiles = await fs.readdir(outputDir);
      allHtmlFiles = outputFiles
        .filter((file) => file.endsWith('.html') && file !== 'index.html')
        .map((file) => path.join(outputDir, file));
    } catch (error) {
      Logger.warning(`Impossible de scanner le dossier ${outputDir}: ${error.message}`);
    }

    // Générer le texte du compteur d'emails
    let emailCountText;
    if (recentFiles.length > 0) {
      emailCountText = `${recentFiles.length} nouveaux / ${allHtmlFiles.length} emails`;
    } else {
      emailCountText = `${allHtmlFiles.length} emails`;
    }

    // Créer la structure HTML de la page d'index
    const indexHtml = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>OptimXmlPreview - Navigation des emails</title>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" crossorigin="anonymous">
  <style>
    ${getIndexPageCSS()}
  </style>
</head>
<body>
  <div class="app-container">
    <!-- Header -->
    <div class="header-bar">
      <div class="header-content">
        <i class="fas fa-envelope-open-text header-icon"></i>
        <h1>OptimXmlPreview</h1>
        <button class="convert-button" id="convertButton">
          <i class="fas fa-sync-alt"></i>
          Convertir nouveaux emails
        </button>
        <button class="send-selected-button" id="sendSelectedButton" disabled>
          <i class="fas fa-paper-plane"></i>
          Envoyer sélection
        </button>
        <span class="email-count">${emailCountText}</span>
      </div>
    </div>

    <div class="main-content">
      <!-- Sidebar -->
      <aside class="sidebar">
        <div class="sidebar-header">
          <h2><i class="fas fa-list"></i> Emails convertis</h2>
          <div class="search-box">
            <i class="fas fa-search"></i>
            <input type="text" id="searchInput" placeholder="Rechercher...">
          </div>
        </div>
        <div class="email-list" id="emailList">
          ${generateEmailListHTML(allHtmlFiles, recentFiles)}
        </div>
      </aside>

      <!-- Content Area -->
      <main class="content-area">
        <div class="welcome-screen" id="welcomeScreen">
          <div class="welcome-content">
            <i class="fas fa-envelope-open welcome-icon"></i>
            <h2>Bienvenue dans OptimXmlPreview</h2>
            <p>Sélectionnez un email dans la liste de gauche pour l'afficher</p>
            <div class="stats">
              <div class="stat-item">
                <i class="fas fa-file-alt"></i>
                <span>${allHtmlFiles.length} emails convertis</span>
              </div>
              <div class="stat-item">
                <i class="fas fa-clock"></i>
                <span>Dernière conversion : ${new Date().toLocaleDateString('fr-FR')}</span>
              </div>
              ${
                recentFiles.length > 0
                  ? `
              <div class="stat-item">
                <i class="fas fa-plus-circle"></i>
                <span>${recentFiles.length} nouveaux fichiers</span>
              </div>
              `
                  : ''
              }
            </div>
          </div>
        </div>
        <iframe id="contentFrame" src="" style="display: none;"></iframe>
      </main>
    </div>
  </div>

  <script>
    ${getIndexPageJavaScript()}
  </script>
</body>
</html>`;

    await fs.writeFile(indexPath, indexHtml, 'utf8');
    Logger.success(`Page d'index générée: ${indexPath}`);
    return true;
  } catch (error) {
    Logger.error(`Erreur lors de la génération de l'index: ${error.message}`);
    return false;
  }
}

/**
 * Génère le HTML de la liste des emails
 * @param {string[]} htmlFiles - Liste des fichiers HTML
 * @param {string[]} recentFiles - Liste des fichiers récemment générés
 * @returns {string} HTML de la liste
 */
function generateEmailListHTML(htmlFiles, recentFiles = []) {
  // Séparer les fichiers en nouveaux et anciens
  const newFiles = htmlFiles.filter((file) => recentFiles.includes(file));
  const oldFiles = htmlFiles.filter((file) => !recentFiles.includes(file));

  // Fonction pour trier par date de modification (plus récent en premier)
  const sortByDate = (files) => {
    return files.sort((a, b) => {
      try {
        const statA = fsSync.statSync(a);
        const statB = fsSync.statSync(b);
        return statB.mtime - statA.mtime; // Plus récent en premier
      } catch (error) {
        // En cas d'erreur, trier par nom de fichier
        return b.localeCompare(a);
      }
    });
  };

  // Trier chaque groupe
  const sortedNewFiles = sortByDate([...newFiles]);
  const sortedOldFiles = sortByDate([...oldFiles]);

  // Fonction pour générer un élément email
  const generateEmailItem = (file, index, isRecent) => {
    const fileName = path.basename(file, '.html');
    const fileNameOnly = path.basename(file);
    const relativePath = `Output/${fileNameOnly}`;
    const pdfPath = `pdf/${fileName}.pdf`;
    const displayName = fileName.length > 50 ? fileName.substring(0, 50) + '...' : fileName;
    const fileSize = '~5KB';

    const recentClass = isRecent ? 'recent' : '';
    const recentIcon = isRecent
      ? '<i class="fas fa-star recent-star" title="Nouveau fichier"></i>'
      : '';

    // Obtenir la date de modification du fichier
    let fileDate = '';
    try {
      fileDate = fsSync.statSync(file).mtime.toLocaleDateString('fr-FR');
    } catch (e) {}

    // Checkbox + actions (PDF, mail, external)
    return `
      <div class="email-item ${recentClass}" data-file="${relativePath}" data-pdf="${pdfPath}" data-index="${index}">
        <input type="checkbox" class="email-select" />
        <div class="email-icon">
          <i class="fas fa-envelope"></i>
        </div>
        <div class="email-info">
          <div class="email-title">${displayName} ${recentIcon}</div>
          <div class="email-meta">
            <span class="file-size">${fileSize}</span>
            <span class="file-date">${fileDate}</span>
          </div>
        </div>
        <div class="email-actions">
          <i class="fas fa-file-pdf open-pdf" title="Ouvrir le PDF"></i>
          <i class="fas fa-paper-plane send-mail" title="Envoyer par email"></i>
          <i class="fas fa-external-link-alt open-html" title="Ouvrir dans un nouvel onglet"></i>
        </div>
      </div>
    `;
  };

  let html = '';
  let globalIndex = 0;

  // Section des nouveaux fichiers
  if (sortedNewFiles.length > 0) {
    html += `
      <div class="email-section-header">
        <h3><i class="fas fa-plus-circle"></i> Nouveaux emails (${sortedNewFiles.length})</h3>
      </div>
    `;

    sortedNewFiles.forEach((file) => {
      html += generateEmailItem(file, globalIndex, true);
      globalIndex++;
    });
  }

  // Section des anciens fichiers
  if (sortedOldFiles.length > 0) {
    html += `
      <div class="email-section-header">
        <h3><i class="fas fa-archive"></i> Emails précédents (${sortedOldFiles.length})</h3>
      </div>
    `;

    sortedOldFiles.forEach((file) => {
      html += generateEmailItem(file, globalIndex, false);
      globalIndex++;
    });
  }

  return html;
}

/**
 * Génère le CSS pour la page d'index
 * @returns {string} CSS complet pour l'interface de navigation
 */
function getIndexPageCSS() {
  return `
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background-color: #f8fafc;
      color: #1f2937;
      overflow: hidden;
    }

    .app-container {
      height: 100vh;
      display: flex;
      flex-direction: column;
    }

    /* Header */
    .header-bar {
      background: linear-gradient(135deg, #141325 0%, #1e1b4b 100%);
      color: white;
      padding: 1rem 1.5rem;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
      z-index: 100;
    }

    .header-content {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .header-icon {
      font-size: 1.5rem;
      color: #d60405;
    }

    .header-bar h1 {
      font-size: 1.5rem;
      font-weight: 600;
      flex: 1;
    }

    .convert-button {
      background: linear-gradient(135deg, #059669 0%, #10b981 100%);
      color: white;
      border: none;
      padding: 0.75rem 1.5rem;
      border-radius: 0.5rem;
      font-size: 0.875rem;
      font-weight: 500;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      transition: all 0.2s ease;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }

    .convert-button:hover {
      background: linear-gradient(135deg, #047857 0%, #059669 100%);
      transform: translateY(-1px);
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
    }

    .convert-button:active {
      transform: translateY(0);
    }

    .convert-button:disabled {
      opacity: 0.7;
      cursor: not-allowed;
      transform: none !important;
    }

    .convert-button i {
      font-size: 1rem;
    }

    .email-count {
      background: rgba(59, 130, 246, 0.2);
      padding: 0.25rem 0.75rem;
      border-radius: 1rem;
      font-size: 0.875rem;
      border: 1px solid rgba(59, 130, 246, 0.3);
    }

    /* Main Content */
    .main-content {
      display: flex;
      flex: 1;
      overflow: hidden;
    }

    /* Sidebar */
    .sidebar {
      width: 400px;
      background: #141325;
      color: white;
      border-right: 1px solid #1e1b4b;
      display: flex;
      flex-direction: column;
      box-shadow: 2px 0 10px rgba(0,0,0,0.15);
    }

    .sidebar-header {
      padding: 1.5rem;
      border-bottom: 1px solid #1e1b4b;
      background: #0f0f23;
    }

    .sidebar-header h2 {
      font-size: 1.125rem;
      font-weight: 600;
      color: #e5e7eb;
      margin-bottom: 1rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .search-box {
      position: relative;
    }

    .search-box i {
      position: absolute;
      left: 0.75rem;
      top: 50%;
      transform: translateY(-50%);
      color: #6b7280;
      font-size: 0.875rem;
    }

    .search-box input {
      width: 100%;
      padding: 0.5rem 0.75rem 0.5rem 2.25rem;
      border: 1px solid #374151;
      border-radius: 0.5rem;
      font-size: 0.875rem;
      background: #1f2937;
      color: white;
      transition: border-color 0.2s;
    }

    .search-box input:focus {
      outline: none;
      border-color: #3b82f6;
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
    }

    .search-box input::placeholder {
      color: #9ca3af;
    }

    /* Email List */
    .email-list {
      flex: 1;
      overflow-y: auto;
      padding: 0.5rem;
    }

    .email-section-header {
      padding: 1rem 1rem 0.5rem 1rem;
      margin-top: 1rem;
      border-top: 1px solid #374151;
    }

    .email-section-header:first-child {
      margin-top: 0;
      border-top: none;
    }

    .email-section-header h3 {
      margin: 0;
      font-size: 0.875rem;
      font-weight: 600;
      color: #e5e7eb;
      text-transform: uppercase;
      letter-spacing: 0.025em;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .email-section-header h3 i {
      color: #10b981;
      font-size: 0.75rem;
    }

    .email-section-header h3 .fa-archive {
      color: #6b7280;
    }

    .email-item {
      display: flex;
      align-items: center;
      padding: 1rem;
      margin-bottom: 0.5rem;
      border-radius: 0.75rem;
      cursor: pointer;
      transition: all 0.2s ease;
      border: 2px solid transparent;
      color: #d1d5db;
    }

    .email-item:hover {
      background: #1f2937;
      border-color: #374151;
    }

    .email-item.active {
      background: #1e3a8a;
      border-color: #3b82f6;
      color: white;
    }

    .email-item.recent {
      background: rgba(0, 105, 72, 0.1);
      border-color: rgba(0, 105, 72, 0.3);
    }

    .email-item.recent:hover {
      background: rgba(0, 105, 72, 0.2);
      border-color: #006948;
    }

    .email-item.recent.active {
      background: #006948;
      border-color: #059669;
    }

    .email-icon {
      margin-right: 0.75rem;
      color: #9ca3af;
      font-size: 1.25rem;
    }

    .email-item.active .email-icon {
      color: #dbeafe;
    }

    .email-item.recent .email-icon {
      color: #10b981;
    }

    .email-item.recent.active .email-icon {
      color: white;
    }

    .email-info {
      flex: 1;
      min-width: 0;
    }

    .email-title {
      font-weight: 500;
      font-size: 0.875rem;
      color: inherit;
      margin-bottom: 0.25rem;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .recent-star {
      color: #fbbf24;
      font-size: 0.75rem;
      flex-shrink: 0;
    }

    .email-meta {
      display: flex;
      gap: 0.75rem;
      font-size: 0.75rem;
      color: #9ca3af;
    }

    .email-item.active .email-meta {
      color: #cbd5e1;
    }

    .email-actions {
      opacity: 0;
      transition: opacity 0.2s;
      color: #9ca3af;
      font-size: 0.875rem;
    }

    .email-item:hover .email-actions {
      opacity: 1;
    }

    .email-actions i:hover {
      color: #3b82f6;
    }

    .email-item.recent .email-actions i:hover {
      color: #22c55e;
    }

    /* Content Area */
    .content-area {
      flex: 1;
      display: flex;
      flex-direction: column;
      background: white;
      position: relative;
    }

    .welcome-screen {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #f8fafc 0%, #e5e7eb 100%);
    }

    .welcome-content {
      text-align: center;
      max-width: 500px;
      padding: 2rem;
    }

    .welcome-icon {
      font-size: 4rem;
      color: #6b7280;
      margin-bottom: 1.5rem;
    }

    .welcome-content h2 {
      font-size: 1.875rem;
      font-weight: 600;
      color: #1f2937;
      margin-bottom: 1rem;
    }

    .welcome-content p {
      font-size: 1.125rem;
      color: #6b7280;
      margin-bottom: 2rem;
    }

    .stats {
      display: flex;
      gap: 2rem;
      justify-content: center;
      flex-wrap: wrap;
    }

    .stat-item {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.875rem;
      color: #374151;
    }

    .stat-item i {
      color: #3b82f6;
    }

    #contentFrame {
      width: 100%;
      height: 100%;
      border: none;
      background: white;
    }

    /* Notifications */
    .notification {
      position: fixed;
      top: 5rem;
      right: 1.5rem;
      background: white;
      color: #374151;
      padding: 1rem 1.5rem;
      border-radius: 0.5rem;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
      border-left: 4px solid #3b82f6;
      display: flex;
      align-items: center;
      gap: 0.75rem;
      min-width: 300px;
      transform: translateX(100%);
      opacity: 0;
      transition: all 0.3s ease;
      z-index: 1000;
      font-size: 0.875rem;
      font-weight: 500;
    }

    .notification.show {
      transform: translateX(0);
      opacity: 1;
    }

    .notification-success {
      border-left-color: #10b981;
    }

    .notification-success i {
      color: #10b981;
    }

    .notification-error {
      border-left-color: #ef4444;
    }

    .notification-error i {
      color: #ef4444;
    }

    .notification i {
      font-size: 1.25rem;
      flex-shrink: 0;
    }

    .email-select { margin-right: 0.75rem; cursor:pointer; }
    .email-actions i { cursor: pointer; }
    .email-actions i + i { margin-left: 0.5rem; }
    .send-selected-button { background: linear-gradient(135deg,#3b82f6 0%, #60a5fa 100%); color:white; border:none; padding:0.75rem 1.5rem; border-radius:0.5rem; font-size:0.875rem; font-weight:500; cursor:pointer; display:flex; align-items:center; gap:0.5rem; transition:all 0.2s ease; box-shadow:0 2px 4px rgba(0,0,0,0.1);} 
    .send-selected-button:hover { background: linear-gradient(135deg,#2563eb 0%, #3b82f6 100%); transform:translateY(-1px);} 
    .send-selected-button:disabled { opacity:0.7; cursor:not-allowed; transform:none !important; }
  `;
}

/**
 * Génère le JavaScript pour la page d'index
 * @returns {string} JavaScript complet pour l'interface de navigation
 */
function getIndexPageJavaScript() {
  return `
    document.addEventListener('DOMContentLoaded', function() {
      // Supprimer les erreurs d'extensions de navigateur de la console
      window.addEventListener('error', function(e) {
        if (e.message && e.message.includes('runtime.lastError')) {
          e.preventDefault();
          return true;
        }
      });

      const emailItems = document.querySelectorAll('.email-item');
      const contentFrame = document.getElementById('contentFrame');
      const welcomeScreen = document.getElementById('welcomeScreen');
      const searchInput = document.getElementById('searchInput');
      const convertButton = document.getElementById('convertButton');

      // Détection du contexte (serveur vs fichier local)
      const isServerMode = window.location.protocol === 'http:' || window.location.protocol === 'https:';
      const isFileMode = window.location.protocol === 'file:';

      // Mode détecté silencieusement
      // En mode développement, décommenter la ligne suivante :
      // console.log('OptimXmlPreview - Mode détecté:', isServerMode ? 'Serveur' : 'Fichier local');

      if (isFileMode) {
        // Désactiver le bouton de conversion en mode fichier
        if (convertButton) {
          convertButton.disabled = true;
          convertButton.innerHTML = '<i class="fas fa-info-circle"></i> Serveur requis';
          convertButton.title = 'Démarrez le serveur (start_server.bat) pour utiliser cette fonctionnalité';
        }

        // Modifier le placeholder de recherche
        if (searchInput) {
          searchInput.placeholder = 'Recherche simple par titre...';
          searchInput.title = 'Recherche limitée en mode fichier local. Utilisez le serveur pour la recherche complète.';
        }
      }

      // Gestion du bouton de conversion
      convertButton.addEventListener('click', function() {
        const button = this;
        const originalContent = button.innerHTML;
        
        // Animation de chargement
        button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Conversion...';
        button.disabled = true;
        
        // Appel API pour la conversion
        fetch('/api/convert', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({})
        })
        .then(response => response.json())
        .then(data => {
          if (data.success) {
            // Succès
            button.innerHTML = '<i class="fas fa-check"></i> Conversion réussie !';
            showNotification('Conversion terminée ! ' + data.details.converted + ' fichier(s) converti(s)', 'success');
            
            // Recharger la page après 2 secondes pour afficher les nouveaux emails
            setTimeout(() => {
              window.location.reload();
            }, 2000);
          } else {
            // Erreur
            button.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Erreur';
            showNotification('Erreur de conversion: ' + data.error, 'error');
            
            // Rétablir le bouton après 3 secondes
            setTimeout(() => {
              button.innerHTML = originalContent;
              button.disabled = false;
            }, 3000);
          }
        })
        .catch(error => {
          // Erreur silencieuse pour éviter le spam console
          button.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Erreur réseau';
          showNotification('Erreur de connexion au serveur', 'error');
          
          // Rétablir le bouton après 3 secondes
          setTimeout(() => {
            button.innerHTML = originalContent;
            button.disabled = false;
          }, 3000);
        });
      });

      // Fonction pour afficher des notifications
      function showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = 'notification notification-' + type;
        notification.innerHTML = '<i class="fas ' + (type === "success" ? "fa-check-circle" : "fa-info-circle") + '"></i><span>' + message + '</span>'; 
        
        document.body.appendChild(notification);
        
        // Animation d'apparition
        setTimeout(() => notification.classList.add('show'), 100);
        
        // Suppression automatique
        setTimeout(() => {
          notification.classList.remove('show');
          setTimeout(() => document.body.removeChild(notification), 3000);
        }, 3000);
      }

      // Navigation entre les emails
      emailItems.forEach(item => {
        item.addEventListener('click', function() {
          const fileName = this.dataset.file;
          loadEmail(fileName, this);
        });

        // Ouvrir dans un nouvel onglet
        const externalLink = item.querySelector('.fa-external-link-alt');
        externalLink.addEventListener('click', function(e) {
          e.stopPropagation();
          const fileName = item.dataset.file;
          window.open(fileName, '_blank');
        });
      });

      // Recherche dans la liste
      let searchTimeout;
      searchInput.addEventListener('input', function() {
        const searchTerm = this.value.trim();
        
        // Débounce pour éviter trop de requêtes
        clearTimeout(searchTimeout);
        
        if (searchTerm.length === 0) {
          // Afficher tous les emails si pas de recherche
          showAllEmails();
          return;
        }

        if (searchTerm.length < 2) {
          // Attendre au moins 2 caractères
          return;
        }

        searchTimeout = setTimeout(() => {
          performFullTextSearch(searchTerm);
        }, 300);
      });

      // Fonction pour afficher tous les emails
      function showAllEmails() {
        emailItems.forEach(item => {
          item.style.display = 'flex';
          item.classList.remove('search-highlight');
        });
        
        // Afficher/masquer les en-têtes de section
        document.querySelectorAll('.email-section-header').forEach(header => {
          header.style.display = 'block';
        });
      }

      // Fonction de recherche full-text
      function performFullTextSearch(searchTerm) {
        if (isFileMode) {
          // En mode fichier local, utiliser la recherche simple par titre
          performSimpleSearch(searchTerm);
          return;
        }

        // En mode serveur, utiliser l'API de recherche
        fetch('/api/search?q=' + encodeURIComponent(searchTerm))
          .then(response => response.json())
          .then(data => {
            if (data.success) {
              displaySearchResults(data.results, searchTerm);
            } else {
              // Erreur de recherche gérée par notification utilisateur
              showNotification('Erreur lors de la recherche', 'error');
            }
          })
          .catch(error => {
            // Erreur réseau gérée par notification utilisateur
            showNotification('Erreur de connexion lors de la recherche', 'error');
          });
      }

      // Fonction de recherche simple (mode fichier local)
      function performSimpleSearch(searchTerm) {
        const searchTermLower = searchTerm.toLowerCase();
        let hasResults = false;

        // Masquer les en-têtes de section
        document.querySelectorAll('.email-section-header').forEach(header => {
          header.style.display = 'none';
        });

        emailItems.forEach(item => {
          const title = item.querySelector('.email-title').textContent.toLowerCase();
          if (title.includes(searchTermLower)) {
            item.style.display = 'flex';
            item.classList.add('search-highlight');
            hasResults = true;
          } else {
            item.style.display = 'none';
            item.classList.remove('search-highlight');
          }
        });

        if (!hasResults) {
          showNoResultsMessage(searchTerm);
        }
      }

      // Fonction pour afficher les résultats de recherche
      function displaySearchResults(results, searchTerm) {
        // Masquer d'abord tous les emails
        emailItems.forEach(item => {
          item.style.display = 'none';
          item.classList.remove('search-highlight');
        });

        // Masquer les en-têtes de section pendant la recherche
        document.querySelectorAll('.email-section-header').forEach(header => {
          header.style.display = 'none';
        });

        let hasResults = false;

        results.forEach(result => {
          // Trouver l'élément email correspondant
          const emailItem = Array.from(emailItems).find(item => {
            const dataFile = item.dataset.file;
            const fileName = dataFile.replace('Output/', '');
            return fileName === result.file;
          });

          if (emailItem) {
            emailItem.style.display = 'flex';
            emailItem.classList.add('search-highlight');
            
            // Ajouter des badges de correspondance
            addMatchBadges(emailItem, result.matches);
            hasResults = true;
          }
        });

        // Afficher un message si aucun résultat
        if (!hasResults) {
          showNoResultsMessage(searchTerm);
        }
      }

      // Fonction pour ajouter des badges de correspondance
      function addMatchBadges(emailItem, matches) {
        // Supprimer les anciens badges
        const existingBadges = emailItem.querySelectorAll('.match-badge');
        existingBadges.forEach(badge => badge.remove());

        // Ajouter les nouveaux badges
        const emailInfo = emailItem.querySelector('.email-info');
        const badgeContainer = document.createElement('div');
        badgeContainer.className = 'match-badges';

        matches.forEach(match => {
          const badge = document.createElement('span');
          badge.className = 'match-badge';
          badge.textContent = match.type;
          badge.title = 'Trouvé dans: ' + match.type + ' - "' + match.value + '"';
          badgeContainer.appendChild(badge);
        });

        emailInfo.appendChild(badgeContainer);
      }

      // Fonction pour afficher un message "aucun résultat"
      function showNoResultsMessage(searchTerm) {
        // Créer un message temporaire
        const messageDiv = document.createElement('div');
        messageDiv.className = 'no-results-message';
        messageDiv.innerHTML = '<div class="no-results-content">' +
          '<i class="fas fa-search"></i>' +
          '<h3>Aucun résultat trouvé</h3>' +
          '<p>Aucun email ne correspond à votre recherche <strong>' + searchTerm + '</strong></p>' +
          '<small>La recherche porte sur les sujets, expéditeurs, destinataires, corps des messages et pièces jointes.</small>' +
        '</div>';

        // Insérer le message dans la liste des emails
        const emailList = document.getElementById('emailList');
        emailList.appendChild(messageDiv);

        // Supprimer le message après un délai
        setTimeout(() => {
          if (messageDiv.parentNode) {
            messageDiv.parentNode.removeChild(messageDiv);
          }
        }, 5000);
      }

      // Fonction pour charger un email
      function loadEmail(fileName, activeItem) {
        // Mettre à jour l'état actif
        emailItems.forEach(item => item.classList.remove('active'));
        activeItem.classList.add('active');

        // Cacher l'écran d'accueil et afficher le contenu
        welcomeScreen.style.display = 'none';
        contentFrame.style.display = 'block';
        contentFrame.src = fileName;

        // Mettre à jour l'URL sans recharger la page
        const newUrl = window.location.protocol + '//' + window.location.host + 
                      window.location.pathname + '?email=' + encodeURIComponent(fileName);
        window.history.pushState({email: fileName}, '', newUrl);
      }

      // Charger un email depuis l'URL
      const urlParams = new URLSearchParams(window.location.search);
      const emailParam = urlParams.get('email');
      if (emailParam) {
        const targetItem = Array.from(emailItems).find(item => 
          item.dataset.file === emailParam
        );
        if (targetItem) {
          loadEmail(emailParam, targetItem);
          targetItem.scrollIntoView({behavior: 'smooth', block: 'nearest'});
        }
      }

      // Navigation avec les flèches du clavier
      document.addEventListener('keydown', function(e) {
        const activeItem = document.querySelector('.email-item.active');
        if (!activeItem) return;

        let nextItem = null;
        
        if (e.key === 'ArrowDown') {
          nextItem = activeItem.nextElementSibling;
          e.preventDefault();
        } else if (e.key === 'ArrowUp') {
          nextItem = activeItem.previousElementSibling;
          e.preventDefault();
        }

        if (nextItem && nextItem.classList.contains('email-item')) {
          nextItem.click();
          nextItem.scrollIntoView({behavior: 'smooth', block: 'nearest'});
        }
      });

      // Gestion du retour navigateur
      window.addEventListener('popstate', function(e) {
        if (e.state && e.state.email) {
          const targetItem = Array.from(emailItems).find(item => 
            item.dataset.file === e.state.email
          );
          if (targetItem) {
            loadEmail(e.state.email, targetItem);
          }
        } else {
          // Retour à l'accueil
          emailItems.forEach(item => item.classList.remove('active'));
          welcomeScreen.style.display = 'flex';
          contentFrame.style.display = 'none';
        }
      });

      // Interface chargée avec succès
      // En mode développement, décommenter la ligne suivante :
      // console.log('OptimXmlPreview Navigation Interface loaded successfully');

      const checkboxes = document.querySelectorAll('.email-select');
      const sendSelectedButton = document.getElementById('sendSelectedButton');

      function updateSelected() {
        const any = Array.from(checkboxes).some(cb => cb.checked);
        sendSelectedButton.disabled = !any;
      }

      checkboxes.forEach(cb => {
        cb.addEventListener('click', e => { e.stopPropagation(); updateSelected(); });
      });

      sendSelectedButton.addEventListener('click', function() {
        const files = Array.from(checkboxes)
          .filter(cb => cb.checked)
          .map(cb => cb.closest('.email-item').dataset.pdf);
        if (files.length === 0) return;
        fetch('/api/send-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ files })
        })
          .then(() => {
            showNotification('Préparation Outlook avec ' + files.length + ' pièce(s) jointe(s)', 'success');
          })
          .catch(() => {
            showNotification('Erreur lors de la préparation de l\'email', 'error');
          });
      });

      // nouvelles actions PDF & mail par item
      emailItems.forEach(item => {
        const pdfIcon = item.querySelector('.open-pdf');
        pdfIcon.addEventListener('click', function(e) {
          e.stopPropagation();
          const pdf = item.dataset.pdf;
          window.open(pdf, '_blank');
        });

        const mailIcon = item.querySelector('.send-mail');
        mailIcon.addEventListener('click', function(e) {
          e.stopPropagation();
          const pdf = item.dataset.pdf;
          fetch('/api/send-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ files: [pdf] })
          })
            .then(() => {
              showNotification('Email prêt dans Outlook', 'success');
            })
            .catch(() => {
              showNotification('Erreur lors de la préparation de l\'email', 'error');
            });
        });
      });
    });
  `;
}
