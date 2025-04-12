function SaveOptions(e) {
  e.preventDefault();
  
  const NewsAPIKey = document.querySelector("#NewsAPIKey").value.trim();
  
  // error when no key
  if (!NewsAPIKey) {
    ShowMessage("Please enter an API key", "error");
    return;
  }

  // save to local
  chrome.storage.local.set({ "NewsAPIKey": NewsAPIKey }, function() {
    if (chrome.runtime.lastError) {
      console.error("Error saving options:", chrome.runtime.lastError);
      ShowMessage("Error saving API key. Please try again.", "error");
    } else {
      console.log("API key saved successfully:", NewsAPIKey);
      ShowMessage("API key saved successfully!", "success");
      RestoreOptions();
    }
  });
}

function RestoreOptions() {
  chrome.storage.local.get("NewsAPIKey", function(data) {
    if (chrome.runtime.lastError) {
      console.error("Error retrieving options:", chrome.runtime.lastError);
      ShowMessage("Error retrieving API key. Please try again.", "error");
    } else if (data.NewsAPIKey) {
      document.querySelector("#NewsAPIKey").value = data.NewsAPIKey;
    }
  });
}

function ShowMessage(message, type) {
  // remove any existing message
  const existingMessage = document.querySelector(".message");
  if (existingMessage) {
    existingMessage.remove();
  }

  // Create and show new message
  const messageDiv = document.createElement("div");
  messageDiv.className = `message ${type}`;
  messageDiv.textContent = message;
  
  const form = document.querySelector("form");
  form.insertBefore(messageDiv, form.firstChild);

  // remove after 3 secs
  setTimeout(() => {
    messageDiv.remove();
  }, 3000);
}

// red and green for notis
const style = document.createElement("style");
style.textContent = `
  .message {
    padding: 10px;
    margin-bottom: 10px;
    border-radius: 4px;
  }
  .success {
    background-color: #d4edda;
    color: #155724;
    border: 1px solid #c3e6cb;
  }
  .error {
    background-color: #f8d7da;
    color: #721c24;
    border: 1px solid #f5c6cb;
  }
`;
document.head.appendChild(style);

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', RestoreOptions);
document.querySelector("form").addEventListener("submit", SaveOptions);