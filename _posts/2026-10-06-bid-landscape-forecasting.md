---
layout: default
title: Forecasting the Bid Landscape
---

# Forecasting the Bid Landscape
*October 6, 2026*

A DSP's value model says what an impression is worth. It says nothing about
what it will *cost*. The object that answers the cost question is the bid
landscape: for a given request features `x`, the distribution `p(z|x)` of the
market price `z` — the minimum winning bid, the runner-up or binding floor.
Given it, everything downstream is a query to an integral:

```
win rate at bid b     W(b) = Pr(z < b) = ∫₀ᵇ p(z|x) dz
expected cost at b      ∫₀ᵇ z·p(z|x) dz
```

Zhang, Yuan and Wang's optimal-bidding paper (KDD 2014) states the dependency
bluntly: to obtain an optimal bidding strategy, one needs the *distribution* of
winning prices, not its mean. LinkedIn's pacing paper says the same from the
other direction. The landscape is the load-bearing statistical object of the
whole bidder.

## The censoring

Here's the data situation: on wins, the exchange tells you `z` (via the win
notice, when it bothers). On losses — most auctions — it reveals *nothing*; you
only know `z ≥ your bid`. So the training set is a mixture of exact
observations and lower bounds. In the language of biostatistics: right-censored
data, where win/loss play the role of death/survival events, market price is
survival time, and your bid is the censoring time. Kaplan–Meier and Tobit
aren't exotic citations in this literature; they're the baseline.

Why naive regression on wins alone fails, with numbers: on the iPinYou logs,
the average market price conditioned on wins is around 25 CNY; conditioned on
losses, around 100. The win-only sample's landscape is drastically cheaper than
reality, so a bidder trained on winners alone shades itself into nonexistence —
it believes it's already winning cheaply, stops bidding up, and loses volume it
doesn't see because, well, it lost.

## The genealogy

Each generation relaxes an assumption the last one needed.

- **2011, Cui et al. (KDD)** — named the thing. Per-request-type template
  lookup plus a log-normal fit of the price distribution. The fixed-form
  assumption would be attacked for a decade.
- **2015, Wu et al. (KDD)** — censored regression à la Tobit: `w = βᵀx + ε`,
  Gaussian homoscedastic noise, MLE over wins *and* loss-bounds jointly.
  Unbiased iff the noise really is fixed-variance Gaussian — which Adobe's
  follow-up showed is violated on real data (non-Gaussian, heteroscedastic
  across iPinYou clusters).
- **2016, Wang et al.** — survival trees: a decision tree over features with a
  Kaplan–Meier estimate in each leaf. Assumption-free per leaf, but coarse and
  feature-starved: counting estimators that ignore features lose ~10% to
  models that use them.
- **2019, Ghosh et al. (Google/Adobe)** — two fixes at once. Heteroscedastic
  parametric censored regression: let the noise scale with features,
  `σ = exp(αᵀx)`, which alone buys 5–10%. Then MCNet: a mixture-density network
  outputting (πₖ, μₖ, σₖ) — any smooth density, no unimodality — where censored
  samples enter as quantized bin probabilities, `Pr(W ≥ b − ½)` on losses. On
  Adobe AdCloud: ANLP 0.348 vs 0.474 for censored regression, 25% better, and
  still improving >30% per-day vs the plain CR baseline on iPinYou slices.
- **2019, Ren et al., DLF (KDD)** — the distribution-free trick. Discretize
  price into integer intervals; feed (x, price-index) through an LSTM cell that
  outputs the *conditional* win probability inside that interval,
  `hₗ = Pr(z ∈ Vₗ | z ≥ bₗ₋₁, x)`. Chain rule: the survival function is a
  product `S(b) = Π(1 − hₗ)`, the density is the product up to the true bin. The
  loss is two terms — a pdf NLL on exact observations **plus plain
  cross-entropy on every win/lose label** — and that second term is the
  departure from survival-analysis precedent: it uses *all* the data as
  classification signal, not just likelihoods. Report card: ANLP 4.774 on
  iPinYou vs 5.148 for survival trees, 15.4 for Kaplan–Meier, 38.6 for
  Lasso-Cox.

## Serving consequence

DLF costs `O(L)` LSTM steps per query at L ≈ 300 price bins — not a hot-path
number. The practice that follows: landscapes are *offline artifacts*,
trained per campaign×segment and cached in the serving store, so the bidder
evaluates products and ratios of scalars, never an RNN. Train slow, serve
cheap. And because the win/lose head is just a calibrated classifier and ANLP
is just log-loss, every calibration discipline from the CTR literature applies
verbatim: a landscape is a probability model first and an economics tool second.

## References

1. Zhang, W., Yuan, S. & Wang, J. (2014). "Optimal Real-Time Bidding for Display Advertising." *KDD*. doi:10.1145/2623330.2623633
2. Cui, Z., Zhang, X., Wang, J. & Mao, C. (2011). "Bid Landscape Forecasting in Online Ad Exchange Marketplace." *KDD*. doi:10.1145/2020408.2020454
3. Wu, Y., Chang, K.-W. & Wang, C. (2015). "Predicting Winning Price in Real Time Bidding with Censored Data." *KDD*, pp. 1305–1314.
4. Wang, H., Ren, W. et al. (2016). "Functional Bid Landscape Forecasting for Display Advertising." *ECML-PKDD*, pp. 115–131.
5. Wu, F. et al. (2018). "Deep Censored Learning of the Winning Price in the Real Time Bidding." *KDD*, pp. 2526–2535.
6. Ghosh, S. et al. (2019). "Scalable Bid Landscape Forecasting in Real-time Bidding." *ECML-PKDD*. arXiv:2001.06587
7. Ren, Q. et al. (2019). "Deep Landscape Forecasting for Real-time Bidding Advertising." *KDD*. doi:10.1145/3292500.3330870, arXiv:1905.03028. Code: https://github.com/rk2900/DLF
8. Kaplan, E. L. & Meier, P. (1958). "Nonparametric Estimation from Incomplete Observations." *JASA* 53(282):457–481.
9. Aouad, A. et al. (2019). "Market Segmentation Trees." arXiv:1906.01174
10. Zhang, W. et al. (2014). "Real-Time Bidding Benchmarking with iPinYou Dataset." arXiv:1407.7073.
11. Agarwal, A. et al. — survey, arXiv:2408.07685.
