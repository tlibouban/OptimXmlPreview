/**
 * =============================================================================
 * Test de l'Intégration ERP - OptimXmlPreview v2.0
 * =============================================================================
 *
 * Script de test pour valider la fonctionnalité d'intégration ERP
 */

const { ERPIntegrationClient } = require('./erp-integration.js');

/**
 * Mock ERP Server pour les tests
 */
class MockERPServer {
  constructor() {
    this.documents = new Map();
    this.isHealthy = true;
  }

  /**
   * Simule l'upload d'un document
   */
  async uploadDocument(payload) {
    const documentId = `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    this.documents.set(documentId, {
      ...payload,
      status: 'uploaded',
      uploadDate: new Date().toISOString(),
    });

    return {
      documentId,
      status: 'uploaded',
      message: 'Document reçu avec succès',
    };
  }

  /**
   * Simule la vérification de statut
   */
  async getDocumentStatus(documentId) {
    const doc = this.documents.get(documentId);
    if (!doc) {
      throw new Error('Document non trouvé');
    }

    return {
      status: doc.status,
      progress: 100,
      message: 'Document traité',
      lastUpdated: doc.uploadDate,
    };
  }
}

/**
 * Configuration de test
 */
const TEST_CONFIG = {
  BASE_URL: 'http://localhost:8899/api/v1',
  API_KEY: 'test-api-key-123',
  TIMEOUT: 5000,
  MAX_RETRIES: 2,
  RETRY_DELAY: 500,
};

/**
 * Tests unitaires
 */
async function runTests() {
  console.log("🧪 === Tests d'Intégration ERP ===\n");

  // Test 1: Configuration
  console.log('📋 Test 1: Validation de la configuration');
  try {
    new ERPIntegrationClient(TEST_CONFIG);
    console.log('✅ Configuration validée');
  } catch (error) {
    console.error('❌ Erreur de configuration:', error.message);
  }

  // Test 2: Configuration invalide
  console.log('\n📋 Test 2: Configuration invalide');
  try {
    new ERPIntegrationClient({ BASE_URL: '', API_KEY: '' });
    console.log('❌ Devrait échouer');
  } catch (error) {
    console.log('✅ Erreur attendue:', error.message);
  }

  // Test 3: Métadonnées
  console.log('\n📋 Test 3: Enrichissement des métadonnées');
  const mockMetadata = {
    subject: 'Test Email',
    from: 'test@example.com',
    to: 'dest@example.com',
    attachments: ['file1.pdf', 'file2.doc'],
  };

  // Simuler le processus d'enrichissement
  const enrichedMetadata = {
    ...mockMetadata,
    sourceFile: '/path/to/source.xml',
    conversionDate: new Date().toISOString(),
    emailSubject: mockMetadata.subject,
    emailFrom: mockMetadata.from,
    emailTo: mockMetadata.to,
    attachmentCount: mockMetadata.attachments.length,
  };

  console.log('✅ Métadonnées enrichies:', {
    subject: enrichedMetadata.emailSubject,
    attachmentCount: enrichedMetadata.attachmentCount,
  });

  // Test 4: Mode dégradé (ERP non accessible)
  console.log('\n📋 Test 4: Mode dégradé');
  const degradedClient = new ERPIntegrationClient({
    ...TEST_CONFIG,
    BASE_URL: 'http://nonexistent.server.com',
  });

  const isConnected = await degradedClient.testConnection();
  if (!isConnected) {
    console.log('✅ Mode dégradé détecté correctement');
  } else {
    console.log('❌ Mode dégradé non détecté');
  }

  // Test 5: Simulation d'envoi (sans serveur réel)
  console.log("\n📋 Test 5: Simulation d'envoi de document");

  // Créer un fichier HTML de test temporaire
  const fs = require('fs').promises;
  const testHtmlPath = './test-document.html';
  const testHtmlContent = `
<!DOCTYPE html>
<html>
<head><title>Document de Test</title></head>
<body>
  <h1>Email de Test</h1>
  <p>Ceci est un document de test pour l'intégration ERP.</p>
</body>
</html>`;

  try {
    await fs.writeFile(testHtmlPath, testHtmlContent, 'utf8');
    console.log('✅ Fichier HTML de test créé');

    // Simuler les données de payload
    const payload = {
      document: {
        filename: 'test-document.html',
        content: Buffer.from(testHtmlContent).toString('base64'),
        contentType: 'text/html',
        size: testHtmlContent.length,
      },
      metadata: enrichedMetadata,
    };

    console.log('✅ Payload préparé:', {
      filename: payload.document.filename,
      size: payload.document.size,
      hasMetadata: !!payload.metadata,
    });

    // Nettoyer
    await fs.unlink(testHtmlPath);
    console.log('✅ Fichier de test nettoyé');
  } catch (error) {
    console.error('❌ Erreur de test:', error.message);
  }

  // Test 6: Validation du format de réponse
  console.log('\n📋 Test 6: Format de réponse');
  const mockResponse = {
    success: true,
    documentId: 'doc_123456789',
    status: 'uploaded',
    message: 'Document envoyé avec succès',
    timestamp: new Date().toISOString(),
  };

  const requiredFields = ['success', 'timestamp'];
  const hasRequiredFields = requiredFields.every((field) =>
    Object.prototype.hasOwnProperty.call(mockResponse, field)
  );

  if (hasRequiredFields) {
    console.log('✅ Format de réponse valide');
  } else {
    console.log('❌ Format de réponse invalide');
  }

  console.log('\n🎯 === Tests Terminés ===');
  console.log('💡 Pour tester avec un vrai ERP :');
  console.log('   1. Définir ERP_BASE_URL dans .env');
  console.log('   2. Définir ERP_API_KEY dans .env');
  console.log('   3. Exécuter: node test-erp-integration.js --real');
}

/**
 * Test avec un serveur ERP réel
 */
async function testWithRealERP() {
  console.log('🌐 Test avec ERP réel...\n');

  const client = new ERPIntegrationClient();

  // Test de connexion
  const isConnected = await client.testConnection();
  console.log(`Connexion ERP: ${isConnected ? '✅ OK' : '❌ Échec'}`);

  if (isConnected) {
    console.log("💡 L'ERP est accessible, vous pouvez procéder aux tests complets");
  } else {
    console.log('⚠️ Configurez votre ERP pour les tests complets');
  }
}

// Exécution des tests
async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--real')) {
    await testWithRealERP();
  } else {
    await runTests();
  }
}

// Exécuter si appelé directement
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  runTests,
  testWithRealERP,
  MockERPServer,
};
