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
        
        // Domestic price is the lower of: import price with tariff, or autarky equilibrium
        // But if subsidy exists, producers get more than consumers pay
        results.world_price = params.worldPrice;
        results.import_price = importPriceWithTariff;
        
        // With tariff but no subsidy: domestic price = min(import price with tariff, autarky price)
        // Actually, in a small open economy, if world price + tariff < autarky price, we import
        // If world price + tariff > autarky price, we produce domestically at autarky price
        
        const autarkyPrice = freeTradePrice;  // Same as free trade in this model
        
        if (importPriceWithTariff <= autarkyPrice) {
            // Tariff not prohibitive - imports still happen
            results.domestic_price = importPriceWithTariff;
            results.producer_price = importPriceWithTariff + subsidyLevel;
        } else {
            // Prohibitive tariff - autarky
            results.domestic_price = autarkyPrice;
            results.producer_price = autarkyPrice + subsidyLevel;
        }
        
        // Step 2: Calculate quantities
        const consumerDemand = Math.max(0, params.demandIntercept - params.demandSlope * results.domestic_price);
        const domesticSupply = Math.max(0, params.supplyIntercept + params.supplySlope * results.producer_price);
        
        // Imports only if domestic price equals import price (not autarky)
        if (results.domestic_price === importPriceWithTariff && importPriceWithTariff <= autarkyPrice) {
            results.imports = Math.max(0, consumerDemand - domesticSupply);
        } else {
            results.imports = 0;  // Autarky or domestic supply exceeds demand
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
        // Rent from tariff protection: extra profit due to higher price than free trade
        const priceAboveFreeTrade = Math.max(0, results.domestic_price - freeTradePrice);
        const rentFromTariff = priceAboveFreeTrade * domesticSupply;
        
        // Rent from subsidy: direct transfer to producers
        const rentFromSubsidy = subsidyLevel * domesticSupply;
        
        results.economic_rent = rentFromTariff + rentFromSubsidy;
        
        // Step 6: Rent-seeking behavior
        const lobbyingMultiplier = lobbyingIntensity / 5;  // Normalize around 1
        const lobbyingEffort = results.economic_rent * params.rentSeekingEfficiency * lobbyingMultiplier;
        
        results.lobbying_effort = lobbyingEffort;
        results.rent_seeking_loss = lobbyingEffort;
        
        // Step 7: Deadweight loss
        // Production DWL: producing at higher cost than world price
        const productionDWL = 0.5 * (results.producer_price - params.worldPrice) * 
                              Math.max(0, domesticSupply - (params.supplyIntercept + params.supplySlope * params.worldPrice));
        
        // Consumption DWL: consumers buy less due to higher price
        const consumptionDWL = 0.5 * (results.domestic_price - params.worldPrice) * 
                               Math.max(0, freeTradeQuantity - consumerDemand);
        
        results.production_dwl = Math.max(0, productionDWL);
        results.consumption_dwl = Math.max(0, consumptionDWL);
        results.total_dwl = results.production_dwl + results.consumption_dwl + lobbyingEffort;
        
        // Step 8: Political influence
        const influenceFromLobbying = lobbyingEffort / 15;
        results.political_influence = Math.min(100, Math.max(0, 50 + influenceFromLobbying * lobbyingMultiplier));
        
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