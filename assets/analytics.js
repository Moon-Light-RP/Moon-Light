// Vercel Web Analytics initialization
// Documentation: https://vercel.com/docs/analytics/quickstart
(function() {
  if (window.va) return; // Already initialized
  
  window.va = function() {
    (window.vaq = window.vaq || []).push(arguments);
  };
  
  var script = document.createElement('script');
  script.defer = true;
  script.src = '/_vercel/insights/script.js';
  document.head.appendChild(script);
})();
