chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log("Received message:", message);
    console.log("Sender:", sender);
    console.log("SendResponse:", sendResponse);
    

    if (message.action === "save") {
        console.log("Attempting to save:", message.data);
        try {
            chrome.storage.local.set({ [message.data.key]: message.data.value });
            console.log("Successfully saved:", message.data.key);
            
            sendResponse({ success: true });
        } catch (error) {
            console.error("Error saving:", error);
            sendResponse({ success: false });
        }
        return true; // Keep the messaging channel open for async
    }
    else if (message.action === "get") {
        console.log("Attempting to get:", message.data.key);
        try {
            chrome.storage.local.get([message.data.key]).then((result) => {
                console.log("Retrieved data:", result);
                // console.log("Returning:", result[message.data.key]);
                // console.log("Sending response:", sendResponse);
                sendResponse({value: result[message.data.key]});
            });
        } catch (error) {
            console.error("Error retrieving:", error);
            sendResponse(null);
        }
        console.log("Returning true");
        return true; // Keep the messaging channel open for async
    }
    return true; // Keep the messaging channel open for async
});