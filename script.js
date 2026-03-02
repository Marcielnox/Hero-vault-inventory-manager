let vault = JSON.parse(localStorage.getItem("vault")) || [];
let editingItemId = null;
let itemMemory = JSON.parse(localStorage.getItem("itemMemory")) || {};


const elements = {
    form: document.getElementById("vault-form"),
    tableBody: document.getElementById("vault-table"),
    totalGoldEl: document.getElementById("total-value"),
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

const saveToDisk = () => localStorage.setItem("vault", JSON.stringify(vault));

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
    const { rarity: filterRarity, sort: sortType } = elements.filter;
    const searchTerm = elements.inputs.search.value.toLowerCase();

    let displayList = vault.filter(item => {
        const matchesRarity = filterRarity.value === "All" || item.rarity === filterRarity.value;
        const matchesSearch = item.name.toLowerCase().includes(searchTerm);
        return matchesRarity && matchesSearch; 
    });

    displayList.sort((a, b) => {
        switch (sortType.value) {
            case "NameAsc": return a.name.localeCompare(b.name);
            case "NameDesc": return b.name.localeCompare(a.name);
            case "ValueAsc": return (a.value || 0) - (b.value || 0);
            case "ValueDesc": return (b.value || 0) - (a.value || 0);
            default: return 0;
        }
    });

    const total = displayList.reduce((sum, item) => sum + ((item.value || 0) * item.quantity), 0);
    const artifactCount = displayList.filter(i => i.rarity === "Artifact").length;
    const artifactText = artifactCount === 1 ? "1 Artifact" : `${artifactCount} Artifacts`;
    
    
    elements.totalGoldEl.textContent = `${total.toLocaleString()} gp ${artifactCount > 0 ? `(excluding ${artifactText})` : ""}`;

    
    elements.tableBody.innerHTML = displayList.map(item => `
        <tr class="${item.id === editingItemId ? 'editing-row' : ''}" data-id="${item.id}">
            <td data-label="Name">${item.name}</td>
            <td data-label="Rarity" style="color:${getRarityColor(item.rarity)}; font-weight: bold;">${item.rarity}</td>
            <td data-label="Type">${item.type}</td>
            <td data-label="Value">${item.rarity === "Artifact" ? "?" : item.value.toLocaleString()}</td>
            <td data-label="Quantity">${item.quantity}</td>
            <td data-label="Actions">
                <button class="edit-btn">Edit</button>
                <button class="delete-btn">Delete</button>
                <button class="copy-btn" onclick="copyToClipboard(${item.id})">Copy</button>
            </td>
        </tr>
    `).join('');
}
function copyToClipboard(id) {
    const item = vault.find(i => i.id === id);
    const text = `📦 **${item.name}** (${item.rarity} | ${item.type}) \n💰 Value: ${item.value || '?'} gp | Qty: ${item.quantity}`;
    navigator.clipboard.writeText(text).then(() => {
        alert(`Copied ${item.name} to clipboard!`);
});
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
    if (item.name && item.rarity) {
        itemMemory[item.name.toLowerCase()] = {
            rarity: item.rarity,
            type: item.type,
            value: item.value
         };
        localStorage.setItem("itemMemory", JSON.stringify(itemMemory));
        updateDatalist();
    }

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
});

elements.tableBody.addEventListener("click", (e) => {
    const row = e.target.closest('tr');
    if (!row) return;
    const id = Number(row.dataset.id);
    const item = vault.find(i => i.id === id);

    if (e.target.classList.contains("delete-btn")) {
        vault = vault.filter(i => i.id !== id);
    } else if (e.target.classList.contains("edit-btn")) {
        editingItemId = id;
        
        elements.inputs.name.value = item.name;
        elements.inputs.rarity.value = item.rarity;
        elements.inputs.type.value = item.type;
        elements.inputs.value.value = item.value || "";
        elements.inputs.quantity.value = item.quantity;
        updateUIState();
    }
    saveToDisk();
    renderVault();
});

elements.inputs.name.addEventListener("input", (e) => {
    const found = itemDatabase.find(i => i.name === e.target.value);
    if (found) {
        elements.inputs.rarity.value = found.rarity;
        elements.inputs.type.value = found.type;
        elements.inputs.value.value = found.value !== null ? found.value : "";
        updateUIState();
    }
})

elements.inputs.rarity.addEventListener("change", updateUIState);
elements.inputs.search.addEventListener("input", renderVault);
elements.filter.rarity.addEventListener("change", renderVault);
elements.filter.sort.addEventListener("change", renderVault);   

renderVault();


document.getElementById("export-vault").addEventListener("click", () => {
    if (vault.length === 0) {
        alert("Your vault is empty! Add some loot before exporting.");
        return;
    }
    const dataStr = JSON.stringify(vault, null, 2);
    const dataBlob = new Blob([dataStr], {type: "application/json"});
    const url = URL.createObjectURL(dataBlob);

    const link = document.createElement("a");
    link.href = url;
    link.download= `hero-vault-${new Date().toISOString().split('T')[0]}.json`;
    link.click();

    URL.revokeObjectURL(url);
});

document.getElementById("import-vault").addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        try {
            const importedData = JSON.parse(event.target.result);

            if(Array.isArray(importedData)) {
                if (confirm("This will overwrite your current vault. Continue?")) {
                    vault = importedData;
                    saveToDisk();
                    renderVault();
                    alert("Vault loaded successfully!");
                }
            } else {
                alert("Invalid file format. Please upload a valid vault JSON.");
            }
        } catch (err) {
            alert("Error reading file. Make sure it's a valid .json file.");
        }
    };
    reader.readAsText(file);
});

document.getElementById("clear-vault").addEventListener("click", () => {
    if(vault.length === 0) return;
    const confirmation = confirm("⚠️ WARNING: This will permanently delete EVERY item in your vault. Are you sure?");
    if (confirmation) {
        vault = [];
        saveToDisk();
        renderVault();
        alert("Vault has been emptied.");
    }
});

const themeToggleBtn = document.getElementById("theme-toggle");
const themeIcon = document.getElementById("theme-icon");
const body = document.body;

if (localStorage.getItem("theme") === "dark") {
    body.classList.add("dark-mode");
    themeIcon.textContent = "☀️";
}
themeToggleBtn.addEventListener("click", () => {
    body.classList.toggle("dark-mode");
    const isDark = body.classList.contains("dark-mode");
    localStorage.setItem("theme", isDark ? "dark" : "light");
    themeIcon.textContent = isDark ? "☀️" : "🌙";
});

document.getElementById("footer-date").textContent = new Date().toLocaleDateString(undefined, { 
    year: 'numeric',
    month: 'long',
});

elements.inputs.name.addEventListener("input", (e) => {
    const inputName = e.target.value.toLowerCase();
    const remembered = itemMemory[inputName];
    if (remembered) {
        elements.inputs.rarity.value = remembered.rarity;
        elements.inputs.type.value = remembered.type;

        if (remembered.rarity !== "Artifact") {
            elements.inputs.value.value = remembered.value;
        } 
        updateUIState();
    }
})

function updateDatalist() {
    const list = document.getElementById("item-suggestions");
    const names = Object.keys(itemMemory);
    list.innerHTML = names.map( name => `<option value="${name.charAt(0).toUpperCase() + name.slice(1)}">` ).join('');
}
updateDatalist();