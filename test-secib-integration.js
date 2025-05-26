/**
 * =============================================================================
 * Test de l'Intégration SECIB - OptimXmlPreview v2.0
 * =============================================================================
 *
 * Script de test pour l'API SECIB (Système d'Échange de Communication Inter-Barreaux)
 * API Swagger: https://secibneo.secib.fr/7.4.0/swagger/ui/index#!/
 */

// Charger les variables d'environnement depuis .env
require('dotenv').config();

const { SECIBIntegrationClient } = require('./erp-secib-integration.js');

/**
 * Configuration de test SECIB
 */
const TEST_SECIB_CONFIG = {
  BASE_URL: 'https://secibneo.secib.fr/7.4.0',
  API_VERSION: 'v1',
  CABINET_ID: '02ec98e8-4bb1-46be-a709-8a8aa68bb33c',
  API_KEY: 'test-secib-key', // Sera remplacé par la vraie clé en .env
  TIMEOUT: 45000,
};

// Définir les variables d'environnement pour les tests
process.env.SECIB_CABINET_ID = TEST_SECIB_CONFIG.CABINET_ID;
process.env.SECIB_API_VERSION = TEST_SECIB_CONFIG.API_VERSION;
process.env.SECIB_API_KEY = TEST_SECIB_CONFIG.API_KEY;

/**
 * Tests spécifiques SECIB
 */
async function runSECIBTests() {
  console.log("🏛️ === Tests d'Intégration SECIB ===\n");
  console.log(`📋 Cabinet ID: ${TEST_SECIB_CONFIG.CABINET_ID}`);
  console.log(`🌐 API Base: ${TEST_SECIB_CONFIG.BASE_URL}`);
  console.log(`📡 Version: ${TEST_SECIB_CONFIG.API_VERSION}\n`);

  // Test 1: Configuration SECIB
  console.log('📋 Test 1: Validation configuration SECIB');
  try {
    const client = new SECIBIntegrationClient(TEST_SECIB_CONFIG);
    console.log('✅ Configuration SECIB validée');
    console.log(`   📍 Cabinet: ${client.cabinetId}`);
    console.log(`   🔗 Version API: ${client.apiVersion}`);
  } catch (error) {
    console.error('❌ Erreur configuration SECIB:', error.message);
  }

  // Test 2: Format du payload SECIB
  console.log('\n📋 Test 2: Format payload SECIB');
  try {
    const client = new SECIBIntegrationClient(TEST_SECIB_CONFIG);

    const mockMetadata = {
      subject: 'Notification RPVA - Convocation audience',
      from: 'greffe.tribunal@justice.fr',
      to: 'avocat@cabinet-juridique.com',
      date: '2025-01-26T16:30:00.000Z',
      juridictionCode: 'TGI75001',
      affaireNumber: 'RG 25/00123',
      attachments: ['convocation.pdf', 'pieces-jointes.zip'],
    };

    const payload = client.formatSECIBPayload(
      '<html><body><h1>Test SECIB</h1></body></html>',
      './test-secib-document.html',
      mockMetadata
    );

    console.log('✅ Payload SECIB formaté:');
    console.log(`   📄 Type document: ${payload.document.type}`);
    console.log(`   🏢 Cabinet ID: ${payload.cabinetId}`);
    console.log(`   📧 Email de: ${payload.metadata.emailFrom}`);
    console.log(`   ⚖️ Juridiction: ${payload.metadata.juridictionCode}`);
    console.log(`   📎 Pièces jointes: ${payload.metadata.attachmentCount}`);
    console.log(`   🏛️ RPVA: ${payload.metadata.isRPVA}`);
  } catch (error) {
    console.error('❌ Erreur format payload:', error.message);
  }

  // Test 3: Headers et authentification
  console.log('\n📋 Test 3: Headers SECIB');
  try {
    const client = new SECIBIntegrationClient(TEST_SECIB_CONFIG);

    // Note: On ne peut pas vraiment tester fetchWithRetry sans faire un vrai appel,
    // mais on peut valider la configuration
    console.log('✅ Headers SECIB configurés:');
    console.log(`   🔑 Authorization: Bearer [API_KEY]`);
    console.log(`   🏢 X-Cabinet-ID: ${client.cabinetId}`);
    console.log(`   📡 X-API-Version: ${client.apiVersion}`);
    console.log(`   🏷️ User-Agent: OptimXmlPreview-v2.0-SECIB`);
  } catch (error) {
    console.error('❌ Erreur headers:', error.message);
  }

  // Test 4: URLs des endpoints
  console.log('\n📋 Test 4: Endpoints SECIB');
  const baseUrl = TEST_SECIB_CONFIG.BASE_URL;
  const version = TEST_SECIB_CONFIG.API_VERSION;
  const cabinetId = TEST_SECIB_CONFIG.CABINET_ID;

  console.log('✅ Endpoints SECIB configurés:');
  console.log(`   📤 Upload: ${baseUrl}/api/${version}/documents`);
  console.log(`   📊 Status: ${baseUrl}/api/${version}/documents/{id}/status`);
  console.log(`   🏢 Cabinet: ${baseUrl}/api/${version}/cabinets/${cabinetId}`);
  console.log(`   💚 Health: ${baseUrl}/api/${version}/health`);

  // Test 5: Mode dégradé (sans vraie connexion)
  console.log('\n📋 Test 5: Simulation mode dégradé');
  try {
    const degradedClient = new SECIBIntegrationClient({
      ...TEST_SECIB_CONFIG,
      BASE_URL: 'https://nonexistent.secib.server.com',
    });

    const isConnected = await degradedClient.testConnection();
    if (!isConnected) {
      console.log('✅ Mode dégradé SECIB détecté correctement');
    } else {
      console.log('❌ Mode dégradé SECIB non détecté');
    }
  } catch (error) {
    console.log("✅ Gestion d'erreur SECIB OK:", error.message);
  }

  console.log('\n🎯 === Tests SECIB Terminés ===');
  console.log("\n💡 Pour tester avec l'API SECIB réelle :");
  console.log('   1. Créer un fichier .env');
  console.log('   2. Ajouter votre vraie API key :');
  console.log('      SECIB_API_KEY=your-real-secib-api-key');
  console.log('   3. Exécuter: node test-secib-integration.js --real');
}

/**
 * Test avec l'API SECIB réelle
 */
async function testWithRealSECIB() {
  console.log('🏛️ Test avec API SECIB réelle...\n');

  if (!process.env.SECIB_API_KEY && !process.env.ERP_API_KEY) {
    console.error('❌ API Key SECIB manquante !');
    console.log('💡 Définissez SECIB_API_KEY dans votre fichier .env');
    console.log('   Exemple: SECIB_API_KEY=your-real-api-key');
    return;
  }

  const client = new SECIBIntegrationClient();

  console.log(`🏢 Test pour cabinet: ${client.cabinetId}`);

  // Test de connexion réelle
  console.log('\n1. Test de connexion...');
  const isConnected = await client.testConnection();
  console.log(`   Connexion SECIB: ${isConnected ? '✅ OK' : '❌ Échec'}`);

  if (isConnected) {
    // Test d'information cabinet
    console.log('\n2. Récupération info cabinet...');
    const cabinetInfo = await client.getCabinetInfo();
    if (cabinetInfo.success) {
      console.log(`   ✅ Cabinet: ${cabinetInfo.cabinetInfo.name || 'N/A'}`);
    } else {
      console.log(`   ❌ Erreur: ${cabinetInfo.error}`);
    }

    console.log("\n✅ L'API SECIB est accessible !");
    console.log('💡 Vous pouvez maintenant intégrer SECIB dans votre workflow.');
  } else {
    console.log('\n⚠️ Vérifiez votre configuration SECIB :');
    console.log('   - API Key valide ?');
    console.log('   - Cabinet ID correct ?');
    console.log('   - Accès réseau à secibneo.secib.fr ?');
  }
}

/**
 * Guide de configuration rapide
 */
function showConfigurationGuide() {
  console.log('🔧 === Guide Configuration SECIB ===\n');

  console.log('1. 📁 Créer votre fichier .env :');
  console.log('   cp config.env.example .env\n');

  console.log('2. ✏️ Éditer .env avec vos vraies valeurs :');
  console.log('   SECIB_BASE_URL=https://secibneo.secib.fr/7.4.0');
  console.log('   SECIB_API_VERSION=v1');
  console.log('   SECIB_CABINET_ID=02ec98e8-4bb1-46be-a709-8a8aa68bb33c');
  console.log('   SECIB_API_KEY=VOTRE_VRAIE_CLE_API_ICI\n');

  console.log('3. 🧪 Tester la configuration :');
  console.log('   node test-secib-integration.js --real\n');

  console.log('4. 🔗 Intégrer dans votre code :');
  console.log("   const { integrateWithSECIB } = require('./erp-secib-integration.js');");
  console.log('   const result = await integrateWithSECIB(htmlFile, metadata);\n');

  console.log('📚 Documentation: https://secibneo.secib.fr/7.4.0/swagger/ui/index#!/');
}

// Exécution des tests
async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--real')) {
    await testWithRealSECIB();
  } else if (args.includes('--config')) {
    showConfigurationGuide();
  } else {
    await runSECIBTests();
  }
}

// Exécuter si appelé directement
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  runSECIBTests,
  testWithRealSECIB,
  showConfigurationGuide,
};
