const categories = [
    { key: 'reliability', label: 'Reliability' },
    { key: 'costOfOwnership', label: 'Cost of Ownership' },
    { key: 'insuranceAffordability', label: 'Insurance' },
    { key: 'fuelEfficiency', label: 'Fuel Efficiency' },
    { key: 'performance', label: 'Performance' },
];

const qualityFactors = [
    {
        key: 'maintenanceAffordability',
        label: 'Maintenance Affordability',
        weight: 0.35
    },
    {
        key: 'resaleValue',
        label: 'Resale Value',
        weight: 0.25
    },
    {
        key: 'safety',
        label: 'Safety',
        weight: 0.40
    }
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
    favorites: [],
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

    compareIds: [],

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
    compare: document.querySelector('#compare-view'),
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

const heroTitle = document.querySelector("#hero-title");
const heroSubtitle = document.querySelector("#hero-subtitle");
const heroMatchScore = document.querySelector("#hero-match-score");
const heroImage = document.querySelector("#hero-image");
const heroSpecs = document.querySelector("#hero-specs");

const compareButton = document.querySelector('#compare-button');
const clearCompareButton = document.querySelector('#clear-compare');
const compareCount = document.querySelector('#compare-count');
const compareGrid = document.querySelector('#compare-grid');
const compareSummary = document.querySelector('#compare-summary');

const detailsTitle = document.querySelector('#details-title');
const detailsFinalScore = document.querySelector('#details-final-score');
const detailsRankNote = document.querySelector('#details-rank-note');
const detailsWhy = document.querySelector('#details-why');
const categoryScores = document.querySelector('#category-scores');

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

function formatCurrency(value) {
    const price = Number(value);

    if (!Number.isFinite(price)) {
        return 'Price unavailable';
    }

    return price.toLocaleString('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0
    });
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

function updateSliderFill(slider) {
    if (!slider) return;

    const min = Number(slider.min) || 0;
    const max = Number(slider.max) || 100;
    const value = Number(slider.value) || 0;

    const percentage = ((value - min) / (max - min)) * 100;

    slider.style.setProperty('--val', `${percentage}%`);
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

    updateSliderFill(reliabilitySlider);
    updateSliderFill(costSlider);
    updateSliderFill(insuranceSlider);
    updateSliderFill(fuelSlider);
    updateSliderFill(performanceSlider);
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

/* ---------------- RECOMMENDATION EXPLANATION ---------------- */

function getRecommendationExplanation(car, profile) {
    const contributions = categories
        .map(category => ({
            label: category.label,
            score: Number(car[category.key]) || 0,
            contribution:
                (Number(car[category.key]) || 0) *
                (Number(profile.weights[category.key]) || 0)
        }))
        .sort((a, b) => b.contribution - a.contribution);

    const strengths = contributions
        .filter(item => item.score >= 80)
        .slice(0, 3);

    const weaknesses = contributions
        .filter(item => item.score < 70)
        .sort((a, b) => a.score - b.score)
        .slice(0, 2);

    return {
        strengths,
        weaknesses
    };
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

/* ---------------- HERO SUBTITLE ---------------- */

function getHeroSubtitle(car) {
    const fuelType = car.fuelType || 'vehicle';
    const bodyStyle = car.bodyStyle || 'car';

    return `A ${fuelType.toLowerCase()} ${bodyStyle.toLowerCase()} offering strong value, reliability, and everyday usability.`;
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

        (state.minPrice === 0 || c.price >= state.minPrice) &&
        (state.maxPrice === Infinity || c.price <= state.maxPrice) &&

        (state.minYear === 0 || c.year >= state.minYear) &&
        (state.maxYear === Infinity || c.year <= state.maxYear) &&

        (state.transmission === 'all' ||
            c.transmission === state.transmission) &&

        (state.drivetrain === 'all' ||
            c.drivetrain === state.drivetrain) &&

        (state.fuelType === 'all' ||
            c.fuelType === state.fuelType) &&

        (state.make === 'all' ||
            c.make === state.make) &&

        c.horsepower >= state.minHorsepower &&
        c.torque >= state.minTorque &&

        c.seatingCapacity >= state.minSeats
    );

    if (state.sortMode === 'performance') {
        cars.sort((a, b) => b.performance - a.performance);
    } else if (state.sortMode === 'cost') {
        cars.sort((a, b) => a.price - b.price);
    } else {
        cars.sort((a, b) => b.finalScore - a.finalScore);
    }

    state.rankedCars = cars.map((c, i) => ({
        ...c,
        rank: i + 1
    }));

    resultsTitle.textContent = profile.label + ' Rankings';

    summary.innerHTML = categories.map(c => {
        const w = profile.weights[c.key] * 100;
        return `<div><b>${c.label}</b><br>${w.toFixed(0)}%</div>`;
    }).join('');

    rankingsList.innerHTML = state.rankedCars.map(c => {
        const isSelected = state.compareIds.includes(c.id);

        return `
        <article class="ranking-card">

            <label class="compare-selector">
                <input
                    type="checkbox"
                    class="compare-checkbox"
                    data-id="${c.id}"
                    ${isSelected ? 'checked' : ''}>

                <span>Compare</span>
            </label>

            <button
            class="favorite-btn"
            data-favorite="${c.id}"
            type="button">
            ${
                state.favorites.includes(c.id)
                ? "❤️"
                : "🤍"
            }
            </button>

            <button
                class="ranking-row"
                type="button"
                data-id="${c.id}">

                <span class="rank">
                    #${c.rank}
                </span>

                <span>
                    <span class="car-name">
                        ${c.name}
                    </span>

                    <span class="car-meta">
                        ${formatCurrency(c.price)}
                        · ${c.transmission}
                        · ${c.drivetrain}
                    </span>
                </span>

                <span class="final-score">
                    ${c.finalScore.toFixed(1)}
                </span>

            </button>

        </article>
    `;
    }).join('');

    updateCompareUI();

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

/* ---------------- RENDER DETAILS ---------------- */

function renderDetails(carId) {
    const profile =
        state.selectedProfileKey === 'custom'
            ? getCustomProfile()
            : profiles[state.selectedProfileKey];

    const car = state.rankedCars.find(c => c.id === carId);

    if (!car) {
        console.warn(`Car with id "${carId}" was not found.`);
        render();
        return;
    }

    if (heroSubtitle) {
        heroSubtitle.textContent = getHeroSubtitle(car);
    }

    const explanation = getRecommendationExplanation(car, profile);

    const strengthsText = explanation.strengths.length
        ? explanation.strengths
            .map(item => `
                <li>
                    <strong>${item.label}</strong>: ${item.score}/100
                </li>
            `)
            .join('')
        : `
            <li>
                Strong overall balance across your selected priorities.
            </li>
        `;

    const weaknessesText = explanation.weaknesses.length
        ? explanation.weaknesses
            .map(item => `
                <li>
                    <strong>${item.label}</strong>: ${item.score}/100
                </li>
            `)
            .join('')
        : '';

    const qualityStrengths = qualityFactors
        .map(factor => ({
            label: factor.label,
            score: Number(car[factor.key]) || 0
        }))
        .filter(item => item.score >= 80)
        .sort((a, b) => b.score - a.score);

    const qualityText = qualityStrengths.length
        ? qualityStrengths
            .map(item => `
                <li>
                    <strong>${item.label}</strong>: ${item.score}/100
                </li>
            `)
            .join('')
        : `
            <li>
                Average supporting quality scores.
            </li>
        `;

    detailsTitle.textContent = car.name;
    detailsFinalScore.textContent = car.finalScore.toFixed(1);

    detailsRankNote.textContent =
        `${car.name} ranked #${car.rank} for the ${profile.label} profile.`;

    detailsWhy.innerHTML = `
        <div class="recommendation-section">
            <h3>Why we recommend it</h3>
            <ul>
                ${strengthsText}
            </ul>
        </div>

        <div class="recommendation-section">
            <h3>Supporting quality factors</h3>
            <ul>
                ${qualityText}
            </ul>
        </div>

        ${weaknessesText
            ? `
                    <div class="recommendation-section">
                        <h3>Trade-offs</h3>
                        <ul>
                            ${weaknessesText}
                        </ul>
                    </div>
                `
            : ''
        }

        <div class="recommendation-section">
            <h3>Vehicle specifications</h3>
            <ul>
                <li><strong>Price:</strong> ${formatCurrency(car.price)}</li>
                <li><strong>Year:</strong> ${car.year}</li>
                <li><strong>Body style:</strong> ${car.bodyStyle}</li>
                <li><strong>Transmission:</strong> ${car.transmission}</li>
                <li><strong>Drivetrain:</strong> ${car.drivetrain}</li>
                <li><strong>Fuel type:</strong> ${car.fuelType}</li>
                <li><strong>Seats:</strong> ${car.seatingCapacity}</li>
                <li><strong>Horsepower:</strong> ${car.horsepower} hp</li>
                <li><strong>Torque:</strong> ${car.torque} lb-ft</li>
            </ul>
        </div>
    `;

    const visibleScoreRows = categories.map(category => {
        const score = Number(car[category.key]) || 0;
        const weight = Number(profile.weights[category.key]) || 0;
        const weightPercent = Math.round(weight * 100);

        return `
            <div class="category-row">
                <div class="category-topline">
                    <span>${category.label}</span>
                    <span>${score}/100 · weight ${weightPercent}%</span>
                </div>

                <div class="bar-track" aria-hidden="true">
                    <div
                        class="bar-fill"
                        style="width: ${Math.max(0, Math.min(100, score))}%">
                    </div>
                </div>
            </div>
        `;
    }).join('');

    const qualityScoreRows = qualityFactors.map(factor => {
        const score = Number(car[factor.key]) || 0;

        return `
            <div class="category-row">
                <div class="category-topline">
                    <span>${factor.label}</span>
                    <span>${score}/100</span>
                </div>

                <div class="bar-track" aria-hidden="true">
                    <div
                        class="bar-fill"
                        style="width: ${Math.max(0, Math.min(100, score))}%">
                    </div>
                </div>
            </div>
        `;
    }).join('');

    categoryScores.innerHTML = `
        <h3>Your weighted priorities</h3>
        ${visibleScoreRows}

        <h3 class="quality-heading">Quality factors</h3>
        ${qualityScoreRows}
    `;

    showView('details');
}

/* ---------------- COMPARE MODE ---------------- */

function getComparedCars() {
    return state.compareIds
        .map(id => state.rankedCars.find(car => car.id === id))
        .filter(Boolean);
}

function updateCompareUI() {
    const count = state.compareIds.length;

    if (compareCount) {
        compareCount.textContent = `${count} of 3 selected`;
    }

    if (compareButton) {
        compareButton.disabled = count < 2;
    }

    if (clearCompareButton) {
        clearCompareButton.disabled = count === 0;
    }

    document
        .querySelectorAll('.compare-checkbox')
        .forEach(checkbox => {
            checkbox.checked =
                state.compareIds.includes(checkbox.dataset.id);
        });
}

function toggleCompareCar(carId) {
    const isSelected = state.compareIds.includes(carId);

    if (isSelected) {
        state.compareIds =
            state.compareIds.filter(id => id !== carId);

        updateCompareUI();
        return;
    }

    if (state.compareIds.length >= 3) {
        alert('You can compare up to three cars at once.');
        updateCompareUI();
        return;
    }

    state.compareIds.push(carId);
    updateCompareUI();
}

function getBestValue(cars, key, lowerIsBetter = false) {
    const values = cars
        .map(car => Number(car[key]))
        .filter(Number.isFinite);

    if (!values.length) return null;

    return lowerIsBetter
        ? Math.min(...values)
        : Math.max(...values);
}

function renderComparisonRow(
    label,
    cars,
    key,
    formatter = value => value,
    lowerIsBetter = false
) {
    const bestValue = getBestValue(cars, key, lowerIsBetter);

    const cells = cars.map(car => {
        const rawValue = Number(car[key]);
        const isWinner =
            Number.isFinite(rawValue) &&
            rawValue === bestValue;

        const displayedValue = Number.isFinite(rawValue)
            ? formatter(rawValue)
            : '—';

        return `
            <div class="compare-cell ${isWinner ? 'compare-winner' : ''}">
                ${displayedValue}

                ${isWinner
                ? '<span class="winner-label">Best</span>'
                : ''
            }
            </div>
        `;
    }).join('');

    return `
        <div class="compare-row">
            <div class="compare-row-label">
                ${label}
            </div>

            ${cells}
        </div>
    `;
}

function renderTextComparisonRow(label, cars, key) {
    const cells = cars.map(car => `
        <div class="compare-cell">
            ${car[key] ?? '—'}
        </div>
    `).join('');

    return `
        <div class="compare-row">
            <div class="compare-row-label">
                ${label}
            </div>

            ${cells}
        </div>
    `;
}

function renderCompare() {
    const cars = getComparedCars();

    if (cars.length < 2) {
        alert('Select at least two cars to compare.');
        return;
    }

    const profile =
        state.selectedProfileKey === 'custom'
            ? getCustomProfile()
            : profiles[state.selectedProfileKey];

    const highestScore = Math.max(
        ...cars.map(car => Number(car.finalScore) || 0)
    );

    const bestOverallCars = cars.filter(
        car => Number(car.finalScore) === highestScore
    );

    compareSummary.innerHTML = `
        <div>
            <p class="eyebrow">Best overall match</p>

            <h3>
                ${bestOverallCars.map(car => car.name).join(' and ')}
            </h3>

            <p>
                Based on the ${profile.label} profile and your
                selected category weights.
            </p>
        </div>

        <strong>
            ${highestScore.toFixed(1)}
        </strong>
    `;

    const carHeaders = cars.map(car => `
        <div class="compare-car-header">
            <span class="compare-rank">
                #${car.rank}
            </span>

            <h3>${car.name}</h3>

            <strong>
                ${car.finalScore.toFixed(1)}
            </strong>

            <button
                type="button"
                class="secondary-button compare-details-button"
                data-compare-details="${car.id}">
                View Details
            </button>
        </div>
    `).join('');

    const weightedRows = categories.map(category =>
        renderComparisonRow(
            category.label,
            cars,
            category.key,
            value => `${value}/100`
        )
    ).join('');

    const qualityRows = qualityFactors.map(factor =>
        renderComparisonRow(
            factor.label,
            cars,
            factor.key,
            value => `${value}/100`
        )
    ).join('');

    compareGrid.style.setProperty(
        '--compare-columns',
        cars.length
    );

    compareGrid.innerHTML = `
        <div class="compare-header-row">
            <div class="compare-corner">
                Vehicle
            </div>

            ${carHeaders}
        </div>

        <div class="compare-section-title">
            Buying information
        </div>

        ${renderComparisonRow(
        'Price',
        cars,
        'price',
        value => formatCurrency(value),
        true
    )}

        ${renderComparisonRow(
        'Year',
        cars,
        'year',
        value => String(value)
    )}

        ${renderTextComparisonRow(
        'Body style',
        cars,
        'bodyStyle'
    )}

        ${renderTextComparisonRow(
        'Transmission',
        cars,
        'transmission'
    )}

        ${renderTextComparisonRow(
        'Drivetrain',
        cars,
        'drivetrain'
    )}

        ${renderTextComparisonRow(
        'Fuel type',
        cars,
        'fuelType'
    )}

        ${renderComparisonRow(
        'Seats',
        cars,
        'seatingCapacity',
        value => String(value)
    )}

        <div class="compare-section-title">
            Performance specifications
        </div>

        ${renderComparisonRow(
        'Horsepower',
        cars,
        'horsepower',
        value => `${value} hp`
    )}

        ${renderComparisonRow(
        'Torque',
        cars,
        'torque',
        value => `${value} lb-ft`
    )}

        <div class="compare-section-title">
            Your weighted priorities
        </div>

        ${weightedRows}

        <div class="compare-section-title">
            Supporting quality factors
        </div>

        ${qualityRows}
    `;

    showView('compare');
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

on(rankingsList, 'click', e => {

    const favorite = e.target.closest('.favorite-btn');

    if (favorite) {
        toggleFavorite(favorite.dataset.favorite);
        return;
    }

    const checkbox = e.target.closest('.compare-checkbox');

    if (checkbox) {
        toggleCompareCar(checkbox.dataset.id);
        return;
    }

    const row = e.target.closest('.ranking-row[data-id]');

    if (!row) return;

    renderDetails(row.dataset.id);

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

on(compareButton, 'click', () => {
    renderCompare();
});

on(clearCompareButton, 'click', () => {
    state.compareIds = [];
    updateCompareUI();
});

on(document.querySelector('#back-compare'), 'click', () => {
    showView('results');
});

on(compareGrid, 'click', e => {
    const detailsButton =
        e.target.closest('[data-compare-details]');

    if (!detailsButton) return;

    renderDetails(
        detailsButton.dataset.compareDetails
    );
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

/* ---------------- FAVORITES ---------------- */

function loadFavorites() {
    const saved = localStorage.getItem("automatch-favorites");

    if (saved) {
        state.favorites = JSON.parse(saved);
    }
}

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

loadFavorites();
loadCars();
updateSlidersUI();

function saveFavorites() {
    localStorage.setItem(
        "automatch-favorites",
        JSON.stringify(state.favorites)
    );
}
function toggleFavorite(carId) {

    if (state.favorites.includes(carId)) {

        state.favorites =
            state.favorites.filter(id => id !== carId);

    } else {

        state.favorites.push(carId);

    }

    saveFavorites();

    render();
}

window.addEventListener('DOMContentLoaded', () => {
    initLocks();
});
