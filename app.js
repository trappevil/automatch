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
    },
    activeDrag: null
};

// DOM
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

// smooth animation (prevents jitter)
function animateValue(el, from, to) {
    const start = performance.now();
    const duration = 180;

    function frame(t) {
        const p = Math.min((t - start) / duration, 1);
        const val = from + (to - from) * p;
        el.textContent = Math.round(val);
        if (p < 1) requestAnimationFrame(frame);
    }

    requestAnimationFrame(frame);
}

// normalize weights to 100
function normalize(activeKey, newValue) {
    state.values[activeKey] = newValue;

    const lockedKeys = Object.keys(state.locked).filter(k => state.locked[k] && k !== activeKey);
    const unlockedKeys = categories.map(c => c.key).filter(k => !state.locked[k] && k !== activeKey);

    const lockedSum = lockedKeys.reduce((sum, k) => sum + state.values[k], 0);

    const remaining = 100 - lockedSum - newValue;

    if (unlockedKeys.length === 0) return;

    const totalUnlocked = unlockedKeys.reduce((sum, k) => sum + state.values[k], 0);

    unlockedKeys.forEach(k => {
        const share = state.values[k] / (totalUnlocked || 1);
        state.values[k] = Math.max(1, Math.round(share * remaining));
    });

    // fix rounding drift
    const total = Object.values(state.values).reduce((a, b) => a + b, 0);
    const diff = 100 - total;
    state.values[unlockedKeys[0]] += diff;
}

// update UI
function render() {
    categories.forEach(c => {
        const v = state.values[c.key];

        const slider = sliders[c.key];
        const label = labels[c.key];

        if (!slider) return;

        if (!slider.matches(':active')) {
            slider.value = v;
        }

        label.textContent = v;

        // CSS variable for potential future styling
        slider.style.setProperty('--val', v + '%');
    });
}

// attach slider events
categories.forEach(c => {
    const slider = sliders[c.key];

    slider.addEventListener('input', (e) => {
        const newVal = Number(e.target.value);

        normalize(c.key, newVal);
        render();
    });

    slider.addEventListener('pointerdown', () => {
        state.activeDrag = c.key;
    });

    slider.addEventListener('pointerup', () => {
        state.activeDrag = null;
    });
});

// optional lock system (click label to toggle lock)
categories.forEach(c => {
    const el = labels[c.key];

    el.style.cursor = "pointer";

    el.addEventListener('click', () => {
        state.locked[c.key] = !state.locked[c.key];
        el.style.opacity = state.locked[c.key] ? 0.4 : 1;
    });
});

// init
render();
