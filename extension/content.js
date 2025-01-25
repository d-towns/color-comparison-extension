// content.js
let isSelectionMode = false;
let originalCursor = '';
let highlightedElement = null;

// Styles for visual feedback
const styles = `
.image-selector-highlight {
    outline: 3px solid #007bff !important;
    cursor: pointer !important;
}

.image-selector-selected {
    outline: 3px solid #28a745 !important;
}
`;

// Add styles to page
function injectStyles() {
    const styleSheet = document.createElement("style");
    styleSheet.textContent = styles;
    document.head.appendChild(styleSheet);
}

// Enable image selection mode
function enableSelectionMode() {
    console.log('Enabling selection mode');
    isSelectionMode = true;
    originalCursor = document.body.style.cursor;
    document.body.style.cursor = 'pointer';
    
    // Add hover effect listeners
    document.addEventListener('mouseover', handleMouseOver);
    document.addEventListener('mouseout', handleMouseOut);
    document.addEventListener('click', handleImageClick);
    
    console.log('Selection mode enabled');
}

// Disable image selection mode
function disableSelectionMode() {
    console.log('Disabling selection mode');
    isSelectionMode = false;
    document.body.style.cursor = originalCursor;
    
    // Remove hover effect listeners
    document.removeEventListener('mouseover', handleMouseOver);
    document.removeEventListener('mouseout', handleMouseOut);
    document.removeEventListener('click', handleImageClick);
    
    // Clean up any remaining highlights
    if (highlightedElement) {
        highlightedElement.classList.remove('image-selector-highlight');
        highlightedElement = null;
    }
    
    console.log('Selection mode disabled');
}

// Handle mouse over images
function handleMouseOver(event) {
    if (!isSelectionMode) return;
    
    const target = event.target;
    if (target.tagName === 'IMG') {
        target.classList.add('image-selector-highlight');
        highlightedElement = target;
    }
}

// Handle mouse leaving images
function handleMouseOut(event) {
    if (!isSelectionMode) return;
    
    const target = event.target;
    if (target.tagName === 'IMG') {
        target.classList.remove('image-selector-highlight');
        highlightedElement = null;
    }
}

// Handle image click
async function handleImageClick(event) {
    if (!isSelectionMode) return;
    console.log("image clicked in selection mode")
    const target = event.target;
    if (target.tagName === 'IMG') {
        event.preventDefault();
        event.stopPropagation();
        
        try {
            // Visual feedback
            target.classList.remove('image-selector-highlight');
            target.classList.add('image-selector-selected');
            
            // Get image data
            const imageData = await processSelectedImage(target);
            
            // Save to Chrome storage
            await saveToStorage(imageData);
            
            // Show success message
            showNotification('Image selected successfully!');

            chrome.runtime.sendMessage({
                action: "imageClicked",
                data: imageData
            });
            
            // Cleanup
            // setTimeout(() => {
            //     target.classList.remove('image-selector-selected');
            //     disableSelectionMode();
            // }, 1000);
            
        } catch (error) {
            console.error('Error processing image:', error);
            showNotification('Error selecting image. Please try again.', 'error');
        }
    }
}

// Process the selected image
async function processSelectedImage(imgElement) {
    console.log('Processing selected image:', imgElement.src);
    try {
        // Fetch image data
        
        return {
            url: imgElement.src,
            width: imgElement.naturalWidth,
            height: imgElement.naturalHeight,
            alt: imgElement.alt || '',
            timestamp: new Date().toISOString(),
        };
    } catch (error) {
        console.error('Error processing image:', error);
        throw error;
    }
}

// Save to Chrome storage
async function saveToStorage(imageData) {
    try {
        await chrome.runtime.sendMessage({
            action: "save",
            data: {
                key: "selectedImage",
                value: imageData
            }
        });
        console.log('Image saved to storage');
    } catch (error) {
        console.error('Error saving to storage:', error);
        throw error;
    }
}

// Show notification
function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 16px;
        border-radius: 4px;
        z-index: 10000;
        background-color: ${type === 'success' ? '#28a745' : '#dc3545'};
        color: white;
        font-family: Arial, sans-serif;
        box-shadow: 0 2px 5px rgba(0,0,0,0.2);
    `;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// Listen for messages from the extension
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'startImageSelection') {
        injectStyles();
        enableSelectionMode();
        sendResponse({ status: 'Selection mode enabled' });
    } else if (request.action === 'stopImageSelection') {
        // TODO: remove styles
        disableSelectionMode();
        sendResponse({ status: 'Selection mode disabled' });
    }
    return true;
});

// Initialize
injectStyles();