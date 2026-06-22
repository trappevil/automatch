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
  Object.values(views).forEach((view) => view.classList.add('hidden'));
  views[name].classList.remove('hidden');
}

function formatScore(score) {
  return score.toFixed(1);
}
function calculateScore(car, profile) {
    return categories.reduce((total, category) => {
        return total + car[category.key] * profile.weights[category.key];
    }, 0);
}

function rankCars(profileKey) {
  const profile = profiles[profileKey];
  return state.cars
    .map((car) => ({
      ...car,
      finalScore: calculateScore(car, profile)
    }))
    .sort((a, b) => b.finalScore - a.finalScore);
}

function getStrongestReasons(car, profile) {
  return categories
    .map((category) => ({
      label: category.label,
      score: car[category.key],
      weightedValue: car[category.key] * profile.weights[category.key],
      weight: profile.weights[category.key]
    }))
    .sort((a, b) => b.weightedValue - a.weightedValue)
    .slice(0, 2);
}

function renderProfileSummary(profile) {
  profileSummary.innerHTML = categories
    .map((category) => {
      const weightPercent = Math.round(profile.weights[category.key] * 100);
      return `
        <div class="weight-pill">
          <span>${category.label}</span>
          <strong>${weightPercent}%</strong>
        </div>
      `;
    })
    .join('');
}

function applySort(cars) {
    const mode = state.sortMode;

    if (mode === 'performance') {
        return [...cars].sort((a, b) => b.performance - a.performance);
    }

    if (mode === 'cost') {
        return [...cars].sort((a, b) => a.costOfOwnership - b.costOfOwnership);
    }

    return [...cars].sort((a, b) => b.finalScore - a.finalScore);
}

function renderRankings() {
    const profile = profiles[state.selectedProfileKey];

    let cars = rankCars(state.selectedProfileKey);

    cars = cars.filter(car =>
        car.name.toLowerCase().includes((state.searchTerm || '').toLowerCase()) &&
        (state.bodyFilter === 'all' || car.body === state.bodyFilter)
    );

    cars = applySort(cars);

    state.rankedCars = cars;

    resultsTitle.textContent = `${profile.label} Rankings`;
    renderProfileSummary(profile);

    rankingsList.innerHTML = cars.map((car, index) => `
    <button class="ranking-row" type="button" data-car-id="${car.id}">
      <span class="rank">#${index + 1}</span>
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
  const car = state.rankedCars.find((rankedCar) => rankedCar.id === carId);

  if (!car) {
    renderRankings();
    return;
  }

  const rank = state.rankedCars.findIndex((rankedCar) => rankedCar.id === carId) + 1;
  const reasons = getStrongestReasons(car, profile);

  const top = reasons[0]?.label?.toLowerCase() || "key factors";
  const second = reasons[1]?.label?.toLowerCase() || "overall balance";

  const reasonText = reasons
        .map((r) =>
            `${r.label}: ${r.weightedValue.toFixed(2)} (weight ${(r.weight * 100).toFixed(0)}%)`
        )
        .join(' | ');

  detailsTitle.textContent = car.name;
  detailsFinalScore.textContent = formatScore(car.finalScore);
  detailsRankNote.textContent = `${car.name} ranked #${rank} for the ${profile.label} profile.`;
  detailsWhy.textContent =
        `This car ranked highly because ${profile.label} prioritizes ${top} and ${second}, where ${car.name} performed well across ${reasonText}.`;

  categoryScores.innerHTML = categories
    .map((category) => {
      const score = car[category.key];
      const weightPercent = Math.round(profile.weights[category.key] * 100);
      return `
        <div class="category-row">
          <div class="category-topline">
            <span>${category.label}</span>
            <span>${score} / 10 | weight ${weightPercent}%</span>
          </div>
          <div class="bar-track" aria-hidden="true">
            <div class="bar-fill" style="width: ${score * 10}%"></div>
          </div>
        </div>
      `;
    })
    .join('');

  showView('details');
}

async function loadCars() {
  try {
    const response = await fetch('cars.json');
    if (!response.ok) {
      throw new Error('Unable to load car data.');
    }

    state.cars = await response.json();
  } catch (error) {
    errorMessage.textContent = 'Car data could not be loaded. Start the app from a local server so cars.json can be read.';
    showView('error');
  }
}

profileForm.addEventListener('submit', (event) => {
  event.preventDefault();
  state.selectedProfileKey = profileSelect.value;
  renderRankings();
});

rankingsList.addEventListener('click', (event) => {
  const row = event.target.closest('[data-car-id]');
  if (row) {
    renderDetails(row.dataset.carId);
  }
});

searchInput.addEventListener('input', (event) => {
    state.searchTerm = event.target.value;
    renderRankings();
});

filterBody.addEventListener('change', (event) => {
    state.bodyFilter = event.target.value;
    renderRankings();
});

document.querySelector('#back-home').addEventListener('click', () => showView('home'));
document.querySelector('#back-results').addEventListener('click', () => showView('results'));

if (sortSelect) {
    sortSelect.value = state.sortMode;

    sortSelect.addEventListener('change', (event) => {
        state.sortMode = event.target.value;
        renderRankings();
    });
}

loadCars();
