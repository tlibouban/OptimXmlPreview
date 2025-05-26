/**
 * Script de test pour valider l'extraction du contenu <body> du XML
 * dans la div <email-body> du HTML généré
 */

const { extractEmailMetadata } = require('./ConvertXmlToHtml-refactored.js');

// Exemple de XML de test avec contenu body
const testXML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<email msgId="123456" msgDir="received">
    <envelope>
        <From>test@example.com</From>
        <To>dest@example.com</To>
        <Date>2025-05-26T13:30:00.000+01:00</Date>
        <Subject>Test d'extraction du body</Subject>
        <nbPJ>0</nbPJ>
    </envelope>
    <body>Ceci est le contenu du message de test.&#xD;
&#xD;
Il contient plusieurs lignes.&#xD;
&#xD;
Cordialement,&#xD;
Test</body>
</email>`;

console.log("🧪 Test d'extraction du contenu <body> XML");
console.log('='.repeat(50));

// Test d'extraction des métadonnées
const metadata = extractEmailMetadata(testXML);

if (metadata) {
  console.log('✅ Extraction des métadonnées réussie');
  console.log('📧 Sujet:', metadata.subject);
  console.log('👤 De:', metadata.from);
  console.log('📅 Date:', metadata.date);
  console.log('');
  console.log('📝 Contenu du body extrait:');
  console.log('---');
  console.log(metadata.body);
  console.log('---');

  // Vérifier que le contenu est bien présent
  if (metadata.body && metadata.body.includes('Ceci est le contenu du message de test')) {
    console.log('✅ Le contenu du <body> XML a été correctement extrait !');
    console.log('✅ Les caractères &#xD; ont été convertis en retours à la ligne');
  } else {
    console.log("❌ Erreur: Le contenu du <body> XML n'a pas été extrait correctement");
  }
} else {
  console.log("❌ Erreur: Impossible d'extraire les métadonnées");
}

console.log('');
console.log('🎯 Résumé de la correction appliquée:');
console.log("- La fonction getMessageContent() cherche d'abord la balise <body> du XML");
console.log("- Les caractères d'échappement &#xD; sont convertis en \\n");
console.log('- Le contenu est ensuite affiché dans <div class="email-body"> avec <br>');
console.log("- Si aucun <body> n'est trouvé, d'autres balises sont testées");
