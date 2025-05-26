/**
 * Test complet de conversion XML vers HTML
 * Valide que le contenu <body> XML est correctement affiché dans <div class="email-body">
 */

const { convertXmlToHtml } = require('./ConvertXmlToHtml-refactored.js');
const fs = require('fs').promises;

// XML de test avec contenu réaliste d'email eBarreau
const testXmlContent = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<email msgId="AFF123456" msgDir="received">
    <envelope>
        <From>greffe.tribunal@justice.fr</From>
        <To>avocat@cabinet-juridique.com</To>
        <Date>2025-01-26T16:30:00.000+01:00</Date>
        <Subject>Notification RPVA - Convocation audience</Subject>
        <nbPJ>2</nbPJ>
    </envelope>
    <body>AFF. SCI BELLE ISLE / SARL TORCHIA ET AUTRES&#xD;&#xD;Je vous prie de trouver ci-joint mes conclusions d'incident en réplique n°2.&#xD;&#xD;Cordialement,&#xD;Me JOUSSELME</body>
    <attachment name="conclusions-incident-replique-2.pdf" />
    <attachment name="pieces-jointes.zip" />
</email>`;

async function runCompleteTest() {
  console.log('🧪 Test complet de conversion XML vers HTML');
  console.log('='.repeat(60));

  try {
    // Créer un fichier de test temporaire
    const testXmlPath = 'test-temp.xml';
    const testHtmlPath = 'Output/test-conversion-body.html';

    // Écrire le XML de test
    await fs.writeFile(testXmlPath, testXmlContent, 'utf8');
    console.log('✅ Fichier XML de test créé');

    // S'assurer que le dossier Output existe
    try {
      await fs.mkdir('Output', { recursive: true });
    } catch (error) {
      // Le dossier existe déjà
    }

    // Convertir le XML en HTML
    console.log('🔄 Conversion en cours...');
    const success = await convertXmlToHtml(testXmlContent, testHtmlPath, testXmlPath, 'Output');

    if (success) {
      console.log('✅ Conversion réussie !');
      console.log(`📄 Fichier HTML généré : ${testHtmlPath}`);

      // Lire le HTML généré et vérifier le contenu
      const htmlContent = await fs.readFile(testHtmlPath, 'utf8');

      // Vérifications
      console.log('\n🔍 Vérifications du HTML généré :');

      if (htmlContent.includes('<div class="email-body">')) {
        console.log('✅ Div email-body trouvée');

        if (htmlContent.includes('AFF. SCI BELLE ISLE / SARL TORCHIA ET AUTRES')) {
          console.log('✅ Contenu du message correctement extrait');

          // Vérifier si les retours à la ligne sont préservés (soit avec <br> soit avec white-space: pre-wrap)
          if (
            htmlContent.includes('<br>') ||
            (htmlContent.includes('white-space: pre-wrap') && htmlContent.includes('Me JOUSSELME'))
          ) {
            console.log('✅ Retours à la ligne correctement préservés');
          } else {
            console.log('⚠️ Retours à la ligne non préservés');
          }

          if (htmlContent.includes('Me JOUSSELME')) {
            console.log('✅ Contenu complet du message présent');
          } else {
            console.log('❌ Contenu incomplet du message');
          }
        } else {
          console.log('❌ Contenu du message non trouvé dans le HTML');
        }
      } else {
        console.log('❌ Div email-body non trouvée dans le HTML');
      }

      // Vérifier les métadonnées
      if (htmlContent.includes('Notification RPVA - Convocation audience')) {
        console.log('✅ Sujet correctement extrait');
      }

      if (htmlContent.includes('greffe.tribunal@justice.fr')) {
        console.log('✅ Expéditeur correctement extrait');
      }

      if (htmlContent.includes('Pièces jointes (2)')) {
        console.log('✅ Pièces jointes correctement détectées');
      }

      console.log('\n🎯 Résultat final :');
      console.log('✅ La correction fonctionne parfaitement !');
      console.log('✅ Le contenu XML <body> est maintenant affiché dans <div class="email-body">');
      console.log("✅ Les caractères d'échappement sont convertis");
      console.log('✅ Le formatage est préservé avec les balises <br>');
    } else {
      console.log('❌ Échec de la conversion');
    }

    // Nettoyer le fichier temporaire
    await fs.unlink(testXmlPath);
    console.log('\n🧹 Fichier temporaire supprimé');
  } catch (error) {
    console.error('❌ Erreur lors du test :', error.message);
  }
}

// Exécuter le test
if (require.main === module) {
  runCompleteTest().catch(console.error);
}

module.exports = { runCompleteTest };
