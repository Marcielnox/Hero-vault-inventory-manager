const APP_VERSION = "1.2.1";

let allCharacters = JSON.parse(localStorage.getItem("allCharacters")) || { "Default": [] };
let activeCharacter = localStorage.getItem("activeCharacter") || "Default";
let vault = allCharacters[activeCharacter] || [];
let editingItemId = null;
let itemCompendium = [];


async function loadCompendium() {
    try {
        const response = await fetch("compendium.json");
        itemCompendium = await response.json();
        populateSuggestions();
    } catch (err) {
        console.error("Master JSON not found. Suggestions disabled.", err);
    }
}

function populateSuggestions() {
    const list = document.getElementById("item-suggestions");
    if (list) {
        list.innerHTML = itemCompendium.map(item => `<option value="${item.name}">`).join('');
    }
}


loadCompendium();

const elements = {
    form: document.getElementById("vault-form"),
    tableBody: document.getElementById("vault-table"),
    totalGoldEl: document.getElementById("total-value"),
    tabsContainer: document.getElementById("tabs-list"),
    inputs: {
        name: document.getElementById("name"),
        rarity: document.getElementById("rarity"),
        type: document.getElementById("type"),
        value: document.getElementById("value"),
        quantity: document.getElementById("quantity"),
        search: document.getElementById("search")
    },
    filter: {
        rarity: document.getElementById("filter"),
        sort: document.getElementById("sort")
    }
};

const saveToDisk = () => {
    allCharacters[activeCharacter] = vault;
    localStorage.setItem("allCharacters", JSON.stringify(allCharacters));
    localStorage.setItem("activeCharacter", activeCharacter);
};

const getRarityColor = (rarity) => {
    const colors = {
        Common: "#a0a0a0", 
        Uncommon: "#2ecc71", 
        Rare: "#3498db", 
        "Very Rare": "#9b59b6", 
        Legendary: "#f1c40f", 
        Artifact: "#e74c3c"
    };
    return colors[rarity] || "inherit";
};


document.getElementById("add-character-btn").onclick = () => {
    const name = prompt("Enter new Character or Campaign name:");
    if (name && !allCharacters[name]) {
        allCharacters[name] = [];
        switchCharacter(name);
    } else if (name) {
        alert("That name already exists!");
    }
};

document.getElementById("rename-character-btn").onclick = () => {
    const newName = prompt(`Rename "${activeCharacter}" to:`, activeCharacter);
    if (newName && newName !== activeCharacter) {
        if (allCharacters[newName]) return alert("Name already exists!");
        allCharacters[newName] = allCharacters[activeCharacter];
        delete allCharacters[activeCharacter];
        activeCharacter = newName;
        saveToDisk();
        renderCharacterTabs();
    }
};

document.getElementById("delete-character-btn").onclick = () => {
    const names = Object.keys(allCharacters);
    if (names.length <= 1) return alert("You must have at least one character!");
    if (confirm(`⚠️ Delete "${activeCharacter}" and all its loot?`)) {
        delete allCharacters[activeCharacter];
        activeCharacter = Object.keys(allCharacters)[0];
        vault = allCharacters[activeCharacter];
        saveToDisk();
        renderCharacterTabs();
        renderVault();
    }
};

function renderCharacterTabs() {
    elements.tabsContainer.innerHTML = Object.keys(allCharacters).map(name => `
        <div class="char-tab ${name === activeCharacter ? 'active' : ''}" onclick="switchCharacter('${name}')">
            ${name} <small>(${allCharacters[name].length})</small>
        </div>
    `).join('');
}

window.switchCharacter = (name) => {
    allCharacters[activeCharacter] = vault;
    activeCharacter = name;
    vault = allCharacters[activeCharacter] || [];
    saveToDisk();
    renderCharacterTabs();
    renderVault();
};


function renderVault() {
    const filterRarity = elements.filter.rarity.value;
    const searchTerm = elements.inputs.search.value.toLowerCase();

    let displayList = vault.filter(item => {
        const matchesRarity = filterRarity === "All" || item.rarity === filterRarity;
        const matchesSearch = item.name.toLowerCase().includes(searchTerm);
        return matchesRarity && matchesSearch;
    });

    const total = displayList.reduce((sum, item) => sum + ((item.value || 0) * item.quantity), 0);
    elements.totalGoldEl.textContent = `${total.toLocaleString()} gp`;

    elements.tableBody.innerHTML = displayList.map(item => {
        const isArtifact = item.rarity && item.rarity.toLowerCase() === "artifact";
        const rowClass = isArtifact ? "item-row artifact" : "item-row";
        
        return `
    <tr class="${rowClass}" data-id="${item.id}" onclick="toggleExpand(${item.id})">
        <td>${item.name}</td>
        <td style="color:${getRarityColor(item.rarity)}; font-weight:bold;">${item.rarity}</td>
        <td>${item.type}</td>
        <td>${(item.value || 0).toLocaleString()}</td>
        <td>${item.quantity}</td>
        <td>
            <button type="button" class="util-btn edit-btn">Edit</button>
            <button type="button" class="danger-btn delete-btn">Del</button>
        </td>
    </tr>
<tr class="detail-row" id="detail-${item.id}" style="display: none;">
    <td colspan="6">
        <div class="detail-content">
            <p><strong>Description:</strong> ${item.description || "No description available."}</p>
            <p><strong>Action/Function:</strong> <em>${item.action || "N/A"}</em></p>
        </div>
    </td>
</tr>`;
    }).join('');
}


elements.form.onsubmit = (e) => {
    e.preventDefault();

    const selected = itemCompendium.find(i => i.name === elements.inputs.name.value);

    const item = {
        id: editingItemId || Date.now(),
        name: elements.inputs.name.value,
        rarity: elements.inputs.rarity.value,
        type: elements.inputs.type.value,
        value: Number(elements.inputs.value.value) || 0,
        quantity: Number(elements.inputs.quantity.value) || 1,
        description: selected ? selected.description : "No description available.",
        action: selected ? selected.action : "N/A"
    };

    if (editingItemId) {
        vault = vault.map(i => i.id === editingItemId ? item : i);
        editingItemId = null;
    } else {
        vault.push(item);
    }

    saveToDisk();
    elements.form.reset();
    renderVault();
    renderCharacterTabs();
};


elements.inputs.name.addEventListener("change", () => {
    const itemName = elements.inputs.name.value;
    const foundItem = itemCompendium.find(i => i.name === itemName);
    if (foundItem) {
        elements.inputs.rarity.value = foundItem.rarity;
        elements.inputs.type.value = foundItem.type;
        elements.inputs.value.value = foundItem.value;
    }
});


document.getElementById("vault-table").addEventListener("click", (e) => {
    const target = e.target;
    
    
    const btn = target.closest('button');
    if (!btn) return;
    
    const row = target.closest(".item-row");
    if (!row) return;

    const id = Number(row.dataset.id);
    e.stopPropagation(); 

  
    if (btn.classList.contains("delete-btn")) {
        if (confirm("Are you sure you want to destroy this item?")) {
            vault = vault.filter(i => i.id !== id);
            saveToDisk();
            renderVault();
            renderCharacterTabs();
        }
    } 
    

    else if (btn.classList.contains("edit-btn")) {
        const item = vault.find(i => i.id === id);
        if (item) {
            editingItemId = id;
            elements.inputs.name.value = item.name;
            elements.inputs.rarity.value = item.rarity;
            elements.inputs.type.value = item.type;
            elements.inputs.value.value = item.value;
            elements.inputs.quantity.value = item.quantity;
            
            
            window.scrollTo({ top: 0, behavior: 'smooth' });
            elements.inputs.name.focus();
            
           
            document.getElementById("add-item").textContent = "Update Item";
        }
    }
});

window.toggleExpand = (id) => {
    const detailRow = document.getElementById(`detail-${id}`);
    if (!detailRow) return;
    
    const isVisible = detailRow.style.display === "table-row";

    document.querySelectorAll(".detail-row").forEach(row => row.style.display = "none");
    document.querySelectorAll(".item-row").forEach(row => row.classList.remove("expanded"));

    if (!isVisible) {
        detailRow.style.display = "table-row";
        const mainRow = document.querySelector(`.item-row[data-id="${id}"]`);
        if (mainRow) mainRow.classList.add("expanded");
    }
};

document.getElementById("theme-toggle").onclick = () => {
    document.body.classList.toggle("dark-mode");
    const isDark = document.body.classList.contains("dark-mode");
    localStorage.setItem("theme", isDark ? "dark" : "light");
    document.getElementById("theme-icon").textContent = isDark ? "☀️" : "🌙";
};

const clearBtn = document.getElementById("clear-vault");
if (clearBtn) {
    clearBtn.onclick = () => {
        if (vault.length === 0) return alert("The vault is already empty!");
        if (confirm(`⚠️ Delete ALL items for ${activeCharacter}?`)) {
            vault = []; 
            saveToDisk(); 
            renderVault(); 
            renderCharacterTabs(); 
        }
    };
}


const versionTag = document.getElementById("version-tag");
if (versionTag) versionTag.textContent = APP_VERSION;


const exportBtn = document.getElementById("export-vault");
if (exportBtn) {
    exportBtn.addEventListener('click', () => {
        const dataStr = JSON.stringify(allCharacters, null, 2);
        const blob = new Blob([dataStr], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement("a");
        link.href = url;
        link.download = `vault-backup-${new Date().toLocaleDateString().replace(/\//g, '-')}.json`;
        link.click();
        URL.revokeObjectURL(url);
        console.log("Vault exported successfully.");
    });
}


const importInput = document.getElementById("import-vault");
if (importInput) {
    importInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const importedData = JSON.parse(event.target.result);
                
                if (importedData && typeof importedData === 'object') {
                    allCharacters = importedData;
                    activeCharacter = Object.keys(allCharacters)[0];
                    vault = allCharacters[activeCharacter];
                    
                    saveToDisk();
                    renderCharacterTabs();
                    renderVault();
                    alert("Success: All character vaults restored!");
                }
            } catch (err) {
                alert("Error: The file is corrupted or not a valid JSON.");
            }
        };
        reader.readAsText(file);
    });
}


elements.inputs.search.addEventListener("input", renderVault);
elements.filter.rarity.addEventListener("change", renderVault);


if (localStorage.getItem("theme") === "dark") {
    document.body.classList.add("dark-mode");
    document.getElementById("theme-icon").textContent = "☀️";
}
const initExport = () => {
    const exportBtn = document.getElementById("export-vault");
    if (!exportBtn) return;
    
    exportBtn.onclick = () => {
        const dataStr = JSON.stringify(allCharacters, null, 2);
        const blob = new Blob([dataStr], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `vault-backup-${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        URL.revokeObjectURL(url);
    };
};

initExport();

renderCharacterTabs();
renderVault();
