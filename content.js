const BAR_HEIGHT = 40;

// --- Shadow DOM host for the bar ---
const shadowHost = document.createElement("div");
shadowHost.style.cssText = `
  position: fixed;
  top: 0; left: 0;
  width: 100%;
  height: ${BAR_HEIGHT}px;
  z-index: 999999;
`;
const shadow = shadowHost.attachShadow({ mode: "open" });

const style = document.createElement("style");
style.textContent = `
  *:not(style) { all: unset; box-sizing: border-box; }

  #bar {
    display: flex;
    align-items: center;
    width: 100%;
    height: ${BAR_HEIGHT}px;
    background: #1e1e2e;
    color: white;
    padding: 0 10px;
    gap: 6px;
    font-family: sans-serif;
    font-size: 13px;
    transition: transform 0.2s ease;
  }

  button {
    border-radius: 6px;
    padding: 4px 12px;
    cursor: pointer;
    font-size: 13px;
    font-family: sans-serif;
    color: white;
    border: none;
  }
`;
shadow.appendChild(style);

const bar = document.createElement("div");
bar.id = "bar";
shadow.appendChild(bar);

// --- Toggle tab ---
const toggleTab = document.createElement("div");
toggleTab.textContent = "▲ hide";
toggleTab.style.cssText = `
  all: unset;
  position: fixed;
  top: ${BAR_HEIGHT}px;
  left: 50%;
  transform: translateX(-50%);
  background: #1e1e2e;
  color: white;
  font-size: 11px;
  font-family: sans-serif;
  padding: 2px 10px;
  border-radius: 0 0 6px 6px;
  cursor: pointer;
  z-index: 999999;
  transition: top 0.2s ease;
  user-select: none;
`;

// --- Context menu ---
const contextMenu = document.createElement("div");
contextMenu.style.cssText = `
  position: fixed;
  background: #2a2a3e;
  border: 1px solid #444;
  border-radius: 8px;
  padding: 6px 0;
  z-index: 9999999;
  min-width: 220px;
  max-width: 320px;
  max-height: 400px;
  overflow-y: auto;
  box-shadow: 0 4px 16px rgba(0,0,0,0.5);
  display: none;
  font-family: sans-serif;
`;

document.body.appendChild(shadowHost);
document.body.appendChild(toggleTab);
document.body.appendChild(contextMenu);
document.body.style.marginTop = `${BAR_HEIGHT}px`;

// Close context menu when clicking outside
document.addEventListener("click", () => contextMenu.style.display = "none");
contextMenu.addEventListener("click", e => e.stopPropagation());

// --- Context menu content ---
function showContextMenu(e, ws) {
  e.preventDefault();
  contextMenu.innerHTML = "";

  // Header
  const header = document.createElement("div");
  header.textContent = ws.name;
  header.style.cssText = `
    padding: 4px 12px 8px;
    color: #aaa;
    font-size: 11px;
    border-bottom: 1px solid #444;
    margin-bottom: 4px;
    font-weight: bold;
  `;
  contextMenu.appendChild(header);

  // Tab list
  if (ws.tabs.length === 0) {
    const empty = document.createElement("div");
    empty.textContent = "No tabs";
    empty.style.cssText = "padding: 8px 12px; color: #666; font-size: 12px;";
    contextMenu.appendChild(empty);
  }

  ws.tabs.forEach(tab => {
    const row = document.createElement("div");
    row.style.cssText = `
      display: flex;
      align-items: center;
      padding: 5px 8px;
      gap: 6px;
      border-radius: 4px;
      margin: 0 4px;
      cursor: default;
    `;
    row.addEventListener("mouseenter", () => row.style.background = "#3a3a4e");
    row.addEventListener("mouseleave", () => row.style.background = "transparent");

    const icon = document.createElement("img");
    icon.src = tab.favIconUrl || "";
    icon.style.cssText = `
      width: 14px;
      height: 14px;
      flex-shrink: 0;
      border-radius: 2px;
      object-fit: contain;
    `;
    icon.addEventListener("error", () => icon.style.display = "none");

    const title = document.createElement("span");
    title.textContent = tab.title || tab.url || "Untitled";
    title.style.cssText = `
      flex: 1;
      font-size: 12px;
      color: white;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    `;

    const closeBtn = document.createElement("button");
    closeBtn.textContent = "✕";
    closeBtn.style.cssText = `
      background: transparent;
      border: none;
      color: #666;
      cursor: pointer;
      font-size: 11px;
      padding: 2px 5px;
      border-radius: 3px;
      flex-shrink: 0;
    `;
    closeBtn.addEventListener("mouseenter", () => closeBtn.style.color = "#ff6b6b");
    closeBtn.addEventListener("mouseleave", () => closeBtn.style.color = "#666");
    closeBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      browser.runtime.sendMessage({ type: "closeTab", tabId: tab.id });
      row.remove();
    });

    row.appendChild(icon);
    row.appendChild(title);
    row.appendChild(closeBtn);
    contextMenu.appendChild(row);
  });

  // Delete workspace option (not for Unorganized)
  if (ws.id !== "unorganized") {
    const divider = document.createElement("div");
    divider.style.cssText = "border-top: 1px solid #444; margin: 6px 0 2px;";
    contextMenu.appendChild(divider);

    const deleteBtn = document.createElement("div");
    deleteBtn.textContent = "🗑 Delete workspace";
    deleteBtn.style.cssText = `
      padding: 6px 12px;
      color: #ff6b6b;
      font-size: 12px;
      cursor: pointer;
      border-radius: 4px;
      margin: 0 4px;
    `;
    deleteBtn.addEventListener("mouseenter", () => deleteBtn.style.background = "#3a3a4e");
    deleteBtn.addEventListener("mouseleave", () => deleteBtn.style.background = "transparent");
    deleteBtn.addEventListener("click", () => {
      contextMenu.style.display = "none";
      if (confirm(`Delete workspace "${ws.name}"? Its tabs will be closed.`)) {
        browser.runtime.sendMessage({ type: "deleteWorkspace", workspaceId: ws.id });
      }
    });
    contextMenu.appendChild(deleteBtn);
  }

  // Position near cursor, keeping menu on screen
  contextMenu.style.display = "block";
  const rect = contextMenu.getBoundingClientRect();
  const x = Math.min(e.clientX, window.innerWidth - rect.width - 8);
  const y = Math.min(e.clientY, window.innerHeight - rect.height - 8);
  contextMenu.style.left = `${x}px`;
  contextMenu.style.top = `${y}px`;
}

// --- Toggle logic ---
let isVisible = true;
toggleTab.addEventListener("click", () => {
  isVisible = !isVisible;
  bar.style.transform = isVisible ? "translateY(0)" : `translateY(-${BAR_HEIGHT}px)`;
  toggleTab.style.top = isVisible ? `${BAR_HEIGHT}px` : "0px";
  toggleTab.textContent = isVisible ? "▲ hide" : "▼ show";
  document.body.style.marginTop = isVisible ? `${BAR_HEIGHT}px` : "0px";
});

// --- Render workspaces ---
function renderBar(workspaces, activeWorkspace) {
  bar.innerHTML = "";

  workspaces.forEach(ws => {
    const btn = document.createElement("button");
    btn.textContent = ws.name;
    const isActive = ws.id === activeWorkspace;
    const isUnorganized = ws.id === "unorganized";
    btn.style.cssText = `
      background: ${isActive ? "#7c3aed" : isUnorganized ? "#2a2a3e" : "#3a3a4e"};
      color: ${isUnorganized && !isActive ? "#aaa" : "white"};
      border: ${isUnorganized ? "1px solid #444" : "none"};
      border-radius: 6px;
      padding: 4px 12px;
      cursor: pointer;
      font-size: 13px;
      font-family: sans-serif;
    `;
    btn.addEventListener("mouseenter", () => {
      if (!isActive) btn.style.background = "#52526e";
    });
    btn.addEventListener("mouseleave", () => {
      if (!isActive) btn.style.background = isUnorganized ? "#2a2a3e" : "#3a3a4e";
    });
    btn.addEventListener("click", () => {
      browser.runtime.sendMessage({ type: "switchWorkspace", workspaceId: ws.id });
    });
    btn.addEventListener("contextmenu", (e) => showContextMenu(e, ws));

    bar.appendChild(btn);
  });

  // New workspace button
  const addBtn = document.createElement("button");
  addBtn.textContent = "+ New";
  addBtn.style.cssText = `
    background: transparent;
    color: #aaa;
    border: 1px dashed #555;
    border-radius: 6px;
    padding: 4px 10px;
    cursor: pointer;
    font-size: 13px;
    font-family: sans-serif;
  `;
  addBtn.addEventListener("click", () => {
    const name = prompt("Workspace name:");
    if (name?.trim()) {
      browser.runtime.sendMessage({ type: "createWorkspace", name: name.trim() });
    }
  });
  bar.appendChild(addBtn);
}

// Initial load
browser.runtime.sendMessage({ type: "getState" }).then(({ workspaces, activeWorkspace }) => {
  renderBar(workspaces, activeWorkspace);
});

// Listen for updates
browser.runtime.onMessage.addListener((message) => {
  if (message.type === "stateUpdated") {
    renderBar(message.workspaces, message.activeWorkspace);
  }
});
