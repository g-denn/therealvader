(function () {
    const createSlug = (text = '') => text
        .toString()
        .toLowerCase()
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');

    const createMapEmbedUrl = (address) => `https://maps.google.com/maps?q=${encodeURIComponent(address)}&output=embed`;

    const finalizeFinancials = (property) => {
        if (!property || !property.detail) {
            return;
        }

        const financials = property.detail.financials || {};
        const managementFeeRate = typeof financials.managementFeeRate === 'number'
            ? financials.managementFeeRate
            : 0.05;

        const managementFee = Math.round((financials.monthlyRent || 0) * managementFeeRate);
        const maintenanceFees = financials.maintenanceFees || 0;
        const insuranceTaxes = financials.insuranceTaxes || 0;
        const reserveFund = financials.reserveFund || 0;
        const otherExpenses = financials.otherExpenses || 0;

        const netMonthlyIncome = Math.max(
            0,
            Math.round(
                (financials.monthlyRent || 0)
                - maintenanceFees
                - insuranceTaxes
                - managementFee
                - reserveFund
                - otherExpenses
            )
        );

        const totalTokens = property.totalTokens || 1;
        const netIncomePerToken = totalTokens > 0
            ? Number((netMonthlyIncome / totalTokens).toFixed(2))
            : 0;

        property.detail.financials = {
            ...financials,
            managementFeeRate,
            managementFee,
            netMonthlyIncome,
            netIncomePerToken
        };
    };

    const createDetail = (property, overrides = {}) => {
        const {
            address,
            mapEmbedUrl,
            propertyType,
            yearBuilt,
            developer,
            ownership,
            tenancyStatus,
            tenantType,
            monthlyRent,
            leaseRemaining,
            tenantCreditScore,
            paymentConsistency,
            vacancyRisk,
            maintenanceFees,
            insuranceTaxes,
            managementFeeRate,
            reserveFund,
            otherExpenses,
            liquidity
        } = overrides;

        const resolvedMonthlyRent = typeof monthlyRent === 'number'
            ? monthlyRent
            : Math.round(property.propertyValue * 0.004);
        const resolvedManagementFeeRate = typeof managementFeeRate === 'number'
            ? managementFeeRate
            : 0.05;
        const resolvedMaintenanceFees = typeof maintenanceFees === 'number'
            ? maintenanceFees
            : Math.round(resolvedMonthlyRent * 0.18);
        const resolvedInsuranceTaxes = typeof insuranceTaxes === 'number'
            ? insuranceTaxes
            : Math.round(resolvedMonthlyRent * 0.08);
        const resolvedReserveFund = typeof reserveFund === 'number'
            ? reserveFund
            : Math.round(resolvedMonthlyRent * 0.05);
        const resolvedOtherExpenses = typeof otherExpenses === 'number'
            ? otherExpenses
            : Math.round(resolvedMonthlyRent * 0.04);
        const resolvedAddress = address || `${property.name}, ${property.location}`;

        const resolvedVacancyRisk = vacancyRisk || (
            property.tokenization >= 60
                ? { level: 'Low', summary: 'avg 95% occupancy in area' }
                : { level: 'Moderate', summary: 'steady 88% occupancy in area' }
        );

        return {
            address: resolvedAddress,
            mapEmbedUrl: mapEmbedUrl || createMapEmbedUrl(resolvedAddress),
            propertyType: propertyType || (property.category === 'commercial' ? 'Commercial Suite' : 'Residential Condominium'),
            yearBuilt: yearBuilt || (2012 + Math.floor(Math.random() * 8)),
            developer: developer || 'Sunway Property',
            ownership: ownership || 'Freehold',
            tenancyStatus: tenancyStatus || (property.tokenization >= 50 ? 'Occupied' : 'Vacant'),
            tenantProfile: {
                type: tenantType || (property.category === 'commercial' ? 'Corporate' : 'Family'),
                monthlyRent: resolvedMonthlyRent,
                leaseRemaining: leaseRemaining || `${1 + Math.floor(Math.random() * 2)} years ${3 + Math.floor(Math.random() * 8)} months`,
                creditScore: tenantCreditScore || '730 / 850 (Good)',
                paymentConsistency: paymentConsistency || '12/12 months on time',
                vacancyRisk: resolvedVacancyRisk
            },
            financials: {
                monthlyRent: resolvedMonthlyRent,
                maintenanceFees: resolvedMaintenanceFees,
                insuranceTaxes: resolvedInsuranceTaxes,
                managementFeeRate: resolvedManagementFeeRate,
                reserveFund: resolvedReserveFund,
                otherExpenses: resolvedOtherExpenses
            },
            liquidity: liquidity || {
                secondaryDemand: `${10 + Math.floor(Math.random() * 4)} bids open`,
                averageSpread: '±2%',
                saleTime: '~3 days'
            }
        };
    };

    const createPropertyFromSeed = (seed, getNextImage) => {
        const property = {
            id: seed.id || createSlug(seed.name),
            name: seed.name,
            category: seed.category || 'residential',
            location: seed.location,
            beds: seed.beds,
            baths: seed.baths,
            sqft: seed.sqft,
            tokenization: seed.tokenization,
            propertyValue: seed.propertyValue
        };

        property.tokenPrice = Math.max(100, Math.round(property.propertyValue / 10000));
        property.totalTokens = Math.max(1, Math.round(property.propertyValue / property.tokenPrice));
        property.image = seed.image || getNextImage();
        property.status = property.tokenization === 100 ? 'Fully Tokenized' : 'Available';
        property.detail = createDetail(property, seed.detailOverrides || {});
        finalizeFinancials(property);
        return property;
    };

    document.addEventListener('DOMContentLoaded', () => {
        const propertyGrid = document.querySelector('.property-grid');
        const propertySearch = document.getElementById('propertySearch');
        const searchButton = document.querySelector('.search-btn');
        const propertyType = document.getElementById('propertyType');
        const priceRange = document.getElementById('priceRange');
        const tokenizationFilter = document.getElementById('tokenization');
        const prevButton = document.querySelector('.page-btn.prev-page');
        const nextButton = document.querySelector('.page-btn.next-page');
        const pageButtons = Array.from(document.querySelectorAll('.page-btn[data-page]'));

        if (!propertyGrid) {
            return;
        }

        const resultsCount = document.createElement('p');
        resultsCount.className = 'results-count';
        propertyGrid.insertAdjacentElement('beforebegin', resultsCount);

        const propertiesPerPage = 8;
        let currentPage = 1;

        const normalizeText = (value = '') => value
            .toString()
            .toLowerCase()
            .normalize('NFKD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9]+/g, ' ')
            .trim();

        const houseImages = [
            'pexels-binyaminmellish-106399.jpg',
            'pexels-binyaminmellish-1396132.jpg',
            'pexels-expect-best-79873-323780.jpg',
            'pexels-luis-yanez-57302-206172.jpg',
            'pexels-pixabay-210617.jpg',
            'pexels-pixabay-259588.jpg',
            'pexels-pixabay-259593.jpg',
            'pexels-pixabay-277667.jpg',
            'pexels-pixasquare-1115804.jpg',
            'pexels-scottwebb-1029599.jpg',
            'pexels-fotios-photos-2816323.jpg',
            'pexels-tara-winstead-8407011.jpg',
            'pexels-perqued-13041118.jpg',
            'pexels-heyho-7598376.jpg',
            'pexels-b-s-gulesan-2144469394-30847025.jpg',
            'pexels-szafran-30866045.jpg',
            'pexels-lina-3639542.jpg',
            'pexels-julia-kuzenkov-442028-1974596.jpg'
        ];

        let lastUsedImageIndex = -1;
        const getNextImage = () => {
            lastUsedImageIndex = (lastUsedImageIndex + 1) % houseImages.length;
            return houseImages[lastUsedImageIndex];
        };

        const bandarSunwaySeeds = [
            {
                id: 'lacosta-south-quay-4br',
                name: 'LaCosta @ Sunway South Quay',
                category: 'residential',
                location: 'Bandar Sunway, Selangor',
                beds: 4,
                baths: 3,
                sqft: 1750,
                propertyValue: 2400000,
                tokenization: 72,
                detailOverrides: {
                    address: 'LaCosta, Sunway South Quay, Bandar Sunway, Selangor',
                    propertyType: 'Residential Condominium',
                    yearBuilt: 2016,
                    developer: 'Sunway Property',
                    ownership: 'Freehold',
                    tenancyStatus: 'Occupied',
                    tenantType: 'Family',
                    monthlyRent: 9000,
                    leaseRemaining: '1 year 3 months',
                    tenantCreditScore: '740 / 850 (Good)',
                    paymentConsistency: '12/12 months on time',
                    vacancyRisk: { level: 'Low', summary: 'avg 95% occupancy in Bandar Sunway' },
                    maintenanceFees: 650,
                    insuranceTaxes: 220,
                    reserveFund: 350,
                    otherExpenses: 250,
                    liquidity: {
                        secondaryDemand: '12 bids open',
                        averageSpread: '±2%',
                        saleTime: '~3 days'
                    }
                }
            },
            {
                id: 'lacosta-south-quay-3br',
                name: 'LaCosta @ Sunway South Quay',
                category: 'residential',
                location: 'Bandar Sunway, Selangor',
                beds: 3,
                baths: 3,
                sqft: 1620,
                propertyValue: 2300000,
                tokenization: 88,
                detailOverrides: {
                    address: 'LaCosta Tower B, Sunway South Quay, Bandar Sunway, Selangor',
                    propertyType: 'Residential Condominium',
                    yearBuilt: 2016,
                    developer: 'Sunway Property',
                    ownership: 'Freehold',
                    tenancyStatus: 'Occupied',
                    tenantType: 'Corporate',
                    monthlyRent: 8200,
                    leaseRemaining: '2 years 1 month',
                    tenantCreditScore: '752 / 850 (Very Good)',
                    paymentConsistency: '24/24 months on time',
                    vacancyRisk: { level: 'Low', summary: 'avg 96% occupancy in Bandar Sunway' },
                    maintenanceFees: 580,
                    insuranceTaxes: 240,
                    reserveFund: 330,
                    otherExpenses: 210,
                    liquidity: {
                        secondaryDemand: '15 bids open',
                        averageSpread: '±1.8%',
                        saleTime: '~2 days'
                    }
                }
            },
            {
                id: 'sunway-geolake-residences',
                name: 'Sunway GeoLake Residences',
                category: 'residential',
                location: 'Bandar Sunway, Selangor',
                beds: 3,
                baths: 2,
                sqft: 1480,
                propertyValue: 1950000,
                tokenization: 64,
                detailOverrides: {
                    address: 'Sunway GeoLake Residences, Bandar Sunway, Selangor',
                    propertyType: 'Residential Condominium',
                    yearBuilt: 2019,
                    developer: 'Sunway Property',
                    ownership: 'Leasehold',
                    tenancyStatus: 'Occupied',
                    tenantType: 'Family',
                    monthlyRent: 7200,
                    leaseRemaining: '11 months',
                    tenantCreditScore: '728 / 850 (Good)',
                    paymentConsistency: '11/12 months on time',
                    vacancyRisk: { level: 'Low', summary: 'avg 93% occupancy in Bandar Sunway' },
                    maintenanceFees: 520,
                    insuranceTaxes: 210,
                    reserveFund: 300,
                    otherExpenses: 180,
                    liquidity: {
                        secondaryDemand: '10 bids open',
                        averageSpread: '±2.2%',
                        saleTime: '~4 days'
                    }
                }
            },
            {
                id: 'sunway-geo-residence',
                name: 'Sunway Geo Residence',
                category: 'residential',
                location: 'Bandar Sunway, Selangor',
                beds: 3,
                baths: 2,
                sqft: 1385,
                propertyValue: 1750000,
                tokenization: 58,
                detailOverrides: {
                    address: 'Sunway Geo Residence, Bandar Sunway, Selangor',
                    propertyType: 'Residential Condominium',
                    yearBuilt: 2017,
                    developer: 'Sunway Property',
                    ownership: 'Leasehold',
                    tenancyStatus: 'Occupied',
                    tenantType: 'Student',
                    monthlyRent: 6500,
                    leaseRemaining: '8 months',
                    tenantCreditScore: '715 / 850 (Good)',
                    paymentConsistency: '10/12 months on time',
                    vacancyRisk: { level: 'Moderate', summary: 'avg 90% occupancy in Bandar Sunway' },
                    maintenanceFees: 480,
                    insuranceTaxes: 190,
                    reserveFund: 260,
                    otherExpenses: 170,
                    liquidity: {
                        secondaryDemand: '9 bids open',
                        averageSpread: '±2.4%',
                        saleTime: '~5 days'
                    }
                }
            },
            {
                id: 'ridzuan-condominium',
                name: 'Ridzuan Condominium',
                category: 'residential',
                location: 'Bandar Sunway, Selangor',
                beds: 4,
                baths: 3,
                sqft: 1820,
                propertyValue: 1250000,
                tokenization: 41,
                detailOverrides: {
                    address: 'Ridzuan Condominium, Jalan PJS 10/24, Bandar Sunway, Selangor',
                    propertyType: 'Residential Condominium',
                    yearBuilt: 2005,
                    developer: 'PJS Ten Development',
                    ownership: 'Leasehold',
                    tenancyStatus: 'Occupied',
                    tenantType: 'Family',
                    monthlyRent: 4800,
                    leaseRemaining: '1 year 1 month',
                    tenantCreditScore: '702 / 850 (Fair)',
                    paymentConsistency: '11/12 months on time',
                    vacancyRisk: { level: 'Moderate', summary: 'avg 88% occupancy in Bandar Sunway' },
                    maintenanceFees: 420,
                    insuranceTaxes: 160,
                    reserveFund: 210,
                    otherExpenses: 150,
                    liquidity: {
                        secondaryDemand: '8 bids open',
                        averageSpread: '±2.8%',
                        saleTime: '~6 days'
                    }
                }
            },
            {
                id: 'greenfield-residence',
                name: 'Greenfield Residence',
                category: 'residential',
                location: 'Bandar Sunway, Selangor',
                beds: 3,
                baths: 2,
                sqft: 1510,
                propertyValue: 1150000,
                tokenization: 36,
                detailOverrides: {
                    address: 'Greenfield Residence, Jalan SS 19/2, Bandar Sunway, Selangor',
                    propertyType: 'Residential Condominium',
                    yearBuilt: 2019,
                    developer: 'Citrine Land',
                    ownership: 'Leasehold',
                    tenancyStatus: 'Vacant',
                    tenantType: 'Young Professional',
                    monthlyRent: 4300,
                    leaseRemaining: 'Ready for tenancy',
                    tenantCreditScore: '730 / 850 (Good)',
                    paymentConsistency: 'Ready for first tenancy',
                    vacancyRisk: { level: 'Low', summary: 'avg 92% occupancy in Bandar Sunway' },
                    maintenanceFees: 360,
                    insuranceTaxes: 150,
                    reserveFund: 190,
                    otherExpenses: 140,
                    liquidity: {
                        secondaryDemand: '11 bids open',
                        averageSpread: '±2.1%',
                        saleTime: '~4 days'
                    }
                }
            },
            {
                id: 'taman-sri-subang',
                name: 'Taman Sri Subang, Sunway',
                category: 'residential',
                location: 'Bandar Sunway, Selangor',
                beds: 4,
                baths: 3,
                sqft: 1890,
                propertyValue: 980000,
                tokenization: 29,
                detailOverrides: {
                    address: 'Taman Sri Subang, Bandar Sunway, Selangor',
                    propertyType: 'Landed Residential',
                    yearBuilt: 2001,
                    developer: 'Private Owner',
                    ownership: 'Freehold',
                    tenancyStatus: 'Occupied',
                    tenantType: 'Family',
                    monthlyRent: 3900,
                    leaseRemaining: '9 months',
                    tenantCreditScore: '695 / 850 (Fair)',
                    paymentConsistency: '9/12 months on time',
                    vacancyRisk: { level: 'Moderate', summary: 'avg 87% occupancy in Bandar Sunway' },
                    maintenanceFees: 280,
                    insuranceTaxes: 140,
                    reserveFund: 170,
                    otherExpenses: 130,
                    liquidity: {
                        secondaryDemand: '7 bids open',
                        averageSpread: '±3%',
                        saleTime: '~7 days'
                    }
                }
            }
        ];

        const bandarSunwayProperties = bandarSunwaySeeds.map(seed => createPropertyFromSeed(seed, getNextImage));

        const additionalPropertyNames = [
            'Arte Mont Kiara Residences',
            'The Astaka @ JB City',
            'Aria Luxury Residence',
            'Pavilion Suites Kuala Lumpur',
            'EcoSky Kuala Lumpur',
            'Tropicana Gardens Signatures',
            'M Vertica Cheras',
            'Bukit Bintang City Loft',
            'Star Residences KLCC',
            'SouthPoint Mid Valley',
            'Sentral Suites @ KL Sentral',
            'Tropicana Metropark Paisley',
            'The Fennel @ Sentul',
            'KSL Residences Daya',
            'Southkey Mosaic Residences',
            'Quayside Seafront Resort',
            'Queens Residences Q1',
            'The Light Collection Penang'
        ];

        const additionalPropertyLocations = [
            'Kuala Lumpur, Federal Territory',
            'Petaling Jaya, Selangor',
            'Shah Alam, Selangor',
            'Johor Bahru, Johor',
            'George Town, Penang',
            'Iskandar Puteri, Johor',
            'Cheras, Kuala Lumpur',
            'Mont Kiara, Kuala Lumpur'
        ];

        const propertyCategories = ['residential', 'commercial'];

        const generateRandomSeed = (index) => {
            const propertyValue = Math.round((900000 + Math.random() * 5200000) / 1000) * 1000;
            const tokenization = Math.min(100, 40 + Math.floor(Math.random() * 60));
            const beds = 2 + Math.floor(Math.random() * 4);
            const baths = Math.max(1, Math.round(beds * 0.75));
            const sqft = 1100 + Math.floor(Math.random() * 2400);
            const category = propertyCategories[index % propertyCategories.length];
            const name = additionalPropertyNames[index % additionalPropertyNames.length];
            const location = additionalPropertyLocations[index % additionalPropertyLocations.length];
            const id = `${createSlug(name)}-${index + 1}`;

            return {
                id,
                name,
                category,
                location,
                beds,
                baths,
                sqft,
                tokenization,
                propertyValue,
                detailOverrides: {
                    ownership: 'Freehold',
                    tenantType: category === 'commercial' ? 'Corporate' : 'Family'
                }
            };
        };

        const desiredTotal = 24;
        const additionalCount = Math.max(0, desiredTotal - bandarSunwayProperties.length);
        const additionalProperties = Array.from({ length: additionalCount }, (_, index) => {
            const seed = generateRandomSeed(index);
            return createPropertyFromSeed(seed, getNextImage);
        });

        const allProperties = [...bandarSunwayProperties, ...additionalProperties];
        sessionStorage.setItem('propertyCatalog', JSON.stringify(allProperties));
        let filteredProperties = [...allProperties];

        const getTotalPages = () => Math.max(1, Math.ceil(filteredProperties.length / propertiesPerPage));

        const updateResultsCount = () => {
            if (!resultsCount) {
                return;
            }

            resultsCount.textContent = filteredProperties.length
                ? `${filteredProperties.length} properties found`
                : 'No properties found';
        };

        const updatePaginationControls = () => {
            const totalPages = getTotalPages();
            const hasListings = filteredProperties.length > 0;

            pageButtons.forEach(button => {
                const pageNumber = Number(button.dataset.page);

                if (Number.isNaN(pageNumber) || pageNumber > totalPages) {
                    button.style.display = 'none';
                    return;
                }

                button.style.display = '';
                button.classList.toggle('active', pageNumber === currentPage);
                button.disabled = pageNumber === currentPage;
                button.setAttribute('aria-current', pageNumber === currentPage ? 'page' : 'false');
            });

            if (prevButton) {
                prevButton.disabled = !hasListings || currentPage <= 1;
                prevButton.style.display = totalPages > 1 ? '' : 'none';
            }

            if (nextButton) {
                nextButton.disabled = !hasListings || currentPage >= totalPages;
                nextButton.style.display = totalPages > 1 ? '' : 'none';
            }
        };

        const renderProperties = () => {
            const startIndex = (currentPage - 1) * propertiesPerPage;
            const endIndex = startIndex + propertiesPerPage;
            const propertiesToShow = filteredProperties.slice(startIndex, endIndex);

            propertyGrid.innerHTML = '';

            if (!propertiesToShow.length) {
                propertyGrid.innerHTML = `
                    <div class="empty-state">
                        <p>No properties match your filters right now. Try adjusting your search terms.</p>
                    </div>
                `;
                updatePaginationControls();
                updateResultsCount();
                return;
            }

            propertiesToShow.forEach(property => {
                propertyGrid.insertAdjacentHTML('beforeend', `
                    <a class="property-card" href="/property-details.html?id=${property.id}" data-property-id="${property.id}" aria-label="View ${property.name} investment details">
                        <div class="property-image">
                            <img src="./images/house_pictures/${property.image}" alt="${property.name}">
                            <div class="property-status ${property.status === 'Available' ? 'available' : 'tokenized'}">${property.status}</div>
                        </div>
                        <div class="property-details">
                            <h3>${property.name}</h3>
                            <p class="location"><i class="fas fa-map-marker-alt"></i> ${property.location}</p>
                            <div class="property-stats">
                                <span>${property.beds} Beds</span>
                                <span>${property.baths} Baths</span>
                                <span>${property.sqft.toLocaleString()} sqft</span>
                            </div>
                            <div class="tokenization-info">
                                <div class="progress-bar">
                                    <div class="progress" style="width: ${property.tokenization}%"></div>
                                </div>
                                <p>${property.tokenization}% Tokenized</p>
                            </div>
                            <div class="price-info">
                                <div class="token-price">
                                    <span>Token Price</span>
                                    <strong>${formatCurrency(property.tokenPrice)}</strong>
                                </div>
                                <div class="property-value">
                                    <span>Property Value</span>
                                    <strong>${formatCurrency(property.propertyValue)}</strong>
                                </div>
                            </div>
                            <div class="card-cta">
                                <span>View investment details</span>
                                <i class="fas fa-arrow-right"></i>
                            </div>
                        </div>
                    </a>
                `);
            });

            updatePaginationControls();
            updateResultsCount();
        };

        const filterProperties = () => {
            const searchTermRaw = propertySearch ? propertySearch.value : '';
            const normalizedSearch = normalizeText(searchTermRaw);
            const numericSearch = searchTermRaw.replace(/[^0-9]/g, '');
            const selectedType = propertyType ? propertyType.value : '';
            const selectedPriceRange = priceRange ? priceRange.value : '';
            const selectedTokenization = tokenizationFilter ? tokenizationFilter.value : '';

            filteredProperties = allProperties.filter(property => {
                const normalizedName = normalizeText(property.name);
                const valueString = property.propertyValue.toString();
                const tokenPriceString = property.tokenPrice.toString();

                const matchesSearch = !normalizedSearch
                    || normalizedName.includes(normalizedSearch)
                    || (numericSearch && (valueString.includes(numericSearch) || tokenPriceString.includes(numericSearch)));

                if (!matchesSearch) {
                    return false;
                }

                if (selectedType && property.category !== selectedType) {
                    return false;
                }

                if (selectedPriceRange) {
                    const [minPrice, maxPrice] = selectedPriceRange.split('-').map(Number);
                    if (Number.isFinite(minPrice) && Number.isFinite(maxPrice)) {
                        const withinRange = property.propertyValue >= minPrice && property.propertyValue <= maxPrice;
                        if (!withinRange) {
                            return false;
                        }
                    }
                }

                if (selectedTokenization) {
                    if (selectedTokenization === 'available' && property.tokenization >= 100) {
                        return false;
                    }
                    if (selectedTokenization === 'in-progress' && (property.tokenization === 0 || property.tokenization >= 100)) {
                        return false;
                    }
                    if (selectedTokenization === 'completed' && property.tokenization !== 100) {
                        return false;
                    }
                }

                return true;
            });

            currentPage = 1;
            renderProperties();
        };

        renderProperties();

        let searchTimeout;
        if (propertySearch) {
            propertySearch.addEventListener('input', () => {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(filterProperties, 300);
            });

            propertySearch.addEventListener('keydown', (event) => {
                if (event.key === 'Enter') {
                    event.preventDefault();
                    clearTimeout(searchTimeout);
                    filterProperties();
                }
            });
        }

        if (searchButton) {
            searchButton.addEventListener('click', (event) => {
                event.preventDefault();
                if (propertySearch) {
                    clearTimeout(searchTimeout);
                    filterProperties();
                    propertySearch.focus();
                }
            });
        }

        [propertyType, priceRange, tokenizationFilter].forEach(control => {
            if (control) {
                control.addEventListener('change', filterProperties);
            }
        });

        pageButtons.forEach(button => {
            button.addEventListener('click', () => {
                const requestedPage = Number(button.dataset.page);
                if (Number.isNaN(requestedPage) || requestedPage === currentPage) {
                    return;
                }
                currentPage = requestedPage;
                renderProperties();
                window.scrollTo({ top: 0, behavior: 'smooth' });
            });
        });

        if (prevButton) {
            prevButton.addEventListener('click', () => {
                if (currentPage <= 1) {
                    return;
                }
                currentPage -= 1;
                renderProperties();
                window.scrollTo({ top: 0, behavior: 'smooth' });
            });
        }

        if (nextButton) {
            nextButton.addEventListener('click', () => {
                const totalPages = getTotalPages();
                if (currentPage >= totalPages) {
                    return;
                }
                currentPage += 1;
                renderProperties();
                window.scrollTo({ top: 0, behavior: 'smooth' });
            });
        }

        const storeSelectedProperty = (propertyId) => {
            const property = allProperties.find(item => item.id === propertyId);
            if (property) {
                sessionStorage.setItem('selectedProperty', JSON.stringify(property));
            }
        };

        propertyGrid.addEventListener('click', (event) => {
            const card = event.target.closest('.property-card');
            if (!card) {
                return;
            }
            const propertyId = card.getAttribute('data-property-id');
            if (propertyId) {
                storeSelectedProperty(propertyId);
            }
        });
    });
})();
