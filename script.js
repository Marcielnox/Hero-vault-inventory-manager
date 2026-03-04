const APP_VERSION = "1.2.0";

let allCharacters = JSON.parse(localStorage.getItem("allCharacters")) || { "Default": [] };
let activeCharacter = localStorage.getItem("activeCharacter") || "Default";
let vault = allCharacters[activeCharacter] || [];
let itemMemory = JSON.parse(localStorage.getItem("itemMemory")) || {};
let editingItemId = null;


const saveToDisk = () => {
    allCharacters[activeCharacter] = vault; 
    localStorage.setItem("allCharacters", JSON.stringify(allCharacters));
    localStorage.setItem("activeCharacter", activeCharacter);
    localStorage.setItem("itemMemory", JSON.stringify(itemMemory));
};


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



function renderCharacterTabs() {
    const names = Object.keys(allCharacters);
    elements.tabsContainer.innerHTML = names.map(name => `
        <div class="char-tab ${name === activeCharacter ? 'active' : ''}" onclick="switchCharacter('${name}')">
            <span>${name}</span>
            <small style="opacity: 0.7; font-size: 0.75rem;">(${allCharacters[name].length})</small>
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
    
    if (confirm(`⚠️ Are you sure you want to delete "${activeCharacter}"?`)) {
        delete allCharacters[activeCharacter];
        activeCharacter = Object.keys(allCharacters)[0];
        vault = allCharacters[activeCharacter];
        
        saveToDisk();
        renderCharacterTabs();
        renderVault();
    }
};



const getRarityColor = (rarity) => {
    const colors = {
        Common: "gray", Uncommon: "green", Rare: "blue", 
        "Very Rare": "purple", Legendary: "orange", Artifact: "red"
    };
    return colors[rarity] || "black";
};

function updateUIState() {
    const isArtifact = elements.inputs.rarity.value === "Artifact";
    elements.inputs.value.disabled = isArtifact;
    elements.inputs.value.placeholder = isArtifact ? "?" : "";
    if (isArtifact) elements.inputs.value.value = "";
}

function renderVault() {
    const filterRarity = elements.filter.rarity.value;
    const sortType = elements.filter.sort.value;
    const searchTerm = elements.inputs.search.value.toLowerCase();

    let displayList = vault.filter(item => {
        const matchesRarity = filterRarity === "All" || item.rarity === filterRarity;
        const matchesSearch = item.name.toLowerCase().includes(searchTerm);
        return matchesRarity && matchesSearch; 
    });

    
    displayList.sort((a, b) => {
        switch (sortType) {
            case "NameAsc": return a.name.localeCompare(b.name);
            case "NameDesc": return b.name.localeCompare(a.name);
            case "ValueAsc": return (a.value || 0) - (b.value || 0);
            case "ValueDesc": return (b.value || 0) - (a.value || 0);
            case "Rarity":
                const order = { "Artifact": 6, "Legendary": 5, "Very Rare": 4, "Rare": 3, "Uncommon": 2, "Common": 1 };
                return order[b.rarity] - order[a.rarity];
            default: return 0;
        }
    });

    const total = displayList.reduce((sum, item) => sum + ((item.value || 0) * item.quantity), 0);
    elements.totalGoldEl.textContent = `${total.toLocaleString()} gp`;

    elements.tableBody.innerHTML = displayList.map(item => `
        <tr data-id="${item.id}" class="${item.id === editingItemId ? 'editing-row' : ''}">
            <td data-label="Name">${item.name}</td>
            <td data-label="Rarity" style="color:${getRarityColor(item.rarity)}; font-weight: bold;">${item.rarity}</td>
            <td data-label="Type">${item.type}</td>
            <td data-label="Value">${item.rarity === "Artifact" ? "?" : (item.value || 0).toLocaleString()}</td>
            <td data-label="Qty">${item.quantity}</td>
            <td data-label="Actions">
                <button class="edit-btn">Edit</button>
                <button class="delete-btn">Delete</button>
            </td>
        </tr>
    `).join('');
}



elements.form.addEventListener("submit", (e) => {
    e.preventDefault();
    const { name, rarity, type, value, quantity } = elements.inputs;
    
    const item = {
        id: editingItemId || Date.now(),
        name: name.value.trim(),
        rarity: rarity.value,
        type: type.value.trim(),
        value: rarity.value === "Artifact" ? null : Number(value.value),
        quantity: Number(quantity.value)
    };

    
    itemMemory[item.name.toLowerCase()] = { rarity: item.rarity, type: item.type, value: item.value };

    if (editingItemId) {
        vault = vault.map(i => i.id === editingItemId ? item : i);
        editingItemId = null;
    } else {
        vault.push(item);
    }

    saveToDisk();
    elements.form.reset();
    updateUIState();
    renderVault(); 
    renderCharacterTabs(); 
});


elements.inputs.name.addEventListener("input", (e) => {
    const remembered = itemMemory[e.target.value.toLowerCase()];
    if (remembered) {
        elements.inputs.rarity.value = remembered.rarity;
        elements.inputs.type.value = remembered.type;
        elements.inputs.value.value = remembered.value || "";
        updateUIState();
    }
});



document.getElementById("export-vault").onclick = () => {
    
    const totalItems = Object.values(allCharacters).flat().length;
    if (totalItems === 0) return alert("All vaults are currently empty!");

   
    const dataStr = JSON.stringify(allCharacters, null, 2);
    const blob = new Blob([dataStr], {type: "application/json"});
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement("a");
    link.href = url;
   
    link.download = `hero-vault-MASTER-BACKUP-${new Date().toISOString().split('T')[0]}.json`;
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};

document.getElementById("import-vault").onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
        try {
            const importedData = JSON.parse(event.target.result);
            
            if (importedData && typeof importedData === 'object' && !Array.isArray(importedData)) {
               
                if (confirm("This is a Master Backup. It will replace ALL current characters. Proceed?")) {
                    allCharacters = importedData;
                    activeCharacter = Object.keys(allCharacters)[0];
                    vault = allCharacters[activeCharacter];
                }
            } else if (Array.isArray(importedData)) {
                const charName = prompt("Importing single character. Give them a name:", "Imported Hero");
                if (charName) {
                    allCharacters[charName] = importedData;
                    activeCharacter = charName;
                    vault = allCharacters[activeCharacter];
                }
            }

            saveToDisk();
            renderCharacterTabs();
            renderVault();
            alert("Import Successful!");
        } catch (err) { 
            alert("Error: The file is not a valid Hero Vault JSON."); 
        }
    };
    reader.readAsText(file);
};

document.getElementById("theme-toggle").onclick = () => {
    document.body.classList.toggle("dark-mode");
    const isDark = document.body.classList.contains("dark-mode");
    localStorage.setItem("theme", isDark ? "dark" : "light");
    document.getElementById("theme-icon").textContent = isDark ? "☀️" : "🌙";
};



elements.tableBody.onclick = (e) => {
    const row = e.target.closest('tr');
    if (!row) return;
    const id = Number(row.dataset.id);
    const item = vault.find(i => i.id === id);

    if (e.target.classList.contains("delete-btn")) {
        if(confirm("Destroy this loot?")) {
            vault = vault.filter(i => i.id !== id);
            saveToDisk();
            renderVault();
            renderCharacterTabs();
        }
    } else if (e.target.classList.contains("edit-btn")) {
        editingItemId = id;
        elements.inputs.name.value = item.name;
        elements.inputs.rarity.value = item.rarity;
        elements.inputs.type.value = item.type;
        elements.inputs.value.value = item.value || "";
        elements.inputs.quantity.value = item.quantity;
        updateUIState();
        window.scrollTo({ top: 0, behavior: 'smooth' });
        renderVault();
    }
};



function init() {
    const versionTag = document.getElementById("version-tag");
    if(versionTag) versionTag.textContent = APP_VERSION;
    
    document.getElementById("footer-date").textContent = new Date().getFullYear();

    if (localStorage.getItem("theme") === "dark") {
        document.body.classList.add("dark-mode");
        document.getElementById("theme-icon").textContent = "☀️";
    }

    
    renderCharacterTabs();
    renderVault();
    updateUIState();
}


elements.inputs.search.addEventListener("input", renderVault);
elements.filter.rarity.addEventListener("change", renderVault);
elements.filter.sort.addEventListener("change", renderVault);
elements.inputs.rarity.addEventListener("change", updateUIState);

init();
