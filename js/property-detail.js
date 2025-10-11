(function () {
    const safeParse = (value) => {
        if (!value) {
            return null;
        }

        try {
            return JSON.parse(value);
        } catch (error) {
            console.warn('Unable to parse stored property data:', error);
            return null;
        }
    };

    const formatCurrency = (value, fractionDigits = 0) => {
        const numberValue = Number.isFinite(value) ? value : 0;
        return new Intl.NumberFormat('ms-MY', {
            style: 'currency',
            currency: 'MYR',
            minimumFractionDigits: fractionDigits,
            maximumFractionDigits: fractionDigits
        }).format(numberValue);
    };

    const formatCurrencyOrDash = (value, fractionDigits = 0) => (
        Number.isFinite(value) ? formatCurrency(value, fractionDigits) : '-'
    );

    const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

    const sanitiseNumericInput = (value) => {
        if (typeof value === 'number' && Number.isFinite(value)) {
            return value;
        }

        if (typeof value !== 'string') {
            return NaN;
        }

        const normalised = value.replace(/[^0-9.,]/g, '').replace(/,/g, '');
        return normalised ? Number(normalised) : NaN;
    };

    const isFiniteNumber = (value) => typeof value === 'number' && Number.isFinite(value);

    const clampValue = (value, min, max) => Math.min(Math.max(value, min), max);

    const createMapEmbedUrl = (address, coordinates) => {
        if (coordinates && isFiniteNumber(coordinates.lat) && isFiniteNumber(coordinates.lng)) {
            const lat = clampValue(coordinates.lat, -90, 90);
            const lng = clampValue(coordinates.lng, -180, 180);
            const latOffset = clampValue(coordinates.latOffset ?? 0.01, 0.002, 0.25);
            const lngOffset = clampValue(coordinates.lngOffset ?? 0.01, 0.002, 0.25);
            const minLat = clampValue(lat - latOffset, -90, 90).toFixed(6);
            const maxLat = clampValue(lat + latOffset, -90, 90).toFixed(6);
            const minLng = clampValue(lng - lngOffset, -180, 180).toFixed(6);
            const maxLng = clampValue(lng + lngOffset, -180, 180).toFixed(6);
            const marker = `${lat.toFixed(6)}%2C${lng.toFixed(6)}`;
            const bbox = `${minLng}%2C${minLat}%2C${maxLng}%2C${maxLat}`;

            return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${marker}`;
        }

        return '';
    };

    const finalizeFinancials = (property) => {
        if (!property.detail) {
            property.detail = {};
        }

        const propertyValue = Number.isFinite(property.propertyValue) ? property.propertyValue : 1000000;
        const detail = property.detail;
        const financials = detail.financials || {};
        const monthlyRent = typeof financials.monthlyRent === 'number' ? financials.monthlyRent : Math.round(propertyValue * 0.004);
        const managementFeeRate = typeof financials.managementFeeRate === 'number' ? financials.managementFeeRate : 0.05;
        const maintenanceFees = typeof financials.maintenanceFees === 'number' ? financials.maintenanceFees : Math.round(monthlyRent * 0.18);
        const insuranceTaxes = typeof financials.insuranceTaxes === 'number' ? financials.insuranceTaxes : Math.round(monthlyRent * 0.08);
        const reserveFund = typeof financials.reserveFund === 'number' ? financials.reserveFund : Math.round(monthlyRent * 0.05);
        const otherExpenses = typeof financials.otherExpenses === 'number' ? financials.otherExpenses : Math.round(monthlyRent * 0.04);

        const managementFee = Math.round(monthlyRent * managementFeeRate);
        const netMonthlyIncome = Math.max(0, Math.round(monthlyRent - maintenanceFees - insuranceTaxes - managementFee - reserveFund - otherExpenses));
        const totalTokens = property.totalTokens || Math.max(1, Math.round(propertyValue / (property.tokenPrice || 100)));
        const netIncomePerToken = totalTokens > 0 ? Number((netMonthlyIncome / totalTokens).toFixed(2)) : 0;

        property.detail.financials = {
            monthlyRent,
            maintenanceFees,
            insuranceTaxes,
            managementFeeRate,
            reserveFund,
            otherExpenses,
            managementFee,
            netMonthlyIncome,
            netIncomePerToken
        };
    };

    const buildDetail = (property, overrides = {}) => {
        const address = overrides.address || `${property.name}, ${property.location}`;
        const tenantProfile = overrides.tenantProfile || {};
        const liquidity = overrides.liquidity || {};

        const coordinates = overrides.coordinates && isFiniteNumber(overrides.coordinates.lat) && isFiniteNumber(overrides.coordinates.lng)
            ? {
                lat: overrides.coordinates.lat,
                lng: overrides.coordinates.lng,
                latOffset: overrides.coordinates.latOffset,
                lngOffset: overrides.coordinates.lngOffset
            }
            : undefined;

        property.detail = {
            address,
            coordinates,
            mapEmbedUrl: overrides.mapEmbedUrl || createMapEmbedUrl(address, coordinates),
            propertyType: overrides.propertyType || (property.category === 'commercial' ? 'Commercial Suite' : 'Residential Condominium'),
            yearBuilt: overrides.yearBuilt || 2016,
            developer: overrides.developer || 'Sunway Property',
            ownership: overrides.ownership || 'Freehold',
            tenancyStatus: overrides.tenancyStatus || (property.tokenization >= 50 ? 'Occupied' : 'Vacant'),
            tenantProfile: {
                type: tenantProfile.type || (property.category === 'commercial' ? 'Corporate' : 'Family'),
                monthlyRent: tenantProfile.monthlyRent,
                leaseRemaining: tenantProfile.leaseRemaining || '12 months',
                creditScore: tenantProfile.creditScore || '730 / 850 (Good)',
                paymentConsistency: tenantProfile.paymentConsistency || '12/12 months on time',
                vacancyRisk: tenantProfile.vacancyRisk || {
                    level: property.tokenization >= 60 ? 'Low' : 'Moderate',
                    summary: property.tokenization >= 60 ? 'avg 95% occupancy in area' : 'avg 88% occupancy in area'
                }
            },
            financials: overrides.financials || {},
            liquidity: {
                secondaryDemand: liquidity.secondaryDemand || '12 bids open',
                averageSpread: liquidity.averageSpread || '±2%',
                saleTime: liquidity.saleTime || '~3 days'
            }
        };

        finalizeFinancials(property);
    };

    const fallbackCatalog = (() => {
        const baseProperties = {
            'lacosta-south-quay-4br': {
                id: 'lacosta-south-quay-4br',
                name: 'LaCosta @ Sunway South Quay',
                category: 'residential',
                location: 'Bandar Sunway, Selangor',
                beds: 4,
                baths: 3,
                sqft: 1750,
                propertyValue: 2400000,
                tokenization: 72,
                tokenPrice: 240,
                image: 'pexels-binyaminmellish-106399.jpg',
                detail: {
                    address: 'LaCosta, Sunway South Quay, Bandar Sunway, Selangor',
                    coordinates: { lat: 3.0674, lng: 101.6065 },
                    mapEmbedUrl: createMapEmbedUrl('LaCosta, Sunway South Quay, Bandar Sunway, Selangor', { lat: 3.0674, lng: 101.6065 }),
                    propertyType: 'Residential Condominium',
                    yearBuilt: 2016,
                    developer: 'Sunway Property',
                    ownership: 'Freehold',
                    tenancyStatus: 'Occupied',
                    tenantProfile: {
                        type: 'Family',
                        monthlyRent: 9000,
                        leaseRemaining: '1 year 3 months',
                        creditScore: '740 / 850 (Good)',
                        paymentConsistency: '12/12 months on time',
                        vacancyRisk: { level: 'Low', summary: 'avg 95% occupancy in Bandar Sunway' }
                    },
                    financials: {
                        monthlyRent: 9000,
                        maintenanceFees: 650,
                        insuranceTaxes: 220,
                        managementFeeRate: 0.05,
                        reserveFund: 350,
                        otherExpenses: 250
                    },
                    liquidity: {
                        secondaryDemand: '12 bids open',
                        averageSpread: '±2%',
                        saleTime: '~3 days'
                    }
                }
            },
            'lacosta-south-quay-3br': {
                id: 'lacosta-south-quay-3br',
                name: 'LaCosta @ Sunway South Quay',
                category: 'residential',
                location: 'Bandar Sunway, Selangor',
                beds: 3,
                baths: 3,
                sqft: 1620,
                propertyValue: 2300000,
                tokenization: 88,
                tokenPrice: 230,
                image: 'pexels-binyaminmellish-1396132.jpg',
                detail: {
                    address: 'LaCosta Tower B, Sunway South Quay, Bandar Sunway, Selangor',
                    coordinates: { lat: 3.0674, lng: 101.6065 },
                    mapEmbedUrl: createMapEmbedUrl('LaCosta Tower B, Sunway South Quay, Bandar Sunway, Selangor', { lat: 3.0674, lng: 101.6065 }),
                    propertyType: 'Residential Condominium',
                    yearBuilt: 2016,
                    developer: 'Sunway Property',
                    ownership: 'Freehold',
                    tenancyStatus: 'Occupied',
                    tenantProfile: {
                        type: 'Corporate',
                        monthlyRent: 8200,
                        leaseRemaining: '2 years 1 month',
                        creditScore: '752 / 850 (Very Good)',
                        paymentConsistency: '24/24 months on time',
                        vacancyRisk: { level: 'Low', summary: 'avg 96% occupancy in Bandar Sunway' }
                    },
                    financials: {
                        monthlyRent: 8200,
                        maintenanceFees: 580,
                        insuranceTaxes: 240,
                        managementFeeRate: 0.05,
                        reserveFund: 330,
                        otherExpenses: 210
                    },
                    liquidity: {
                        secondaryDemand: '15 bids open',
                        averageSpread: '±1.8%',
                        saleTime: '~2 days'
                    }
                }
            },
            'sunway-geolake-residences': {
                id: 'sunway-geolake-residences',
                name: 'Sunway GeoLake Residences',
                category: 'residential',
                location: 'Bandar Sunway, Selangor',
                beds: 3,
                baths: 2,
                sqft: 1480,
                propertyValue: 1950000,
                tokenization: 64,
                tokenPrice: 195,
                image: 'pexels-expect-best-79873-323780.jpg',
                detail: {
                    address: 'Sunway GeoLake Residences, Bandar Sunway, Selangor',
                    coordinates: { lat: 3.0689, lng: 101.6107 },
                    mapEmbedUrl: createMapEmbedUrl('Sunway GeoLake Residences, Bandar Sunway, Selangor', { lat: 3.0689, lng: 101.6107 }),
                    propertyType: 'Residential Condominium',
                    yearBuilt: 2019,
                    developer: 'Sunway Property',
                    ownership: 'Leasehold',
                    tenancyStatus: 'Occupied',
                    tenantProfile: {
                        type: 'Family',
                        monthlyRent: 7200,
                        leaseRemaining: '11 months',
                        creditScore: '728 / 850 (Good)',
                        paymentConsistency: '11/12 months on time',
                        vacancyRisk: { level: 'Low', summary: 'avg 93% occupancy in Bandar Sunway' }
                    },
                    financials: {
                        monthlyRent: 7200,
                        maintenanceFees: 520,
                        insuranceTaxes: 210,
                        managementFeeRate: 0.05,
                        reserveFund: 300,
                        otherExpenses: 180
                    },
                    liquidity: {
                        secondaryDemand: '10 bids open',
                        averageSpread: '±2.2%',
                        saleTime: '~4 days'
                    }
                }
            },
            'sunway-geo-residence': {
                id: 'sunway-geo-residence',
                name: 'Sunway Geo Residence',
                category: 'residential',
                location: 'Bandar Sunway, Selangor',
                beds: 3,
                baths: 2,
                sqft: 1385,
                propertyValue: 1750000,
                tokenization: 58,
                tokenPrice: 175,
                image: 'pexels-luis-yanez-57302-206172.jpg',
                detail: {
                    address: 'Sunway Geo Residence, Bandar Sunway, Selangor',
                    coordinates: { lat: 3.0681, lng: 101.6081 },
                    mapEmbedUrl: createMapEmbedUrl('Sunway Geo Residence, Bandar Sunway, Selangor', { lat: 3.0681, lng: 101.6081 }),
                    propertyType: 'Residential Condominium',
                    yearBuilt: 2017,
                    developer: 'Sunway Property',
                    ownership: 'Leasehold',
                    tenancyStatus: 'Occupied',
                    tenantProfile: {
                        type: 'Student',
                        monthlyRent: 6500,
                        leaseRemaining: '8 months',
                        creditScore: '715 / 850 (Good)',
                        paymentConsistency: '10/12 months on time',
                        vacancyRisk: { level: 'Moderate', summary: 'avg 90% occupancy in Bandar Sunway' }
                    },
                    financials: {
                        monthlyRent: 6500,
                        maintenanceFees: 480,
                        insuranceTaxes: 190,
                        managementFeeRate: 0.05,
                        reserveFund: 260,
                        otherExpenses: 170
                    },
                    liquidity: {
                        secondaryDemand: '9 bids open',
                        averageSpread: '±2.4%',
                        saleTime: '~5 days'
                    }
                }
            }
        };

        Object.values(baseProperties).forEach(property => {
            property.totalTokens = property.totalTokens || Math.max(1, Math.round(property.propertyValue / property.tokenPrice));
            property.status = property.status || (property.tokenization === 100 ? 'Fully Tokenized' : 'Available');
            finalizeFinancials(property);
        });

        return baseProperties;
    })();

    const ensureDetail = (property) => {
        if (!property || typeof property !== 'object') {
            return null;
        }

        const cloned = JSON.parse(JSON.stringify(property));
        const fallbackValue = Number.isFinite(cloned.propertyValue) ? cloned.propertyValue : 1000000;
        const computedTokenPrice = Number.isFinite(cloned.tokenPrice)
            ? cloned.tokenPrice
            : Math.round(fallbackValue / 10000) || 100;
        const normalizedTokenPrice = Number.isFinite(computedTokenPrice) && computedTokenPrice > 0 ? computedTokenPrice : 100;
        const computedTotalTokens = Number.isFinite(cloned.totalTokens)
            ? cloned.totalTokens
            : Math.round(fallbackValue / normalizedTokenPrice) || 1000;

        cloned.category = cloned.category || 'residential';
        cloned.tokenPrice = normalizedTokenPrice;
        cloned.totalTokens = Math.max(1, computedTotalTokens);
        cloned.status = cloned.status || (cloned.tokenization === 100 ? 'Fully Tokenized' : 'Available');
        cloned.image = cloned.image || 'pexels-binyaminmellish-106399.jpg';

        if (!cloned.detail) {
            buildDetail(cloned);
        } else {
            const detail = { ...cloned.detail };
            detail.address = detail.address || `${cloned.name}, ${cloned.location}`;

            if (detail.coordinates) {
                if (!isFiniteNumber(detail.coordinates.lat) || !isFiniteNumber(detail.coordinates.lng)) {
                    delete detail.coordinates;
                } else {
                    detail.coordinates = {
                        lat: detail.coordinates.lat,
                        lng: detail.coordinates.lng,
                        latOffset: detail.coordinates.latOffset,
                        lngOffset: detail.coordinates.lngOffset
                    };
                }
            }

            detail.mapEmbedUrl = detail.mapEmbedUrl || createMapEmbedUrl(detail.address, detail.coordinates);
            detail.propertyType = detail.propertyType || (cloned.category === 'commercial' ? 'Commercial Suite' : 'Residential Condominium');
            detail.yearBuilt = detail.yearBuilt || 2016;
            detail.developer = detail.developer || 'Sunway Property';
            detail.ownership = detail.ownership || 'Freehold';
            detail.tenancyStatus = detail.tenancyStatus || (cloned.tokenization >= 50 ? 'Occupied' : 'Vacant');
            detail.tenantProfile = detail.tenantProfile || {};
            detail.tenantProfile.type = detail.tenantProfile.type || (cloned.category === 'commercial' ? 'Corporate' : 'Family');
            detail.tenantProfile.leaseRemaining = detail.tenantProfile.leaseRemaining || '12 months';
            detail.tenantProfile.creditScore = detail.tenantProfile.creditScore || '730 / 850 (Good)';
            detail.tenantProfile.paymentConsistency = detail.tenantProfile.paymentConsistency || '12/12 months on time';
            detail.tenantProfile.vacancyRisk = detail.tenantProfile.vacancyRisk || {
                level: cloned.tokenization >= 60 ? 'Low' : 'Moderate',
                summary: cloned.tokenization >= 60 ? 'avg 95% occupancy in area' : 'avg 88% occupancy in area'
            };
            detail.financials = detail.financials || {};
            detail.liquidity = detail.liquidity || {};
            detail.liquidity.secondaryDemand = detail.liquidity.secondaryDemand || '10 bids open';
            detail.liquidity.averageSpread = detail.liquidity.averageSpread || '±2%';
            detail.liquidity.saleTime = detail.liquidity.saleTime || '~3 days';

            cloned.detail = detail;
            finalizeFinancials(cloned);
        }

        return cloned;
    };

    const pickProperty = () => {
        const params = new URLSearchParams(window.location.search);
        const requestedId = params.get('id');
        const selectedRaw = safeParse(sessionStorage.getItem('selectedProperty'));
        const selectedProperty = selectedRaw ? ensureDetail(selectedRaw) : null;
        const catalogRaw = safeParse(sessionStorage.getItem('propertyCatalog'));
        const catalog = Array.isArray(catalogRaw)
            ? catalogRaw.map(item => ensureDetail(item)).filter(Boolean)
            : [];

        const fromSelection = selectedProperty && selectedProperty.id ? selectedProperty : null;
        if (fromSelection && (!requestedId || fromSelection.id === requestedId)) {
            return fromSelection;
        }

        if (requestedId && catalog.length) {
            const match = catalog.find(item => item.id === requestedId);
            if (match) {
                return match;
            }
        }

        if (fromSelection) {
            return fromSelection;
        }

        if (requestedId && fallbackCatalog[requestedId]) {
            return ensureDetail(fallbackCatalog[requestedId]);
        }

        return ensureDetail(fallbackCatalog['lacosta-south-quay-4br']);
    };

    const updateText = (selector, value) => {
        const element = document.querySelector(selector);
        if (element) {
            element.textContent = value;
        }
    };

    const updateStatusBadge = (property) => {
        const badge = document.getElementById('detailStatus');
        if (!badge) {
            return;
        }

        badge.textContent = property.status;
        badge.classList.remove('available', 'tokenized');
        badge.classList.add(property.status === 'Fully Tokenized' ? 'tokenized' : 'available');
    };

    const updateMetrics = (property) => {
        updateText('#metricBeds', property.beds ?? '-');
        updateText('#metricBaths', property.baths ?? '-');
        updateText('#metricSize', property.sqft ? `${property.sqft.toLocaleString()} sqft` : '-');
        updateText('#metricTokenPrice', formatCurrency(property.tokenPrice));
        updateText('#metricPropertyValue', formatCurrency(property.propertyValue));
    };

    const updateHeaderVisuals = (property) => {
        const image = document.getElementById('detailImage');
        if (image) {
            const imagePath = property.image && property.image.startsWith('http')
                ? property.image
                : `./images/house_pictures/${property.image}`;
            image.src = imagePath;
            image.alt = property.name;
        }

        updateText('#tokenizationPercent', `${property.tokenization}% Tokenized`);
        updateText('#totalTokens', `${property.totalTokens.toLocaleString()} tokens`);

        const progressBar = document.getElementById('tokenizationBar');
        if (progressBar) {
            progressBar.style.width = `${Math.min(100, Math.max(0, property.tokenization))}%`;
        }
    };

    const updateOverview = (property) => {
        const detail = property.detail;
        updateText('#detailAddress', detail.address);
        updateText('#detailPropertyType', detail.propertyType);
        updateText('#detailYearBuilt', detail.yearBuilt ? detail.yearBuilt.toString() : '-');
        updateText('#detailDeveloper', detail.developer || '-');
        updateText('#detailOwnership', detail.ownership || '-');
        updateText('#detailTenancy', detail.tenancyStatus || '-');

        const locationSpan = document.querySelector('#detailLocation span');
        if (locationSpan) {
            locationSpan.textContent = property.location;
        }

        const mapFrame = document.getElementById('detailMap');
        const mapWrapper = document.querySelector('[data-map-wrapper]');
        const fallback = mapWrapper?.querySelector('[data-map-fallback]');
        const fallbackAddress = fallback?.querySelector('[data-map-address]');
        const fallbackLink = fallback?.querySelector('[data-map-link]');

        if (fallbackAddress) {
            fallbackAddress.textContent = detail.address || property.location || property.name;
        }

        if (fallbackLink) {
            const mapQuery = encodeURIComponent(detail.address || property.location || property.name || 'Bandar Sunway, Selangor');
            fallbackLink.href = `https://www.openstreetmap.org/search?query=${mapQuery}`;
        }

        if (!mapFrame) {
            return;
        }

        const setFallbackVisibility = (isVisible) => {
            if (!fallback) {
                return;
            }

            if (isVisible) {
                fallback.removeAttribute('hidden');
            } else {
                fallback.setAttribute('hidden', '');
            }
        };

        if (detail.mapEmbedUrl) {
            if (mapFrame.dataset.mapSrc === detail.mapEmbedUrl) {
                setFallbackVisibility(false);
                mapFrame.removeAttribute('hidden');
                return;
            }

            setFallbackVisibility(true);
            mapFrame.removeAttribute('hidden');
            const handleLoad = () => {
                setFallbackVisibility(false);
            };

            mapFrame.addEventListener('load', handleLoad, { once: true });
            mapFrame.src = detail.mapEmbedUrl;
            mapFrame.dataset.mapSrc = detail.mapEmbedUrl;
        } else {
            mapFrame.setAttribute('hidden', '');
            mapFrame.src = 'about:blank';
            setFallbackVisibility(true);
            delete mapFrame.dataset.mapSrc;
        }
    };

    const updateTenantSection = (property) => {
        const profile = property.detail.tenantProfile || {};
        updateText('#tenantType', profile.type || '-');
        updateText('#tenantRent', formatCurrencyOrDash(profile.monthlyRent));
        updateText('#tenantLease', profile.leaseRemaining || '-');
        updateText('#tenantCreditScore', profile.creditScore || '-');
        updateText('#tenantPayment', profile.paymentConsistency || '-');

        const vacancyRisk = profile.vacancyRisk || { level: 'Moderate', summary: '' };
        updateText('#tenantVacancy', `${vacancyRisk.level}`);
        updateText('#vacancySummary', `${vacancyRisk.summary ? `${vacancyRisk.summary}.` : ''} ${property.status === 'Fully Tokenized' ? 'Existing holders receive pro-rata distributions.' : 'Current tenant underpins stable cash flow.'}`.trim());
    };

    const updateLiquiditySection = (property) => {
        const liquidity = property.detail.liquidity || {};
        updateText('#liquidityDemand', liquidity.secondaryDemand || '-');
        updateText('#liquiditySpread', liquidity.averageSpread || '-');
        updateText('#liquiditySaleTime', liquidity.saleTime || '-');

        const estimatedHolders = Math.max(12, Math.round((property.tokenization / 100) * property.totalTokens / 80));
        updateText('#liquidityTokenHolders', `${estimatedHolders.toLocaleString()} active`);
    };

    const updateFinancialSection = (property) => {
        const financials = property.detail.financials || {};
        updateText('#financialRent', formatCurrencyOrDash(financials.monthlyRent));
        updateText('#financialMaintenance', formatCurrencyOrDash(financials.maintenanceFees));
        updateText('#financialInsurance', formatCurrencyOrDash(financials.insuranceTaxes));
        updateText('#financialManagement', formatCurrencyOrDash(financials.managementFee));
        updateText('#financialReserve', formatCurrencyOrDash(financials.reserveFund));
        updateText('#financialOther', formatCurrencyOrDash(financials.otherExpenses));

        const managementLabel = document.querySelector('#financialManagement')?.previousElementSibling;
        if (managementLabel) {
            managementLabel.textContent = `Management Fee (${Math.round((financials.managementFeeRate || 0) * 100)}%)`;
        }

        const netMonthlyIncome = financials.netMonthlyIncome || 0;
        updateText('#financialNetIncome', `${formatCurrency(netMonthlyIncome)} Net Monthly Income`);
        updateText('#financialPerToken', `Net distributable per token: ${formatCurrency(financials.netIncomePerToken, 2)}`);

        const annualNet = netMonthlyIncome * 12;
        const yieldPercent = property.propertyValue > 0 ? ((annualNet / property.propertyValue) * 100) : 0;
        updateText('#financialNetSummary', `Projected net yield of ${yieldPercent.toFixed(1)}% with reserves for upkeep and vacancies.`);

        setupYieldCalculator(property, financials);
    };

    const setupYieldCalculator = (property, financials) => {
        const slider = document.getElementById('investmentSlider');
        if (!slider) {
            return;
        }

        const minInvestment = Math.max(100, property.tokenPrice);
        const maxInvestment = Math.min(property.propertyValue, minInvestment * 400);
        slider.min = String(minInvestment);
        slider.max = String(maxInvestment);
        slider.step = String(property.tokenPrice);
        slider.value = String(Math.min(maxInvestment, property.tokenPrice * 10));

        const investmentAmountEl = document.getElementById('investmentAmount');
        const estimatedIncomeEl = document.getElementById('estimatedIncome');
        const tokensPurchasedEl = document.getElementById('tokensPurchased');
        const yieldNote = document.getElementById('yieldNote');

        const updateOutputs = () => {
            const investment = Number(slider.value);
            const tokens = Math.floor(investment / property.tokenPrice);
            const adjustedInvestment = tokens * property.tokenPrice;
            const monthlyIncome = tokens * (financials.netIncomePerToken || 0);

            if (investmentAmountEl) {
                investmentAmountEl.textContent = formatCurrency(adjustedInvestment);
            }
            if (estimatedIncomeEl) {
                estimatedIncomeEl.textContent = formatCurrency(monthlyIncome, 2);
            }
            if (tokensPurchasedEl) {
                tokensPurchasedEl.textContent = tokens.toLocaleString();
            }
            if (yieldNote) {
                yieldNote.textContent = tokens
                    ? `Investing ${formatCurrency(adjustedInvestment)} secures ${tokens.toLocaleString()} tokens with an estimated RM ${monthlyIncome.toFixed(2)} monthly distribution.`
                    : 'Adjust the slider to see projected passive income at different commitment levels.';
            }
        };

        slider.addEventListener('input', updateOutputs);
        updateOutputs();
    };

    const initialiseBuyModal = (property) => {
        const openButton = document.getElementById('openBuyModal');
        const modal = document.getElementById('buyModal');
        if (!openButton || !modal) {
            return;
        }

        const dialog = modal.querySelector('.buy-modal__dialog');
        const slider = modal.querySelector('#buySlider');
        const amountInput = modal.querySelector('#buyAmount');
        const unitsInput = modal.querySelector('#buyUnits');
        const modeInputs = modal.querySelectorAll('input[name="buyMode"]');
        const sliderMinLabel = modal.querySelector('[data-slider-min]');
        const sliderMaxLabel = modal.querySelector('[data-slider-max]');
        const summaryAmount = modal.querySelector('[data-summary-amount]');
        const summaryUnits = modal.querySelector('[data-summary-units]');
        const autoInvestCheckbox = modal.querySelector('#autoInvest');
        const autoInvestCapInput = modal.querySelector('#autoInvestCap');
        const form = modal.querySelector('#buyForm');

        if (!slider || !amountInput || !unitsInput) {
            return;
        }

        const totalTokens = Number.isFinite(property.totalTokens) ? property.totalTokens : 200;
        const tokenPrice = Number.isFinite(property.tokenPrice) ? property.tokenPrice : 100;
        const maxTokensForSlider = Math.max(1, Math.min(totalTokens, 250));
        const amountBounds = {
            min: tokenPrice,
            max: tokenPrice * maxTokensForSlider
        };

        const updateSummary = (amountValue, unitValue) => {
            if (summaryAmount) {
                summaryAmount.textContent = formatCurrency(amountValue || 0);
            }
            if (summaryUnits) {
                const safeUnits = Number.isFinite(unitValue) ? unitValue : 0;
                summaryUnits.textContent = `${safeUnits.toLocaleString()} token${safeUnits === 1 ? '' : 's'}`;
            }
        };

        const setSliderLabels = (mode) => {
            if (!sliderMinLabel || !sliderMaxLabel) {
                return;
            }

            if (mode === 'amount') {
                sliderMinLabel.textContent = formatCurrency(amountBounds.min);
                sliderMaxLabel.textContent = formatCurrency(amountBounds.max);
            } else {
                sliderMinLabel.textContent = '1 token';
                sliderMaxLabel.textContent = `${maxTokensForSlider.toLocaleString()} token${maxTokensForSlider === 1 ? '' : 's'}`;
            }
        };

        let currentMode = 'amount';

        const setMode = (mode) => {
            currentMode = mode;
            const isAmountMode = mode === 'amount';
            amountInput.disabled = !isAmountMode;
            unitsInput.disabled = isAmountMode;
            amountInput.parentElement?.classList.toggle('is-active', isAmountMode);
            unitsInput.parentElement?.classList.toggle('is-active', !isAmountMode);

            setSliderLabels(mode);

            if (mode === 'amount') {
                slider.min = String(amountBounds.min);
                slider.max = String(amountBounds.max);
                slider.step = String(tokenPrice);
                const desiredAmount = sanitiseNumericInput(amountInput.value);
                const resolvedAmount = Number.isFinite(desiredAmount)
                    ? clamp(Math.round(desiredAmount / tokenPrice) * tokenPrice, amountBounds.min, amountBounds.max)
                    : tokenPrice * Math.min(10, maxTokensForSlider);
                slider.value = String(resolvedAmount);
                const derivedUnits = Math.max(1, Math.round(resolvedAmount / tokenPrice));
                amountInput.value = String(resolvedAmount);
                unitsInput.value = String(derivedUnits);
                updateSummary(resolvedAmount, derivedUnits);
            } else {
                slider.min = '1';
                slider.max = String(maxTokensForSlider);
                slider.step = '1';
                const desiredUnits = sanitiseNumericInput(unitsInput.value);
                const resolvedUnits = Number.isFinite(desiredUnits)
                    ? clamp(Math.round(desiredUnits), 1, maxTokensForSlider)
                    : Math.min(10, maxTokensForSlider);
                slider.value = String(resolvedUnits);
                const derivedAmount = resolvedUnits * tokenPrice;
                unitsInput.value = String(resolvedUnits);
                amountInput.value = String(derivedAmount);
                updateSummary(derivedAmount, resolvedUnits);
            }
        };

        const syncFromSlider = () => {
            if (currentMode === 'amount') {
                const sliderAmount = Number(slider.value);
                const roundedAmount = clamp(Math.round(sliderAmount / tokenPrice) * tokenPrice, amountBounds.min, amountBounds.max);
                const units = Math.max(1, Math.round(roundedAmount / tokenPrice));
                amountInput.value = String(roundedAmount);
                unitsInput.value = String(units);
                updateSummary(roundedAmount, units);
            } else {
                const sliderUnits = Number(slider.value);
                const units = clamp(Math.round(sliderUnits), 1, maxTokensForSlider);
                const amount = units * tokenPrice;
                unitsInput.value = String(units);
                amountInput.value = String(amount);
                updateSummary(amount, units);
            }
        };

        const handleAmountInput = () => {
            const parsedAmount = sanitiseNumericInput(amountInput.value);
            if (!Number.isFinite(parsedAmount)) {
                updateSummary(0, 0);
                return;
            }

            const roundedAmount = clamp(Math.round(parsedAmount / tokenPrice) * tokenPrice, amountBounds.min, amountBounds.max);
            const units = Math.max(1, Math.round(roundedAmount / tokenPrice));
            amountInput.value = String(roundedAmount);
            unitsInput.value = String(units);
            slider.value = String(roundedAmount);
            updateSummary(roundedAmount, units);
        };

        const handleUnitsInput = () => {
            const parsedUnits = sanitiseNumericInput(unitsInput.value);
            if (!Number.isFinite(parsedUnits)) {
                updateSummary(0, 0);
                return;
            }

            const units = clamp(Math.round(parsedUnits), 1, maxTokensForSlider);
            const amount = units * tokenPrice;
            unitsInput.value = String(units);
            amountInput.value = String(amount);
            slider.value = currentMode === 'amount' ? String(amount) : String(units);
            updateSummary(amount, units);
        };

        const openModal = () => {
            modal.hidden = false;
            modal.classList.add('buy-modal--open');
            document.body.classList.add('buy-modal-open');
            setMode(currentMode);
            requestAnimationFrame(() => {
                dialog?.focus({ preventScroll: true });
            });
        };

        const closeModal = () => {
            modal.hidden = true;
            modal.classList.remove('buy-modal--open');
            document.body.classList.remove('buy-modal-open');
            openButton.focus({ preventScroll: true });
        };

        openButton.addEventListener('click', openModal);

        modal.querySelectorAll('[data-buy-close]').forEach((el) => {
            el.addEventListener('click', closeModal);
        });

        modal.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') {
                event.preventDefault();
                closeModal();
            }
        });

        slider.addEventListener('input', syncFromSlider);

        amountInput.addEventListener('change', handleAmountInput);
        amountInput.addEventListener('blur', handleAmountInput);

        unitsInput.addEventListener('change', handleUnitsInput);
        unitsInput.addEventListener('blur', handleUnitsInput);

        modeInputs.forEach((input) => {
            input.addEventListener('change', (event) => {
                if (event.target.checked) {
                    setMode(event.target.value);
                }
            });
        });

        if (autoInvestCheckbox && autoInvestCapInput) {
            autoInvestCheckbox.addEventListener('change', () => {
                const enabled = autoInvestCheckbox.checked;
                autoInvestCapInput.disabled = !enabled;
                if (enabled && !autoInvestCapInput.value) {
                    autoInvestCapInput.value = '15';
                }
            });
        }

        if (form) {
            form.addEventListener('submit', (event) => {
                event.preventDefault();
            });
        }

        // Initialise with defaults
        amountInput.value = String(tokenPrice * Math.min(10, maxTokensForSlider));
        unitsInput.value = String(Math.min(10, maxTokensForSlider));
        setMode('amount');
    };

    document.addEventListener('DOMContentLoaded', () => {
        const property = pickProperty();
        if (!property) {
            return;
        }

        updateStatusBadge(property);
        updateText('#detailName', property.name);
        updateMetrics(property);
        updateHeaderVisuals(property);
        updateOverview(property);
        updateTenantSection(property);
        updateLiquiditySection(property);
        updateFinancialSection(property);
        initialiseBuyModal(property);
    });
})();
