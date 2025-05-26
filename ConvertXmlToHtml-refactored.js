/**
 * @fileoverview Convertisseur de fichiers XML d'emails RPVA vers HTML (Version refactorisée)
 * @description Ce module convertit les fichiers XML contenant des emails juridiques
 * au format HTML avec une mise en page structurée et responsive.
 * @author OptimXmlPreview
 * @version 2.0.0
 */

const fs = require('node:fs/promises');
const fsSync = require('node:fs');
const path = require('node:path');
// const { spawn } = require('node:child_process'); // Non utilisé actuellement
const { DOMParser } = require('xmldom');
const { JSDOM } = require('jsdom');

// Import de la configuration centralisée
const CONFIG_FILE = require('./assets/templates/config.js');

// Configuration avec chemins ajustés pour Node.js
const CONFIG = {
  ...CONFIG_FILE,
  LOGO_SOURCE_PATH: path.join('img', 'logo-blanc.png'),
  FAVICON_SOURCE_PATH: path.join('img', 'icon-com.svg'),
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
// eslint-disable-next-line no-unused-vars
class ConsoleLoader {
  constructor(message = 'Traitement...') {
    this.message = message;
    this.frames = ['-', '\\', '|', '/'];
    this.currentFrame = 0;
    this.interval = null;
  }

  start() {
    if (this.interval) return;
    process.stdout.write(`${COLORS.YELLOW}${this.message} ${COLORS.RESET}`);
    this.interval = setInterval(() => {
      process.stdout.write(
        `\r${COLORS.YELLOW}${this.message} ${this.frames[this.currentFrame]}${COLORS.RESET}`
      );
      this.currentFrame = (this.currentFrame + 1) % this.frames.length;
    }, 150);
  }

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
    `;
  }
}

/**
 * Charge le JavaScript de navigation depuis le fichier externe
 * @returns {string} Contenu JavaScript pour l'interface
 */
function loadNavigationJS() {
  try {
    return fsSync.readFileSync(CONFIG.ASSETS.JS.NAVIGATION, 'utf8');
  } catch (error) {
    Logger.warning(`Impossible de charger le JavaScript externe: ${error.message}`);
    return '// Navigation JavaScript non disponible';
  }
}

/**
 * Charge le CSS de navigation depuis le fichier externe
 * @returns {string} Contenu CSS pour l'interface de navigation
 */
function loadNavigationCSS() {
  try {
    return fsSync.readFileSync(CONFIG.ASSETS.CSS.NAVIGATION, 'utf8');
  } catch (error) {
    Logger.warning(`Impossible de charger le CSS de navigation: ${error.message}`);
    return '/* CSS de navigation non disponible */';
  }
}

/**
 * Utilitaires pour la gestion des logs avec couleurs
 */
const Logger = {
  success: (message) => console.log(`${COLORS.GREEN}✓ ${message}${COLORS.RESET}`),
  error: (message) => console.error(`${COLORS.RED}✗ ${message}${COLORS.RESET}`),
  warning: (message) => console.log(`${COLORS.YELLOW}⚠ ${message}${COLORS.RESET}`),
  info: (message) => console.log(`${COLORS.CYAN}ℹ ${message}${COLORS.RESET}`),
};

/**
 * Formate une date ISO en format français lisible
 */
function formatDate(isoDate) {
  try {
    const date = new Date(isoDate);
    if (isNaN(date.getTime())) {
      return isoDate;
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
 */
function getFileIcon(fileName) {
  const ext = path.extname(fileName).toLowerCase();
  const iconMap = {
    '.pdf': 'fas fa-file-pdf',
    '.doc': 'fas fa-file-word',
    '.docx': 'fas fa-file-word',
    '.jpg': 'fas fa-file-image',
    '.jpeg': 'fas fa-file-image',
    '.png': 'fas fa-file-image',
    '.gif': 'fas fa-file-image',
    '.xml': 'fas fa-file-code',
    '.txt': 'fas fa-file-alt',
    '.zip': 'fas fa-file-archive',
    '.rar': 'fas fa-file-archive',
    '.xlsx': 'fas fa-file-excel',
    '.xls': 'fas fa-file-excel',
    '.ppt': 'fas fa-file-powerpoint',
    '.pptx': 'fas fa-file-powerpoint',
  };
  return iconMap[ext] || 'fas fa-file';
}

/**
 * Extrait les métadonnées d'un fichier XML
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

    const getTextContent = (tagName) => {
      const element = envelope.getElementsByTagName(tagName)[0];
      return element?.textContent?.trim() || '';
    };

    // Extraction du contenu du message depuis la balise <body> du XML
    const getMessageContent = () => {
      // D'abord, essayer d'extraire le contenu de la balise <body> depuis le XML complet
      const bodyElement = xmlDoc.getElementsByTagName('body')[0];
      if (bodyElement?.textContent) {
        let bodyContent = bodyElement.textContent.trim();

        // Nettoyer les caractères d'échappement XML &#xD; (retours chariot)
        bodyContent = bodyContent.replace(/&#xD;/g, '\n');

        // Supprimer les espaces excessifs mais préserver les retours à la ligne
        bodyContent = bodyContent.replace(/[ \t]+/g, ' ');

        if (bodyContent.length > 0) {
          return bodyContent;
        }
      }

      // Si pas de balise <body>, essayer d'autres balises communes
      const possibleTags = ['Message', 'Content', 'Text', 'MessageBody', 'mail-body'];

      for (const tag of possibleTags) {
        const content = getTextContent(tag);
        if (content && content.length > 0) {
          return content;
        }
      }

      // En dernier recours, analyser le contenu global intelligemment
      const allText = envelope.textContent || '';
      const excludePatterns = [
        getTextContent('Subject'),
        getTextContent('From'),
        getTextContent('To'),
        getTextContent('Date'),
      ].filter((text) => text.length > 0);

      let remainingContent = allText;
      excludePatterns.forEach((pattern) => {
        remainingContent = remainingContent.replace(pattern, '');
      });

      // Nettoyer les espaces et caractères de contrôle
      remainingContent = remainingContent
        .trim()
        .replace(/[\r\n\t]+/g, ' ')
        .replace(/\s+/g, ' ');

      // Si le contenu restant semble être une liste d'emails, le formater correctement
      if (remainingContent.includes('@') && remainingContent.includes(';')) {
        const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
        const emails = remainingContent.match(emailPattern);

        if (emails && emails.length > 1) {
          return `<div class="participants-list">
            <h4>📧 Adresses email concernées :</h4>
            <ul>
              ${emails.map((email) => `<li><i class="fas fa-envelope"></i> ${email}</li>`).join('')}
            </ul>
          </div>`;
        }
      }

      // Si c'est juste un nombre isolé (comme "0" ou "1"), considérer comme insuffisant
      if (/^\d+$/.test(remainingContent)) {
        return '';
      }

      return remainingContent.length > 5 ? remainingContent : '';
    };

    // Extraction des pièces jointes
    const attachmentsXml = xmlDoc.getElementsByTagName('attachment');
    const attachments = [];

    for (let i = 0; i < attachmentsXml.length; i++) {
      const name = attachmentsXml[i].getAttribute('name');
      if (name) {
        attachments.push(name);
      }
    }

    return {
      subject: getTextContent('Subject') || 'Sans objet',
      from: getTextContent('From') || 'Expéditeur inconnu',
      to: getTextContent('To') || '',
      date: getTextContent('Date') || '',
      body: getMessageContent(),
      attachments,
    };
  } catch (error) {
    Logger.error(`Erreur lors de l'extraction des métadonnées: ${error.message}`);
    return null;
  }
}

/**
 * Convertit un fichier XML en HTML
 */
async function convertXmlToHtml(xmlContent, outputHtmlPath, sourceFilePath, _outputDir) {
  try {
    const metadata = extractEmailMetadata(xmlContent);
    if (!metadata) {
      return false;
    }

    const pageTitle =
      metadata.subject.length > 50
        ? `${metadata.subject.substring(0, 50)}... - ${CONFIG.MESSAGES.APP_TITLE}`
        : `${metadata.subject} - ${CONFIG.MESSAGES.APP_TITLE}`;

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

    // Ajouter les styles CSS depuis le fichier externe
    const style = document.createElement('style');
    style.textContent = loadEmailViewerCSS();
    document.head.appendChild(style);

    // Ajouter Font Awesome CDN
    const fontAwesome = document.createElement('link');
    fontAwesome.rel = 'stylesheet';
    fontAwesome.href = CONFIG.ASSETS.ICONS.FONT_AWESOME;
    fontAwesome.crossOrigin = 'anonymous';
    fontAwesome.referrerPolicy = 'no-referrer';
    document.head.appendChild(fontAwesome);

    // Ajouter le script de filtrage des erreurs d'extensions
    const errorFilterScript = document.createElement('script');
    errorFilterScript.src = '../assets/js/error-filter.js';
    document.head.appendChild(errorFilterScript);

    // Générer le contenu HTML de l'email
    generateEmailHTML(document, metadata);

    // Sauvegarder le fichier HTML
    const htmlContent = dom.serialize();
    await fs.writeFile(outputHtmlPath, htmlContent, 'utf8');

    return true;
  } catch (error) {
    Logger.error(`Erreur lors de la conversion de ${sourceFilePath}: ${error.message}`);
    return false;
  }
}

/**
 * Génère le contenu HTML de l'email
 */
function generateEmailHTML(document, metadata) {
  // Conteneur principal
  const container = document.createElement('div');
  container.className = 'container';
  document.body.appendChild(container);

  // Conteneur de l'email
  const emailContainer = document.createElement('div');
  emailContainer.className = 'email-container';
  container.appendChild(emailContainer);

  // En-tête de l'email
  generateEmailHeader(document, emailContainer, metadata);

  // Corps du message
  generateEmailBody(document, emailContainer, metadata);

  // Pièces jointes
  if (metadata.attachments.length > 0) {
    generateAttachments(document, emailContainer, metadata.attachments);
  }

  // Footer
  generateFooter(document, container);
}

/**
 * Génère l'en-tête de l'email
 */
function generateEmailHeader(document, container, metadata) {
  const header = document.createElement('div');
  header.className = 'email-header';
  container.appendChild(header);

  const titleContainer = document.createElement('div');
  titleContainer.className = 'email-header-h2';
  header.appendChild(titleContainer);

  const title = document.createElement('h2');
  title.textContent = metadata.subject;
  titleContainer.appendChild(title);

  const headerFields = [
    { label: 'De', value: metadata.from },
    { label: 'À', value: metadata.to },
    { label: 'Date', value: formatDate(metadata.date) },
  ].filter((field) => field.value);

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
}

/**
 * Génère le corps du message
 */
function generateEmailBody(document, container, metadata) {
  const messageSection = document.createElement('div');
  messageSection.className = 'message-section';

  const messageTitle = document.createElement('h3');
  messageTitle.className = 'section-title';
  messageTitle.textContent = 'Corps du message';
  messageSection.appendChild(messageTitle);

  const emailBody = document.createElement('div');
  emailBody.className = 'email-body';

  // Extraire le contenu réel du message depuis les métadonnées
  const messageContent = metadata.body || metadata.message || metadata.content || '';

  if (messageContent.trim()) {
    // Si le contenu contient du HTML, l'interpréter
    if (messageContent.includes('<') && messageContent.includes('>')) {
      emailBody.innerHTML = messageContent;
    } else {
      // Sinon, traiter comme du texte brut en préservant les retours à la ligne
      emailBody.innerHTML = messageContent.replace(/\n/g, '<br>');
    }
  } else {
    // Message par défaut si aucun contenu n'est trouvé
    emailBody.innerHTML = `
      <div class="no-content-message">
        <i class="fas fa-info-circle"></i>
        <span>Contenu du message non disponible dans ce fichier XML</span>
      </div>
    `;
  }

  messageSection.appendChild(emailBody);
  container.appendChild(messageSection);
}

/**
 * Génère les pièces jointes
 */
function generateAttachments(document, container, attachments) {
  const attachmentsContainer = document.createElement('div');
  attachmentsContainer.className = 'attachments';

  const attachmentsTitle = document.createElement('h3');
  attachmentsTitle.className = 'section-title';
  attachmentsTitle.textContent = `Pièces jointes (${attachments.length})`;
  attachmentsContainer.appendChild(attachmentsTitle);

  attachments.forEach((attachmentName) => {
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

  container.appendChild(attachmentsContainer);
}

/**
 * Génère le footer
 */
function generateFooter(document, container) {
  const footer = document.createElement('div');
  footer.className = 'footer';

  const footerContent = document.createElement('div');
  footerContent.className = 'footer-content';

  const cnbLogo = document.createElement('img');
  cnbLogo.src = '../img/logo.jpg';
  cnbLogo.alt = 'Logo CNB';
  cnbLogo.className = 'footer-logo';
  cnbLogo.onerror = function () {
    this.style.display = 'none';
  };

  const footerText = document.createElement('span');
  footerText.className = 'footer-text';
  footerText.textContent = CONFIG.MESSAGES.FOOTER_TEXT;

  footerContent.appendChild(cnbLogo);
  footerContent.appendChild(footerText);
  footer.appendChild(footerContent);
  container.appendChild(footer);
}

// Export pour les tests et réutilisation
module.exports = {
  convertXmlToHtml,
  extractEmailMetadata,
  formatDate,
  getFileIcon,
  CONFIG,
  Logger,
  loadEmailViewerCSS,
  loadNavigationJS,
  loadNavigationCSS,
};
