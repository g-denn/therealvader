(function () {
    const modal = document.getElementById('sellModal');
    const openButton = document.getElementById('openSellModal');

    if (!modal || !openButton) {
        return;
    }

    const dialog = modal.querySelector('.sell-modal__dialog');
    const closeTriggers = modal.querySelectorAll('[data-sell-close]');
    const propertySelect = document.getElementById('sellProperty');
    const modeInputs = Array.from(modal.querySelectorAll('input[name="sellMode"]'));
    const toggleLabels = Array.from(modal.querySelectorAll('.sell-form__toggle-option'));
    const amountInput = document.getElementById('sellAmount');
    const unitsInput = document.getElementById('sellUnits');
    const slider = document.getElementById('sellSlider');
    const sliderValue = modal.querySelector('[data-sell-slider-value]');
    const availableUnitsEl = modal.querySelector('[data-available-units]');
    const unitPriceEl = modal.querySelector('[data-unit-price]');
    const proceedsEl = modal.querySelector('[data-estimated-proceeds]');
    const autoInvestCheckbox = document.getElementById('sellAutoInvest');
    const autoInvestCap = document.getElementById('sellAutoCap');
    const form = document.getElementById('sellForm');

    const holdings = {
        lacosta: { name: 'LaCosta @ Sunway South Quay', units: 1250, value: 1250000 },
        geolake: { name: 'Sunway GeoLake Residences', units: 940, value: 1080000 },
        greenfield: { name: 'Greenfield Residence', units: 780, value: 735000 },
        ridzuan: { name: 'Ridzuan Condominium', units: 520, value: 612000 }
    };

    Object.values(holdings).forEach((holding) => {
        holding.pricePerUnit = holding.units ? holding.value / holding.units : 0;
    });

    const currencyFormatter = new Intl.NumberFormat('en-MY', {
        style: 'currency',
        currency: 'MYR',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });

    const unitsFormatter = new Intl.NumberFormat('en-MY', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
    });

    let currentMode = 'amount';
    let previouslyFocusedElement = null;

    autoInvestCap.disabled = !autoInvestCheckbox.checked;

    function formatCurrency(value) {
        return currencyFormatter.format(value || 0);
    }

    function formatUnits(value) {
        return `${unitsFormatter.format(value || 0)} units`;
    }

    function getHolding() {
        return holdings[propertySelect.value];
    }

    function clampUnits(units, holding) {
        if (!holding) {
            return 0;
        }
        return Math.min(Math.max(units, 0), holding.units);
    }

    function toAmountInput(value) {
        if (!Number.isFinite(value)) {
            return '';
        }
        return (Math.round(value * 100) / 100).toFixed(2);
    }

    function toUnitsInput(value) {
        if (!Number.isFinite(value)) {
            return '';
        }
        const rounded = Math.round(value * 100) / 100;
        if (Math.abs(rounded) < 0.005) {
            return '0';
        }
        return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2);
    }

    function syncToggleStyles() {
        toggleLabels.forEach((label) => {
            const input = label.querySelector('input');
            label.classList.toggle('is-selected', input && input.checked);
        });
    }

    function updateMode() {
        amountInput.disabled = currentMode !== 'amount';
        unitsInput.disabled = currentMode !== 'units';
        syncToggleStyles();
        updateFromUnits(parseFloat(unitsInput.value) || 0, { origin: 'mode' });
    }

    function updateAvailableMeta(holding) {
        availableUnitsEl.textContent = formatUnits(holding.units);
        unitPriceEl.textContent = formatCurrency(holding.pricePerUnit);
    }

    function updateSliderValueDisplay(units, amount) {
        const holding = getHolding();
        const percent = holding && holding.units
            ? Math.round((units / holding.units) * 100)
            : 0;
        const detail = currentMode === 'amount' ? formatCurrency(amount) : formatUnits(units);
        sliderValue.textContent = `${percent}% of holdings (${detail})`;
    }

    function updateSliderFromUnits(units) {
        const holding = getHolding();
        if (!holding || !holding.units) {
            slider.value = 0;
            sliderValue.textContent = '0% of holdings';
            return;
        }
        const percent = Math.round((units / holding.units) * 100);
        slider.value = Math.min(Math.max(percent, 0), 100);
        updateSliderValueDisplay(units, units * holding.pricePerUnit);
    }

    function updateFromUnits(units, options = {}) {
        const holding = getHolding();
        if (!holding) {
            return;
        }
        const clampedUnits = clampUnits(units, holding);
        const amount = clampedUnits * holding.pricePerUnit;

        if (options.origin !== 'units') {
            unitsInput.value = toUnitsInput(clampedUnits);
        }

        if (options.origin !== 'amount') {
            amountInput.value = toAmountInput(amount);
        }

        proceedsEl.textContent = formatCurrency(amount);
        updateSliderFromUnits(clampedUnits);
    }

    function handleAmountChange() {
        const holding = getHolding();
        if (!holding) {
            return;
        }
        let amount = Number.parseFloat(amountInput.value);
        if (!Number.isFinite(amount)) {
            amount = 0;
        }
        amount = Math.max(0, amount);
        if (amount > holding.value) {
            amount = holding.value;
            amountInput.value = toAmountInput(amount);
        }
        const units = holding.pricePerUnit ? amount / holding.pricePerUnit : 0;
        updateFromUnits(units, { origin: 'amount' });
    }

    function handleUnitsChange() {
        const holding = getHolding();
        if (!holding) {
            return;
        }
        let units = Number.parseFloat(unitsInput.value);
        if (!Number.isFinite(units)) {
            units = 0;
        }
        units = clampUnits(units, holding);
        if (units !== Number.parseFloat(unitsInput.value)) {
            unitsInput.value = toUnitsInput(units);
        }
        updateFromUnits(units, { origin: 'units' });
    }

    function handleSliderInput() {
        const holding = getHolding();
        if (!holding) {
            return;
        }
        const percent = Number.parseFloat(slider.value) || 0;
        const units = (percent / 100) * holding.units;
        updateFromUnits(units, { origin: 'slider' });
    }

    function openModal() {
        previouslyFocusedElement = document.activeElement;
        modal.hidden = false;
        document.body.classList.add('sell-modal-open');
        autoInvestCap.disabled = !autoInvestCheckbox.checked;
        updateAvailableMeta(getHolding());
        updateFromUnits(0, { origin: 'reset' });
        slider.value = 0;
        sliderValue.textContent = '0% of holdings';
        requestAnimationFrame(() => {
            propertySelect.focus();
        });
    }

    function closeModal() {
        modal.hidden = true;
        document.body.classList.remove('sell-modal-open');
        if (previouslyFocusedElement && typeof previouslyFocusedElement.focus === 'function') {
            previouslyFocusedElement.focus();
        }
    }

    function handleKeyDown(event) {
        if (event.key === 'Escape') {
            event.preventDefault();
            closeModal();
            return;
        }

        if (event.key !== 'Tab') {
            return;
        }

        const focusable = Array.from(dialog.querySelectorAll(
            'a[href], button:not([disabled]), textarea, input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )).filter((el) => !el.hasAttribute('aria-hidden'));

        if (!focusable.length) {
            return;
        }

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first.focus();
        } else if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last.focus();
        }
    }

    function resetForm() {
        amountInput.value = '';
        unitsInput.value = '';
        slider.value = 0;
        sliderValue.textContent = '0% of holdings';
        updateFromUnits(0, { origin: 'reset' });
    }

    openButton.addEventListener('click', openModal);

    closeTriggers.forEach((trigger) => {
        trigger.addEventListener('click', closeModal);
    });

    modal.addEventListener('keydown', handleKeyDown);

    propertySelect.addEventListener('change', () => {
        updateAvailableMeta(getHolding());
        resetForm();
    });

    modeInputs.forEach((input) => {
        input.addEventListener('change', () => {
            if (input.checked) {
                currentMode = input.value;
                updateMode();
            }
        });
    });

    amountInput.addEventListener('input', handleAmountChange);
    unitsInput.addEventListener('input', handleUnitsChange);
    slider.addEventListener('input', handleSliderInput);

    autoInvestCheckbox.addEventListener('change', () => {
        autoInvestCap.disabled = !autoInvestCheckbox.checked;
    });

    form.addEventListener('submit', (event) => {
        event.preventDefault();
        closeModal();
    });

    updateAvailableMeta(getHolding());
    updateFromUnits(0, { origin: 'initial' });
    syncToggleStyles();
})();
