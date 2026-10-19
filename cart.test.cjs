const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

// Lightweight DOM doubles keep the cart tests runnable without dependencies.
function setup(options = {}, filename = 'cart.js') {
    const storage = new Map();
    if (options.cart) storage.set('solaceCart', JSON.stringify(options.cart));
    const callbacks = {};
    const timers = [];
    const alerts = [];
    const badge = { textContent: '', style: {} };
    const classes = new Set();
    const message = {
        textContent: '',
        classList: { add: value => classes.add(value), remove: value => classes.delete(value) }
    };
    let visibleBadge = options.missingBadge ? null : badge;
    const icon = options.noIcon ? null : {
        parentNode: { insertBefore: node => { visibleBadge = node; } }
    };
    const product = {
        dataset: options.dataset || { id: 'shirt-1', name: 'Shirt', price: '25', image: 'shirt.jpg' },
        querySelector: () => options.noMessage ? null : message
    };
    const button = {
        closest: () => options.noProduct ? null : product,
        addEventListener: (name, handler) => { callbacks[name] = handler; }
    };
    const context = vm.createContext({
        document: {
            addEventListener: (name, handler) => { callbacks[name] = handler; },
            querySelectorAll: () => [button],
            querySelector: () => icon,
            getElementById: () => visibleBadge,
            createElement: () => badge
        },
        sessionStorage: {
            getItem: key => storage.get(key) ?? null,
            setItem: (key, value) => storage.set(key, value)
        },
        console: { log() {}, warn() {}, error() {} },
        setTimeout: (handler, delay) => { timers.push({ handler, delay }); },
        alert: message => alerts.push(message)
    });
    vm.runInContext(fs.readFileSync(path.join(__dirname, filename), 'utf8'), context);
    callbacks.DOMContentLoaded();
    return {
        click: () => callbacks.click({ target: button, preventDefault() {} }),
        cart: () => JSON.parse(storage.get('solaceCart') || '[]'),
        badge, message, classes, alerts, timers,
        snapshot: () => ({
            cart: storage.get('solaceCart') || null,
            badge, message: message.textContent, classes: [...classes],
            alerts, delays: timers.map(timer => timer.delay)
        })
    };
}

test('empty cart hides the badge', () => {
    const app = setup();
    assert.equal(app.badge.style.display, 'none');
});

test('adding an item persists its fields and updates the badge', () => {
    const app = setup();
    app.click();
    assert.deepEqual(app.cart(), [{ id: 'shirt-1', name: 'Shirt', price: 25, image: 'shirt.jpg', quantity: 1 }]);
    assert.equal(app.badge.textContent, 1);
    assert.equal(app.badge.style.display, 'inline-block');
});

test('repeated clicks increment quantity without duplicating the item', () => {
    const app = setup();
    app.click();
    app.click();
    assert.equal(app.cart().length, 1);
    assert.equal(app.cart()[0].quantity, 2);
});

test('existing items contribute to the count and remain unchanged', () => {
    const existing = { id: 'other', quantity: 3 };
    const app = setup({ cart: [existing] });
    app.click();
    assert.deepEqual(app.cart()[0], existing);
    assert.equal(app.badge.textContent, 4);
});

test('feedback uses the original message and 1500 ms timeout', () => {
    const app = setup();
    app.click();
    assert.equal(app.message.textContent, 'Added to cart!');
    assert.equal(app.classes.has('show'), true);
    assert.equal(app.timers[0].delay, 1500);
    app.timers[0].handler();
    assert.equal(app.classes.has('show'), false);
});

test('missing feedback element uses the existing alert', () => {
    const app = setup({ noMessage: true });
    app.click();
    assert.deepEqual(app.alerts, ['Added to cart!']);
});

test('invalid product data or absent container does not alter storage', () => {
    for (const options of [{ noProduct: true }, { dataset: { id: 'x', price: 'bad' } }, { dataset: { price: '5' } }]) {
        const app = setup(options);
        app.click();
        assert.deepEqual(app.cart(), []);
    }
});

test('missing name and image retain their existing defaults', () => {
    const app = setup({ dataset: { id: 'x', price: '5' } });
    app.click();
    assert.equal(app.cart()[0].name, 'Unknown Product');
    assert.equal(app.cart()[0].image, 'https://via.placeholder.com/60x80');
});

test('a missing badge is created when a cart icon exists', () => {
    const app = setup({ missingBadge: true });
    app.click();
    assert.equal(app.badge.id, 'cart-item-count');
    assert.equal(app.badge.textContent, 1);
});

// Optional differential check against a local pre-refactor snapshot.
if (fs.existsSync(path.join(__dirname, 'cart.original.js'))) {
    test('observable behavior matches the original implementation', () => {
        const cases = [{}, { noMessage: true }, { missingBadge: true }, { noIcon: true, missingBadge: true },
            { noProduct: true }, { dataset: { id: 'x', price: 'bad' } },
            { dataset: { id: 'x', price: '5' } }, { cart: [{ id: 'shirt-1', quantity: 2 }] }];
        for (const options of cases) {
            const before = setup(options, 'cart.original.js');
            const after = setup(options);
            for (let click = 0; click < 3; click++) {
                before.click();
                after.click();
                assert.deepEqual(after.snapshot(), before.snapshot());
            }
            before.timers.forEach(timer => timer.handler());
            after.timers.forEach(timer => timer.handler());
            assert.deepEqual(after.snapshot(), before.snapshot());
        }
    });
}
