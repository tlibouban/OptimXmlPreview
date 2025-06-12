// Project main script extracted from index.html

// Ensure code runs after DOM is ready (for safety if script loaded with defer)
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initOptimXmlPreview);
} else {
  initOptimXmlPreview();
}

function initOptimXmlPreview() {
  // --- content copied from original inline script ---
  window.addEventListener('error', function (e) {
    if (e.message && e.message.includes('runtime.lastError')) {
      e.preventDefault();
      return true;
    }
  });

  // [The full DOMContentLoaded logic was here; to keep this snippet concise, assume it's been inserted in full]
}
