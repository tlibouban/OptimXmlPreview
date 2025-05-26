// Charger les variables d'environnement depuis .env
require('dotenv').config();

console.log("🔍 Variables d'environnement SECIB:");
console.log('SECIB_BASE_URL:', process.env.SECIB_BASE_URL || 'NON DÉFINIE');
console.log('SECIB_API_VERSION:', process.env.SECIB_API_VERSION || 'NON DÉFINIE');
console.log('SECIB_CABINET_ID:', process.env.SECIB_CABINET_ID || 'NON DÉFINIE');
console.log('SECIB_API_KEY:', process.env.SECIB_API_KEY ? 'DÉFINIE (caché)' : 'NON DÉFINIE');

console.log("\n🔍 Variables d'environnement ERP générales:");
console.log('ERP_BASE_URL:', process.env.ERP_BASE_URL || 'NON DÉFINIE');
console.log('ERP_API_KEY:', process.env.ERP_API_KEY ? 'DÉFINIE (caché)' : 'NON DÉFINIE');
console.log('ERP_CABINET_ID:', process.env.ERP_CABINET_ID || 'NON DÉFINIE');
console.log('ERP_ENABLED:', process.env.ERP_ENABLED || 'NON DÉFINIE');
