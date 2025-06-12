/* eslint-env browser */
/**
 * Onboarding modal pour OptimXmlPreview
 * Affiche un aperçu des fonctionnalités lors de la première visite.
 * Le choix de masquer définitivement la modale est mémorisé via localStorage.
 */
(function () {
  const STORAGE_KEY = 'optimxmlpreview_onboarding_dismissed';

  // Ne rien faire si l'utilisateur a déjà masqué la modale
  if (localStorage.getItem(STORAGE_KEY) === 'true') return;

  // Styles auxiliaires (injection directe pour éviter une requête réseau supplémentaire)
  const style = document.createElement('style');
  style.textContent = `
    .onboarding-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.6);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9999;
    }
    .onboarding-modal {
      background: #ffffff;
      max-width: 600px;
      width: 90%;
      border-radius: 8px;
      padding: 2rem 2.5rem;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
      animation: fadeIn 0.3s ease-out;
      font-family: Inter, Arial, sans-serif;
    }
    .onboarding-modal h2 {
      margin-top: 0;
      font-size: 1.9rem;
      color: #333;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .onboarding-modal ul {
      list-style: none;
      padding-left: 0;
      margin: 1.2rem 0 1.8rem 0;
    }
    .onboarding-modal li {
      margin-bottom: 0.6rem;
      display: flex;
      align-items: center;
      gap: 0.6rem;
      color: #444;
      font-size: 1rem;
    }
    .onboarding-modal li i {
      color: #2c7be5;
    }
    .onboarding-actions {
      display: flex;
      justify-content: flex-end;
      gap: 1rem;
    }
    .onboarding-btn {
      border: none;
      padding: 0.6rem 1.2rem;
      font-size: 0.95rem;
      border-radius: 4px;
      cursor: pointer;
      transition: background 0.15s ease-in-out;
    }
    .onboarding-btn-primary {
      background: #2c7be5;
      color: #fff;
    }
    .onboarding-btn-primary:hover {
      background: #1d6fd1;
    }
    .onboarding-btn-secondary {
      background: #e0e0e0;
      color: #333;
    }
    .onboarding-btn-secondary:hover {
      background: #cacaca;
    }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(-10px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `;
  document.head.appendChild(style);

  // Crée la structure de la modale
  const backdrop = document.createElement('div');
  backdrop.className = 'onboarding-backdrop';

  backdrop.innerHTML = `
    <div class="onboarding-modal" role="dialog" aria-modal="true" aria-labelledby="onb-title">
      <h2 id="onb-title"><i class="fas fa-seedling"></i> Bienvenue !</h2>
      <p>Voici un aperçu rapide de ce que vous pouvez faire&nbsp;:</p>
      <ul>
        <li><i class="fas fa-sync-alt"></i> Convertir vos e-mails XML en un clic</li>
        <li><i class="fas fa-search"></i> Rechercher dans le sujet, le corps et les pièces jointes</li>
        <li><i class="fas fa-file-pdf"></i> Télécharger chaque e-mail au format PDF</li>
        <li><i class="fas fa-paper-plane"></i> Sélectionner et envoyer par e-mail depuis l'interface</li>
      </ul>
      <div class="onboarding-actions">
        <button class="onboarding-btn onboarding-btn-secondary" id="onb-dismiss">Ne plus afficher</button>
        <button class="onboarding-btn onboarding-btn-primary" id="onb-close">Commencer</button>
      </div>
    </div>
  `;

  document.body.appendChild(backdrop);

  const close = () => {
    backdrop.remove();
  };

  // Gestion des boutons
  document.getElementById('onb-close').addEventListener('click', close);
  document.getElementById('onb-dismiss').addEventListener('click', () => {
    localStorage.setItem(STORAGE_KEY, 'true');
    close();
  });
})();
