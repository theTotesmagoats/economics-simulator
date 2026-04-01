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
            rentSeekingEfficiency: 0.5,  // What fraction of rents is spent on lobbying
            influenceDecay: 0.95,        // How fast influence decays per period
            policyBiasStrength: 0.1      // How much influence affects policy
        };
    }
    
    runSimulation(tariffRate, subsidyLevel, lobbyingIntensity) {
        const results = {};
        
        // Step 1: Calculate prices
        const importPrice = this.worldPrice * (1 + tariffRate / 100);
        const producerPrice = Math.max(importPrice, this.freeTradeEquilibriumPrice()) + subsidyLevel;
        const domesticPrice = Math.max(importPrice, this.freeTradeEquilibriumPrice());
        
        results.world_price = this.worldPrice;
        results.import_price = importPrice;
        results.domestic_price = domesticPrice;
        results.producer_price = producerPrice;
        
        // Step 2: Calculate quantities
        const consumerDemand = Math.max(0, this.demandIntercept - this.demandSlope * domesticPrice);
        const domesticSupply = Math.max(0, this.supplyIntercept + this.supplySlope * producerPrice);
        const imports = Math.max(0, consumerDemand - domesticSupply);
        
        results.consumer_demand = consumerDemand;
        results.domestic_supply = domesticSupply;
        results.imports = imports;
        
        // Step 3: Government accounts
        const govRevenue = (tariffRate / 100) * this.worldPrice * imports;
        const subsidyCost = subsidyLevel * domesticSupply;
        const netGovBudget = govRevenue - subsidyCost;
        
        results.gov_revenue = govRevenue;
        results.subsidy_cost = subsidyCost;
        results.net_gov_budget = netGovBudget;
        
        // Step 4: Welfare analysis
        const consumerSurplus = 0.5 * Math.pow(Math.max(0, this.demandIntercept - domesticPrice), 2) / this.demandSlope;
        const producerSurplus = 0.5 * Math.pow(Math.max(0, producerPrice - (-this.supplyIntercept / this.supplySlope)), 2) / this.supplySlope;
        
        results.consumer_surplus = consumerSurplus;
        results.producer_surplus = producerSurplus;
        
        // Step 5: Economic rents created (the protectionist prize!)
        const freeTradeProducerPrice = this.freeTradeEquilibriumPrice();
        const priceProtection = Math.max(0, domesticPrice - freeTradeProducerPrice);
        const economicRent = priceProtection * domesticSupply + subsidyLevel * domesticSupply;
        
        results.economic_rent = economicRent;
        
        // Step 6: Rent-seeking behavior
        // Lobbying intensity scales how aggressively rents are fought over
        const lobbyingMultiplier = lobbyingIntensity / 5;  // Normalize around 1
        const lobbyingEffort = economicRent * this.rentSeekingEfficiency * lobbyingMultiplier;
        
        results.lobbying_effort = lobbyingEffort;
        results.rent_seeking_loss = lobbyingEffort;  // Resources wasted
        
        // Step 7: Deadweight loss calculation
        const freeTradeQuantity = this.demandIntercept - this.demandSlope * freeTradeProducerPrice;
        const productionDWL = 0.5 * (producerPrice - freeTradeProducerPrice) * 
                              Math.max(0, domesticSupply - (-this.supplyIntercept + this.supplySlope * freeTradeProducerPrice));
        const consumptionDWL = 0.5 * (domesticPrice - freeTradeProducerPrice) * 
                               Math.max(0, freeTradeQuantity - consumerDemand);
        
        results.production_dwl = productionDWL;
        results.consumption_dwl = consumptionDWL;
        results.total_dwl = productionDWL + consumptionDWL + lobbyingEffort;
        
        // Step 8: Political influence (accumulates over time)
        // For simplicity, we calculate equilibrium influence
        const influenceFromLobbying = lobbyingEffort / 10;  // Scale factor
        results.political_influence = Math.min(100, 50 + influenceFromLobbying * lobbyingMultiplier);
        
        return results;
    }
    
    freeTradeEquilibriumPrice() {
        // Solve: a - b*P = c + d*P
        // P = (a - c) / (b + d)
        return (this.demandIntercept - this.supplyIntercept) / (this.demandSlope + this.supplySlope);
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
            const changePercent = baseline !== 0 ? (change / baseline) * 100 : 0;
            changes[key] = { value: current, change, changePercent };
        }
        return changes;
    }
}