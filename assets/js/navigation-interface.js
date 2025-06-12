/**
 * @fileoverview Interface de navigation pour OptimXmlPreview
 * @description Gestion de l'interface utilisateur pour la navigation entre emails
 * @author OptimXmlPreview
 * @version 2.0.0
 */

/* eslint-env browser */
/* global Quill */

// Filtrage avancé des erreurs d'extensions navigateur
(() => {
  // Sauvegarder les fonctions console originales
  const originalConsoleError = console.error;
  const originalConsoleWarn = console.warn;

  // Liste étendue des erreurs d'extensions à filtrer
  const extensionErrorPatterns = [
    'Unchecked runtime.lastError',
    'A listener indicated an asynchronous response by returning true',
    'the message channel closed before a response was received',
    'message channel closed before a response was received',
    'chrome-extension://',
    'moz-extension://',
    'safari-web-extension://',
    'contentscript.bundle.js',
    'Sentry.io',
    'Extension error',
    'chrome.runtime',
    'browser.runtime',
    'webExtension',
    'inject.js',
    'content_script',
  ];

  // Fonction utilitaire pour vérifier si c'est une erreur d'extension
  function isExtensionError(message) {
    return extensionErrorPatterns.some((pattern) =>
      message.toLowerCase().includes(pattern.toLowerCase())
    );
  }

  // Surcharger console.error
  console.error = function (...args) {
    const message = args.join(' ');
    if (!isExtensionError(message)) {
      originalConsoleError.apply(console, args);
    }
  };

  // Surcharger console.warn pour filtrer aussi les avertissements d'extensions
  console.warn = function (...args) {
    const message = args.join(' ');
    if (!isExtensionError(message)) {
      originalConsoleWarn.apply(console, args);
    }
  };
})();

document.addEventListener('DOMContentLoaded', function () {
  /* Charger dynamiquement la modale d'onboarding (toujours disponible) */
  const onboardingPath = 'assets/js/onboarding.js';
  if (!document.querySelector(`script[src="${onboardingPath}"]`)) {
    const s = document.createElement('script');
    s.src = onboardingPath;
    document.body.appendChild(s);
  }
  // Gestion avancée des erreurs d'extensions
  window.addEventListener('error', function (e) {
    if (
      e.message &&
      (e.message.includes('runtime.lastError') ||
        e.message.includes('message channel closed') ||
        e.message.includes('asynchronous response by returning true'))
    ) {
      e.preventDefault();
      e.stopPropagation();
      return true;
    }
  });

  // Intercepter les erreurs de promesses non gérées (pour les extensions async)
  window.addEventListener('unhandledrejection', function (e) {
    if (
      e.reason &&
      typeof e.reason === 'string' &&
      (e.reason.includes('runtime.lastError') || e.reason.includes('Extension context invalidated'))
    ) {
      e.preventDefault();
      return true;
    }
  });

  const emailItems = document.querySelectorAll('.email-item');
  const contentFrame = document.getElementById('contentFrame');
  const welcomeScreen = document.getElementById('welcomeScreen');
  const searchInput = document.getElementById('searchInput');
  const convertButton = document.getElementById('convertButton');

  // Détection du contexte (serveur vs fichier local)
  const isServerMode =
    window.location.protocol === 'http:' || window.location.protocol === 'https:';
  const isFileMode = window.location.protocol === 'file:';

  // Mode détecté silencieusement
  // En mode développement, décommenter la ligne suivante :
  // console.log('OptimXmlPreview - Mode détecté:', isServerMode ? 'Serveur' : 'Fichier local');

  if (isFileMode) {
    // Désactiver le bouton de conversion en mode fichier
    if (convertButton) {
      convertButton.disabled = true;
      convertButton.innerHTML = '<i class="fas fa-info-circle"></i> Serveur requis';
      convertButton.title =
        'Démarrez le serveur (start_server.bat) pour utiliser cette fonctionnalité';
    }

    // Modifier le placeholder de recherche
    if (searchInput) {
      searchInput.placeholder = 'Recherche simple par titre...';
      searchInput.title =
        'Recherche limitée en mode fichier local. Utilisez le serveur pour la recherche complète.';
    }
  }

  // Gestion du bouton de conversion
  convertButton.addEventListener('click', function () {
    const button = this;
    const originalContent = button.innerHTML;

    // Animation de chargement
    button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Conversion...';
    button.disabled = true;

    // Appel API pour la conversion
    fetch('/api/convert', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.success) {
          // Succès
          button.innerHTML = '<i class="fas fa-check"></i> Conversion réussie !';
          showNotification(
            `Conversion terminée ! ${data.details.converted} fichier(s) converti(s)`,
            'success'
          );

          // Recharger la page après 2 secondes pour afficher les nouveaux emails
          setTimeout(() => {
            window.location.reload();
          }, 2000);
        } else {
          // Erreur
          button.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Erreur';
          showNotification(`Erreur de conversion: ${data.error}`, 'error');

          // Rétablir le bouton après 3 secondes
          setTimeout(() => {
            button.innerHTML = originalContent;
            button.disabled = false;
          }, 3000);
        }
      })
      .catch(() => {
        // Erreur silencieuse pour éviter le spam console
        button.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Erreur réseau';
        showNotification('Erreur de connexion au serveur', 'error');

        // Rétablir le bouton après 3 secondes
        setTimeout(() => {
          button.innerHTML = originalContent;
          button.disabled = false;
        }, 3000);
      });
  });

  // Fonction pour afficher des notifications
  function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
      <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-info-circle'}"></i>
      <span>${message}</span>
    `;

    document.body.appendChild(notification);

    // Animation d'apparition
    setTimeout(() => notification.classList.add('show'), 100);

    // Suppression automatique
    setTimeout(() => {
      notification.classList.remove('show');
      setTimeout(() => document.body.removeChild(notification), 3000);
    }, 3000);
  }

  // Navigation entre les emails
  emailItems.forEach((item) => {
    item.addEventListener('click', function () {
      const fileName = this.dataset.file;
      loadEmail(fileName, this);
    });

    // Ouvrir dans un nouvel onglet
    const externalLink = item.querySelector('.fa-external-link-alt');
    externalLink.addEventListener('click', function (e) {
      e.stopPropagation();
      const fileName = item.dataset.file;
      window.open(fileName, '_blank');
    });

    // Ajout : Ouverture du PDF dans un nouvel onglet
    const pdfLink = item.querySelector('.open-pdf');
    if (pdfLink) {
      pdfLink.addEventListener('click', function (e) {
        e.stopPropagation();
        const pdfFile = item.dataset.pdf;
        if (pdfFile) {
          window.open(pdfFile, '_blank');
        } else {
          showNotification('PDF non disponible', 'error');
        }
      });
    }

    // Ajout : Envoi par email (pièce jointe unique)
    const sendLink = item.querySelector('.send-mail');
    if (sendLink) {
      sendLink.addEventListener('click', function (e) {
        e.stopPropagation();
        const pdfFile = item.dataset.pdf;
        if (!pdfFile) {
          showNotification('Pièce jointe manquante', 'error');
          return;
        }
        fetch('/api/send-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ files: [pdfFile] }),
        })
          .then(() => {
            showNotification('Préparation Outlook avec 1 pièce jointe', 'success');
          })
          .catch(() => {
            showNotification("Erreur lors de la préparation de l'email", 'error');
          });
      });
    }
  });

  // Recherche dans la liste
  let searchTimeout;
  searchInput.addEventListener('input', function () {
    const searchTerm = this.value.trim();

    // Débounce pour éviter trop de requêtes
    clearTimeout(searchTimeout);

    if (searchTerm.length === 0) {
      // Afficher tous les emails si pas de recherche
      showAllEmails();
      return;
    }

    if (searchTerm.length < 2) {
      // Attendre au moins 2 caractères
      return;
    }

    searchTimeout = setTimeout(() => {
      performFullTextSearch(searchTerm);
    }, 300);
  });

  // Fonction pour afficher tous les emails
  function showAllEmails() {
    emailItems.forEach((item) => {
      item.style.display = 'flex';
      item.classList.remove('search-highlight');
    });

    // Afficher/masquer les en-têtes de section
    document.querySelectorAll('.email-section-header').forEach((header) => {
      header.style.display = 'block';
    });
  }

  // Fonction de recherche full-text
  function performFullTextSearch(searchTerm) {
    if (isFileMode) {
      // En mode fichier local, utiliser la recherche simple par titre
      performSimpleSearch(searchTerm);
      return;
    }

    // En mode serveur, utiliser l'API de recherche
    fetch(`/api/search?q=${encodeURIComponent(searchTerm)}`)
      .then((response) => response.json())
      .then((data) => {
        if (data.success) {
          displaySearchResults(data.results, searchTerm);
        } else {
          // Erreur de recherche gérée par notification utilisateur
          showNotification('Erreur lors de la recherche', 'error');
        }
      })
      .catch(() => {
        // Erreur réseau gérée par notification utilisateur
        showNotification('Erreur de connexion lors de la recherche', 'error');
      });
  }

  // Fonction de recherche simple (mode fichier local)
  function performSimpleSearch(searchTerm) {
    const searchTermLower = searchTerm.toLowerCase();
    let hasResults = false;

    // Masquer les en-têtes de section
    document.querySelectorAll('.email-section-header').forEach((header) => {
      header.style.display = 'none';
    });

    emailItems.forEach((item) => {
      const title = item.querySelector('.email-title').textContent.toLowerCase();
      if (title.includes(searchTermLower)) {
        item.style.display = 'flex';
        item.classList.add('search-highlight');
        hasResults = true;
      } else {
        item.style.display = 'none';
        item.classList.remove('search-highlight');
      }
    });

    if (!hasResults) {
      showNoResultsMessage(searchTerm);
    }
  }

  // Fonction pour afficher les résultats de recherche
  function displaySearchResults(results, searchTerm) {
    // Masquer d'abord tous les emails
    emailItems.forEach((item) => {
      item.style.display = 'none';
      item.classList.remove('search-highlight');
    });

    // Masquer les en-têtes de section pendant la recherche
    document.querySelectorAll('.email-section-header').forEach((header) => {
      header.style.display = 'none';
    });

    let hasResults = false;

    results.forEach((result) => {
      // Trouver l'élément email correspondant
      const emailItem = Array.from(emailItems).find((item) => {
        const dataFile = item.dataset.file;
        const fileName = dataFile.replace('Output/', '');
        return fileName === result.file;
      });

      if (emailItem) {
        emailItem.style.display = 'flex';
        emailItem.classList.add('search-highlight');

        // Ajouter des badges de correspondance
        addMatchBadges(emailItem, result.matches);
        hasResults = true;
      }
    });

    // Afficher un message si aucun résultat
    if (!hasResults) {
      showNoResultsMessage(searchTerm);
    }
  }

  // Fonction pour ajouter des badges de correspondance
  function addMatchBadges(emailItem, matches) {
    // Supprimer les anciens badges
    const existingBadges = emailItem.querySelectorAll('.match-badge');
    existingBadges.forEach((badge) => badge.remove());

    // Ajouter les nouveaux badges
    const emailInfo = emailItem.querySelector('.email-info');
    const badgeContainer = document.createElement('div');
    badgeContainer.className = 'match-badges';

    matches.forEach((match) => {
      const badge = document.createElement('span');
      badge.className = 'match-badge';
      badge.textContent = match.type;
      badge.title = `Trouvé dans: ${match.type} - "${match.value}"`;
      badgeContainer.appendChild(badge);
    });

    emailInfo.appendChild(badgeContainer);
  }

  // Fonction pour afficher un message "aucun résultat"
  function showNoResultsMessage(searchTerm) {
    // Créer un message temporaire
    const messageDiv = document.createElement('div');
    messageDiv.className = 'no-results-message';
    messageDiv.innerHTML = `
      <div class="no-results-content">
        <i class="fas fa-search"></i>
        <h3>Aucun résultat trouvé</h3>
        <p>Aucun email ne correspond à votre recherche "<strong>${searchTerm}</strong>"</p>
        <small>La recherche porte sur les sujets, expéditeurs, destinataires, corps des messages et pièces jointes.</small>
      </div>
    `;

    // Insérer le message dans la liste des emails
    const emailList = document.getElementById('emailList');
    emailList.appendChild(messageDiv);

    // Supprimer le message après un délai
    setTimeout(() => {
      if (messageDiv.parentNode) {
        messageDiv.parentNode.removeChild(messageDiv);
      }
    }, 5000);
  }

  // Fonction pour charger un email
  function loadEmail(fileName, activeItem) {
    // Mettre à jour l'état actif
    emailItems.forEach((item) => item.classList.remove('active'));
    activeItem.classList.add('active');

    // Cacher l'écran d'accueil et afficher le contenu
    welcomeScreen.style.display = 'none';
    contentFrame.style.display = 'block';
    contentFrame.src = fileName;

    // Mettre à jour l'URL sans recharger la page
    const newUrl =
      window.location.protocol +
      '//' +
      window.location.host +
      window.location.pathname +
      '?email=' +
      encodeURIComponent(fileName);
    window.history.pushState({ email: fileName }, '', newUrl);
  }

  // Charger un email depuis l'URL
  const urlParams = new URLSearchParams(window.location.search);
  const emailParam = urlParams.get('email');
  if (emailParam) {
    const targetItem = Array.from(emailItems).find((item) => item.dataset.file === emailParam);
    if (targetItem) {
      loadEmail(emailParam, targetItem);
      targetItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }

  // Navigation avec les flèches du clavier
  document.addEventListener('keydown', function (e) {
    const activeItem = document.querySelector('.email-item.active');
    if (!activeItem) return;

    let nextItem = null;

    if (e.key === 'ArrowDown') {
      nextItem = activeItem.nextElementSibling;
      e.preventDefault();
    } else if (e.key === 'ArrowUp') {
      nextItem = activeItem.previousElementSibling;
      e.preventDefault();
    }

    if (nextItem && nextItem.classList.contains('email-item')) {
      nextItem.click();
      nextItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  });

  // Gestion du retour navigateur
  window.addEventListener('popstate', function (e) {
    if (e.state && e.state.email) {
      const targetItem = Array.from(emailItems).find((item) => item.dataset.file === e.state.email);
      if (targetItem) {
        loadEmail(e.state.email, targetItem);
      }
    } else {
      // Retour à l'accueil
      emailItems.forEach((item) => item.classList.remove('active'));
      welcomeScreen.style.display = 'flex';
      contentFrame.style.display = 'none';
    }
  });

  /* ----------------------  Sélection multiple & Envoi ---------------------- */
  const checkboxes = document.querySelectorAll('.email-select');
  const sendSelectedButton = document.getElementById('sendSelectedButton');
  const selectAllCheckbox = document.getElementById('selectAll');

  function updateSelected() {
    const any = Array.from(checkboxes).some((cb) => cb.checked);
    if (sendSelectedButton) sendSelectedButton.disabled = !any;
    if (selectAllCheckbox) {
      selectAllCheckbox.checked = Array.from(checkboxes).every((cb) => cb.checked);
    }
  }

  checkboxes.forEach((cb) => {
    cb.addEventListener('click', (e) => {
      e.stopPropagation();
      updateSelected();
    });
  });

  if (selectAllCheckbox) {
    selectAllCheckbox.addEventListener('change', () => {
      const checked = selectAllCheckbox.checked;
      checkboxes.forEach((cb) => (cb.checked = checked));
      updateSelected();
    });
  }

  sendSelectedButton &&
    sendSelectedButton.addEventListener('click', () => {
      const files = Array.from(checkboxes)
        .filter((cb) => cb.checked)
        .map((cb) => cb.closest('.email-item').dataset.pdf);
      if (files.length === 0) return;
      fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ files }),
      })
        .then(() => {
          showNotification(
            `Préparation Outlook avec ${files.length} pièce(s) jointe(s)`,
            'success'
          );
        })
        .catch(() => {
          showNotification("Erreur lors de la préparation de l'email", 'error');
        });
    });

  /* ---------------------- Drag & Drop Upload XML ---------------------- */
  const sidebar = document.querySelector('.sidebar');
  if (sidebar && isServerMode) {
    const highlight = () => sidebar.classList.add('drop-target');
    const unHighlight = () => sidebar.classList.remove('drop-target');

    ['dragenter', 'dragover'].forEach((evt) => {
      sidebar.addEventListener(evt, (e) => {
        e.preventDefault();
        highlight();
      });
    });
    ['dragleave', 'drop'].forEach((evt) => {
      sidebar.addEventListener(evt, (e) => {
        e.preventDefault();
        unHighlight();
      });
    });

    sidebar.addEventListener('drop', (e) => {
      e.preventDefault();
      unHighlight();
      const xmlFiles = Array.from(e.dataTransfer.files).filter((f) => /\.x?xml$/i.test(f.name));
      if (xmlFiles.length === 0) {
        showNotification('Aucun fichier XML détecté', 'error');
        return;
      }

      const formData = new FormData();
      xmlFiles.forEach((f) => formData.append('files', f));

      showNotification(`Envoi de ${xmlFiles.length} fichier(s) XML...`, 'info');
      fetch('/api/upload-xml', { method: 'POST', body: formData })
        .then((r) => r.json())
        .then((d) => {
          if (d.success) {
            showNotification(`Conversion terminée (${d.converted} fichier(s))`, 'success');
            setTimeout(() => location.reload(), 2000);
          } else {
            showNotification(`Erreur: ${d.error || 'Conversion'}`, 'error');
          }
        })
        .catch(() => showNotification("Erreur réseau lors de l'upload", 'error'));
    });
  }

  /* ---------------------- Settings Modal (Quill) ---------------------- */
  const openSettingsBtn = document.getElementById('openSettings');
  const settingsModal = document.getElementById('settingsModal');
  const subjectInput = document.getElementById('subjectTemplateInput');
  const closeSettingsBtn = document.getElementById('closeSettings');
  const saveSettingsBtn = document.getElementById('saveSettings');
  const tokens = settingsModal ? settingsModal.querySelectorAll('.token') : [];
  let quill;

  const ensureQuill = () => {
    if (!quill) {
      quill = new Quill('#bodyQuill', { theme: 'snow' });
    }
  };

  // Focus tracking
  let lastTarget = 'subject';
  subjectInput && subjectInput.addEventListener('focus', () => (lastTarget = 'subject'));
  ensureQuill();
  quill.root.addEventListener('focus', () => (lastTarget = 'quill'));

  tokens.forEach((t) => {
    t.addEventListener('click', () => {
      const token = t.textContent;
      if (lastTarget === 'subject') {
        insertAtCursor(subjectInput, token);
      } else {
        const range = quill.getSelection(true) || { index: quill.getLength(), length: 0 };
        quill.insertText(range.index, token);
        quill.setSelection(range.index + token.length, 0);
      }
    });
  });

  function insertAtCursor(textarea, text) {
    if (!textarea) return;
    const start = textarea.selectionStart || 0;
    const end = textarea.selectionEnd || 0;
    textarea.value = textarea.value.slice(0, start) + text + textarea.value.slice(end);
    textarea.selectionStart = textarea.selectionEnd = start + text.length;
    textarea.focus();
  }

  openSettingsBtn &&
    openSettingsBtn.addEventListener('click', () => {
      fetch('/api/email-config')
        .then((r) => r.json())
        .then((d) => {
          if (d.success) {
            subjectInput.value = d.config.subjectTemplate || '';
            ensureQuill();
            quill.root.innerHTML = d.config.bodyTemplate || '';
          }
        })
        .catch(() => {});
      settingsModal.style.display = 'flex';
    });

  closeSettingsBtn &&
    closeSettingsBtn.addEventListener('click', () => {
      settingsModal.style.display = 'none';
    });

  saveSettingsBtn &&
    saveSettingsBtn.addEventListener('click', () => {
      const payload = {
        subjectTemplate: subjectInput.value,
        bodyTemplate: quill ? quill.root.innerHTML : '',
      };
      fetch('/api/email-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
        .then((r) => r.json())
        .then((d) => {
          if (d.success) {
            showNotification('Paramètres enregistrés', 'success');
            settingsModal.style.display = 'none';
          } else {
            showNotification('Erreur enregistrement', 'error');
          }
        })
        .catch(() => showNotification('Erreur réseau', 'error'));
    });

  /* ---------------------- Sidebar Resizer ---------------------- */
  const resizer = document.getElementById('sidebarResizer');
  let isResizing = false;
  resizer &&
    resizer.addEventListener('mousedown', () => {
      isResizing = true;
      document.body.style.cursor = 'ew-resize';
    });
  document.addEventListener('mousemove', (e) => {
    if (!isResizing) return;
    const newWidth = e.clientX;
    if (newWidth < 240) return; // largeur minimale
    sidebar.style.width = newWidth + 'px';
  });
  document.addEventListener('mouseup', () => {
    if (isResizing) {
      isResizing = false;
      document.body.style.cursor = '';
    }
  });

  // Interface chargée avec succès
  // En mode développement, décommenter la ligne suivante :
  // console.log('OptimXmlPreview Navigation Interface loaded successfully');
});
