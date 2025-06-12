/**
 * =============================================================================
 * OptimXmlPreview v2.0 - Module d'Intégration ERP Externe
 * =============================================================================
 *
 * Ce module permet d'envoyer des documents convertis vers un système ERP externe
 * via des API REST. Il inclut la gestion d'erreurs, retry, et logging.
 *
 * @author OptimXmlPreview Team
 * @since v2.1.0
 * @version 1.0.0
 */

const fs = require('fs').promises;
const path = require('path');

// Configuration ERP par défaut (à adapter selon votre ERP)
const ERP_CONFIG = {
  // Configuration API
  BASE_URL: process.env.ERP_BASE_URL || 'https://api.votre-erp.com/v1',
  API_KEY: process.env.ERP_API_KEY || '',
  TIMEOUT: parseInt(process.env.ERP_TIMEOUT) || 30000, // 30 secondes

  // Configuration retry
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000, // 1 seconde

  // Endpoints
  ENDPOINTS: {
    UPLOAD_DOCUMENT: '/documents/upload',
    CHECK_STATUS: '/documents/status',
    METADATA: '/documents/metadata',
  },
};

/**
 * Client pour l'intégration ERP
 */
class ERPIntegrationClient {
  constructor(config = ERP_CONFIG) {
    this.config = { ...ERP_CONFIG, ...config };
    this.validateConfig();
  }

  /**
   * Valide la configuration ERP
   */
  validateConfig() {
    if (!this.config.BASE_URL) {
      throw new Error('ERP_BASE_URL est requis');
    }
    if (!this.config.API_KEY) {
      console.warn('⚠️ ERP_API_KEY non définie - mode démonstration');
    }
  }

  /**
   * Effectue une requête HTTP avec retry automatique
   * @param {string} url - URL complète
   * @param {Object} options - Options fetch
   * @param {number} attempt - Tentative actuelle
   * @returns {Promise<Response>}
   */
  async fetchWithRetry(url, options = {}, attempt = 1) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.config.TIMEOUT);

      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.config.API_KEY}`,
          'User-Agent': 'OptimXmlPreview-v2.0',
          ...options.headers,
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return response;
    } catch (error) {
      console.error(`❌ Tentative ${attempt}/${this.config.MAX_RETRIES} échouée:`, error.message);

      if (attempt < this.config.MAX_RETRIES) {
        const delay = this.config.RETRY_DELAY * attempt;
        console.log(`🔄 Nouvelle tentative dans ${delay}ms...`);

        await new Promise((resolve) => setTimeout(resolve, delay));
        return this.fetchWithRetry(url, options, attempt + 1);
      }

      throw new Error(`Échec après ${this.config.MAX_RETRIES} tentatives: ${error.message}`);
    }
  }

  /**
   * Envoie un document HTML vers l'ERP
   * @param {string} htmlFilePath - Chemin vers le fichier HTML
   * @param {Object} metadata - Métadonnées du document
   * @returns {Promise<Object>} Réponse de l'ERP
   */
  async uploadDocument(htmlFilePath, metadata = {}) {
    try {
      console.log(`📤 Envoi vers ERP: ${path.basename(htmlFilePath)}`);

      // Lire le contenu du fichier
      const htmlContent = await fs.readFile(htmlFilePath, 'utf8');

      // Préparer les données
      const payload = {
        document: {
          filename: path.basename(htmlFilePath),
          content: Buffer.from(htmlContent).toString('base64'),
          contentType: 'text/html',
          size: htmlContent.length,
        },
        metadata: {
          source: 'OptimXmlPreview',
          version: '2.0.0',
          timestamp: new Date().toISOString(),
          originalFormat: 'XML',
          convertedFormat: 'HTML',
          ...metadata,
        },
      };

      const url = `${this.config.BASE_URL}${this.config.ENDPOINTS.UPLOAD_DOCUMENT}`;

      const response = await this.fetchWithRetry(url, {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      console.log(`✅ Document envoyé avec succès. ID: ${result.documentId || 'N/A'}`);

      return {
        success: true,
        documentId: result.documentId,
        status: result.status,
        message: result.message || 'Document envoyé avec succès',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error(`❌ Erreur lors de l'envoi vers l'ERP:`, error.message);

      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Vérifie le statut d'un document dans l'ERP
   * @param {string} documentId - ID du document
   * @returns {Promise<Object>} Statut du document
   */
  async checkDocumentStatus(documentId) {
    try {
      const url = `${this.config.BASE_URL}${this.config.ENDPOINTS.CHECK_STATUS}/${documentId}`;

      const response = await this.fetchWithRetry(url, {
        method: 'GET',
      });

      const result = await response.json();

      return {
        success: true,
        documentId,
        status: result.status,
        progress: result.progress || 0,
        message: result.message,
        lastUpdated: result.lastUpdated,
      };
    } catch (error) {
      return {
        success: false,
        documentId,
        error: error.message,
      };
    }
  }

  /**
   * Test de connectivité à l'ERP
   * @returns {Promise<boolean>} True si la connexion est OK
   */
  async testConnection() {
    try {
      console.log("🔍 Test de connexion à l'ERP...");

      const url = `${this.config.BASE_URL}/health`;

      const response = await this.fetchWithRetry(url, {
        method: 'GET',
      });

      console.log('✅ Connexion ERP OK');
      return true;
    } catch (error) {
      console.warn('⚠️ Connexion ERP échouée:', error.message);
      return false;
    }
  }
}

/**
 * Intègre l'ERP dans le processus de conversion
 * @param {string} htmlFilePath - Fichier HTML converti
 * @param {Object} originalMetadata - Métadonnées d'origine
 * @returns {Promise<Object>} Résultat de l'intégration
 */
async function integrateWithERP(htmlFilePath, originalMetadata = {}) {
  const client = new ERPIntegrationClient();

  // Test de connexion (optionnel en mode dégradé)
  const isConnected = await client.testConnection();
  if (!isConnected) {
    console.warn('⚠️ Mode dégradé: ERP non accessible');
    return { success: false, mode: 'degraded', error: 'ERP non accessible' };
  }

  // Enrichir les métadonnées
  const enrichedMetadata = {
    ...originalMetadata,
    sourceFile: originalMetadata.sourceFilePath || '',
    conversionDate: new Date().toISOString(),
    emailSubject: originalMetadata.subject || '',
    emailFrom: originalMetadata.from || '',
    emailTo: originalMetadata.to || '',
    attachmentCount: originalMetadata.attachments?.length || 0,
  };

  // Envoyer vers l'ERP
  return await client.uploadDocument(htmlFilePath, enrichedMetadata);
}

module.exports = {
  ERPIntegrationClient,
  integrateWithERP,
  ERP_CONFIG,
};
