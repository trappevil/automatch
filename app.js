const categories = [
    { key: 'reliability', label: 'Reliability' },
    { key: 'costOfOwnership', label: 'Cost of Ownership' },
    { key: 'insuranceAffordability', label: 'Insurance' },
    { key: 'fuelEfficiency', label: 'Fuel Efficiency' },
    { key: 'performance', label: 'Performance' }
];

const profiles = {
    firstTimeBuyer: {
        label: 'First-Time Buyer',
        weights: {
            reliability: 0.35,
            costOfOwnership: 0.25,
            insuranceAffordability: 0.2,
            fuelEfficiency: 0.15,
            performance: 0.05
        }
    },
    enthusiast: {
        label: 'Enthusiast',
        weights: {
            reliability: 0.15,
            costOfOwnership: 0.1,
            insuranceAffordability: 0.1,
            fuelEfficiency: 0.05,
            performance: 0.6
        }
    },
    dailyCommuter: {
        label: 'Daily Commuter',
        weights: {
            reliability: 0.3,
            costOfOwnership: 0.25,
            insuranceAffordability: 0.15,
            fuelEfficiency: 0.25,
            performance: 0.05
        }
    }
};

const state = {
    cars: [],
    rankedCars: [],
    selectedProfileKey: 'firstTimeBuyer',
    searchTerm: '',
    sortMode: 'bestMatch',
    bodyFilter: 'all',
    sliders: {
        reliability: 35,
        cost: 25,
        insurance: 20,
        fuel: 15,
        performance: 5
    }
};

const views = {
    home: document.querySelector('#home-view'),
    results: document.querySelector('#results-view'),
    details: document.querySelector('#details-view'),
    error: document.querySelector('#error-view')
};

const profileSelect = document.querySelector('#profile-select');
const profileForm = document.querySelector('#profile-form');

const rankingsList = document.querySelector('#rankings-list');
const searchInput = document.querySelector('#search-input');
const sortSelect = document.querySelector('#sort-select');
const filterBody = document.querySelector('#filter-body');

const customProfile = document.querySelector('#custom-profile');

const summary = document.querySelector('#profile-summary');
const resultsTitle = document.querySelector('#results-title');

const reliabilitySlider = document.querySelector('#reliability-slider');
const costSlider = document.querySelector('#cost-slider');
const insuranceSlider = document.querySelector('#insurance-slider');
const fuelSlider = document.querySelector('#fuel-slider');
const performanceSlider = document.querySelector('#performance-slider');

const reliabilityValue = document.querySelector('#reliability-value');
const costValue = document.querySelector('#cost-value');
const insuranceValue = document.querySelector('#insurance-value');
const fuelValue = document.querySelector('#fuel-value');
const performanceValue = document.querySelector('#performance-value');

function initLocks() {
    const lockedWeights = {
        reliability: false,
        cost: false,
        insurance: false,
        fuel: false,
        performance: false
    };

    document.querySelectorAll('.lock-btn').forEach(btn => {
        btn.addEventListener('click', () => {

            const key = btn.dataset.slider;

            if (!key) return; // safety check

            lockedWeights[key] = !lockedWeights[key];

            btn.textContent = lockedWeights[key] ? '🔒' : '🔓';
        });
    });

    // expose if normalize needs it later
    window.lockedWeights = lockedWeights;
}

/* ---------------- VIEW SWITCH ---------------- */

function showView(v) {
    Object.values(views).forEach(x => x.classList.add('hidden'));
    views[v].classList.remove('hidden');
}

/* ---------------- NORMALIZE SLIDERS ---------------- */

function normalize(changedKey) {
    const keys = Object.keys(state.sliders);

    const unlocked = keys.filter(
        k => !lockedWeights[k] && k !== changedKey
    );

    if (unlocked.length === 0) {
        updateSlidersUI();
        return;
    }

    let lockedTotal = 0;

    keys.forEach(key => {
        if (lockedWeights[key]) {
            lockedTotal += state.sliders[key];
        }
    });

    const changedValue = state.sliders[changedKey];

    let remaining = 100 - lockedTotal - changedValue;

    if (remaining < 0) remaining = 0;

    let unlockedTotal = 0;

    unlocked.forEach(key => {
        unlockedTotal += state.sliders[key];
    });

    if (unlockedTotal <= 0) {
        const even = Math.floor((remaining / unlocked.length) / 5) * 5;

        unlocked.forEach(key => {
            state.sliders[key] = even;
        });
    } else {
        unlocked.forEach(key => {
            const ratio = state.sliders[key] / unlockedTotal;
            state.sliders[key] = Math.round((remaining * ratio) / 5) * 5;
        });
    }

    let total = 0;
    keys.forEach(key => total += state.sliders[key]);

    const correction = 100 - total;

    if (unlocked.length > 0) {
        state.sliders[unlocked[0]] += correction;
    }
}

/* ---------------- UPDATE UI ---------------- */

function updateSlidersUI() {
    reliabilitySlider.value = state.sliders.reliability;
    costSlider.value = state.sliders.cost;
    insuranceSlider.value = state.sliders.insurance;
    fuelSlider.value = state.sliders.fuel;
    performanceSlider.value = state.sliders.performance;

    reliabilityValue.textContent = Math.round(state.sliders.reliability);
    costValue.textContent = Math.round(state.sliders.cost);
    insuranceValue.textContent = Math.round(state.sliders.insurance);
    fuelValue.textContent = Math.round(state.sliders.fuel);
    performanceValue.textContent = Math.round(state.sliders.performance);
}

/* ---------------- SLIDER HANDLER ---------------- */

function handleSlider(key, value) {
    if (window.lockedWeights?.[key]) return;

    state.sliders[key] = Number(value);

    normalize(key);

    updateSlidersUI();
}

/* ---------------- SCORE ---------------- */

function scoreCar(car, profile) {
    return categories.reduce((sum, c) => {
        return sum + (car[c.key] || 0) * profile.weights[c.key];
    }, 0);
}

/* ---------------- CUSTOM PROFILE ---------------- */

function getCustomProfile() {
    const s = state.sliders;

    return {
        label: 'Custom',
        weights: {
            reliability: s.reliability / 100,
            costOfOwnership: s.cost / 100,
            insuranceAffordability: s.insurance / 100,
            fuelEfficiency: s.fuel / 100,
            performance: s.performance / 100
        }
    };
}

/* ---------------- RENDER ---------------- */

function render() {
    const profile =
        state.selectedProfileKey === 'custom'
            ? getCustomProfile()
            : profiles[state.selectedProfileKey];

    let cars = state.cars.map(c => ({
        ...c,
        finalScore: scoreCar(c, profile)
    }));

    const search = state.searchTerm.toLowerCase().trim();

    cars = cars.filter(c =>
        (!search || c.name.toLowerCase().includes(search)) &&
        (state.bodyFilter === 'all' || c.bodyStyle === state.bodyFilter)
    );

    cars.sort((a, b) => b.finalScore - a.finalScore);

    state.rankedCars = cars.map((c, i) => ({
        ...c,
        rank: i + 1
    }));

    resultsTitle.textContent = profile.label + ' Rankings';

    summary.innerHTML = categories.map(c => {
        const w = profile.weights[c.key] * 100;
        return `<div><b>${c.label}</b><br>${w.toFixed(0)}%</div>`;
    }).join('');

    rankingsList.innerHTML = state.rankedCars.map(c => `
        <button class="ranking-row" data-id="${c.id}">
            <span>#${c.rank}</span>
            <span>${c.name}</span>
            <span>${c.finalScore.toFixed(1)}</span>
        </button>
    `).join('');

    showView('results');
}

/* ---------------- EVENTS ---------------- */

profileSelect.addEventListener('change', e => {

    state.selectedProfileKey = e.target.value;

    if (e.target.value === 'custom') {

        customProfile.classList.remove('hidden');

    } else {

        customProfile.classList.add('hidden');

        // immediately go to rankings
        render();

    }

});

profileForm.addEventListener('submit', e => {
    e.preventDefault();
    render();
});

searchInput.addEventListener('input', e => {
    state.searchTerm = e.target.value;
    render();
});

filterBody.addEventListener('change', e => {
    state.bodyFilter = e.target.value;
    render();
});

sortSelect.addEventListener('change', e => {
    state.sortMode = e.target.value;
    render();
});

/* sliders */
reliabilitySlider.addEventListener('input', e => handleSlider('reliability', e.target.value));
costSlider.addEventListener('input', e => handleSlider('cost', e.target.value));
insuranceSlider.addEventListener('input', e => handleSlider('insurance', e.target.value));
fuelSlider.addEventListener('input', e => handleSlider('fuel', e.target.value));
performanceSlider.addEventListener('input', e => handleSlider('performance', e.target.value));

/* navigation fix */
document.querySelector('#back-home')?.addEventListener('click', () => showView('home'));
document.querySelector('#back-results')?.addEventListener('click', () => showView('results'));

/* ---------------- LOAD ---------------- */

async function loadCars() {
    const res = await fetch('cars.json');
    state.cars = await res.json();
}

loadCars();
updateSlidersUI();

window.addEventListener('DOMContentLoaded', () => {
    initLocks();
});
