// Chicago School Economic Simulation Engine
// Implements supply/demand, welfare analysis, and rent-seeking dynamics
// 
// ECONOMIC FOUNDATIONS:
// - Demand: Qd = demandIntercept - demandSlope × P
// - Supply: Qs = supplyIntercept + supplySlope × P  (supplyIntercept is negative)
// - Autarky equilibrium where Qd = Qs
// - World price exogenous; country is importer if worldPrice < autarkyPrice

class EconomicSimulation {
    constructor(model) {
        this.model = model;
        this.parameters = {
            // Demand: Qd = 200 - P (downward sloping)
            demandIntercept: 200,
            demandSlope: 1,
            
            // Supply: Qs = -50 + P, or equivalently P = 50 + Q (upward sloping)
            supplyIntercept: -50,  // Negative because supply starts at P > 0
            supplySlope: 1,
            
            // World price (exogenous) - set BELOW autarky to make us an importer
            worldPrice: 100,  // At P=$100: Qd=100, Qs=50 → imports of 50 units
            
            // Rent-seeking parameters
            rentSeekingEfficiency: 0.4,  // What fraction of rents is spent on lobbying
        };
    }
    
    /**
     * Calculate autarky (closed economy) equilibrium price and quantity
     * Where Qd = Qs: demandIntercept - b×P = c + d×P
     * Solving: P = (demandIntercept - supplyIntercept) / (demandSlope + supplySlope)
     */
    getAutarkyEquilibrium() {
        const params = this.parameters;
        const autarkyPrice = (params.demandIntercept - params.supplyIntercept) / 
                             (params.demandSlope + params.supplySlope);
        const autarkyQuantity = params.demandIntercept - params.demandSlope * autarkyPrice;
        return { price: autarkyPrice, quantity: autarkyQuantity };
    }
    
    /**
     * Calculate producer surplus at a given price
     * PS = area above supply curve and below price line
     * For linear supply Qs = c + d×P (or P = -c/d + Q/d):
     * PS = 0.5 × (P - P_min)² / slope, where P_min is choke price (-supplyIntercept/supplySlope)
     */
    calculateProducerSurplus(price) {
        const params = this.parameters;
        const supplyChokePrice = -params.supplyIntercept / params.supplySlope;  // = $50
        const effectivePriceAboveChoke = Math.max(0, price - supplyChokePrice);
        return 0.5 * Math.pow(effectivePriceAboveChoke, 2) / params.supplySlope;
    }
    
    /**
     * Calculate consumer surplus at a given price
     * CS = area below demand curve and above price line
     * For linear demand Qd = a - b×P:
     * CS = 0.5 × (demandIntercept - P)² / slope
     */
    calculateConsumerSurplus(price) {
        const params = this.parameters;
        const effectiveDemandRange = Math.max(0, params.demandIntercept - price);
        return 0.5 * Math.pow(effectiveDemandRange, 2) / params.demandSlope;
    }
    
    run() {
        // Read current policy values from the model
        const tariffNode = this.model.getNode('tariff');
        const subsidyNode = this.model.getNode('subsidy');
        const lobbyingNode = this.model.getNode('lobbying_intensity');
        
        const tariffRate = tariffNode ? tariffNode.value : 0;
        const subsidyLevel = subsidyNode ? subsidyNode.value : 0;
        const lobbyingIntensity = lobbyingNode ? lobbyingNode.value : 5;
        
        return this.runSimulation(tariffRate, subsidyLevel, lobbyingIntensity);
    }
    
    runSimulation(tariffRate, subsidyLevel, lobbyingIntensity) {
        const results = {};
        const params = this.parameters;
        
        // ========== EQUILIBRIUM CALCULATIONS ==========
        
        // Autarky equilibrium (closed economy reference point)
        const autarky = this.getAutarkyEquilibrium();
        results.autarky_price = autarky.price;  // $125
        results.autarky_quantity = autarky.quantity;  // 75 units
        
        // Free trade quantities at world price (reference point)
        const freeTradeDemand = params.demandIntercept - params.demandSlope * params.worldPrice;
        const freeTradeSupply = params.supplyIntercept + params.supplySlope * params.worldPrice;
        results.free_trade_demand = freeTradeDemand;  // 100 units
        results.free_trade_supply = freeTradeSupply;  // 50 units
        results.free_trade_imports = Math.max(0, freeTradeDemand - freeTradeSupply);  // 50 units
        
        // Step 1: Calculate prices with tariff
        const importPriceWithTariff = params.worldPrice * (1 + tariffRate / 100);
        
        results.world_price = params.worldPrice;
        results.import_price = importPriceWithTariff;
        
        // CRITICAL FIX #2: Price ceiling logic
        // Domestic price cannot exceed autarky price - if tariff makes imports too expensive,
        // consumers switch to domestic goods and market clears at autarky equilibrium
        // This is min(), not max() - the autarky price is a CEILING, not a floor
        if (importPriceWithTariff < autarky.price) {
            // Tariff non-prohibitive: imports still viable, domestic price = import price
            results.domestic_price = importPriceWithTariff;
            results.producer_price = importPriceWithTariff + subsidyLevel;
            results.is_prohibitive_tariff = false;
        } else {
            // Prohibitive tariff: imports eliminated, market clears at autarky
            results.domestic_price = autarky.price;  // CEILING - consumers won't pay more!
            results.producer_price = autarky.price + subsidyLevel;
            results.is_prohibitive_tariff = true;
        }
        
        // Step 2: Calculate quantities at equilibrium prices
        const consumerDemand = Math.max(0, params.demandIntercept - params.demandSlope * results.domestic_price);
        const domesticSupply = Math.max(0, params.supplyIntercept + params.supplySlope * results.producer_price);
        
        // Imports only if tariff is non-prohibitive
        if (!results.is_prohibitive_tariff) {
            results.imports = Math.max(0, consumerDemand - domesticSupply);
        } else {
            results.imports = 0;  // Autarky - no imports
        }
        
        results.consumer_demand = consumerDemand;
        results.domestic_supply = domesticSupply;
        
        // Step 3: Government accounts
        const govRevenue = (tariffRate / 100) * params.worldPrice * results.imports;
        const subsidyCost = subsidyLevel * domesticSupply;
        
        results.gov_revenue = govRevenue;
        results.subsidy_cost = subsidyCost;
        results.net_gov_budget = govRevenue - subsidyCost;
        
        // Step 4: Welfare analysis using CORRECT geometric formulas
        const consumerSurplus = this.calculateConsumerSurplus(results.domestic_price);
        const producerPriceWithoutSubsidy = results.producer_price - subsidyLevel;
        const producerSurplus = this.calculateProducerSurplus(producerPriceWithoutSubsidy);
        
        results.consumer_surplus = consumerSurplus;
        results.producer_surplus = producerSurplus;
        
        // Step 5: ECONOMIC RENT CALCULATION - CRITICAL FIX #3
        // Economic rent is the ARTIFICIAL profit created by protectionism
        // It equals the CHANGE in producer surplus due to policy intervention
        // NOT a crude rectangle that ignores supply curve geometry
        
        // Baseline producer surplus at free trade (world price, no subsidy)
        const baselineProducerSurplus = this.calculateProducerSurplus(params.worldPrice);
        
        // Producer surplus with protection (domestic price + any subsidy benefit)
        // Note: subsidies directly increase PS dollar-for-dollar
        const protectedProducerSurplus = producerSurplus + (subsidyLevel * domesticSupply);
        
        // Economic rent = artificial profit created by policy
        // This is the TRUE change in PS, accounting for supply curve geometry
        results.economic_rent = Math.max(0, protectedProducerSurplus - baselineProducerSurplus);
        
        // Breakdown for transparency:
        // Rectangle component: price increase × baseline quantity (pure rent)
        const priceIncrease = Math.max(0, results.domestic_price - params.worldPrice);
        results.rent_rectangle = priceIncrease * freeTradeSupply;
        
        // Triangle component: half of new production surplus (partially offset by costs)
        const additionalProduction = Math.max(0, domesticSupply - freeTradeSupply);
        results.rent_triangle = 0.5 * priceIncrease * additionalProduction;
        
        // Subsidy rent: direct transfer to producers
        results.subsidy_rent = subsidyLevel * domesticSupply;
        
        // Step 6: Rent-seeking behavior
        const lobbyingMultiplier = lobbyingIntensity / 5;
        const lobbyingEffort = results.economic_rent * params.rentSeekingEfficiency * lobbyingMultiplier;
        
        results.lobbying_effort = lobbyingEffort;
        results.rent_seeking_loss = lobbyingEffort;
        
        // Step 7: Deadweight loss - CORRECT calculation
        // DWL has three components:
        // 1. Production distortion: inefficient domestic production (triangle)
        // 2. Consumption distortion: reduced consumption below efficient level (triangle)  
        // 3. Rent-seeking waste: resources spent on lobbying (rectangle)
        
        // Production DWL: area between supply curve and world price for excess production
        const baselineSupplyAtWorldPrice = freeTradeSupply;
        if (domesticSupply > baselineSupplyAtWorldPrice && !results.is_prohibitive_tariff) {
            results.production_dwl = 0.5 * (results.producer_price - subsidyLevel - params.worldPrice) * 
                                    (domesticSupply - baselineSupplyAtWorldPrice);
        } else {
            results.production_dwl = 0;
        }
        
        // Consumption DWL: lost surplus from reduced consumption
        if (consumerDemand < freeTradeDemand) {
            results.consumption_dwl = 0.5 * (results.domestic_price - params.worldPrice) * 
                                     (freeTradeDemand - consumerDemand);
        } else {
            results.consumption_dwl = 0;
        }
        
        // Total DWL includes rent-seeking waste
        results.total_dwl = Math.max(0, results.production_dwl) + Math.max(0, results.consumption_dwl) + lobbyingEffort;
        
        // Step 8: Political influence accumulation
        const influenceFromLobbying = lobbyingEffort / 15;
        results.political_influence = Math.min(100, Math.max(0, 50 + influenceFromLobbying * lobbyingMultiplier));
        
        // ========== INDUSTRY STRUCTURE VARIABLES ==========
        
        // Moat Pressure: composite measure of barriers to competition
        // Higher when rents are high, lobbying is intense, political influence is strong
        const normalizedRent = Math.min(1, results.economic_rent / 2000);  // Cap at $2000 rent
        const normalizedLobbying = Math.min(1, lobbyingEffort / 1500);
        const normalizedInfluence = results.political_influence / 100;
        const tariffPressure = Math.min(1, tariffRate / 50);  // Cap at 50% tariff
        
        results.moat_pressure = (
            0.25 * normalizedRent +
            0.25 * normalizedLobbying +
            0.25 * normalizedInfluence +
            0.25 * tariffPressure
        );
        
        // Concentration Index: 0 = perfectly competitive, 100 = monopoly
        results.concentration_index = Math.round(results.moat_pressure * 100);
        
        // Small Business Survival Rate: percentage of small firms that survive
        results.small_business_survival = Math.max(5, Math.round((1 - results.moat_pressure) * 95 + 5));
        
        // Entrant Viability: likelihood new entrants can succeed (0-100)
        results.entrant_viability = Math.max(2, Math.round((1 - results.moat_pressure * 1.2) * 98 + 2));
        
        // Market Health Score: overall competitive health (0-100)
        results.market_health = Math.round(
            0.4 * results.small_business_survival +
            0.3 * results.entrant_viability +
            0.3 * (100 - results.concentration_index)
        );
        
        // Number of small firms surviving (out of baseline ~15)
        const baselineSmallFirms = 15;
        results.small_firms_surviving = Math.max(1, Math.round(baselineSmallFirms * (results.small_business_survival / 100)));
        
        // Incumbent market share advantage (percentage points above competitive level)
        results.incumbent_share_advantage = Math.round(results.moat_pressure * 40);  // Up to +40%
        
        return results;
    }
    
    freeTradeEquilibriumPrice() {
        // Legacy name - this actually returns AUTARKY price
        return (this.parameters.demandIntercept - this.parameters.supplyIntercept) / 
               (this.parameters.demandSlope + this.parameters.supplySlope);
    }
    
    getBaselineResults() {
        return this.runSimulation(0, 0, 5);
    }
    
    calculateChanges(currentResults, baselineResults) {
        const changes = {};
        for (const key of Object.keys(currentResults)) {
            const current = currentResults[key];
            const baseline = baselineResults[key];
            const change = current - baseline;
            const changePercent = Math.abs(baseline) > 0.01 ? (change / baseline) * 100 : (change > 0 ? 100 : 0);
            changes[key] = { value: current, change, changePercent };
        }
        return changes;
    }
}
