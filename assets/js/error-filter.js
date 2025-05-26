/**
 * @fileoverview Filtre avancé pour les erreurs d'extensions de navigateur
 * @description Supprime les erreurs runtime.lastError et autres erreurs d'extensions
 * @author OptimXmlPreview
 * @version 1.0.0
 */

/* eslint-env browser */

(function () {
  'use strict';

  // Sauvegarder les méthodes console originales
  const originalError = console.error;
  const originalWarn = console.warn;

  // Patterns d'erreurs d'extensions à filtrer
  const EXTENSION_ERROR_PATTERNS = [
    // Erreurs Chrome runtime (plus spécifiques)
    /unchecked runtime\.lasterror/i,
    /runtime\.lasterror/i,
    /a listener indicated an asynchronous response by returning true/i,
    /message channel closed before a response was received/i,
    /the message channel closed before a response was received/i,
    /message channel.*response.*received/i,
    /listener.*asynchronous response.*returning true/i,

    // URLs d'extensions
    /chrome-extension:\/\//i,
    /moz-extension:\/\//i,
    /safari-web-extension:\/\//i,

    // Scripts d'extensions
    /contentscript\.bundle\.js/i,
    /content_script/i,
    /inject\.js/i,

    // Extensions API calls (only from extension URLs)
    /chrome-extension.*\/api\//i,
    /moz-extension.*\/api\//i,

    // Autres erreurs d'extensions courantes
    /extension context invalidated/i,
    /chrome\.runtime/i,
    /browser\.runtime/i,
    /webextension/i,
    /sentry\.io/i,
  ];

  /**
   * Vérifie si un message d'erreur provient d'une extension
   * @param {string} message - Le message d'erreur à vérifier
   * @returns {boolean} True si c'est une erreur d'extension
   */
  function isExtensionError(message) {
    if (typeof message !== 'string') {
      return false;
    }

    // Ne jamais filtrer les requêtes vers localhost ou l'application locale
    if (
      message.includes('localhost') ||
      message.includes('127.0.0.1') ||
      message.includes(':3000')
    ) {
      return false;
    }

    // Ne jamais filtrer les requêtes API de l'application elle-même
    if (
      message.includes('GET /api/search') &&
      !message.includes('chrome-extension://') &&
      !message.includes('moz-extension://')
    ) {
      return false;
    }

    return EXTENSION_ERROR_PATTERNS.some((pattern) => pattern.test(message));
  }

  /**
   * Filtre les arguments de console pour les erreurs d'extensions
   * @param {Array} args - Arguments passés à console.error/warn
   * @returns {boolean} True si les arguments doivent être filtrés
   */
  function shouldFilterArgs(args) {
    const message = args.join(' ');
    return isExtensionError(message);
  }

  // Remplacer console.error
  console.error = function (...args) {
    if (!shouldFilterArgs(args)) {
      originalError.apply(console, args);
    }
  };

  // Remplacer console.warn
  console.warn = function (...args) {
    if (!shouldFilterArgs(args)) {
      originalWarn.apply(console, args);
    }
  };

  // Gérer les erreurs globales
  window.addEventListener(
    'error',
    function (event) {
      if (event.message && isExtensionError(event.message)) {
        event.preventDefault();
        event.stopPropagation();
        return true;
      }
    },
    true
  );

  // Gérer les rejets de promesses non gérés
  window.addEventListener('unhandledrejection', function (event) {
    if (event.reason) {
      const reasonString =
        typeof event.reason === 'string' ? event.reason : event.reason.toString();

      if (isExtensionError(reasonString)) {
        event.preventDefault();
        return true;
      }
    }
  });

  // Intercepter les messages de console à un niveau plus bas
  const originalConsoleLog = console.log;
  const originalConsoleInfo = console.info;
  const originalConsoleDebug = console.debug;

  // Filtrer tous les types de messages console
  console.log = function (...args) {
    if (!shouldFilterArgs(args)) {
      originalConsoleLog.apply(console, args);
    }
  };

  console.info = function (...args) {
    if (!shouldFilterArgs(args)) {
      originalConsoleInfo.apply(console, args);
    }
  };

  console.debug = function (...args) {
    if (!shouldFilterArgs(args)) {
      originalConsoleDebug.apply(console, args);
    }
  };

  // Intercepter les erreurs au niveau du navigateur avec un observer mutation
  if (typeof MutationObserver !== 'undefined') {
    const observer = new MutationObserver(function (mutations) {
      mutations.forEach(function (mutation) {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach(function (node) {
            if (node.nodeType === Node.TEXT_NODE) {
              const text = node.textContent || '';
              if (isExtensionError(text)) {
                node.remove();
              }
            }
          });
        }
      });
    });

    // Observer les changements dans la console du DevTools si accessible
    try {
      observer.observe(document.body, {
        childList: true,
        subtree: true,
      });
    } catch (e) {
      // Observer pas possible, ignorer
    }
  }

  // Hook plus agressif sur window.onerror
  const originalOnError = window.onerror;
  window.onerror = function (message, source, lineno, colno, error) {
    if (typeof message === 'string' && isExtensionError(message)) {
      return true; // Suppress the error
    }
    if (originalOnError) {
      return originalOnError.call(this, message, source, lineno, colno, error);
    }
  };

  // Mode debug (décommenter pour voir les erreurs filtrées)
  /*
  const originalConsoleError = console.error;
  console.error = function(...args) {
    const message = args.join(' ');
    if (isExtensionError(message)) {
      console.log('🔇 Extension error filtered:', message);
      return;
    }
    originalConsoleError.apply(console, args);
  };
  */

  // Message de confirmation (silencieux en production)
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    console.log('🛡️ Extension error filter active');
  }
})();
