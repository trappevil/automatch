const profiles = {
    firstTimeBuyer: {
        label: 'First-Time Buyer',
        weights: {
            reliability: 0.35,
            costOfOwnership: 0.25,
            insuranceAffordability: 0.20,
            fuelEfficiency: 0.15,
            performance: 0.05
        }
    },
    enthusiast: {
        label: 'Enthusiast',
        weights: {
            reliability: 0.15,
            costOfOwnership: 0.10,
            insuranceAffordability: 0.10,
            fuelEfficiency: 0.05,
            performance: 0.60
        }
    },
    dailyCommuter: {
        label: 'Daily Commuter',
        weights: {
            reliability: 0.30,
            costOfOwnership: 0.25,
            insuranceAffordability: 0.15,
            fuelEfficiency: 0.25,
            performance: 0.05
        }
    }
};

const categories = [
    { key: 'reliability', label: 'Reliability' },
    { key: 'costOfOwnership', label: 'Cost of Ownership' },
    { key: 'insuranceAffordability', label: 'Insurance Affordability' },
    { key: 'fuelEfficiency', label: 'Fuel Efficiency' },
    { key: 'performance', label: 'Performance' }
];

const state = {
    cars: [],
    selectedProfileKey: 'firstTimeBuyer',
    rankedCars: [],
    searchTerm: '',
    sortMode: 'bestMatch',
    bodyFilter: 'all'
};

// views
const views = {
    home: document.querySelector('#home-view'),
    results: document.querySelector('#results-view'),
    details: document.querySelector('#details-view'),
    error: document.querySelector('#error-view')
};

// inputs
const profileForm = document.querySelector('#profile-form');
const profileSelect = document.querySelector('#profile-select');
const rankingsList = document.querySelector('#rankings-list');
const searchInput = document.querySelector('#search-input');
const sortSelect = document.querySelector('#sort-select');
const profileSummary = document.querySelector('#profile-summary');
const resultsTitle = document.querySelector('#results-title');
const detailsTitle = document.querySelector('#details-title');
const detailsFinalScore = document.querySelector('#details-final-score');
const detailsRankNote = document.querySelector('#details-rank-note');
const detailsWhy = document.querySelector('#details-why');
const categoryScores = document.querySelector('#category-scores');
const errorMessage = document.querySelector('#error-message');
const filterBody = document.querySelector('#filter-body');

// sliders
const customProfileSection = document.querySelector('#custom-profile');
const sliders = {
    reliability: document.querySelector('#reliability-slider'),
    costOfOwnership: document.querySelector('#cost-slider'),
    insuranceAffordability: document.querySelector('#insurance-slider'),
    fuelEfficiency: document.querySelector('#fuel-slider'),
    performance: document.querySelector('#performance-slider')
};

const valueLabels = {
    reliability: document.querySelector('#reliability-value'),
    costOfOwnership: document.querySelector('#cost-value'),
    insuranceAffordability: document.querySelector('#insurance-value'),
    fuelEfficiency: document.querySelector('#fuel-value'),
    performance: document.querySelector('#performance-value')
};

// -------------------- CORE --------------------

function showView(name) {
    Object.values(views).forEach(v => v.classList.add('hidden'));
    views[name].classList.remove('hidden');
}

function formatScore(score) {
    return Number(score || 0).toFixed(1);
}

function calculateScore(car, profile) {
    return categories.reduce((total, c) => {
        return total + (car[c.key] || 0) * profile.weights[c.key];
    }, 0);
}

function getProfile() {
    if (state.selectedProfileKey !== 'custom') {
        return profiles[state.selectedProfileKey];
    }

    const raw = {};
    let sum = 0;

    for (const key in sliders) {
        const val = Number(sliders[key].value);
        raw[key] = val;
        sum += val;
    }

    const weights = {};
    for (const key in raw) {
        weights[key] = raw[key] / sum;
    }

    return {
        label: 'Custom',
        weights
    };
}

function updateSliderLabels() {
    for (const key in sliders) {
        valueLabels[key].textContent = sliders[key].value;
    }
}

// 🔥 AUTO-NORMALIZE SLIDERS TO 100%
function normalizeSliders(changedKey) {
    const values = {};

    let total = 0;
    for (const key in sliders) {
        values[key] = Number(sliders[key].value);
        total += values[key];
    }

    const diff = 100 - total;
    if (diff === 0) return;

    const others = Object.keys(sliders).filter(k => k !== changedKey);

    others.forEach(k => {
        values[k] += diff / others.length;
        values[k] = Math.max(1, Math.min(100, values[k]));
    });

    for (const key in sliders) {
        sliders[key].value = Math.round(values[key]);
    }
}

function bindSliders() {
    for (const key in sliders) {
        sliders[key].addEventListener('input', () => {
            normalizeSliders(key);
            updateSliderLabels();

            if (state.selectedProfileKey === 'custom') {
                renderRankings();
            }
        });
    }
}

function getStrongestReasons(car, profile) {
    return categories
        .map(c => ({
            label: c.label,
            weightedValue: (car[c.key] || 0) * profile.weights[c.key],
            weight: profile.weights[c.key]
        }))
        .sort((a, b) => b.weightedValue - a.weightedValue)
        .slice(0, 2);
}

function renderProfileSummary(profile) {
    profileSummary.innerHTML = categories.map(c => {
        const pct = Math.round(profile.weights[c.key] * 100);
        return `
            <div class="weight-pill">
                <span>${c.label}</span>
                <strong>${pct}%</strong>
            </div>
        `;
    }).join('');
}

function applySort(cars) {
    if (state.sortMode === 'performance') {
        return [...cars].sort((a, b) => (b.performance || 0) - (a.performance || 0));
    }

    if (state.sortMode === 'cost') {
        return [...cars].sort((a, b) => (a.costOfOwnership || 0) - (b.costOfOwnership || 0));
    }

    return [...cars].sort((a, b) => (b.finalScore || 0) - (a.finalScore || 0));
}

// -------------------- RENDER --------------------

function renderRankings() {
    const profile = getProfile();

    let cars = state.cars.map(car => ({
        ...car,
        finalScore: calculateScore(car, profile)
    }));

    const search = (state.searchTerm || '').toLowerCase();

    cars = cars.filter(car =>
        (!search || car.name.toLowerCase().includes(search)) &&
        (state.bodyFilter === 'all' || car.bodyStyle === state.bodyFilter)
    );

    cars = applySort(cars);

    state.rankedCars = cars.map((c, i) => ({ ...c, rank: i + 1 }));

    resultsTitle.textContent = `${profile.label} Rankings`;
    renderProfileSummary(profile);

    rankingsList.innerHTML = state.rankedCars.map(car => `
        <button class="ranking-row" data-car-id="${car.id}">
            <span class="rank">#${car.rank}</span>
            <span>
                <span class="car-name">${car.name}</span>
                <span class="car-meta">View breakdown</span>
            </span>
            <span class="final-score">${formatScore(car.finalScore)}</span>
        </button>
    `).join('');

    showView('results');
}

function renderDetails(id) {
    const profile = getProfile();
    const car = state.rankedCars.find(c => c.id === id);
    if (!car) return renderRankings();

    const rank = car.rank;
    const reasons = getStrongestReasons(car, profile);

    const top = reasons[0]?.label || 'key factors';
    const second = reasons[1]?.label || 'balance';

    detailsTitle.textContent = car.name;
    detailsFinalScore.textContent = formatScore(car.finalScore);
    detailsRankNote.textContent = `${car.name} ranked #${rank}`;
    detailsWhy.textContent = `${car.name} performs best in ${top} and ${second}.`;

    categoryScores.innerHTML = categories.map(c => {
        const score = car[c.key] || 0;
        const weight = Math.round(profile.weights[c.key] * 100);

        return `
            <div class="category-row">
                <div class="category-topline">
                    <span>${c.label}</span>
                    <span>${score} / 10 | ${weight}%</span>
                </div>
                <div class="bar-track">
                    <div class="bar-fill" style="width:${score * 10}%"></div>
                </div>
            </div>
        `;
    }).join('');

    showView('details');
}

// -------------------- LOAD --------------------

async function loadCars() {
    try {
        const res = await fetch('cars.json');
        state.cars = await res.json();
    } catch {
        errorMessage.textContent = 'Failed to load cars.json';
        showView('error');
    }
}

// -------------------- EVENTS --------------------

profileForm.addEventListener('submit', e => {
    e.preventDefault();
    state.selectedProfileKey = profileSelect.value;
    renderRankings();
});

rankingsList.addEventListener('click', e => {
    const row = e.target.closest('[data-car-id]');
    if (row) renderDetails(row.dataset.carId);
});

searchInput.addEventListener('input', e => {
    state.searchTerm = e.target.value;
    renderRankings();
});

filterBody.addEventListener('change', e => {
    state.bodyFilter = e.target.value;
    renderRankings();
});

profileSelect.addEventListener('change', () => {
    customProfileSection.classList.toggle('hidden', profileSelect.value !== 'custom');
    renderRankings();
});

document.querySelector('#back-home').addEventListener('click', () => showView('home'));
document.querySelector('#back-results').addEventListener('click', () => showView('results'));

if (sortSelect) {
    sortSelect.addEventListener('change', e => {
        state.sortMode = e.target.value;
        renderRankings();
    });
}

// -------------------- INIT --------------------

bindSliders();
updateSliderLabels();
loadCars();
