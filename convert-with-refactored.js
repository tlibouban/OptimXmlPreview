#!/usr/bin/env node

/**
 * @fileoverview Script de conversion utilisant le module refactorisé
 * @description Script de conversion simple et fiable pour OptimXmlPreview v2.0
 * @author OptimXmlPreview
 * @version 2.0.0
 */

const fs = require('node:fs/promises');
const fsSync = require('node:fs');
const path = require('node:path');
const { DOMParser } = require('xmldom');

// Import du module refactorisé
const { Logger } = require('./ConvertXmlToHtml-refactored.js');

/**
 * Fonction principale de conversion
 */
async function main() {
  Logger.info('🚀 OptimXmlPreview v2.0 - Module refactorisé');
  Logger.info('Architecture moderne avec ressources externalisées\n');

  try {
    // Vérifier la structure des dossiers
    await ensureDirectories();

    // Scanner les fichiers HTML existants AVANT conversion pour identifier les anciens
    let existingHtmlFiles = [];
    try {
      const outputFiles = await fs.readdir('./Output');
      existingHtmlFiles = outputFiles
        .filter((file) => file.endsWith('.html') && file !== 'index.html')
        .map((file) => file.replace('.html', ''));
    } catch (error) {
      // Pas de fichiers HTML existants
    }

    // Scanner les fichiers XML
    const xmlFiles = await scanXmlFiles();
    if (xmlFiles.length === 0) {
      Logger.warning('Aucun fichier XML trouvé dans le dossier Data');
      Logger.info('Copiez vos fichiers .xml dans le dossier Data/ et relancez la conversion');
      return;
    }

    Logger.info(`📁 ${xmlFiles.length} fichier(s) XML trouvé(s)`);

    // Processus de conversion
    let successCount = 0;
    let errorCount = 0;
    const newlyConverted = []; // Liste des fichiers nouvellement convertis
    const attachmentsCache = new Map(); // Cache des pièces jointes

    // ÉTAPE 1: Extraire les informations de pièces jointes AVANT conversion
    Logger.info('📎 Extraction des informations de pièces jointes...');
    for (const xmlFile of xmlFiles) {
      try {
        const fileName = path.basename(xmlFile, '.xml');
        const attachmentsCount = await extractAttachmentsFromXmlFile(xmlFile);
        attachmentsCache.set(fileName, attachmentsCount);
        Logger.info(`📎 ${fileName}: ${attachmentsCount} pièce(s) jointe(s)`);
      } catch (error) {
        Logger.warning(`⚠️ Erreur extraction pièces jointes ${xmlFile}: ${error.message}`);
        attachmentsCache.set(path.basename(xmlFile, '.xml'), 0);
      }
    }

    // ÉTAPE 2: Conversion des fichiers
    for (const xmlFile of xmlFiles) {
      try {
        const success = await convertSingleFile(xmlFile);
        if (success) {
          successCount++;
          const fileName = path.basename(xmlFile, '.xml');
          newlyConverted.push(fileName);
          Logger.success(`✓ ${path.basename(xmlFile)}`);
        } else {
          errorCount++;
          Logger.error(`✗ ${path.basename(xmlFile)}`);
        }
      } catch (error) {
        errorCount++;
        Logger.error(`✗ ${path.basename(xmlFile)}: ${error.message}`);
      }
    }

    // Vider le dossier Data après conversion réussie
    if (successCount > 0) {
      Logger.info('🗑️ Vidage du dossier Data...');
      await clearDataFolder();
    }

    // Générer l'interface de navigation avec le cache des pièces jointes
    await generateNavigationInterface(
      successCount,
      newlyConverted,
      existingHtmlFiles,
      attachmentsCache
    );

    // Résumé final
    console.log('\n' + '='.repeat(60));
    Logger.success(`🎉 Conversion terminée !`);
    Logger.info(`📊 Résultats: ${successCount} succès, ${errorCount} échecs`);

    if (successCount > 0) {
      Logger.info(`🗑️ Dossier Data vidé après conversion`);
      Logger.info(`🌐 Interface disponible sur: http://localhost:3000`);
      Logger.info(`📁 Fichiers HTML générés dans: ./Output/`);
      Logger.info(`🔧 Architecture v2.0: Ressources externalisées dans ./assets/`);
    }

    console.log('='.repeat(60));
    console.log('CONVERSION_SUCCESS'); // Signal pour scripts batch
  } catch (error) {
    Logger.error(`Erreur fatale: ${error.message}`);
    process.exit(1);
  }
}

/**
 * Vérifie et crée les dossiers nécessaires
 */
async function ensureDirectories() {
  const directories = ['Data', 'Output', 'assets', 'assets/css', 'assets/js', 'assets/templates'];

  for (const dir of directories) {
    try {
      await fs.mkdir(dir, { recursive: true });
    } catch (error) {
      // Dossier existe déjà
    }
  }
}

/**
 * Scanne les fichiers XML dans le dossier Data
 */
async function scanXmlFiles() {
  try {
    const files = await fs.readdir('./Data');
    return files
      .filter((file) => file.toLowerCase().endsWith('.xml'))
      .map((file) => path.join('./Data', file));
  } catch (error) {
    Logger.warning('Dossier Data inexistant - création automatique');
    await fs.mkdir('./Data', { recursive: true });
    return [];
  }
}

/**
 * Convertit un fichier XML individuel
 */
async function convertSingleFile(xmlFilePath) {
  try {
    // Lire le fichier XML
    const xmlContent = await fs.readFile(xmlFilePath, 'utf8');

    // Générer le nom du fichier HTML
    const fileName = path.basename(xmlFilePath, '.xml');
    const outputPath = path.join('./Output', fileName + '.html');

    // Utiliser la fonction de conversion du module refactorisé
    const { convertXmlToHtml } = require('./ConvertXmlToHtml-refactored.js');
    const success = await convertXmlToHtml(xmlContent, outputPath, xmlFilePath, './Output');

    return success;
  } catch (error) {
    Logger.error(`Erreur conversion ${xmlFilePath}: ${error.message}`);
    return false;
  }
}

/**
 * Génère l'interface de navigation moderne
 */
async function generateNavigationInterface(
  emailCount,
  newlyConverted,
  _existingHtmlFiles,
  attachmentsCache
) {
  try {
    Logger.info("🎨 Génération de l'interface de navigation...");

    // Scanner les fichiers HTML existants
    let htmlFiles = [];
    try {
      const outputFiles = await fs.readdir('./Output');
      htmlFiles = outputFiles
        .filter((file) => file.endsWith('.html') && file !== 'index.html')
        .map((file) => ({
          name: file,
          path: `Output/${file}`,
          displayName: file.replace('.html', ''),
          date: new Date().toLocaleDateString('fr-FR'),
        }));
    } catch (error) {
      // Pas de fichiers HTML
    }

    // Générer la page d'index avec l'interface v2.0
    const indexHTML = await generateIndexHTML(
      htmlFiles,
      emailCount,
      newlyConverted,
      _existingHtmlFiles,
      attachmentsCache
    );
    await fs.writeFile('./index.html', indexHTML, 'utf8');

    Logger.success('✓ Interface de navigation générée');
  } catch (error) {
    Logger.warning(`Erreur génération interface: ${error.message}`);
  }
}

/**
 * Génère le HTML de la page d'index avec interface moderne
 */
async function generateIndexHTML(
  htmlFiles,
  emailCount,
  newlyConverted,
  _existingHtmlFiles,
  attachmentsCache
) {
  // Calculer le total d'emails
  const totalEmails = htmlFiles.length;

  // Séparer les nouveaux et anciens emails
  const newEmails = htmlFiles.filter((file) => newlyConverted.includes(file.displayName));
  const oldEmails = htmlFiles.filter((file) => !newlyConverted.includes(file.displayName));

  // Fonction pour générer le HTML d'un email
  const generateEmailHTML = async (file, index, isNew = false) => {
    const newClass = isNew ? ' new-email' : '';

    // Extraire le nombre de pièces jointes
    const attachmentsCount = await extractAttachmentsCount(file.path, attachmentsCache);
    const hasAttachments = attachmentsCount > 0;

    return `
    <div class="email-item${newClass}" data-file="${file.path}" data-index="${index}">
      <div class="email-icon">
        <i class="fas fa-envelope${isNew ? ' text-success' : ''}"></i>
      </div>
      <div class="email-info">
        <div class="email-title">${file.displayName}${isNew ? ' <span class="new-badge">NOUVEAU</span>' : ''}</div>
        <div class="email-meta">
          <span class="file-date">${file.date}</span>
          <span class="file-size">~5KB</span>
        </div>
      </div>
      ${
        hasAttachments
          ? `<div class="pj" title="${attachmentsCount} pièce(s) jointe(s)">
        <i class="fas fa-paperclip"></i>
        <span class="pj-count">${attachmentsCount}</span>
      </div>`
          : ''
      }
      <div class="email-actions">
        <i class="fas fa-external-link-alt" title="Ouvrir dans un nouvel onglet"></i>
      </div>
    </div>
  `;
  };

  // Générer les sections
  let emailListHTML = '';
  let currentIndex = 0;

  // Section des nouveaux emails
  if (newEmails.length > 0) {
    emailListHTML += `
    <div class="email-section-header">
      <h3><i class="fas fa-star"></i> Nouveaux emails (${newEmails.length})</h3>
    </div>`;

    const newEmailsHTML = await Promise.all(
      newEmails.map((file) => generateEmailHTML(file, currentIndex++, true))
    );
    emailListHTML += newEmailsHTML.join('');
  }

  // Section des anciens emails
  if (oldEmails.length > 0) {
    emailListHTML += `
    <div class="email-section-header">
      <h3><i class="fas fa-archive"></i> Emails précédents (${oldEmails.length})</h3>
    </div>`;

    const oldEmailsHTML = await Promise.all(
      oldEmails.map((file) => generateEmailHTML(file, currentIndex++, false))
    );
    emailListHTML += oldEmailsHTML.join('');
  }

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>OptimXmlPreview v2.0 - Navigation des emails</title>
  <link rel="icon" type="image/svg+xml" href="img/icon-com.svg">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" crossorigin="anonymous">
  <link rel="stylesheet" href="assets/css/navigation-interface.css">
</head>
<body>
  <div class="app-container">
    <!-- Header -->
    <div class="header-bar">
      <div class="header-content">
        <i class="fas fa-envelope-open-text header-icon"></i>
        <h1>OptimXmlPreview v2.0</h1>
        <button class="convert-button" id="convertButton">
          <i class="fas fa-sync-alt"></i>
          Convertir nouveaux emails
        </button>
        <span class="email-count">${emailCount === 1 ? '1 nouveau' : emailCount + ' nouveaux'} / ${totalEmails} total</span>
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
          ${
            htmlFiles.length > 0
              ? emailListHTML
              : `
            <div class="no-results-message">
              <div class="no-results-content">
                <i class="fas fa-inbox"></i>
                <h3>Aucun email</h3>
                <p>Placez vos fichiers .xml dans le dossier Data/ et relancez la conversion</p>
              </div>
            </div>
          `
          }
        </div>
      </aside>

      <!-- Content Area -->
      <main class="content-area">
        <div class="welcome-screen" id="welcomeScreen">
          <div class="welcome-content">
            <i class="fas fa-envelope-open welcome-icon"></i>
            <h2>OptimXmlPreview v2.0</h2>
            <p>Architecture refactorisée avec ressources externalisées</p>
            <div class="stats">
              <div class="stat-item">
                <i class="fas fa-file-alt"></i>
                <span>${htmlFiles.length} emails convertis</span>
              </div>
              <div class="stat-item">
                <i class="fas fa-cogs"></i>
                <span>Module refactorisé v2.0</span>
              </div>
              <div class="stat-item">
                <i class="fas fa-check-circle"></i>
                <span>Architecture moderne</span>
              </div>
            </div>
          </div>
        </div>
        <iframe id="contentFrame" src="" style="display: none;"></iframe>
      </main>
    </div>
  </div>

  <script src="assets/js/navigation-interface.js"></script>
</body>
</html>`;
}

/**
 * Vide le dossier Data après conversion
 */
async function clearDataFolder() {
  try {
    const files = await fs.readdir('./Data');
    const xmlFiles = files.filter((file) => file.toLowerCase().endsWith('.xml'));

    if (xmlFiles.length === 0) {
      Logger.info('✅ Dossier Data déjà vide');
      return;
    }

    for (const file of xmlFiles) {
      const filePath = path.join('./Data', file);
      await fs.unlink(filePath);
    }

    Logger.success(`✅ ${xmlFiles.length} fichier(s) XML supprimé(s) du dossier Data`);
  } catch (error) {
    Logger.warning(`⚠️ Erreur lors du vidage du dossier Data: ${error.message}`);
  }
}

/**
 * Extrait le nombre de pièces jointes directement d'un fichier XML
 */
async function extractAttachmentsFromXmlFile(xmlFilePath) {
  try {
    const xmlContent = await fs.readFile(xmlFilePath, 'utf8');

    // Parser le XML pour extraire les pièces jointes
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlContent, 'text/xml');
    const attachmentsXml = xmlDoc.getElementsByTagName('attachment');

    return attachmentsXml.length;
  } catch (error) {
    // En cas d'erreur, analyser le nom du fichier pour deviner
    const fileName = path.basename(xmlFilePath, '.xml');
    const hasAttachmentKeywords =
      fileName.toLowerCase().includes('pièc') ||
      fileName.toLowerCase().includes('piece') ||
      fileName.toLowerCase().includes('joint') ||
      fileName.toLowerCase().includes('bcp') ||
      fileName.toLowerCase().includes('conclusions + bcp') ||
      fileName.toLowerCase().includes('bordereau');
    return hasAttachmentKeywords ? 1 : 0;
  }
}

/**
 * Extrait le nombre de pièces jointes d'un fichier XML (basé sur le nom du fichier HTML)
 */
async function extractAttachmentsCount(htmlFileName, attachmentsCache = null) {
  try {
    const htmlNameWithoutExt = htmlFileName.replace('Output/', '').replace('.html', '');

    // Si on a un cache, l'utiliser en priorité
    if (attachmentsCache && attachmentsCache.has(htmlNameWithoutExt)) {
      return attachmentsCache.get(htmlNameWithoutExt);
    }

    // Sinon, chercher le fichier XML correspondant dans différents dossiers
    const possiblePaths = [
      path.join('Data', `${htmlNameWithoutExt}.xml`),
      path.join('Data', `${htmlNameWithoutExt}.XML`),
    ];

    let xmlContent = null;
    for (const xmlPath of possiblePaths) {
      try {
        if (fsSync.existsSync(xmlPath)) {
          xmlContent = await fs.readFile(xmlPath, 'utf8');
          break;
        }
      } catch (error) {
        // Continuer avec le prochain chemin
      }
    }

    if (!xmlContent) {
      // Si le fichier XML n'existe pas, essayer de deviner à partir du nom du fichier
      // Certains emails mentionnent explicitement des pièces jointes dans leur titre
      const hasAttachmentKeywords =
        htmlNameWithoutExt.toLowerCase().includes('pièc') ||
        htmlNameWithoutExt.toLowerCase().includes('piece') ||
        htmlNameWithoutExt.toLowerCase().includes('joint') ||
        htmlNameWithoutExt.toLowerCase().includes('bcp') ||
        htmlNameWithoutExt.toLowerCase().includes('conclusions + bcp') ||
        htmlNameWithoutExt.toLowerCase().includes('bordereau');
      return hasAttachmentKeywords ? 1 : 0;
    }

    // Parser le XML pour extraire les pièces jointes
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlContent, 'text/xml');
    const attachmentsXml = xmlDoc.getElementsByTagName('attachment');

    return attachmentsXml.length;
  } catch (error) {
    // En cas d'erreur, analyser le nom du fichier pour deviner
    const hasAttachmentKeywords =
      htmlFileName.toLowerCase().includes('pièc') ||
      htmlFileName.toLowerCase().includes('piece') ||
      htmlFileName.toLowerCase().includes('joint') ||
      htmlFileName.toLowerCase().includes('bcp') ||
      htmlFileName.toLowerCase().includes('conclusions + bcp') ||
      htmlFileName.toLowerCase().includes('bordereau');
    return hasAttachmentKeywords ? 1 : 0;
  }
}

// Exécuter le script si appelé directement
if (require.main === module) {
  main().catch((error) => {
    Logger.error(`Erreur inattendue: ${error.message}`);
    process.exit(1);
  });
}
