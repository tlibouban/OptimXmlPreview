/**
 * @fileoverview Configuration centralisée pour OptimXmlPreview
 * @description Paramètres de configuration de l'application
 * @author OptimXmlPreview
 * @version 2.0.0
 */

// Configuration par défaut
const CONFIG = {
  DELETE_SOURCE_FILES: false,
  CLEAR_DATA_FOLDER: false,
  SUPPORTED_EXTENSIONS: ['.xml', '.xeml'],
  OUTPUT_FILE_EXTENSION: '.html',
  PDF_OUTPUT_DIR: './pdf',
  LOGO_RELATIVE_PATH: '../img/logo-blanc.png',
  LOGO_SOURCE_PATH: 'img/logo-blanc.png',
  FAVICON_RELATIVE_PATH: '../img/icon-com.svg',
  FAVICON_SOURCE_PATH: 'img/icon-com.svg',
  BROWSER_TAB_NAME: 'OptimXmlPreview',

  // Chemins des ressources externes
  ASSETS: {
    CSS: {
      EMAIL_VIEWER: 'assets/css/email-viewer.css',
      NAVIGATION: 'assets/css/navigation-interface.css',
    },
    JS: {
      NAVIGATION: 'assets/js/navigation-interface.js',
    },
    FONTS: {
      INTER: 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap',
      PALANQUIN: 'https://fonts.googleapis.com/css2?family=Palanquin:wght@400;600&display=swap',
    },
    ICONS: {
      FONT_AWESOME: 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
    },
  },

  // Configuration du serveur
  SERVER: {
    DEFAULT_PORT: 3000,
    STATIC_PATHS: {
      OUTPUT: '/Output',
      ASSETS: '/assets',
      IMG: '/img',
    },
  },

  // Messages de l'application
  MESSAGES: {
    FOOTER_TEXT: "OptimXmlPreview v2.0 - Visualisation d'emails eBarreau",
    APP_TITLE: 'OptimXmlPreview',
    CONVERSION_SUCCESS: 'CONVERSION_SUCCESS',
  },
};

// Export pour Node.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CONFIG;
}
