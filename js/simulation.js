// Chicago School Economic Simulation Engine
// Implements supply/demand, welfare analysis, and rent-seeking dynamics

class EconomicSimulation {
    constructor(model) {
        this.model = model;
        this.parameters = {
            // Demand: Qd = a - b*P
            demandIntercept: 200,
            demandSlope: 1,
            
            // Supply: Qs = c + d*P  
            supplyIntercept: -50,
            supplySlope: 1,
            
            // World price (exogenous)
            worldPrice: 100,
            
            // Rent-seeking parameters
            rentSeekingEfficiency: 0.4,  // What fraction of rents is spent on lobbying
        };
    }
    
    runSimulation(tariffRate, subsidyLevel, lobbyingIntensity) {
        const results = {};
        const params = this.parameters;
        
        // Free trade equilibrium (for comparison)
        const freeTradePrice = (params.demandIntercept - params.supplyIntercept) / 
                               (params.demandSlope + params.supplySlope);
        const freeTradeQuantity = params.demandIntercept - params.demandSlope * freeTradePrice;
        
        // Step 1: Calculate prices
        const importPriceWithTariff = params.worldPrice * (1 + tariffRate / 100);
        
        results.world_price = params.worldPrice;
        results.import_price = importPriceWithTariff;
        
        if (importPriceWithTariff <= freeTradePrice) {
            // Tariff not prohibitive - imports still happen
            results.domestic_price = importPriceWithTariff;
            results.producer_price = importPriceWithTariff + subsidyLevel;
        } else {
            // Prohibitive tariff - autarky
            results.domestic_price = freeTradePrice;
            results.producer_price = freeTradePrice + subsidyLevel;
        }
        
        // Step 2: Calculate quantities
        const consumerDemand = Math.max(0, params.demandIntercept - params.demandSlope * results.domestic_price);
        const domesticSupply = Math.max(0, params.supplyIntercept + params.supplySlope * results.producer_price);
        
        if (results.domestic_price === importPriceWithTariff && importPriceWithTariff <= freeTradePrice) {
            results.imports = Math.max(0, consumerDemand - domesticSupply);
        } else {
            results.imports = 0;
        }
        
        results.consumer_demand = consumerDemand;
        results.domestic_supply = domesticSupply;
        
        // Step 3: Government accounts
        const govRevenue = (tariffRate / 100) * params.worldPrice * results.imports;
        const subsidyCost = subsidyLevel * domesticSupply;
        
        results.gov_revenue = govRevenue;
        results.subsidy_cost = subsidyCost;
        results.net_gov_budget = govRevenue - subsidyCost;
        
        // Step 4: Welfare analysis
        const consumerSurplus = 0.5 * Math.pow(Math.max(0, params.demandIntercept - results.domestic_price), 2) / params.demandSlope;
        const producerPriceWithoutSubsidy = results.producer_price - subsidyLevel;
        const producerSurplus = 0.5 * Math.pow(Math.max(0, producerPriceWithoutSubsidy - (-params.supplyIntercept / params.supplySlope)), 2) / params.supplySlope;
        
        results.consumer_surplus = consumerSurplus;
        results.producer_surplus = producerSurplus;
        
        // Step 5: Economic rents created
        const priceAboveFreeTrade = Math.max(0, results.domestic_price - freeTradePrice);
        const rentFromTariff = priceAboveFreeTrade * domesticSupply;
        const rentFromSubsidy = subsidyLevel * domesticSupply;
        
        results.economic_rent = rentFromTariff + rentFromSubsidy;
        
        // Step 6: Rent-seeking behavior
        const lobbyingMultiplier = lobbyingIntensity / 5;
        const lobbyingEffort = results.economic_rent * params.rentSeekingEfficiency * lobbyingMultiplier;
        
        results.lobbying_effort = lobbyingEffort;
        results.rent_seeking_loss = lobbyingEffort;
        
        // Step 7: Deadweight loss
        const productionDWL = 0.5 * (results.producer_price - params.worldPrice) * 
                              Math.max(0, domesticSupply - (params.supplyIntercept + params.supplySlope * params.worldPrice));
        const consumptionDWL = 0.5 * (results.domestic_price - params.worldPrice) * 
                               Math.max(0, freeTradeQuantity - consumerDemand);
        
        results.production_dwl = Math.max(0, productionDWL);
        results.consumption_dwl = Math.max(0, consumptionDWL);
        results.total_dwl = results.production_dwl + results.consumption_dwl + lobbyingEffort;
        
        // Step 8: Political influence
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
        // Rises with moat pressure
        results.concentration_index = Math.round(results.moat_pressure * 100);
        
        // Small Business Survival Rate: percentage of small firms that survive
        // Falls as moat pressure rises
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
        const baselineIncumbentShare = 20;  // Each incumbent has ~20% in free competition
        results.incumbent_share_advantage = Math.round(results.moat_pressure * 40);  // Up to +40%
        
        return results;
    }
    
    freeTradeEquilibriumPrice() {
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