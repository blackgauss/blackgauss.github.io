---
layout: default
title: Forecasting the Bid Landscape
---

# Forecasting the Bid Landscape
*October 6, 2026*

A DSP's value model says what an impression is *worth*. It says nothing about
what it will *cost*. The statistical object that answers the cost question is
the **bid landscape**: for an individual auction with features `x`, the
conditional distribution `p(z|x)` of the market price `z` — the minimum bid
that would have won, meaning the runner-up bid or the binding floor. Given
`p(z|x)`, every decision downstream is an integral:

```
win probability at bid b     W(b) = Pr(z < b | x)
expected cost per win        ∫₀ᵇ z·p(z|x) dz
expected spend per auction   b·W(b)      (first price)   /   ∫₀ᵇ z p(z|x)dz   (second)
```

The literature states the dependency bluntly. Zhang, Yuan & Wang's optimal
bidding paper (KDD 2014) — "to obtain an optimal bidding strategy, one needs
the distribution of the winning price," not its point estimate. LinkedIn's
pacing paper says the same from the control side: hitting a spend curve
requires quantiles of the winning-price distribution. The landscape is
*the* load-bearing statistical object of a bidder, with a fascinating secret:
the training data has a hole in it, and a decade of papers is a succession of
ways to estimate around the hole.

## The hole, precisely: right-censoring

In a second-price auction, when you *win*, the exchange (optionally, by
policy) tells you the clearing price `z`. When you *lose*, it tells you
nothing — the only information is the inequality `z ≥ b`; your bid was a
lower bound. So the training set is a mixture of exact observations and
censored lower bounds. In the vocabulary of biostatistics: **right-censored
data**, where win/lose plays the role of death/survival event, the market
price is survival time, and your bid is the censoring time. This is why the
foundations of this literature are Tobit (1953 econometrics), Kaplan–Meier
(1958), and Cox regression — survival analysis, re-purposed for money.

Why naive regression on winners alone fails, with numbers that should be
tattooed: in the iPinYou logs (64.7M bid requests; the paper's simulation),
**the average market price conditioned on wins is around 25 CNY; conditioned
on losses, around 100.** The distribution restricted to your winners is
drastically cheaper than reality, because you only see the cheap tail. A
landscape model fit to winners alone concludes the market is cheap, shades
aggressively, loses auctions, never observes those losses, and starves — a
measurement bias that self-enforces. (The related theoretical warning, from
Balseiro, Besbes & Weintraub, 2015: truthful bidding is dominant *only*
without budget constraints and repetition; both always apply, so a bidder
must shade — which you can only do with a landscape.)

## The genealogy, constraint by constraint

Each generation of methods relaxed an assumption its predecessor needed.

**(1) 2011 — template lookup + log-normal. Cui et al., KDD, "Bid Landscape
Forecasting in Online Ad Exchange Marketplace"** — which named the field.
Match the incoming request to a request-type segment; reuse that segment's
empirical price histogram, smoothed with a log-normal fit (the distributional
assumption that all later papers attack). Simple, feature-blind-by-segment,
surprisingly durable for coarse segmentation. Log-normality's standing is
worth stating precisely: the RTB measurement literature's "roughly log-normal"
observation is an *aggregate-pooling* fact, and it dissolves the moment you
test it where forecasters actually use it — Yuan et al. (2013) split 50
placements × 160 days into ~192k ⟨placement, hour⟩ segments and found
**under 1% passed Shapiro–Wilk or Anderson–Darling**, no matter the bidder or
the hour's volume. The fixed-form parametric era wasn't superseded because it
was suboptimal; it was superseded because its premise fails ~99% of the time
at segment level. (The paper notes bids "vary greatly throughout a day,"
which is exactly why they split by hour — pool hard enough and normality in
log-space looks fine again. That's the honest version.)

**(2) 2015 — censored regression. Wu, Yeh & Chen, KDD, "Predicting Winning
Price in Real Time Bidding with Censored Data."** Model `w = βᵀx + ε`, `ε ~
N(0, σ²)`, and do MLE over *both* observation types: a win at price `w`
contributes the Gaussian density `p(w)`; a loss at bid `b` contributes the
survival probability `Pr(W > b) = Φ((βᵀx − b)/σ)`. The combined
negative-log-likelihood (the exact objective in the Adobe/Amazon "Scalable
BLF" paper that follows):

```
argmax  Σ_{wins} log[(1/σ)·φ((wᵢ − βᵀxᵢ)/σ)]  +  Σ_{losses} log Φ((βᵀxᵢ − bᵢ)/σ)
```

Consistent and unbiased *iff* the noise is actually fixed-variance Gaussian
— which the follow-up work demonstrated is *not true on real data*:
non-Gaussian and non-constant-variance across iPinYou clusters. Two failures
to attack in turn: heteroscedasticity, then shape.

**(3) 2016 — survival trees. "Functional Bid Landscape Forecasting" (Wang et
al., ECML-PKDD).** A decision tree over request features, with a
nonparametric Kaplan–Meier estimator in each leaf — zero distributional
assumptions, interpretable, coarse. The empirical cost of assumption-freedom:
estimators that ignore feature *content* (KM-style counting) lose about 10%
to feature-using parametric models; trees and hybrids struggle to scale to
huge feature spaces.

**(4) 2019 — relax the noise scale, then the shape. "Scalable Bid Landscape
Forecasting in Real-Time Bidding" (Ghosh, Mitra, Sarkhel, Xie, Wu,
Swaminathan, ECML-PKDD; Adobe).** Two stacked fixes. *P-CR*: heteroscedastic
parametric censored regression — let the noise scale with features, `σᵢ =
exp(αᵀxᵢ)`, giving `Wᵢ ~ N(βᵀxᵢ, exp(αᵀxᵢ)²)`; plain CR appears as the
constant-σ special case, and heteroscedasticity alone earns 5–10%. *MCNet*:
drop unimodality entirely — a mixture-density network outputs (πₖ, μₖ, σₖ),
an MDN can approximate any smooth density (Bishop 1994), and censored samples
enter through **quantized bin probabilities**: a win at `w` contributes
`Pr(W ∈ [w−½, w+½])`, a loss at `b` contributes `Pr(W ≥ b−½)`. On Adobe
AdCloud (31.77M samples, 33,492 features): ANLP (average negative log
probability; lower better) 0.348 for MCNet vs 0.474 CR, 0.421 survival
trees, 0.467 KM — 25% over plain censored regression; on iPinYou daily
slices MCNet beats CR by >30% every single day.

**(5) 2019 — go distribution-free with a price ladder. "Deep Landscape
Forecasting" (Ren, Qin, Zheng, Yang, Zhang, Yu, KDD; DLF).** The cleverest
formulation in the lineage. Discretize price into `L` integer intervals
(ICT — 300 suffices on iPinYou); feed `(x, price-index ℓ)` sequentially into
an LSTM cell that outputs the **conditional** probability that the price
lands inside interval `ℓ`, *given* it's above the previous rung:

```
hₗ = Pr(z ∈ Vₗ | z ≥ b_{ℓ−1}, x; θ)
S(b) = Π_{ℓ ≤ ℓ_b} (1 − hₗ)        W(b) = 1 − Π_{ℓ ≤ ℓ_b} (1 − hₗ)
p at true bin:  p_ℓ = h_ℓ · Π_{m<ℓ}(1 − h_m)          (chain rule of survival)
```

and — the departure from all survival-analysis precedent — **train on two
losses**: `L₁` the exact-density NLL over wins, and `L₂`, *plain cross-entropy
win/lose classification on every auction*: `−Σ [wᵢ log W(bᵢ) +
(1−wᵢ) log(1−W(bᵢ))]`. Prior methods (Cox, KM trees, DWPP's parametric deep
censored learner) use only the likelihood plus censored tail, throwing away
the classification signal that is actually the most abundant thing RTB logs
contain: wins and losses. Report card on iPinYou, overall ANLP: **DLF 4.774,
survival trees 5.148, DeepHit 5.544, Kaplan–Meier 15.4, Lasso-Cox 38.6.**

**(6) also 2019 — interpretable segments.** Market Segmentation Trees
(Aouad, Elmachtoub, Ferreira, McNellis) apply isotonic regression trees to
landscapes: the monotonicity of `W(b)` in `b` is *enforced by construction*,
which matters as a correctness property more than a metric one (below).

## What the landscape is *for* — the five hooks

1. **Bid shading in first-price auctions** — the optimal shade solves
   `v − b* = W(b*)/w(b*)`: surplus over bid equals the *inverse hazard rate*
   of market price. That's the win-rate curve, which is the landscape's
   derivative — landscape modeling and shading are the same object consumed
   from different angles.
2. **Budget pacing** — to spend the daily budget evenly you must know the
   marginal cost of the next percentile of supply: quantiles of `p(z|x)`,
   feeding the controller's plant model.
3. **Optimal constrained bidding** — the ORB KKT identity `λ·w(b) =
   (θ − λb)·w′(b)` says the optimal bid *function* depends on nothing else
   but the landscape's shape and the budget shadow price. The value
   distribution only moves λ.
4. **Calibration discipline** — a landscape is a probability model: ANLP is
   log-loss, DLF's win/lose head is a classifier. Everything the CTR
   literature says about calibration applies verbatim; slice-level checks and
   all.
5. **Exploration budgets** — you can't estimate what you never bid on, and a
   landscape with confidence bounds is what lets you budget exploration
   (bandit/Knapsack formulations) instead of trusting stale segments.

## The serving corollary

DLF costs O(L) LSTM steps per bid at query time (300 sequential steps — not a
100 ms budget item). MCNet's mixture likelihoods are products of densities. The
practice that follows, and it's the sentence worth remembering: **landscapes
are offline artifacts.** Trained per campaign × segment × daypart, published
nightly or by stream-merge into the serving store, and the bidder at query
time evaluates a lookup and a handful of scalar products and exponentials.
Train slow, serve cheap: the ML lives in the warehouse; the bid lives in an
integral with precomputed coefficients. (The same discipline reappears in
CTR — FTRL's sparse linear serving — and in pacing: duals precomputed, gates
evaluated. It is the design motif of the whole industry, and the reason the
latency entry's budget math closes at all.)

## Open items on this thread

Cui et al.'s exact log-normal template math awaits a PDF pass (their
formulation is second-hand here); whether any of the 2022–24 robust-shading
variants is production frontier is unknown — no third-party replications
exist; and the online (not offline ANLP) effects of every method above are
reported by exactly one party each, which in this literature is a polite way
of saying the benchmark numbers measure estimation, not profit.

## References

1. Zhang, W., Yuan, S. & Wang, J. (2014). "Optimal Real-Time Bidding for Display Advertising." *KDD*. doi:10.1145/2623330.2623633
2. Balseiro, S., Besbes, O. & Weintraub, G. (2015). "Repeated Auctions with Budgets in Ad Exchanges." *Management Science* 61(4):864–884. doi:10.1287/mnsc.2014.2022
3. Cui, Y., Zhang, R., Li, W. & Mao, J. (2011). "Bid Landscape Forecasting in Online Ad Exchange Marketplace." *KDD*. doi:10.1145/2020408.2020454
4. Wu, W.C.-H., Yeh, M.-Y. & Chen, M.-S. (2015). "Predicting Winning Price in Real Time Bidding with Censored Data." *KDD*, 1305–1314.
5. Wang, Y., Ren, K., Zhang, W., Wang, J. & Yu, Y. (2016). "Functional Bid Landscape Forecasting for Display Advertising." *ECML-PKDD*, 115–131.
6. Wu, W.C.-H., Yeh, M.-Y. & Chen, M.-S. (2018). "Deep Censored Learning of the Winning Price in the Real Time Bidding." *KDD*, 2526–2535.
7. Ghosh, A., Mitra, S., Sarkhel, S., Xie, J., Wu, G. & Swaminathan, S. (2019). "Scalable Bid Landscape Forecasting in Real-Time Bidding." *ECML-PKDD*. arXiv:2001.06587
8. Ren, Q., Qin, X., Zheng, B., Yang, Z., Zhang, W. & Yu, Y. (2019). "Deep Landscape Forecasting for Real-time Bidding Advertising." *KDD*. doi:10.1145/3292500.3330870, arXiv:1905.03028. Code: https://github.com/rk2900/DLF
9. Kaplan, E. L. & Meier, P. (1958). "Nonparametric Estimation from Incomplete Observations." *JASA* 53(282):457–481.
10. Aouad, A., Elmachtoub, A. N., Ferreira, K. J. & McNellis, R. P. (2019). "Market Segmentation Trees." *Operations Research* (arXiv:1906.01174)
11. Yuan, S., Wang, J. & Zhao, X. (2013). "Real-time Bidding for Online Advertising: Measurement and Analysis." arXiv:1306.6542. doi:10.48550/arXiv.1306.6542
12. Zhang, W., Yuan, S., Wang, J. & Shen, X. (2014). "Real-Time Bidding Benchmarking with iPinYou Dataset." arXiv:1407.7073
13. Wang, J., Zhang, W. & Yuan, S. (2016). "Display Advertising with Real-Time Bidding (RTB) and Behavioural Targeting." arXiv:1610.03013
14. Agarwal, A. et al. (2014). "Budget Pacing for Targeted Online Advertisements at LinkedIn." *KDD*. doi:10.1145/2623330.2623366
