/**
 * @fileoverview Utilitaire centralisé de journalisation et couleurs ANSI
 * @description Fournit un objet Logger uniformisé et la palette COLORS pour tout le projet.
 * @author OptimXmlPreview
 * @version 2.0.0
 */

// Palette de couleurs ANSI
const COLORS = Object.freeze({
  RESET: '\x1b[0m',
  BRIGHT: '\x1b[1m',
  RED: '\x1b[31m',
  GREEN: '\x1b[32m',
  YELLOW: '\x1b[33m',
  BLUE: '\x1b[34m',
  CYAN: '\x1b[36m',
});

// Logger unifié
const Logger = Object.freeze({
  success: (msg) => console.log(`${COLORS.GREEN}✓ ${msg}${COLORS.RESET}`),
  error: (msg) => console.error(`${COLORS.RED}✗ ${msg}${COLORS.RESET}`),
  warning: (msg) => console.log(`${COLORS.YELLOW}⚠ ${msg}${COLORS.RESET}`),
  info: (msg) => console.log(`${COLORS.CYAN}ℹ ${msg}${COLORS.RESET}`),
});

module.exports = {
  COLORS,
  Logger,
};
