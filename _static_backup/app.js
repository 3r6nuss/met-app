// Initial Data based on the image
const initialInventory = [
    // Column 1
    { id: 1, name: 'Aramidfaser', current: 23356, target: 75000, category: 'Materials' },
    { id: 2, name: 'E-Schrott', current: 89605, target: 400000, category: 'Materials' },
    { id: 3, name: 'Kohle', current: 126054, target: 100000, category: 'Materials' },
    { id: 4, name: 'S-Pulver', current: 68925, target: 250000, category: 'Materials' },
    { id: 5, name: 'Eisen', current: 111384, target: 50000, category: 'Materials' },
    { id: 6, name: 'Stahl', current: 3332, target: 50000, category: 'Materials' },
    { id: 7, name: 'Pistol Clip', current: 519, target: 10000, category: 'Ammo' },
    { id: 8, name: 'SMG-Clip', current: 318, target: 0, category: 'Ammo' },
    { id: 9, name: 'Bandage', current: 3898, target: 0, category: 'Medical' },
    { id: 10, name: 'Weste', current: 7041, target: 5000, category: 'Gear' },

    // Column 2
    { id: 11, name: 'Weintrauben Rot', current: 7362, target: null, category: 'Food' },
    { id: 12, name: 'Weintrauben Grün', current: 18548, target: null, category: 'Food' },
    { id: 13, name: 'Rotwein Kiste', current: 2333, target: null, category: 'Food' },
    { id: 14, name: 'Weißwein Kiste', current: 4880, target: null, category: 'Food' },
    { id: 15, name: 'Tabak Blatt', current: 18954, target: null, category: 'Misc' },
    { id: 16, name: 'Tabak', current: 6923, target: null, category: 'Misc' },

    // Column 3
    { id: 17, name: 'Platine', current: 128325, target: 100000, category: 'Materials' },
    { id: 18, name: 'Karotten', current: 1290, target: null, category: 'Food' },
    { id: 19, name: 'Kopfsalat', current: 9215, target: null, category: 'Food' },
    { id: 20, name: 'Zwiebeln', current: 1054, target: null, category: 'Food' },
    { id: 21, name: 'Kartoffeln', current: 8963, target: null, category: 'Food' },
    { id: 22, name: 'Gurken', current: 8366, target: null, category: 'Food' },
    { id: 23, name: 'Weizen', current: 796, target: 500, category: 'Food' }, // Special alert in image
    { id: 24, name: 'Ei', current: 178, target: null, category: 'Food' },
    { id: 25, name: 'Fleisch', current: 74, target: null, category: 'Food' },
    { id: 26, name: 'Milch', current: 55, target: null, category: 'Food' },
    { id: 27, name: 'Dünger', current: 8295, target: null, category: 'Farming' },
    { id: 28, name: 'Repkit', current: 100, target: null, category: 'Tools' },
    { id: 29, name: 'Medikit', current: 80, target: null, category: 'Medical' },
];

let inventory = [...initialInventory];
let isEditMode = false;

// DOM Elements
const inventoryGrid = document.getElementById('inventory-grid');
const checkInForm = document.getElementById('check-in-form');
const productSelect = document.getElementById('product-select');
const verifyBtn = document.getElementById('verify-btn');
const adjustBtn = document.getElementById('adjust-btn');
const userNameInput = document.getElementById('user-name');

// Initialize
function init() {
    populateProductSelect();
    renderInventory();
    setupEventListeners();
}

function populateProductSelect() {
    productSelect.innerHTML = '<option value="">Produkt wählen...</option>';
    inventory.sort((a, b) => a.name.localeCompare(b.name)).forEach(item => {
        const option = document.createElement('option');
        option.value = item.id;
        option.textContent = item.name;
        productSelect.appendChild(option);
    });
}

function renderInventory() {
    inventoryGrid.innerHTML = '';

    // Split into 3 columns for display (simulating the image layout)
    const chunkSize = Math.ceil(inventory.length / 3);
    const columns = [
        inventory.slice(0, 10), // Manual split to match image roughly
        inventory.slice(10, 16),
        inventory.slice(16)
    ];

    columns.forEach((colItems, colIndex) => {
        const colDiv = document.createElement('div');
        colDiv.className = 'flex flex-col gap-2';

        // Header
        colDiv.innerHTML = `
            <div class="grid grid-cols-[2fr_1fr_1fr] gap-2 p-3 bg-slate-800/50 rounded-t-lg font-bold text-slate-300 text-sm uppercase tracking-wider">
                <div>Artikel</div>
                <div class="text-right">Bestand</div>
                <div class="text-right">Soll</div>
            </div>
        `;

        colItems.forEach(item => {
            const row = document.createElement('div');
            row.className = `grid grid-cols-[2fr_1fr_1fr] gap-2 p-3 border-b border-slate-700/50 items-center table-row-hover transition-colors ${getStatusColor(item)}`;

            // Edit mode inputs or text
            const currentDisplay = isEditMode
                ? `<input type="number" value="${item.current}" class="w-full bg-slate-900/50 border border-slate-600 rounded px-2 py-1 text-right text-sm focus:border-violet-500 outline-none" onchange="updateStock(${item.id}, this.value)">`
                : `<span class="font-mono font-medium">${item.current.toLocaleString()}</span>`;

            const targetDisplay = item.target !== null
                ? `<span class="text-slate-400 text-sm">${item.target.toLocaleString()}</span>`
                : '<span class="text-slate-600">-</span>';

            row.innerHTML = `
                <div class="font-medium text-slate-200">${item.name}</div>
                <div class="text-right">${currentDisplay}</div>
                <div class="text-right">${targetDisplay}</div>
            `;
            colDiv.appendChild(row);
        });

        inventoryGrid.appendChild(colDiv);
    });
}

function getStatusColor(item) {
    if (item.target && item.current < item.target * 0.2) return 'bg-red-500/10 text-red-200'; // Critical
    if (item.target && item.current < item.target) return 'bg-amber-500/10 text-amber-200'; // Low
    return 'bg-emerald-500/5 text-emerald-200'; // Good
}

function updateStock(id, newValue) {
    const item = inventory.find(i => i.id === id);
    if (item) {
        item.current = parseInt(newValue) || 0;
        // Re-render handled by toggle to avoid losing focus, or we can just let it stay
    }
}

function setupEventListeners() {
    // Check-in Form
    checkInForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const productId = parseInt(productSelect.value);
        const quantity = parseInt(document.getElementById('quantity').value);

        if (productId && quantity) {
            const item = inventory.find(i => i.id === productId);
            if (item) {
                item.current += quantity;
                renderInventory();
                checkInForm.reset();
                showNotification(`Eingelagert: ${quantity}x ${item.name}`, 'success');
            }
        }
    });

    // Verification
    verifyBtn.addEventListener('click', () => {
        const name = userNameInput.value.trim();
        if (!name) {
            showNotification('Bitte Namen eingeben!', 'error');
            return;
        }
        showNotification(`Lagerliste bestätigt von ${name}`, 'success');
        isEditMode = false;
        renderInventory();
    });

    // Adjust Mode
    adjustBtn.addEventListener('click', () => {
        const name = userNameInput.value.trim();
        if (!name) {
            showNotification('Bitte Namen eingeben um zu bearbeiten!', 'error');
            return;
        }
        isEditMode = !isEditMode;
        adjustBtn.textContent = isEditMode ? 'Fertig' : 'Liste Anpassen';
        adjustBtn.className = isEditMode
            ? 'px-6 py-2 rounded-lg bg-violet-600 hover:bg-violet-700 text-white font-medium transition-all shadow-lg shadow-violet-500/20'
            : 'px-6 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-white font-medium transition-all border border-slate-600';
        renderInventory();
    });
}

function showNotification(msg, type) {
    const notif = document.createElement('div');
    notif.className = `fixed top-4 right-4 p-4 rounded-lg shadow-xl backdrop-blur-md border animate-fade-in z-50 ${type === 'success' ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-200' : 'bg-red-500/20 border-red-500/50 text-red-200'
        }`;
    notif.textContent = msg;
    document.body.appendChild(notif);
    setTimeout(() => notif.remove(), 3000);
}

// Start
init();
