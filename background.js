browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message === "getTabGroups") {
    browser.tabs.query({ currentWindow: true }).then(tabs => {
      const groups = [...new Set(
        tabs.map(tab => tab.groupName).filter(Boolean)
      )];
      sendResponse({ groups });
    });
    return true; // keeps the message channel open for async response
  }
});