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
const { Logger, COLORS } = require('../../utils/logger');

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
const CONFIG_FILE = require('../../assets/templates/config.js');

// Configuration par défaut avec chemins ajustés
const CONFIG = {
  ...CONFIG_FILE,
  LOGO_SOURCE_PATH: path.join('img', 'logo-blanc.png'),
  FAVICON_SOURCE_PATH: path.join('img', 'icon-com.svg'),
  PDF_OUTPUT_DIR: CONFIG_FILE.PDF_OUTPUT_DIR || './pdf',
};

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
  <link rel="icon" href="img/icon-com.svg" type="image/svg+xml">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" crossorigin="anonymous">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/quill@1.3.7/dist/quill.snow.css" />
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
  <link rel="icon" href="img/icon-com.svg" type="image/svg+xml">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" crossorigin="anonymous">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/quill@1.3.7/dist/quill.snow.css" />
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
        <button class="settings-button" id="openSettings" title="Paramètres email">
          <i class="fas fa-cog"></i>
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

  <!-- Settings Modal -->
  <div class="settings-modal" id="settingsModal" style="display:none;">
    <div class="settings-dialog">
      <div class="dialog-header">
        <h3><i class="fas fa-cog"></i> Paramètres email</h3>
        <button class="close-icon" id="closeSettings" title="Fermer"><i class="fas fa-times"></i></button>
      </div>
      <label for="subjectTemplateInput">Objet</label>
      <input type="text" id="subjectTemplateInput" placeholder="Objet de l'email..." />
      <label for="bodyQuill">Corps</label>
      <div id="bodyQuill" style="height:200px; background:white;"></div>
      <div class="token-bar">
        <span class="token">{{fileList}}</span>
        <span class="token">{{fileName}}</span>
      </div>
      <div class="actions">
        <button class="secondary" title="Annuler">Annuler</button>
        <button id="saveSettings">Enregistrer</button>
      </div>
    </div>
  </div>

  <script src="https://cdn.jsdelivr.net/npm/quill@1.3.7/dist/quill.min.js"></script>
  <script src="assets/js/navigation-interface.js"></script>
  <!-- Onboarding modal (affiché seulement à la première visite) -->
  <script src="assets/js/onboarding.js"></script>
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
      } catch (e) {
        /* ignore fs stat errors */
      }
      // En cas d'erreur, trier par nom de fichier
      return b.localeCompare(a);
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
    } catch (e) {
      /* ignore fs stat errors */
    }

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

    /* Settings button */
    .settings-button { background:#f3f4f6; color:#374151; border:none; padding:0.6rem 0.8rem; border-radius:0.5rem; font-size:0.9rem; cursor:pointer; margin-left:0.5rem; transition:all 0.2s ease; display:flex; align-items:center; }
    .settings-button i { font-size:1rem; }
    .settings-button:hover { background:#e5e7eb; transform:translateY(-1px); }

    /* Settings Modal */
    .settings-modal { position:fixed; inset:0; background:rgba(0,0,0,0.55); display:none; align-items:center; justify-content:center; z-index:2000; }
    .settings-dialog { background:white; border-radius:0.75rem; width:95%; max-width:640px; box-shadow:0 20px 40px rgba(0,0,0,0.25); padding:1.5rem 2rem; display:flex; flex-direction:column; gap:1rem; }
    .dialog-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:0.5rem; }
    .dialog-header h3 { font-size:1.25rem; font-weight:600; display:flex; gap:0.5rem; align-items:center; margin:0; }
    .dialog-header i { color:#3b82f6; }
    .close-icon { background:none; border:none; font-size:1.25rem; cursor:pointer; color:#6b7280; }
    .close-icon:hover { color:#ef4444; }
    .settings-dialog label { font-weight:500; font-size:0.875rem; color:#374151; }
    .settings-dialog input { border:1px solid #d1d5db; border-radius:0.375rem; padding:0.6rem 0.75rem; font-size:0.9rem; }
    .token-bar { display:flex; gap:0.5rem; flex-wrap:wrap; margin-top:0.5rem; }
    .token { background:#e0f2fe; color:#0284c7; padding:0.25rem 0.5rem; border-radius:0.375rem; font-size:0.8rem; cursor:pointer; }
    .token:hover { background:#bae6fd; }
    .actions { display:flex; justify-content:flex-end; gap:0.75rem; margin-top:1rem; }
    .actions button { border:none; padding:0.6rem 1.2rem; border-radius:0.375rem; font-size:0.9rem; cursor:pointer; }
    .actions .secondary { background:#e5e7eb; color:#374151; }
    .actions .secondary:hover { background:#d1d5db; }
    #saveSettings { background:#3b82f6; color:white; }
    #saveSettings:hover { background:#2563eb; }
  `;
}

/**
 * Génère le JavaScript pour la page d'index
 * @returns {string} JavaScript complet pour l'interface de navigation
 */
/* eslint-disable no-unused-vars */
function getIndexPageJavaScript() {
  // Cette fonction a été remplacée par un fichier JS externe (assets/js/navigation-interface.js)
  return '';
}
/* eslint-enable no-unused-vars */
