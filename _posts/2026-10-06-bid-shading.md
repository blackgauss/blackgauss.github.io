---
layout: default
title: The First-Price Shock and What Bid Shading Is
---

# The First-Price Shock and What Bid Shading Is
*October 6, 2026*

For most of programmatic's life, display exchanges cleared at second price: you
bid your value, the runner-up set the price, and the mechanism did the shading
for you. In 2019, Google Ad Manager and the open exchanges moved to first
price, and overnight every buyer was paying its *own* bid. Enormous engineering
effort went into one question: **how far below your value should you actually
bid?** That's bid shading — and its theory is older, stranger, and prettier
than the engineering around it. This entry is the whole thread: the equilibrium
that nobody solves, the first-order condition everyone does solve, the methods
catalogue, and the trap where shading quietly fights pacing.

## Baseline: why first price isn't trivial

Vickrey's 1961 paper sets up the sealed-bid taxonomy and proves the second-price
rule truthful. The first-price rule is older than Vickrey and, at first sight,
worse: the winner pays their own bid, so bidding your value dominates
*nothing*. Every bidder must form an expectation about *other bidders' bids*
and shade below value — the strategic content of the mechanism moves out of the
mechanism and into the bidders' heads.

Myerson's optimal-auction framework makes the comparison precise. Under the
standard assumptions — independent private values, risk-neutral quasilinear
bidders, symmetric distributions, no reserve asymmetries — every efficient,
individually-rational sealed-bid format yields the seller the **same expected
revenue**. FPA and SPA are two points on one plateau. The revenue equivalence
theorem is fragile, and the fragility is the whole applied story: *every way
display RTB violates the assumptions* — asymmetric bidders with different data,
hard budget constraints, repeated interaction, algorithmic play — picks a point
off the plateau and determines which format serves whom. The exchanges' motive
for switching is legible in that fragility: truthfulness concentrates surplus
with the buyers, and first price hands it to whoever models the field best.

## The equilibrium nobody solves

Symmetric independent values, *n* bidders with values i.i.d. on cdf *F* over
[0, v̄]: the unique strictly-increasing Bayesian Nash equilibrium bid function
is

```
β(v) = E[Y₁ | Y₁ < v],   Y₁ = max of the other n−1 values
```

— bid the expected highest competing value, *conditional on it being beaten*.
For uniform values this collapses to the charming textbook law

```
β(v) = (n−1)/n · v
```

and the reading I want you to keep: **shading depth is a market-thickness
statistic**, not a policy. With ~30 effective competitors you bid ≈ 97% of
value; with 2, ≈ 67%. The right shade factor is a function of the conditional
win-rate curve `w(b | x)`, not a per-market constant — one more argument for
the landscape-estimation machinery existing at all.

Asymmetry makes the analysis genuinely hard, and there's a bonus result worth
knowing: with asymmetric bidders, Maskin & Riley show the *second*-price format
generally has **no equilibrium in pure monotone strategies** while first price
retains clean structure — and that sealed high-bid auctions *screen better*:
equilibrium bidding discloses more of the weak bidder's private information,
giving the seller a post-auction informational edge. Milgrom & Weber's
linkage principle is the general language: formats rank by how much the
winner's payoff reveals about the common value. The RTB read-across is
imperfect (values not costs, no resale market), but the screening logic
reappears whenever an exchange decides whether to disclose clearing prices.

## The first-order condition everybody does solve

Forget the game. Maximize expected surplus `(v − b)·W(b)` over the bid, where
`W(b)` is the win probability and `w = W′` its density:

```
v − b* = W(b*) / w(b*)
```

**Surplus over the bid equals the inverse hazard rate of the market price at
your bid.** This condition is equilibrium-free — it needs only a calibrated
win-rate curve. That single property is why shading became a product: a
DSP doesn't have to solve the game's fixed point per request (which, as the
pacing literature proves, is PPAD-hard in general anyway); it has to estimate
one conditional CDF well.

Where does `W(b|x)` come from? The same bid-landscape estimators as
everywhere else, with an FPA wrinkle on the labels: market price `z` = minimum
winning bid (runner-up bid, or the floor if binding). Wins reveal your own
payment but not `z`; losses reveal nothing unless the exchange is configured to
fire loss-notice macros. Your shading ceiling is set by a counterparty's
logging choices — some exchange templates blank `AUCTION_PRICE` entirely — and
that dependency never appears in a contract.

## The methods catalogue, in the order the field discovered them

**Uniform / order-statistics shading** (`α·v`) survives every serious review
because two independent facts back it: the symmetric equilibrium factor
`(n−1)/n` *is* an order-statistics fact, and pacing equilibria in repeated
first-price auctions with budgets *are* uniform multiplicative shading
(Conitzer, Kroer, Sodomka & Stier-Moses — the componentwise-maximal
budget-feasible multiplier vector, with the practitioners' distrusted "uniform
% shade" literally being the equilibrium play). Also reassuring: regret-optimal
learners in repeated FPA (Han, Zhou & Weissman) converge to good average play
with no knowledge of bidder counts or distributions, and regret-based learning
provably approaches symmetric Bayes–Nash in the i.i.d. model (Danak & Mannor).
But there's a negative-space warning too (Ratan & Wen): certain adaptive
adjustment rules converge to *wrong* — over- or under-shaded — points and lose
against equilibrium play. Uniform shading deserves its status; naive
heuristics tuned by vibes do not. Check your heuristic against the FOC.

**Market-price distribution models** are the production-ML answer. Yahoo's
CIKM 2020 paper predicts a high quantile of `z|x` with a safety buffer and
bids `min(v, ẑ + ε)`; the 2021 KDD network models the *entire* distribution of
market price rather than one quantile and then applies the inverse-hazard FOC
exactly. Same conditional object as landscape forecasting, consumed at the
payment side. The subsequent literature went end-to-end and robust:
distributionally-robust shading over an ambiguity set around the price model,
multi-slot end-to-end shading, concave shading policies via measure-valued
proximal optimization, shading-factor search as a bandit (Tilli &
Espinosa-Leal), and best-response iteration for shading factors
(Fagandini & Dierickx) — the game-theoretic formalization of the uniform
heuristic, which I find lovely: the heuristic everyone shipped with, made into
a solvable fixed-point problem a decade later.

**Shape constraints** are the load-bearing plumbing. `w(b|x)` must be monotone
in `b` or the FOC `v − b = W/w` is ill-posed and the shade is unstable. The
econometric anchor is real, not folklore: Zhang (*Economics Letters* 2017)
gives a shape-constrained nonparametric estimator of the FPA bidding function
with consistency guarantees, and Curmei & Hall (*Operations Research* 2025)
supply rates and a computable hierarchy for monotone/convex regression; isotonic
regression (PAVA) is the monotone special case you'd reach for in code.

**Interaction with pacing** is the trap section, and the most transferable
finding here. In FPA, shading and min-pacing act on the *same* multiplicative
channel: `bid = min(λ_budget, λ_ROS) · shade(x) · v` — the dual structure
survives the format change. An aggressive shade lowers effective spend, which
a naive pacing controller misreads as budget slack-free pressure: λ drifts up,
and the shade is **silently undone**. Attributing λ-movement to *win-rate*
versus *price* requires loss-notice data again. When two controllers share one
actuator, one of them is hallucinating; don't cascade, min-compose — a law
about shared actuators that generalizes far beyond advertising.

## What the exchanges engineered around it

The 2019 migration (`at` flipped in OpenRTB; "first-price auctions with
soft floors" is the honest description) created a new mechanism-design surface
rather than a level field:

1. **Floors bite differently.** With pay-your-bid, a floor `f` makes every
   auction "max(b, f) wins, pays own bid"; the option value of shading *falls*
   because shaded bids that used to clear a runner-up now collide with the
   floor. Yahoo's floor-optimization study shows strongly **non-monotone**
   revenue effects mediated by bidder adaptation. The equilibrium bid function
   literally kinks at `f`, with mass points piling near it.
2. **The second-price illusion.** Post-migration, exchanges kept reporting
   second-price-like quantities (`AUCTION_PRICE` macros, min-to-win), so
   shaded first-price payments looked like SPA outcomes in DSP reporting. The
   empirical record we *can* anchor: FPA adoption explained by soft floors and
   SSP competition (Despotakis, Ravi & Sayedi, *JMR* 2021); measured bidder
   responses — shade factors, bid levels — to the format change (Deng, Mao,
   Rodriguez & Wang 2021); and learning-agent simulation comparing FPA vs SPA
   revenue in display (Bichler, Gupta & Oberlechner, *ISR* 2026). The
   widely-quoted trade-press percentage deltas remained, in my reading,
   unanchored to any primary source.
3. **Cache risk changes.** In SPA a cached bid pays second price whenever it
   fires; in FPA the cached bid *pays itself* at a later, possibly thinner
   auction — same trick, different price exposure. Under budgeted auto-bidding,
   moreover, SPA's truthfulness is moot anyway (Balseiro, Deng, Mao, Mirrokni
   & Zuo; Liaw, Mehta & Perlroth), which is the theoretical footnote the trade
   press never printed when it explained the switch by "simplicity."
4. **DSP countermeasures**, which are engineering positions, I'd add, not
   literature: per-exchange `p(z|x)` models with floor decomposition
   `z = max(f, z⁻)`; loss-notice-driven censoring repair; treating
   floor-policy changes as covariate drift rather than model damage; refusing
   the uniform-% default wherever the z-forecast is confident.

## The synthesis

Every prior mechanism change — SPAs to FPAs, server-side to header bidding,
cookies to signal loss — invalidated one subsystem at a time while competitors'
algorithms changed underneath, and every vendor rebuilt on the same public
papers. Mechanisms commoditize the moment they're standardized; advantage
retreats into execution and data. The 2019 flip didn't hand anyone an economic
idea the theory crowd hadn't published in 1961; it handed a temporary edge to
whoever could estimate hazard rates on a billion heterogeneous auctions a day.
That is an infrastructure advantage, not an idea advantage — which is, as far
as I can tell, the only kind programmatic ever hands out.

## References

1. Vickrey, W. (1961). "Counterspeculation, Auctions, and Competitive Sealed Tenders." *Journal of Finance* 16(1). doi:10.1111/j.1540-6261.1961.tb02789.x
2. Myerson, R. (1981). "Optimal Auction Design." *Mathematics of Operations Research* 6(1). doi:10.1287/moor.6.1.58
3. Maskin, E. & Riley, J. (2000). "Asymmetric Auctions." *Review of Economic Studies* 67(2). doi:10.1111/1467-937X.00137; and "Optimal Auctions with Risk Averse Bidders." doi:10.1111/1467-937X.00138
4. Milgrom, P. & Weber, R. (1982). "A Theory of Auctions and Competitive Bidding." *Econometrica* 50(5). doi:10.2307/1911865
5. Gligorijevic, D. et al. (2020). "Bid Shading in The Brave New World of First-Price Auctions." *CIKM*. doi:10.1145/3340531.3412689 (preprint arXiv:2009.01360)
6. Zhou, Y. et al. (2021). "An Efficient Deep Distribution Network for Bid Shading in First-Price Auctions." *KDD*. doi:10.1145/3447548.3467167, arXiv:2107.06650
7. Conitzer, V., Kroer, C., Sodomka, E. & Stier-Moses, N. (2019/2022). "Pacing Equilibrium in First-Price Auction Markets," *EC*, doi:10.1145/3328526.3329600; "Multiplicative Pacing Equilibria in Auction Markets," *Management Science* 70(2). doi:10.1287/mnsc.2022.4310, arXiv:1811.07166
8. Zhang, A. (2017). "Nonparametric estimation of the bidding function in first-price auctions with entry and observable outliers." *Economics Letters*. doi:10.1016/j.econlet.2016.11.001
9. Curmei, D. & Hall, D. (2025). "Shape-constrained regression using sums-of-squares of polynomials." *Operations Research*. doi:10.1287/opre.2021.0383
10. Han, D., Zhou, T. & Weissman, T. (2021/24). "Optimal No-Regret Learning in Repeated First-Price Auctions." *Operations Research*. doi:10.1287/opre.2020.0282
11. Danak, A. & Mannor, S. (2012). "Easy is better than difficult…" *Annals of Operations Research*. doi:10.1007/s10479-012-1148-8
12. Ratan, A. & Wen, Q. (2016). "Reinforcement learning and strategic bidding in first price auctions." *Economics Letters*. doi:10.1016/j.econlet.2016.03.021
13. Balseiro, S., Besbes, O. & Weintraub, G. (2015). "Repeated Auctions with Budgets in Ad Exchanges: Equilibria and Design." *Management Science* 61(4):864–884. doi:10.1287/mnsc.2014.2022
14. Balseiro, S., Deng, Y., Mao, J., Mirrokni, V. & Zuo, S. (2021). "The Landscape of Auto-bidding auctions: Value or utility maximization?" *ACM EC*. doi:10.1145/3465456.3467607
15. Despotakis, S., Ravi, R. & Sayedi, A. (2021). "The Rise of First-Price Auctions." *Journal of Marketing Research*. doi:10.1177/00222437211030201
16. Deng, Y., Mao, J., Rodriguez, V. & Wang, K. (2021). "Conducting First-Price Auctions in Display Advertising." arXiv:2110.13814
17. Bichler, M., Gupta, V. & Oberlechner, M. (2026). "From Second-to-First Price Auctions, or Not?" *Information Systems Research*. doi:10.1287/isre.2025.2160
18. Deshpande, Y. et al. (2023). "Optimization of Floor Prices in First-Price Auctions." arXiv:2302.06018
19. Fagandini, A. & Dierickx, I. (2023). "Computing profit-maximizing bid-shading factors…," *Computational Economics*. doi:10.1007/s10614-022-10321-y (corrigendum doi:10.1007/s10614-022-10343-6); Tilli, P. & Espinosa-Leal, C. (2021). *J. Intell. Fuzzy Systems*. doi:10.3233/JIFS-202665
20. IAB Tech Lab, *OpenRTB 2.6*, §3.2.1 (`at` field), §4.4 (`AUCTION_PRICE` macros). https://github.com/InteractiveAdvertisingBureau/openrtb2.x/blob/main/2.6.md
21. Google Ad Manager first-price migration (2019); PubMatic, "First Price Auctions & Auction Dynamics." https://pubmatic.com/blog/first-price-auctions-auction-dynamics/
