/**
 * =============================================================================
 * OptimXmlPreview v2.0 - Module d'Intégration SECIB
 * =============================================================================
 *
 * Module spécialisé pour l'intégration avec l'API SECIB
 * (Système d'Échange de Communication Inter-Barreaux)
 *
 * API Swagger: https://secibneo.secib.fr/7.4.0/swagger/ui/index#!/
 *
 * @author OptimXmlPreview Team
 * @since v2.1.0
 * @version 1.0.0
 */

const { ERPIntegrationClient } = require('./erp-integration.js');

/**
 * Configuration SECIB spécifique
 */
const SECIB_CONFIG = {
  BASE_URL: process.env.SECIB_BASE_URL || 'https://secibneo.secib.fr/7.4.0',
  API_VERSION: process.env.SECIB_API_VERSION || 'v1',
  CABINET_ID: process.env.SECIB_CABINET_ID || process.env.ERP_CABINET_ID || '',
  API_KEY: process.env.SECIB_API_KEY || process.env.ERP_API_KEY || '',
  TIMEOUT: parseInt(process.env.SECIB_TIMEOUT || process.env.ERP_TIMEOUT) || 45000,

  // Endpoints SECIB (à adapter selon la documentation Swagger)
  ENDPOINTS: {
    UPLOAD_DOCUMENT: '/api/v1/documents',
    CHECK_STATUS: '/api/v1/documents',
    HEALTH: '/api/v1/health',
    CABINET_INFO: '/api/v1/cabinets',
  },

  // Headers spécifiques SECIB
  HEADERS: {
    'User-Agent': 'OptimXmlPreview-v2.0-SECIB',
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
};

/**
 * Client SECIB spécialisé
 */
class SECIBIntegrationClient extends ERPIntegrationClient {
  constructor(config = {}) {
    const secibConfig = {
      ...SECIB_CONFIG,
      ...config,
    };

    super(secibConfig);
    this.cabinetId = secibConfig.CABINET_ID || config.CABINET_ID;
    this.apiVersion = secibConfig.API_VERSION || config.API_VERSION;
  }

  /**
   * Valide la configuration SECIB
   */
  validateConfig() {
    super.validateConfig();

    if (!this.cabinetId) {
      throw new Error("SECIB_CABINET_ID est requis pour l'intégration SECIB");
    }

    console.log(`🏢 Configuration SECIB validée pour cabinet: ${this.cabinetId}`);
  }

  /**
   * Surcharge fetchWithRetry pour ajouter les headers SECIB
   */
  async fetchWithRetry(url, options = {}, attempt = 1) {
    // Ajouter les headers spécifiques SECIB
    options.headers = {
      ...SECIB_CONFIG.HEADERS,
      Authorization: `Bearer ${this.config.API_KEY}`,
      'X-Cabinet-ID': this.cabinetId,
      'X-API-Version': this.apiVersion,
      ...options.headers,
    };

    return super.fetchWithRetry(url, options, attempt);
  }

  /**
   * Envoie un document vers SECIB
   * @param {string} htmlFilePath - Chemin vers le fichier HTML
   * @param {Object} metadata - Métadonnées du document
   * @returns {Promise<Object>} Réponse SECIB
   */
  async uploadDocument(htmlFilePath, metadata = {}) {
    try {
      console.log(
        `📤 Envoi vers SECIB (Cabinet: ${this.cabinetId}): ${require('path').basename(htmlFilePath)}`
      );

      // Lire le contenu du fichier
      const fs = require('fs').promises;
      const htmlContent = await fs.readFile(htmlFilePath, 'utf8');

      // Adapter le payload au format SECIB
      const secibPayload = this.formatSECIBPayload(htmlContent, htmlFilePath, metadata);

      const url = `${SECIB_CONFIG.BASE_URL}/api/${this.apiVersion}/documents`;

      const response = await this.fetchWithRetry(url, {
        method: 'POST',
        body: JSON.stringify(secibPayload),
      });

      const result = await response.json();
      console.log(
        `✅ Document SECIB envoyé avec succès. ID: ${result.documentId || result.id || 'N/A'}`
      );

      return {
        success: true,
        documentId: result.documentId || result.id,
        status: result.status || 'uploaded',
        message: result.message || 'Document envoyé vers SECIB avec succès',
        timestamp: new Date().toISOString(),
        secibResponse: result,
      };
    } catch (error) {
      console.error(`❌ Erreur lors de l'envoi vers SECIB:`, error.message);

      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
        cabinetId: this.cabinetId,
      };
    }
  }

  /**
   * Formate le payload selon les spécifications SECIB
   * @param {string} htmlContent - Contenu HTML
   * @param {string} filePath - Chemin du fichier
   * @param {Object} metadata - Métadonnées
   * @returns {Object} Payload formaté pour SECIB
   */
  formatSECIBPayload(htmlContent, filePath, metadata) {
    const path = require('path');

    return {
      // Informations du cabinet
      cabinetId: this.cabinetId,

      // Informations du document
      document: {
        type: 'EMAIL_CONVERTED',
        format: 'HTML',
        filename: path.basename(filePath),
        content: Buffer.from(htmlContent).toString('base64'),
        size: htmlContent.length,
        mimeType: 'text/html',
        encoding: 'base64',
      },

      // Métadonnées juridiques
      metadata: {
        source: 'OptimXmlPreview',
        version: '2.0.0',
        conversionDate: new Date().toISOString(),
        originalFormat: 'XML',

        // Informations email juridique
        emailSubject: metadata.emailSubject || metadata.subject || '',
        emailFrom: metadata.emailFrom || metadata.from || '',
        emailTo: metadata.emailTo || metadata.to || '',
        emailDate: metadata.emailDate || metadata.date || '',

        // Informations juridiques spécifiques
        juridictionCode: metadata.juridictionCode || '',
        affaireNumber: metadata.affaireNumber || '',
        documentType: metadata.documentType || 'EMAIL_NOTIFICATION',
        isRPVA: metadata.isRPVA || true,

        // Pièces jointes
        attachmentCount: metadata.attachmentCount || metadata.attachments?.length || 0,
        hasAttachments: (metadata.attachmentCount || metadata.attachments?.length || 0) > 0,

        // Origine
        sourceFilePath: metadata.sourceFilePath || '',
        processingDate: new Date().toISOString(),
      },

      // Configuration
      options: {
        notifyOnSuccess: true,
        notifyOnError: true,
        autoArchive: true,
        priority: 'normal',
      },
    };
  }

  /**
   * Vérifie le statut d'un document dans SECIB
   * @param {string} documentId - ID du document SECIB
   * @returns {Promise<Object>} Statut du document
   */
  async checkDocumentStatus(documentId) {
    try {
      const url = `${SECIB_CONFIG.BASE_URL}/api/${this.apiVersion}/documents/${documentId}/status`;

      const response = await this.fetchWithRetry(url, {
        method: 'GET',
      });

      const result = await response.json();

      return {
        success: true,
        documentId,
        status: result.status,
        progress: result.progress || 100,
        message: result.message || result.statusMessage,
        lastUpdated: result.lastUpdated || result.updatedAt,
        cabinetId: this.cabinetId,
        secibData: result,
      };
    } catch (error) {
      return {
        success: false,
        documentId,
        error: error.message,
        cabinetId: this.cabinetId,
      };
    }
  }

  /**
   * Test de connectivité spécifique SECIB
   * @returns {Promise<boolean>} True si la connexion SECIB est OK
   */
  async testConnection() {
    try {
      console.log(`🔍 Test de connexion à SECIB (Cabinet: ${this.cabinetId})...`);

      // Test sur l'endpoint health ou cabinet info
      const url = `${SECIB_CONFIG.BASE_URL}/api/${this.apiVersion}/cabinets/${this.cabinetId}`;

      await this.fetchWithRetry(url, {
        method: 'GET',
      });

      console.log('✅ Connexion SECIB OK');
      return true;
    } catch (error) {
      console.warn('⚠️ Connexion SECIB échouée:', error.message);
      return false;
    }
  }

  /**
   * Récupère les informations du cabinet SECIB
   * @returns {Promise<Object>} Informations du cabinet
   */
  async getCabinetInfo() {
    try {
      const url = `${SECIB_CONFIG.BASE_URL}/api/${this.apiVersion}/cabinets/${this.cabinetId}`;

      const response = await this.fetchWithRetry(url, {
        method: 'GET',
      });

      const cabinetInfo = await response.json();

      console.log(`🏢 Informations cabinet SECIB récupérées: ${cabinetInfo.name || 'N/A'}`);

      return {
        success: true,
        cabinetInfo,
        cabinetId: this.cabinetId,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        cabinetId: this.cabinetId,
      };
    }
  }
}

/**
 * Fonction d'intégration SECIB simplifiée
 * @param {string} htmlFilePath - Fichier HTML converti
 * @param {Object} originalMetadata - Métadonnées d'origine
 * @returns {Promise<Object>} Résultat de l'intégration SECIB
 */
async function integrateWithSECIB(htmlFilePath, originalMetadata = {}) {
  const client = new SECIBIntegrationClient();

  // Test de connexion SECIB
  const isConnected = await client.testConnection();
  if (!isConnected) {
    console.warn('⚠️ Mode dégradé: SECIB non accessible');
    return { success: false, mode: 'degraded', error: 'SECIB non accessible' };
  }

  // Enrichir les métadonnées pour SECIB
  const enrichedMetadata = {
    ...originalMetadata,
    isRPVA: true,
    documentType: 'EMAIL_NOTIFICATION',
    processingTool: 'OptimXmlPreview',
    conversionDate: new Date().toISOString(),
  };

  // Envoyer vers SECIB
  return await client.uploadDocument(htmlFilePath, enrichedMetadata);
}

module.exports = {
  SECIBIntegrationClient,
  integrateWithSECIB,
  SECIB_CONFIG,
};
