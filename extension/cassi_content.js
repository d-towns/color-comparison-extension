// content-script.js

// Create the popup container (hidden by default)
const popup = document.createElement('div');
popup.id = 'shopper-popup';
popup.style.cssText = `
  display: none;
  position: fixed;
  z-index: 999999;
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(0,0,0,0.1);
  min-width: 280px;
  max-width: 400px;
  padding: 16px;
  font-family: -apple-system, system-ui, sans-serif;
`;

// Popup content template
popup.innerHTML = `
  <div class="popup-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
    <h3 style="margin: 0; font-size: 16px; color: #333;">Shopping Assistant</h3>
    <button id="close-popup" style="background: none; border: none; cursor: pointer; padding: 4px;">
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="#666">
        <path d="M13 1L1 13M1 1l12 12"/>
      </svg>
    </button>
  </div>
  <div class="popup-content">
    <!-- Dynamic content will be injected here -->
    <p>Analyzing item...</p>
  </div>
`;

// Create trigger icon template
const createTriggerIcon = () => {
  const icon = document.createElement('div');
  icon.innerHTML = `
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" style="filter: drop-shadow(0 2px 4px rgba(0,0,0,0.1))">
      <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" fill="#4F46E5"/>
      <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" stroke="#fff" stroke-width="1.5"/>
    </svg>
  `;
  icon.style.cssText = `
    position: absolute;
    cursor: pointer;
    z-index: 99999;
    transition: transform 0.2s ease;
  `;
  icon.addEventListener('mouseenter', () => {
    icon.style.transform = 'scale(1.1)';
  });
  icon.addEventListener('mouseleave', () => {
    icon.style.transform = 'scale(1)';
  });
  return icon;
};

// Handle image detection
const processImages = () => {
  document.querySelectorAll('img').forEach(img => {
    const trigger = createTriggerIcon();
    
    // Position trigger near image
    const rect = img.getBoundingClientRect();
    trigger.style.top = `${rect.top + window.scrollY + 8}px`;
    trigger.style.left = `${rect.left + window.scrollX + rect.width - 32}px`;

    // Click handler
    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      showPopup(img.src, rect);
    });

    document.body.appendChild(trigger);
  });
};

// Handle text selection
document.addEventListener('mouseup', (e) => {
  const selection = window.getSelection().toString().trim();
  if (selection.length > 3) {
    const trigger = createTriggerIcon();
    const range = window.getSelection().getRangeAt(0);
    const rect = range.getBoundingClientRect();
    
    trigger.style.top = `${rect.top + window.scrollY - 32}px`;
    trigger.style.left = `${rect.left + window.scrollX + rect.width/2 - 12}px`;
    
    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      showPopup(null, rect, selection);
    });

    document.body.appendChild(trigger);
    
    // Remove trigger after 5 seconds
    setTimeout(() => {
      trigger.remove();
    }, 5000);
  }
});

// Show popup with context
function showPopup(imageSrc, position, text) {
  const popupContent = popup.querySelector('.popup-content');
  
  if (imageSrc) {
    popupContent.innerHTML = `
      <div style="display: grid; gap: 12px;">
        <img src="${imageSrc}" style="max-width: 120px; border-radius: 8px; margin: 0 auto;">
        <div style="display: grid; gap: 8px;">
          <p style="margin: 0; font-size: 14px;">Analyzing product...</p>
          <div class="loader" style="width: 100%; height: 4px; background: #f0f0f0; border-radius: 2px;">
            <div style="width: 60%; height: 100%; background: #4F46E5; border-radius: 2px; transition: width 0.3s ease;"></div>
          </div>
        </div>
      </div>
    `;
  } else if (text) {
    popupContent.innerHTML = `
      <div style="display: grid; gap: 12px;">
        <p style="margin: 0; font-size: 14px;">Searching for "${text}"...</p>
        <div class="loader" style="width: 100%; height: 4px; background: #f0f0f0; border-radius: 2px;">
          <div style="width: 60%; height: 100%; background: #4F46E5; border-radius: 2px; transition: width 0.3s ease;"></div>
        </div>
      </div>
    `;
  }

  // Position popup
  popup.style.top = `${position.top + window.scrollY + 32}px`;
  popup.style.left = `${position.left + window.scrollX}px`;
  popup.style.display = 'block';

  // Add to DOM if not already present
  if (!document.body.contains(popup)) {
    document.body.appendChild(popup);
  }
}

// Close popup handlers
popup.querySelector('#close-popup').addEventListener('click', () => {
  popup.style.display = 'none';
});

document.addEventListener('click', (e) => {
  if (!popup.contains(e.target)) {
    popup.style.display = 'none';
  }
});

// Initial image processing
processImages();

// Optional: Watch for dynamically loaded images
const observer = new MutationObserver((mutations) => {
  mutations.forEach(() => processImages());
});

observer.observe(document.body, {
  childList: true,
  subtree: true
});