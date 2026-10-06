---
layout: default
title: The First-Price Shock and What Bid Shading Is
---

# The First-Price Shock and What Bid Shading Is
*October 6, 2026*

For most of programmatic's life, display exchanges cleared at second price: you
bid your value, the runner-up set the price, and the mechanism did the shading
for you. In 2019, Google Ad Manager and the open exchanges moved to first
price, and suddenly every buyer was paying its own bid. Enormous engineering
effort went into one question: *how far below your value should you actually
bid?* That's bid shading, and its theory is older and prettier than the
engineering.

## The textbook equilibrium

First-price sealed-bid, symmetric private values, *n* bidders with values
i.i.d. on a cdf *F*: the unique increasing Bayesian Nash equilibrium is

```
β(v) = E[max of the other n−1 values | max < v]
```

— bid the expected highest competing value, conditional on it being below
yours. For uniform values this collapses to the charming `β(v) = (n−1)/n·v`:
shading depth is a *market-thickness statistic*. With ~30 effective rivals you
bid ≈ 97% of value; with 2, ≈ 67%. Revenue equivalence says FPA and SPA earn
the seller the same under those idealized assumptions; every way reality
violates them — asymmetric bidders, budgets, repeated interaction, algorithms —
picks a point off the plateau. The exchanges' motive for switching is legible
in that fragility: second price is truthful, and truthfulness concentrates
surplus with buyers. First price hands the surplus to whoever models the
field best.

The engineer's version sidesteps equilibrium entirely. Maximizing expected
surplus `(v − b)·W(b)` at bid b with win-rate `W` gives the first-order
condition

```
v − b* = W(b*) / w(b*)
```

surplus over the bid equals the *inverse hazard rate* of the market price. No
fixed point, no game — just a calibrated win-rate curve, which is exactly the
bid landscape the previous post is about. This is why shading is productizable:
it requires one well-calibrated conditional CDF, which is productizable — not
an equilibrium.

## The catalogue, as the papers left it

- **Uniform shading** (`α·v`) survives because two independent facts back it:
  the order-statistics equilibrium factor is uniform, and pacing equilibria in
  repeated first-price auctions *are* uniform multiplicative shading
  (Conitzer et al.). Its failure is systematic in exactly the way you'd
  predict: overpay on thin auctions, lose volume on thick ones.
- **Distribution models** are the production ML answer: Yahoo's 2020 paper —
  predict a quantile of market price and bid `min(v, ẑ + ε)`; the 2021 deep
  network that models the entire price distribution and applies the FOC
  exactly. Same `p(z|x)` as landscape forecasting, consumed at the payment
  side. The literature has since gone end-to-end and robust: distributionally
  robust shading, monotone/shape-constrained estimators (a real econometric
  anchor exists here; Zhang, *Economics Letters* 2017, on estimating the
  nonparametric FPA bidding function with consistency bounds).
- **Loss-notice observability determines everything.** Under FPA, wins reveal
  your payment but still not the runner-up; losses reveal nothing unless the
  exchange fires `${AUCTION_MIN_TO_WIN}` macros — and some blank
  `AUCTION_PRICE` entirely, starving the loop. Your shading ceiling is set by
  a counterparty's logging choices, which nobody puts in the SLA.

## The trap: shading and pacing fight

In FPA, shading and pacing both act on a *single* multiplicative channel —
`bid = min(λ_budget, λ_ROS)·shade(x)·v`. An aggressive shade lowers effective
spend, which a naive pacing controller misreads as budget pressure: λ drifts
up, and the shade is silently undone. Attributing λ-movement to market win-rate
versus price requires loss-notice data. The lesson generalizes beyond adtech:
when two controllers share an actuator, one of them is hallucinating.

## What the migration actually taught

Each mechanism change — SPA → FPA, server-side auction → header bidding,
cookie → signal loss — invalidated one DSP subsystem at a time while
"competitors' algorithms changed in flight," and every vendor rebuilt on the
same public papers. Mechanisms commoditize the moment they're standardized;
advantage retreats into execution and data. The 2019 flip didn't hand anyone's
economy to the theory crowd; the theory was in Vickrey's 1961 paper. It handed
an advantage to whoever could estimate hazard rates on a billion heterogeneous
auctions a day, and that's an infrastructure advantage, not an idea advantage —
the only kind programmatic seems to hand out.

## References

1. Vickrey, W. (1961). "Counterspeculation, Auctions, and Competitive Sealed Tenders." *Journal of Finance* 16(1). doi:10.1111/j.1540-6261.1961.tb02789.x
2. Myerson, R. (1981). "Optimal Auction Design." *Mathematics of Operations Research* 6(1). doi:10.1287/moor.6.1.58
3. Maskin, E. & Riley, J. (2000). "Asymmetric Auctions." *Review of Economic Studies*. doi:10.1111/1467-937X.00137
4. Balseiro, S., Besbes, O. & Weintraub, G. (2015). "Repeated Auctions with Budgets in Ad Exchanges." *Management Science* 61(4):864–884. doi:10.1287/mnsc.2014.2022
5. Gligorijevic, D. et al. (2020). "Bid Shading in The Brave New World of First-Price Auctions." *CIKM*. doi:10.1145/3340531.3412689 (preprint arXiv:2009.01360)
6. Zhou, Y. et al. (2021). "An Efficient Deep Distribution Network for Bid Shading in First-Price Auctions." *KDD*. doi:10.1145/3447548.3467167, arXiv:2107.06650
7. Conitzer, V., Kroer, C., Sodomka, E. & Stier-Moses, N. (2020+). "Multiplicative Pacing Equilibria." *Management Science* 70(2). doi:10.1287/mnsc.2022.4310, arXiv:1811.07166
8. Zhang, A. (2017). "Nonparametric estimation of the bidding function in first-price auctions with entry and observable outliers." *Economics Letters*. doi:10.1016/j.econlet.2016.11.001 (shape-constrained anchor)
9. Han, D., Zhou, T. & Weissman, T. (2021/24). "Optimal No-Regret Learning in Repeated First-Price Auctions." *Operations Research*. doi:10.1287/opre.2020.0282
10. IAB Tech Lab, *OpenRTB 2.6*, §3.2.1 (`at`), §4.4 (macros). https://github.com/InteractiveAdvertisingBureau/openrtb2.x/blob/main/2.6.md
11. Google Ad Manager first-price migration (2019); PubMatic, "First Price Auctions & Auction Dynamics." https://pubmatic.com/blog/first-price-auctions-auction-dynamics/
