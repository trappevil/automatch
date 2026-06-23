const categories = [
    { key: 'reliability', label: 'Reliability' },
    { key: 'costOfOwnership', label: 'Cost of Ownership' },
    { key: 'insuranceAffordability', label: 'Insurance Affordability' },
    { key: 'fuelEfficiency', label: 'Fuel Efficiency' },
    { key: 'performance', label: 'Performance' }
];

const state = {
    values: {
        reliability: 35,
        costOfOwnership: 25,
        insuranceAffordability: 20,
        fuelEfficiency: 15,
        performance: 5
    },
    locked: {
        reliability: false,
        costOfOwnership: false,
        insuranceAffordability: false,
        fuelEfficiency: false,
        performance: false
    }
};

const sliders = {};
const labels = {};

// bind DOM
categories.forEach(c => {
    sliders[c.key] = document.querySelector(`#${c.key}-slider`);
    labels[c.key] = document.querySelector(`#${c.key}-value`);
});

// core normalization (SAFE VERSION)
function normalize(activeKey, newValue) {
    newValue = Math.max(1, Math.min(100, newValue));

    state.values[activeKey] = newValue;

    const locked = categories.filter(c => state.locked[c.key] && c.key !== activeKey);
    const unlocked = categories.filter(c => !state.locked[c.key] && c.key !== activeKey);

    const lockedSum = locked.reduce((s, c) => s + state.values[c.key], 0);

    let remaining = 100 - lockedSum - newValue;

    if (unlocked.length === 0) {
        state.values[activeKey] = Math.max(1, 100 - lockedSum);
        return;
    }

    const currentUnlockedSum = unlocked.reduce((s, c) => s + state.values[c.key], 0);

    unlocked.forEach(c => {
        const share = state.values[c.key] / (currentUnlockedSum || 1);
        state.values[c.key] = Math.max(1, Math.round(share * remaining));
    });

    // FINAL FIX: force exact 100 sum (no drift, no negatives)
    let total = categories.reduce((s, c) => s + state.values[c.key], 0);
    let diff = 100 - total;

    // apply correction safely
    const firstUnlocked = unlocked[0] || categories.find(c => !state.locked[c.key]);

    if (firstUnlocked) {
        state.values[firstUnlocked.key] += diff;
    }
}

// UI render
function render() {
    categories.forEach(c => {
        const val = state.values[c.key];

        sliders[c.key].value = val;
        labels[c.key].textContent = val;
    });
}

// events
categories.forEach(c => {
    sliders[c.key].addEventListener('input', (e) => {
        normalize(c.key, Number(e.target.value));
        render();
    });

    labels[c.key].style.cursor = "pointer";

    labels[c.key].addEventListener('click', () => {
        state.locked[c.key] = !state.locked[c.key];
        labels[c.key].style.opacity = state.locked[c.key] ? 0.4 : 1;
    });
});

// init
render();
