/**
 * Vercel Speed Insights initialization
 * This script loads and initializes Speed Insights for performance monitoring
 */
(async function() {
  try {
    // Dynamically import the Speed Insights module
    const { injectSpeedInsights } = await import('./speed-insights.mjs');
    
    // Initialize Speed Insights
    if (injectSpeedInsights) {
      injectSpeedInsights({
        framework: 'express',
        debug: false
      });
    }
  } catch (error) {
    // Silently fail if Speed Insights cannot be loaded
    // This prevents blocking the page load if there are any issues
    console.warn('Speed Insights initialization failed:', error);
  }
})();
