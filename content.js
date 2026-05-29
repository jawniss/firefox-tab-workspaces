const BAR_HEIGHT = 40;
const TAB_HEIGHT = 18;

// Create the main bar
const bar = document.createElement("div");
bar.style.cssText = `
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: ${BAR_HEIGHT}px;
  background: #333;
  color: white;
  display: flex;
  align-items: center;
  padding: 0 10px;
  gap: 10px;
  z-index: 999999;
  transition: transform 0.2s ease;
`;

// Create the toggle tab
const toggleTab = document.createElement("div");
toggleTab.textContent = "▲ hide";
toggleTab.style.cssText = `
  position: fixed;
  top: ${BAR_HEIGHT}px;
  left: 50%;
  transform: translateX(-50%);
  background: #333;
  color: white;
  font-size: 11px;
  padding: 2px 10px;
  border-radius: 0 0 6px 6px;
  cursor: pointer;
  z-index: 999999;
  transition: top 0.2s ease;
  user-select: none;
`;

document.body.appendChild(bar);
document.body.appendChild(toggleTab);
document.body.style.marginTop = `${BAR_HEIGHT}px`;

// Toggle logic
let isVisible = true;

toggleTab.addEventListener("click", () => {
  isVisible = !isVisible;

  if (isVisible) {
    bar.style.transform = "translateY(0)";
    toggleTab.style.top = `${BAR_HEIGHT}px`;
    toggleTab.textContent = "▲ hide";
    document.body.style.marginTop = `${BAR_HEIGHT}px`;
  } else {
    bar.style.transform = `translateY(-${BAR_HEIGHT}px)`;
    toggleTab.style.top = "0px";
    toggleTab.textContent = "▼ show";
    document.body.style.marginTop = "0px";
  }
});

// Fetch and display tab groups
// May 29, 2026: Looks like Firefox has yet to expose tab group data
browser.runtime.sendMessage("getTabGroups").then(response => {
  if (response.groups.length === 0) {
    bar.innerHTML = "<span>No tab groups</span>";
    return;
  }

  response.groups.forEach(name => {
    const tag = document.createElement("span");
    tag.textContent = name;
    tag.style.cssText = `
      background: #555;
      padding: 2px 10px;
      border-radius: 10px;
      font-size: 13px;
    `;
    bar.appendChild(tag);
  });
});