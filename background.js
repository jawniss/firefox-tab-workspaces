const UNORGANIZED_ID = "unorganized";

async function getState() {
  const result = await browser.storage.local.get(["workspaces", "activeWorkspace"]);
  return {
    workspaces: result.workspaces || [],
    activeWorkspace: result.activeWorkspace || UNORGANIZED_ID
  };
}

async function saveState(workspaces, activeWorkspace) {
  await browser.storage.local.set({ workspaces, activeWorkspace });
}

// Tabs not belonging to any workspace
async function getUnorganizedTabIds(workspaces) {
  const allTabs = await browser.tabs.query({ currentWindow: true });
  const organizedIds = new Set(workspaces.flatMap(w => w.tabIds));
  return allTabs.filter(t => !organizedIds.has(t.id)).map(t => t.id);
}

// Always prepend the virtual Unorganized workspace
async function getFullState() {
    const { workspaces, activeWorkspace } = await getState();
    const allTabs = await browser.tabs.query({ currentWindow: true });
    const tabMap = new Map(allTabs.map(t => [t.id, { id: t.id, title: t.title, url: t.url, favIconUrl: t.favIconUrl }]));
  
    const unorganizedTabIds = await getUnorganizedTabIds(workspaces);
  
    const enrich = (ws) => ({
      ...ws,
      tabs: ws.tabIds.map(id => tabMap.get(id)).filter(Boolean)
    });
  
    return {
      workspaces: [
        enrich({ id: UNORGANIZED_ID, name: "Unorganized", tabIds: unorganizedTabIds }),
        ...workspaces.map(enrich)
      ],
      activeWorkspace
    };
  }

async function notifyTabs() {
  const state = await getFullState();
  const visibleTabs = await browser.tabs.query({ currentWindow: true, hidden: false });
  visibleTabs.forEach(tab => {
    browser.tabs.sendMessage(tab.id, { type: "stateUpdated", ...state }).catch(() => {});
  });
}

async function switchWorkspace(workspaceId) {
  const { workspaces, activeWorkspace } = await getState();
  if (workspaceId === activeWorkspace) return;

  // Compute target tab IDs
  let toShow;
  if (workspaceId === UNORGANIZED_ID) {
    toShow = await getUnorganizedTabIds(workspaces);
  } else {
    const target = workspaces.find(w => w.id === workspaceId);
    if (!target) return;
    toShow = target.tabIds;
  }

  // Compute tabs to hide (everything except target)
  const allTabs = await browser.tabs.query({ currentWindow: true });
  const toShowSet = new Set(toShow);
  const toHide = allTabs.filter(t => !toShowSet.has(t.id)).map(t => t.id);

  // If target workspace has no tabs, create one first
  if (toShow.length === 0) {
    const newTab = await browser.tabs.create({});
    // If switching to a named workspace, assign the new tab to it
    if (workspaceId !== UNORGANIZED_ID) {
      const idx = workspaces.findIndex(w => w.id === workspaceId);
      if (idx !== -1) workspaces[idx].tabIds.push(newTab.id);
    }
  } else {
    // Activate a target tab BEFORE hiding so Firefox never blocks the hide
    await browser.tabs.show(toShow);
    await browser.tabs.update(toShow[0], { active: true });
  }

  if (toHide.length) await browser.tabs.hide(toHide);

  await saveState(workspaces, workspaceId);
  await notifyTabs();
}

async function createWorkspace(name) {
  const { workspaces, activeWorkspace } = await getState();
  const id = "ws_" + Date.now();
  workspaces.push({ id, name, tabIds: [] });
  await saveState(workspaces, activeWorkspace);
  await switchWorkspace(id);
}

async function deleteWorkspace(workspaceId) {
  if (workspaceId === UNORGANIZED_ID) return; // can't delete Unorganized
  let { workspaces, activeWorkspace } = await getState();
  if (workspaces.length === 0) return;

  const target = workspaces.find(w => w.id === workspaceId);
  if (target?.tabIds.length) await browser.tabs.remove(target.tabIds);

  workspaces = workspaces.filter(w => w.id !== workspaceId);

  if (activeWorkspace === workspaceId) {
    await saveState(workspaces, UNORGANIZED_ID);
    await switchWorkspace(UNORGANIZED_ID);
  } else {
    await saveState(workspaces, activeWorkspace);
  }

  await notifyTabs();
}

// New tabs while on Unorganized stay unorganized (not added to any workspace)
// New tabs while on a named workspace get assigned to it
browser.tabs.onCreated.addListener(async (tab) => {
  const { workspaces, activeWorkspace } = await getState();
  if (activeWorkspace === UNORGANIZED_ID) return;
  const idx = workspaces.findIndex(w => w.id === activeWorkspace);
  if (idx !== -1 && !workspaces[idx].tabIds.includes(tab.id)) {
    workspaces[idx].tabIds.push(tab.id);
    await saveState(workspaces, activeWorkspace);
  }
});

browser.tabs.onRemoved.addListener(async (tabId) => {
  const { workspaces, activeWorkspace } = await getState();
  workspaces.forEach(w => { w.tabIds = w.tabIds.filter(id => id !== tabId); });
  await saveState(workspaces, activeWorkspace);
});

browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "getState") {
    getFullState().then(sendResponse);
    return true;
  }
  if (message.type === "switchWorkspace") {
    switchWorkspace(message.workspaceId).then(() => sendResponse({ ok: true }));
    return true;
  }
  if (message.type === "createWorkspace") {
    createWorkspace(message.name).then(() => sendResponse({ ok: true }));
    return true;
  }
  if (message.type === "closeTab") {
    browser.tabs.remove(message.tabId).then(() => sendResponse({ ok: true }));
    return true;
  }
  if (message.type === "deleteWorkspace") {
    deleteWorkspace(message.workspaceId).then(() => sendResponse({ ok: true }));
    return true;
  }
});