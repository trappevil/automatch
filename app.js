const profiles = {
    firstTimeBuyer: {
        label: 'First-Time Buyer',
        weights: {
            reliability: 35,
            costOfOwnership: 25,
            insuranceAffordability: 20,
            fuelEfficiency: 15,
            performance: 5
        }
    },
    enthusiast: {
        label: 'Enthusiast',
        weights: {
            reliability: 15,
            costOfOwnership: 10,
            insuranceAffordability: 10,
            fuelEfficiency: 5,
            performance: 60
        }
    },
    dailyCommuter: {
        label: 'Daily Commuter',
        weights: {
            reliability: 30,
            costOfOwnership: 25,
            insuranceAffordability: 15,
            fuelEfficiency: 25,
            performance: 5
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

/* ---------------- DOM ---------------- */

const views = {
    home: document.querySelector('#home-view'),
    results: document.querySelector('#results-view'),
    details: document.querySelector('#details-view'),
    error: document.querySelector('#error-view')
};

const profileForm = document.querySelector('#profile-form');
const profileSelect = document.querySelector('#profile-select');
const rankingsList = document.querySelector('#rankings-list');
const searchInput = document.querySelector('#search-input');
const sortSelect = document.querySelector('#sort-select');
const profileSummary = document.querySelector('#profile-summary');
const resultsTitle = document.querySelector('#results-title');

const filterBody = document.querySelector('#filter-body');
const customProfileSection = document.querySelector('#custom-profile');

/* sliders */
const sliders = {
    reliability: document.querySelector('#reliability-slider'),
    costOfOwnership: document.querySelector('#cost-slider'),
    insuranceAffordability: document.querySelector('#insurance-slider'),
    fuelEfficiency: document.querySelector('#fuel-slider'),
    performance: document.querySelector('#performance-slider')
};

const labels = {
    reliability: document.querySelector('#reliability-value'),
    costOfOwnership: document.querySelector('#cost-value'),
    insuranceAffordability: document.querySelector('#insurance-value'),
    fuelEfficiency: document.querySelector('#fuel-value'),
    performance: document.querySelector('#performance-value')
};

/* ---------------- WEIGHT ENGINE ---------------- */

const lockState = {};
const weights = {
    reliability: 35,
    costOfOwnership: 25,
    insuranceAffordability: 20,
    fuelEfficiency: 15,
    performance: 5
};

function totalUnlocked(exceptKey = null) {
    let sum = 0;
    for (const k of Object.keys(weights)) {
        if (!lockState[k] && k !== exceptKey) sum += weights[k];
    }
    return sum;
}

function normalizeWeights(changedKey) {
    const lockedTotal = Object.keys(weights)
        .filter(k => lockState[k])
        .reduce((a, k) => a + weights[k], 0);

    const remaining = 100 - lockedTotal;

    const freeKeys = Object.keys(weights).filter(k => !lockState[k]);

    let freeSum = freeKeys.reduce((a, k) => a + weights[k], 0);

    if (freeSum <= 0) {
        const equal = remaining / freeKeys.length;
        freeKeys.forEach(k => weights[k] = equal);
        return;
    }

    freeKeys.forEach(k => {
        weights[k] = (weights[k] / freeSum) * remaining;
    });
}

function setSliderUI(key) {
    const val = weights[key];

    sliders[key].value = val;
    labels[key].textContent = Math.round(val);

    sliders[key].style.setProperty('--pct', `${val}%`);
}

/* ---------------- LIVE SLIDER SYSTEM ---------------- */

function updateFromSlider(key, rawValue) {
    if (lockState[key]) return;

    weights[key] = Number(rawValue);

    normalizeWeights(key);

    for (const k of Object.keys(weights)) {
        setSliderUI(k);
    }

    if (state.selectedProfileKey === 'custom') {
        renderRankings();
    }
}

/* ---------------- INIT SLIDERS ---------------- */

Object.keys(sliders).forEach(key => {
    sliders[key].addEventListener('input', e => {
        updateFromSlider(key, e.target.value);
    });

    /* click label = toggle lock */
    labels[key].parentElement.addEventListener('click', () => {
        lockState[key] = !lockState[key];
        labels[key].parentElement.classList.toggle('locked', lockState[key]);
    });
});

/* ---------------- CORE APP ---------------- */

function showView(name) {
    Object.values(views).forEach(v => v.classList.add('hidden'));
    views[name].classList.remove('hidden');
}

function calculateScore(car, profile) {
    return categories.reduce((sum, c) => {
        return sum + (car[c.key] || 0) * profile.weights[c.key];
    }, 0);
}

function getProfile() {
    if (state.selectedProfileKey !== 'custom') {
        return profiles[state.selectedProfileKey];
    }

    return {
        label: 'Custom',
        weights: { ...weights }
    };
}

/* ---------------- RENDER ---------------- */

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

    cars.sort((a, b) => b.finalScore - a.finalScore);

    state.rankedCars = cars.map((c, i) => ({ ...c, rank: i + 1 }));

    resultsTitle.textContent = `${profile.label} Rankings`;

    rankingsList.innerHTML = state.rankedCars.map(car => `
        <button class="ranking-row" data-id="${car.id}">
            <span class="rank">#${car.rank}</span>
            <span>${car.name}</span>
            <span class="final-score">${car.finalScore.toFixed(1)}</span>
        </button>
    `).join('');

    showView('results');
}

/* ---------------- EVENTS ---------------- */

profileForm.addEventListener('submit', e => {
    e.preventDefault();

    state.selectedProfileKey = profileSelect.value;

    if (profileSelect.value === 'custom') {
        showView('home'); // stay in editor
        return;
    }

    renderRankings();
});

profileSelect.addEventListener('change', () => {
    if (profileSelect.value === 'custom') {
        customProfileSection.classList.remove('hidden');
        showView('home');
    } else {
        customProfileSection.classList.add('hidden');
    }
});

rankingsList.addEventListener('click', e => {
    const row = e.target.closest('[data-id]');
    if (!row) return;
    console.log("clicked car:", row.dataset.id);
});

searchInput.addEventListener('input', e => {
    state.searchTerm = e.target.value;
    renderRankings();
});

filterBody.addEventListener('change', e => {
    state.bodyFilter = e.target.value;
    renderRankings();
});

/* sort */
sortSelect.addEventListener('change', e => {
    state.sortMode = e.target.value;
    renderRankings();
});

/* ---------------- LOAD ---------------- */

async function loadCars() {
    try {
        const res = await fetch('cars.json');
        state.cars = await res.json();
    } catch {
        showView('error');
    }
}

/* init sliders */
for (const k of Object.keys(weights)) {
    setSliderUI(k);
}

loadCars();
