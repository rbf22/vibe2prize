// Event listener cleanup utility for Template Studio
const eventListeners = new Set();

export function addTrackedEventListener(element, event, handler, options) {
  if (!element) return null;
  
  element.addEventListener(event, handler, options);
  
  const listenerInfo = { element, event, handler, options };
  eventListeners.add(listenerInfo);
  
  // Return cleanup function for individual listener
  return () => {
    element.removeEventListener(event, handler, options);
    eventListeners.delete(listenerInfo);
  };
}

export function cleanupAllEventListeners() {
  eventListeners.forEach(({ element, event, handler, options }) => {
    try {
      element.removeEventListener(event, handler, options);
    } catch (e) {
      // Element might have been removed from DOM
      console.warn('Failed to remove event listener:', e);
    }
  });
  eventListeners.clear();
}

export function getEventListenerCount() {
  return eventListeners.size;
}
