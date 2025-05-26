#!/usr/bin/env node

/**
 * @fileoverview Test de l'API de recherche
 * @description Script pour valider la fonctionnalité de recherche full-text
 * @author OptimXmlPreview
 * @version 1.0.0
 */

const http = require('http');

// Configuration
const SERVER_URL = 'http://localhost:3000';
const TEST_SEARCHES = [
  'TORCHIA',
  're',
  'belle',
  'Conclusions',
  'BCP',
  'pièces',
  'inexistant_terme_123',
];

/**
 * Fait une requête GET à l'API
 */
function makeRequest(path) {
  return new Promise((resolve, reject) => {
    const url = `${SERVER_URL}${path}`;

    http
      .get(url, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          try {
            const jsonData = JSON.parse(data);
            resolve({ status: res.statusCode, data: jsonData });
          } catch (error) {
            reject(new Error(`Erreur parsing JSON: ${error.message}`));
          }
        });
      })
      .on('error', (error) => {
        reject(error);
      });
  });
}

/**
 * Test de l'API de recherche
 */
async function testSearchAPI() {
  console.log("🔍 Test de l'API de recherche OptimXmlPreview\n");

  // Test du statut du serveur
  try {
    console.log('📡 Test de connexion au serveur...');
    const statusResponse = await makeRequest('/api/status');

    if (statusResponse.status === 200 && statusResponse.data.success) {
      console.log('✅ Serveur accessible');
      console.log(`   Architecture: ${statusResponse.data.architecture}`);
    } else {
      console.log('❌ Problème de connexion au serveur');
      return;
    }
  } catch (error) {
    console.log('❌ Erreur de connexion:', error.message);
    return;
  }

  console.log('\n' + '='.repeat(60));
  console.log('Tests de recherche');
  console.log('='.repeat(60));

  // Tests des recherches
  for (const searchTerm of TEST_SEARCHES) {
    try {
      console.log(`\n🔍 Recherche: "${searchTerm}"`);

      const searchResponse = await makeRequest(`/api/search?q=${encodeURIComponent(searchTerm)}`);

      if (searchResponse.status === 200) {
        const data = searchResponse.data;

        if (data.success) {
          console.log(`✅ Succès - ${data.totalResults || 0} résultat(s) trouvé(s)`);

          if (data.results && data.results.length > 0) {
            data.results.slice(0, 3).forEach((result, index) => {
              console.log(`   ${index + 1}. ${result.fileName}`);
              if (result.matches && result.matches.length > 0) {
                console.log(
                  `      Correspondances: ${result.matches.map((m) => m.type).join(', ')}`
                );
              }
            });

            if (data.results.length > 3) {
              console.log(`   ... et ${data.results.length - 3} autre(s)`);
            }
          }
        } else {
          console.log(`❌ Erreur API: ${data.error || data.message}`);
        }
      } else {
        console.log(`❌ Erreur HTTP ${searchResponse.status}`);
      }
    } catch (error) {
      console.log(`❌ Erreur requête: ${error.message}`);
    }

    // Pause entre les requêtes
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  console.log('\n' + '='.repeat(60));
  console.log('✅ Tests terminés');
  console.log('='.repeat(60));
}

// Exécuter les tests
testSearchAPI().catch((error) => {
  console.error('Erreur inattendue:', error);
  process.exit(1);
});
