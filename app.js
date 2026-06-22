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
const detailsTitle = document.querySelector('#details-title');
const detailsFinalScore = document.querySelector('#details-final-score');
const detailsRankNote = document.querySelector('#details-rank-note');
const detailsWhy = document.querySelector('#details-why');
const categoryScores = document.querySelector('#category-scores');
const errorMessage = document.querySelector('#error-message');
const filterBody = document.querySelector('#filter-body');

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

function getStrongestReasons(car, profile) {
    return categories
        .map(c => ({
            label: c.label,
            score: car[c.key] || 0,
            weightedValue: (car[c.key] || 0) * profile.weights[c.key],
            weight: profile.weights[c.key]
        }))
        .sort((a, b) => b.weightedValue - a.weightedValue)
        .slice(0, 2);
}

function renderProfileSummary(profile) {
    profileSummary.innerHTML = categories.map(c => {
        const weightPercent = Math.round((profile.weights[c.key] || 0) * 100);
        return `
      <div class="weight-pill">
        <span>${c.label}</span>
        <strong>${weightPercent}%</strong>
      </div>
    `;
    }).join('');
}

function applySort(cars) {
    const mode = state.sortMode || 'bestMatch';

    if (mode === 'performance') {
        return [...cars].sort((a, b) => (b.performance || 0) - (a.performance || 0));
    }

    if (mode === 'cost') {
        return [...cars].sort((a, b) => (a.costOfOwnership || 0) - (b.costOfOwnership || 0));
    }

    return [...cars].sort((a, b) => (b.finalScore || 0) - (a.finalScore || 0));
}

function renderRankings() {
    const profile = profiles[state.selectedProfileKey];

    let cars = state.cars.map(car => ({
        ...car,
        finalScore: calculateScore(car, profile)
    }));

    const search = (state.searchTerm || '').trim().toLowerCase();

    cars = cars.filter(car =>
        (!search || (car.name || '').toLowerCase().includes(search)) &&
        (state.bodyFilter === 'all' || car.bodyStyle === state.bodyFilter)
    );

    cars = applySort(cars);

    // store ranked list once (no re-sorting later needed)
    state.rankedCars = cars.map((car, i) => ({
        ...car,
        rank: i + 1
    }));

    resultsTitle.textContent = `${profile.label} Rankings`;
    renderProfileSummary(profile);

    rankingsList.innerHTML = state.rankedCars.map(car => `
    <button class="ranking-row" type="button" data-car-id="${car.id}">
      <span class="rank">#${car.rank}</span>
      <span>
        <span class="car-name">${car.name}</span>
        <span class="car-meta">View category scores and ranking reason</span>
      </span>
      <span class="final-score">${formatScore(car.finalScore)}</span>
    </button>
  `).join('');

    showView('results');
}

function renderDetails(carId) {
    const profile = profiles[state.selectedProfileKey];

    const car = state.rankedCars.find(c => c.id === carId);
    if (!car) return renderRankings();

    const rank = car.rank;

    const reasons = getStrongestReasons(car, profile);

    const top = reasons[0]?.label?.toLowerCase() || "key factors";
    const second = reasons[1]?.label?.toLowerCase() || "overall balance";

    const reasonText = reasons.map(r =>
        `${r.label}: ${r.weightedValue.toFixed(2)} (weight ${(r.weight * 100).toFixed(0)}%)`
    ).join(' | ');

    detailsTitle.textContent = car.name;
    detailsFinalScore.textContent = formatScore(car.finalScore);
    detailsRankNote.textContent = `${car.name} ranked #${rank} for the ${profile.label} profile.`;

    detailsWhy.textContent =
        `This car ranked highly because ${profile.label} prioritizes ${top} and ${second}, where ${car.name} performed well across ${reasonText}.`;

    categoryScores.innerHTML = categories.map(c => {
        const score = car[c.key] || 0;
        const weightPercent = Math.round((profile.weights[c.key] || 0) * 100);

        return `
      <div class="category-row">
        <div class="category-topline">
          <span>${c.label}</span>
          <span>${score} / 10 | weight ${weightPercent}%</span>
        </div>
        <div class="bar-track" aria-hidden="true">
          <div class="bar-fill" style="width: ${score * 10}%"></div>
        </div>
      </div>
    `;
    }).join('');

    showView('details');
}

async function loadCars() {
    try {
        const res = await fetch('cars.json');
        if (!res.ok) throw new Error();

        state.cars = await res.json();
    } catch {
        errorMessage.textContent =
            'Car data could not be loaded. Run this from a local server so cars.json works.';
        showView('error');
    }
}

// events
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

document.querySelector('#back-home').addEventListener('click', () => showView('home'));
document.querySelector('#back-results').addEventListener('click', () => showView('results'));

if (sortSelect) {
    sortSelect.value = state.sortMode;

    sortSelect.addEventListener('change', e => {
        state.sortMode = e.target.value;
        renderRankings();
    });
}

loadCars();
