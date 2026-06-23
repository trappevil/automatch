const categories = [
    { key: 'reliability', label: 'Reliability' },
    { key: 'costOfOwnership', label: 'Cost of Ownership' },
    { key: 'insuranceAffordability', label: 'Insurance' },
    { key: 'fuelEfficiency', label: 'Fuel' },
    { key: 'performance', label: 'Performance' }
];

const sliders = {
    reliability: document.querySelector('#reliability-slider'),
    costOfOwnership: document.querySelector('#cost-slider'),
    insuranceAffordability: document.querySelector('#insurance-slider'),
    fuelEfficiency: document.querySelector('#fuel-slider'),
    performance: document.querySelector('#performance-slider')
};

const values = {
    reliability: document.querySelector('#reliability-value'),
    costOfOwnership: document.querySelector('#cost-value'),
    insuranceAffordability: document.querySelector('#insurance-value'),
    fuelEfficiency: document.querySelector('#fuel-value'),
    performance: document.querySelector('#performance-value')
};

// weights stored as 0–100 integers
let weights = {
    reliability: 35,
    costOfOwnership: 25,
    insuranceAffordability: 20,
    fuelEfficiency: 15,
    performance: 5
};

let locked = new Set();

function sumWeights() {
    return Object.values(weights).reduce((a, b) => a + b, 0);
}

// normalize everything except dragged category + locked ones
function normalize(changedKey) {
    const total = sumWeights();

    if (total === 100) return;

    const diff = 100 - total;

    const keys = categories
        .map(c => c.key)
        .filter(k => k !== changedKey && !locked.has(k));

    if (keys.length === 0) return;

    let distribute = diff / keys.length;

    keys.forEach(k => {
        weights[k] = Math.max(1, weights[k] + distribute);
    });

    // final clamp + fix rounding drift
    let fix = 100 - sumWeights();
    weights[keys[0]] += fix;
}

function updateUI() {
    categories.forEach(c => {
        const val = Math.round(weights[c.key]);

        sliders[c.key].value = val;
        values[c.key].textContent = val + '%';
    });
}

function onSlide(key, value) {
    weights[key] = Number(value);

    normalize(key);
    updateUI();
}

// attach events
Object.entries(sliders).forEach(([key, slider]) => {
    slider.addEventListener('input', (e) => {
        onSlide(key, e.target.value);
    });
});

// click label to lock/unlock
categories.forEach(c => {
    const label = values[c.key].parentElement;

    label.addEventListener('click', () => {
        if (locked.has(c.key)) {
            locked.delete(c.key);
            label.style.opacity = 1;
        } else {
            locked.add(c.key);
            label.style.opacity = 0.5;
        }
    });
});

// init
updateUI();
