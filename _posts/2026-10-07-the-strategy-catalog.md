---
layout: default
title: The Strategy Catalog — Every Campaign Is Three Knobs
---

# The Strategy Catalog — Every Campaign Is Three Knobs
*October 7, 2026*

Every product name in this industry — retargeting, prospecting, dayparting, PDB, frequency caps — is a *contractual* vocabulary. The math underneath it is a vocabulary of three things, and once you see that the product names dissolve into bookkeeping, a surprising amount of DSP "feature work" reveals itself as configuration changes on a fixed lattice. This entry is the reduction: a catalogue of the strategies advertisers actually buy, expressed as (a) which gates are on, (b) how the value estimate is modified, and (c) which dual variables are allowed to move. Nothing else is available to a bidder.

## The machine, in one paragraph

The canonical bid problem: maximize expected value of won impressions subject to a budget, a cost-per-action ceiling, a frequency cap, and a one-bid-per-request rule. Lagrangian duality does what it always does: at the optimum, the bid on an opportunity with value `v̂` is

```
b = v̂ / λ
```

where `λ` is the budget multiplier — value divided by "what a unit of money is worth right now to this campaign" — with correction terms subtracted for each other constraint that binds. The general shape (the unified-solution form of He et al., KDD 2021, `b = w₀·v̂ − Σⱼ wⱼ·(qⱼ(1 − 1/Cⱼ) − kⱼ·pⱼ)`) is just this with all four constraint families written out. Every strategy below is a setting of which terms are nonzero and what the `λ`-loop chases.

## The catalogue

| Strategy | Gates | Value modifier | Dual moves |
|---|---|---|---|
| **Retargeting** | `id ∈ segment`, recency window | `v̂` high, decays with time-since-event | `λ` full loop; frequency dual `ν` load-bearing; throttle rarely |
| **Prospecting / new-converter** | exclusion gate `id ∉ converters` | in-house model on sparse features; lookalike score multiplies `pCVR` | cost-dual `μ` usually binding, slow loop on conversion-delayed feedback; explicit exploration reservation |
| **Frequency-capped flight** | contractual cap, re-checked at the last stage | — | `ν(t)` is the *smoother*; cap is a dual by default, with a stale-counter fallback of "cap = ∞" |
| **Dayparted flight** | none | — | `λ`-loop chases a seasonal reference curve `α(t)` instead of the linear `t/T·B` |
| **Even pacing** | — | — | `λ` by dual descent against linear `α(t)` |
| **ASAP / velocity** | — | — | deadline makes `α` near-vertical; drive bid up until supply exhausts, throttle as hard stop |
| **PDB (guaranteed)** | deal gate; type 3, payment = deal floor | irrelevant to clearing | no auction duals; volume-cap bookkeeping *outside* the machine |
| **Preferred deal (PG)** | deal gate, take-or-pass per auction | fixed price known: take iff `v̂ ≥ price` | binary choice; `λ` enters as opportunity cost of the *residual* supply you skipped |
| **PMP (deal auction)** | `private_auction=1` | — | one `λ` prices two markets (deal path + open path) |
| **Brand-safety-first** | extra hard gates: privacy fails closed, quality fails open | — | none — gates are predicates, never duals |

Reading the table as a theorem: strategies differ in **which constraint families are switched on and what the reference curve is** — the objective and the machinery are invariant.

## Three of them, in detail

**Retargeting** is the strategy with the least mystery and the most plumbing. Membership arrives by pixel, is checked at bid time (identity is a lookup, not a judgment), and the value decays with recency — the natural convention is `v̂ = V·e^{−Δ/τ}` with per-segment horizon. The interesting part is the frequency cap: it does *two* jobs. Contractually it is a hard gate re-checked late in the pipeline; economically the cap's dual `ν` is what prices the last allowed impression, and because marginal response decays with exposure, the cap's correction term grows with each impression — meaning "decay the bid, then stop" is not a special rule bolted on, it *is* the KKT condition. Where retargeting dies is by pacing arithmetic: segment populations decay without refresh, so the campaign's addressable supply shrinks under a fixed budget and `λ` drifts up mechanically. The slow death of a retargeting audience is a spend-plan symptom, and reading it as "the creative got stale" is a misdiagnosis.

**Prospecting** has the opposite data problem: no behavioral signal, so the bidder must *manufacture* labeled data, which makes exploration the strategy rather than an appendix to it. The machinery already contains two handles. The throttle variable `p(t)` — the fraction of eligible traffic you let yourself enter the auction for — is, mechanically speaking, a pure proportional bandit on the entry gate (the pacing literature's own description), and dual-descent pacing carries `Õ(√T)` regret bounds under i.i.d. arrivals (Balseiro, Lu & Mirrokni), i.e. pacing at scale *is* bandits-with-knapsacks (the Balseiro–Gur Mgmt. Sci. lineage). Exploration reservations added to the bid should be charged to the same budget dual as exploitation — no second currency — and bounded the way production PID stacks bound their actuator, so a speculative bid can never exceed value by more than the reservation. Selection bias is structural here, not incidental: prospecting models train on won impressions of self-selected traffic, and the loss-notice (censored-outcome) channel is what partially repairs the ground truth.

**Dayparting** is the most misunderstood knob. Time-of-day is not a constraint; it is the *reference* the `λ`-loop chases — `α(t)` can be a seasonal profile (an hour-of-day cost distribution estimated from training data, which is what Alibaba's multivariable-control production loop uses) instead of a clock-linear ramp. Why not hard per-hour budgets? For the same reason you don't stack serial constraint loops: sequential enforcement of many soft constraints has provably Ω(T) violation growth (the sequential-composition theorem of the pacing field guide, Balseiro, Bhawalkar, Feng, Lu, Mirrokni, Sivan & Wang, KDD 2023), and because market price is itself endogenous to demand phase, a per-hour "should" would strand value in cheap hours you were forbid to enter. A reference curve leaves the single `λ` free to arbitrage across hours; hourly budgets are a discretization of the continuous equalization, not an alternative to it.

## When strategies collide

Duality gives every *campaign* its own book: `λ`-s live in separate ledgers and never interact. But two campaigns from one buyer bid in the *same* auction, and the theory of what happens there is thin — the pacing-equilibrium object is per-campaign (Conitzer et al.), and cannibalization (one campaign outbidding its sibling for a user it would have converted anyway) shifts both equilibria while leaving each campaign's optimization untouched. The mechanism that forces a bidder to internalize the collision is the one-bid-per-request rule: with a single impression and multiple eligible campaigns, the bidder runs an auction among its own policies and answers with the highest `m·v̂` — an internal second-price with no disclosure. Everything above that — cross-campaign exclusion lists, unified frequency ceilings, shared budgets — is an orchestration layer on top of the machine, a convention, not a dual. That distinction (duals vs. conventions) is where I'd draw the line in any DSP design review: mark which of your "strategies" are constraint rows and which are agreements between humans, and stop pretending the agreements are optimal.

Two more honest gaps, on the record: this catalogue's exponential recency-decay and embedding-neighborhood lookalike score are conventions — plausible shapes, unverified formulas; and whether exploration spend should be budget-dual-charged (as I've assumed here) has no source in either direction. The rest is derivable or cited.

## References

1. He, Y., Chen, X., Wu, D., Pan, J., Tan, Q., Yu, C., Xu, J. & Zhu, X. (2021). "A Unified Solution to Constrained Bidding in Online Display Advertising." *KDD*. doi:10.1145/3447548.3467199
2. Balseiro, S., Lu, H. & Mirrokni, V. (2023). "The Best of Many Worlds: Dual Mirror Descent for Online Allocation Problems." *Operations Research* 71(1):101–119 [preprint 2020]. doi:10.1287/opre.2021.2242, arXiv:2011.10124
3. Balseiro, S. & Gur, Y. (2019). "Learning in Repeated Auctions with Budgets: Regret Minimization and Equilibrium." *Management Science* 65(9). doi:10.1287/mnsc.2018.3174
4. Conitzer, V., Kroer, C., Sodomka, E. & Stier-Moses, N. (2024). "Multiplicative Pacing Equilibria in Auction Markets." *Management Science* 70(2) [preprint EC 2019]. doi:10.1145/3328526.3329600, arXiv:1811.07166
5. Balseiro, S., Bhawalkar, K., Feng, Z., Lu, H., Mirrokni, V., Sivan, B. & Wang, S. (2023). "A Field Guide for Pacing Budget and ROS Constraints." *KDD*. arXiv:2302.08530
6. Yang, X., Li, Y., Wang, H., Wu, D., Tan, Q., Xu, J. & Gai, K. (2019). "Bid Optimization by Multivariable Control in Display Advertising." *KDD*. doi:10.1145/3292500.3330681, arXiv:1905.10928
7. Zhang, W., Yuan, S. & Wang, J. (2014). "Real-Time Bidding Benchmarking with iPinYou Dataset." arXiv:1407.7073 (for the audience- and response-data substrate the decay parameters would be fit on).
