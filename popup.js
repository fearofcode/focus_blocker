document.addEventListener('DOMContentLoaded', () => {
  const input = document.getElementById('domainInput');
  const addBtn = document.getElementById('addBtn');
  const list = document.getElementById('domainList');

  // Load domains on startup
  loadDomains();

  // Add domain on button click
  addBtn.addEventListener('click', () => {
    const domain = input.value.trim().toLowerCase();
    if (domain) {
      addDomain(domain);
      input.value = '';
    }
  });

  // Add domain on Enter key
  input.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      const domain = input.value.trim().toLowerCase();
      if (domain) {
        addDomain(domain);
        input.value = '';
      }
    }
  });

  function loadDomains() {
    chrome.storage.sync.get(['blockedDomains'], (result) => {
      const domains = result.blockedDomains || [];
      renderList(domains);
    });
  }

  function addDomain(domain) {
    chrome.storage.sync.get(['blockedDomains'], (result) => {
      const domains = result.blockedDomains || [];
      if (!domains.includes(domain)) {
        domains.push(domain);
        chrome.storage.sync.set({ blockedDomains: domains }, () => {
          renderList(domains);
          updateBlockingRules(domains);
        });
      }
    });
  }

  function removeDomain(domain) {
    chrome.storage.sync.get(['blockedDomains'], (result) => {
      let domains = result.blockedDomains || [];
      domains = domains.filter(d => d !== domain);
      chrome.storage.sync.set({ blockedDomains: domains }, () => {
        renderList(domains);
        updateBlockingRules(domains);
      });
    });
  }

  function renderList(domains) {
    list.innerHTML = '';
    domains.forEach(domain => {
      const li = document.createElement('li');
      li.textContent = domain;
      
      const removeBtn = document.createElement('button');
      removeBtn.textContent = 'X';
      removeBtn.className = 'remove-btn';
      removeBtn.onclick = () => removeDomain(domain);
      
      li.appendChild(removeBtn);
      list.appendChild(li);
    });
  }

  // This function tells Chrome's Declarative Net Request API what to block
  async function updateBlockingRules(domains) {
    // 1. Get existing dynamic rules so we can remove them before adding new ones
    const oldRules = await chrome.declarativeNetRequest.getDynamicRules();
    const oldRuleIds = oldRules.map(rule => rule.id);

    // 2. Generate new rules based on the domain list
    // Syntax: ||domain.com^ blocks http://domain.com, https://sub.domain.com/path, etc.
    const newRules = domains.map((domain, index) => ({
      id: index + 1,
      priority: 1,
      action: { type: "block" },
      condition: { 
        urlFilter: `||${domain}^`, 
        resourceTypes: ["main_frame", "xmlhttprequest", "script", "image"] 
      }
    }));

    // 3. Apply the update
    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: oldRuleIds,
      addRules: newRules
    });
  }
});