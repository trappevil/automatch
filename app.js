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
    minPrice: 0,
    maxPrice: 100000,

    minYear: 1990,
    maxYear: 2026,

    transmission: 'all',
    drivetrain: 'all',
    fuelType: 'all',

    make: 'all',

    minHorsepower: 0,
    minTorque: 0,

    minSeats: 0,
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

const minPriceInput = document.querySelector('#min-price');
const maxPriceInput = document.querySelector('#max-price');

const minYearInput = document.querySelector('#min-year');
const maxYearInput = document.querySelector('#max-year');

const transmissionFilter = document.querySelector('#transmission-filter');
const drivetrainFilter = document.querySelector('#drivetrain-filter');
const fuelFilter = document.querySelector('#fuel-filter');
const makeFilter = document.querySelector('#make-filter');

const minHorsepowerInput = document.querySelector('#min-horsepower');
const minTorqueInput = document.querySelector('#min-torque');

const minSeatsInput = document.querySelector('#min-seats');

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

/* ---------------- HELPER: SAFE EVENT BINDING ---------------- */
// Guards against a single missing element crashing the whole script,
// the way the old #price-filter reference used to.
function on(el, event, handler) {
    if (!el) {
        console.warn(`Skipped binding "${event}" — element not found.`);
        return;
    }
    el.addEventListener(event, handler);
}

/* ---------------- LOCKS ---------------- */

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
            if (!key) return;

            lockedWeights[key] = !lockedWeights[key];

            btn.textContent = lockedWeights[key] ? '🔒' : '🔓';

            const slider = document.querySelector(`#${key}-slider`);

            if (slider) {
                slider.disabled = lockedWeights[key];
            }

            btn.classList.toggle('locked', lockedWeights[key]);
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
        k => !window.lockedWeights[k] && k !== changedKey
    );

    if (unlocked.length === 0) {
        updateSlidersUI();
        return;
    }

    let lockedTotal = 0;

    keys.forEach(key => {
        if (window.lockedWeights[key]) {
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

            state.sliders[key] = Math.max(
                0,
                Math.min(
                    100,
                    Math.round((remaining * ratio) / 5) * 5
                )
            );
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
    const preferenceScore = categories.reduce((sum, category) => {
        const carScore = Number(car[category.key]) || 0;
        const userWeight = Number(profile.weights[category.key]) || 0;

        return sum + carScore * userWeight;
    }, 0);

    const qualityScore = qualityFactors.reduce((sum, factor) => {
        const carScore = Number(car[factor.key]) || 0;

        return sum + carScore * factor.weight;
    }, 0);

    const preferenceImportance = 0.85;
    const qualityImportance = 0.15;

    return (
        preferenceScore * preferenceImportance +
        qualityScore * qualityImportance
    );
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

        (state.bodyFilter === 'all' || c.bodyStyle === state.bodyFilter) &&

        c.price >= state.minPrice &&
        c.price <= state.maxPrice &&

        c.year >= state.minYear &&
        c.year <= state.maxYear &&

        (state.transmission === 'all' ||
            c.transmission === state.transmission) &&

        (state.drivetrain === 'all' ||
            c.drivetrain === state.drivetrain) &&

        // NOTE: cars.json uses the key "fueltype" (lowercase t), not "fuelType"
        (state.fuelType === 'all' ||
            c.fueltype === state.fuelType) &&

        (state.make === 'all' ||
            c.make === state.make) &&

        c.horsepower >= state.minHorsepower &&
        c.torque >= state.minTorque &&

        c.seatingCapacity >= state.minSeats
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

/* ---------------- POPULATE MAKE FILTER ---------------- */

function populateMakeFilter() {
    if (!makeFilter) return;

    const makes = [...new Set(state.cars.map(c => c.make).filter(Boolean))].sort();

    makes.forEach(make => {
        const opt = document.createElement('option');
        opt.value = make;
        opt.textContent = make;
        makeFilter.appendChild(opt);
    });
}

/* ---------------- EVENTS ---------------- */

on(profileSelect, 'change', e => {

    state.selectedProfileKey = e.target.value;

    if (e.target.value === 'custom') {

        customProfile.classList.remove('hidden');

    } else {

        customProfile.classList.add('hidden');

        // immediately go to rankings
        render();

    }

});

on(profileForm, 'submit', e => {
    e.preventDefault();
    render();
});

on(searchInput, 'input', e => {
    state.searchTerm = e.target.value;
    render();
});

on(filterBody, 'change', e => {
    state.bodyFilter = e.target.value;
    render();
});

on(sortSelect, 'change', e => {
    state.sortMode = e.target.value;
    render();
});

on(minPriceInput, 'input', e => {
    state.minPrice = Number(e.target.value) || 0;
    render();
});

on(maxPriceInput, 'input', e => {
    state.maxPrice = e.target.value === '' ? 100000 : Number(e.target.value);
    render();
});

on(minYearInput, 'input', e => {
    state.minYear = e.target.value === '' ? 1990 : Number(e.target.value);
    render();
});

on(maxYearInput, 'input', e => {
    state.maxYear = e.target.value === '' ? 2026 : Number(e.target.value);
    render();
});

on(transmissionFilter, 'change', e => {
    state.transmission = e.target.value;
    render();
});

on(drivetrainFilter, 'change', e => {
    state.drivetrain = e.target.value;
    render();
});

on(fuelFilter, 'change', e => {
    state.fuelType = e.target.value;
    render();
});

on(makeFilter, 'change', e => {
    state.make = e.target.value;
    render();
});

on(minHorsepowerInput, 'input', e => {
    state.minHorsepower = Number(e.target.value) || 0;
    render();
});

on(minTorqueInput, 'input', e => {
    state.minTorque = Number(e.target.value) || 0;
    render();
});

on(minSeatsInput, 'input', e => {
    state.minSeats = Number(e.target.value) || 0;
    render();
});

/* sliders */
on(reliabilitySlider, 'input', e => handleSlider('reliability', e.target.value));
on(costSlider, 'input', e => handleSlider('cost', e.target.value));
on(insuranceSlider, 'input', e => handleSlider('insurance', e.target.value));
on(fuelSlider, 'input', e => handleSlider('fuel', e.target.value));
on(performanceSlider, 'input', e => handleSlider('performance', e.target.value));

/* navigation */
on(document.querySelector('#back-home'), 'click', () => showView('home'));
on(document.querySelector('#back-results'), 'click', () => showView('results'));

/* ---------------- LOAD ---------------- */

async function loadCars() {
    try {
        const res = await fetch('cars.json');

        if (!res.ok) {
            throw new Error(`cars.json returned ${res.status} ${res.statusText}`);
        }

        const data = await res.json();

        if (!Array.isArray(data) || data.length === 0) {
            throw new Error('cars.json loaded but contained no cars.');
        }

        state.cars = data;

        populateMakeFilter();

        // Render immediately once data is ready, using the default profile,
        // rather than waiting for a user click.
        render();

    } catch (err) {
        console.error('Failed to load car data:', err);

        const errorMessage = document.querySelector('#error-message');
        if (errorMessage) {
            errorMessage.textContent = `Couldn't load car data: ${err.message}`;
        }
        showView('error');
    }
}

loadCars();
updateSlidersUI();

window.addEventListener('DOMContentLoaded', () => {
    initLocks();
});
