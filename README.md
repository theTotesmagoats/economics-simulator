# Economics Simulator

## Interactive Causal Graph for Protectionism & Rent-Seeking

A Chicago School economics simulator that visualizes how protectionist policies create economic distortions and rent-seeking behavior. Built with the insight that **every effect must be traceable back to its cause** — if you can't explain *why* something happened, the model has failed.

---

## Philosophy

Inspired by Milton Friedman and Thomas Sowell:

- **Follow the incentives**: Every actor responds rationally to constraints and rewards
- **Second-order effects matter**: The seen vs. the unseen (Bastiat)
- **Tradeoffs are real**: There are no free lunches, only hidden costs
- **Rent-seeking is central**: Protectionism creates artificial profits that motivate wasteful political competition

---

## Features

### Policy Controls
- **Import Tariff Rate** (0-100%): Tax on imported goods
- **Production Subsidy** ($/unit): Government payment to domestic producers  
- **Political Environment**: Scales how aggressively rents are fought over

### Visual Encoding
- 🔴 **Red nodes**: Policy interventions
- 🔵 **Blue nodes**: Economic variables (prices, quantities, welfare)
- 🟠 **Orange nodes**: Rent-seeking dynamics (the trap!)

### Key Insights the Simulator Reveals

1. **Tariffs raise consumer prices** — The basic point most understand
2. **Protection creates economic rents** — Artificial profits for protected producers
3. **Rents motivate lobbying** — Resources spent competing for protection
4. **Lobbying builds political influence** — Which biases future policy
5. **The feedback loop** — Protection begets more protection through politics
6. **Total deadweight loss includes rent-seeking** — Often larger than traditional DWL triangles

---

## How to Use

1. **Start at free trade** (all sliders at zero/medium)
2. **Increase the tariff** and watch effects propagate:
   - Import price rises → domestic price rises
   - Consumer demand falls, domestic production rises
   - Economic rents are created for producers
3. **Watch the orange nodes activate** — rent-seeking kicks in
4. **Click any node** to see detailed explanation of what it represents and why it changed
5. **Compare deadweight loss components** — notice how rent-seeking can dominate

---

## Technical Architecture

```
economics-simulator/
├── index.html          # Main entry point
├── css/
│   └── styles.css      # Dark theme, animations
├── js/
│   ├── model.js        # Causal graph data structure
│   ├── simulation.js   # Chicago school economic math
│   ├── graph.js        # D3.js visualization
│   └── app.js          # Application logic & interactions
└── README.md
```

### Economic Model (Chicago School)

**Supply/Demand:**
- Demand: Qd = 200 - P
- Supply: Qs = -50 + P
- Free trade equilibrium: P* = $150, Q* = 50 units

**Tariff Effects:**
- Import price = World Price × (1 + tariff/100)
- Domestic price = max(import price, free trade price)
- Producer price = domestic price + subsidy

**Rent Creation:**
- Economic Rent = (Protected Price - Competitive Price) × Protected Quantity
- This is the "prize" motivating rent-seeking

**Rent-Seeking:**
- Lobbying Effort = Rent × Efficiency × Political Environment
- Resources wasted = lobbying effort (pure deadweight loss)

---

## Running Locally

Simply open `index.html` in a browser — no server required.

Or deploy to GitHub Pages:
```
git push origin main
```
Then enable GitHub Pages in repository settings.

---

## Planned Extensions

- [ ] Quotas (different rent distribution than tariffs)
- [ ] Multiple sectors with interdependencies
- [ ] Dynamic time simulation showing policy lags
- [ ] Retaliatory tariff modeling
- [ ] Exchange rate effects
- [ ] Export subsidies

---

## License

MIT — Use freely, modify as needed. The ideas belong to Friedman, Sowell, Tullock, Buchanan, and decades of public choice economics.

---

> "The curious task of economics is to demonstrate to men how little they really know about what they imagine they can design." — Friedrich Hayek