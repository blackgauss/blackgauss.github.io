---
layout: default
title: Budget Pacing Is a Control Loop
---

# Budget Pacing Is a Control Loop
*October 6, 2026*

The problem, in one sentence: **spend a daily budget fully and evenly without
overdrawing or front-loading, without knowing next hour's supply.** It sounds
like bookkeeping. It is where a DSP most plainly becomes a control-theory and
online-optimization problem, and the papers written by the companies doing it
at scale (Alibaba, Yahoo, LinkedIn, Google, the theoretical group around
Balseiro–Mirrokni) are unusually good — enough that I think pacing is the
single best domain to learn online convex optimization from. This entry is the
whole thread: the dual view, the four update laws in their historical order,
the loop architectures, stability practice, and what "good" even means.

## Two ways to see the same object

**The LP view (with foresight).** If you knew every upcoming auction's value
and cost, pacing is a packing program: maximize delivered value subject to
spend ≤ B (plus soft CPA/ROS constraints). Its dual has one multiplier λ per
constrained resource, and optimality condition is one line: **buy item i iff
`vᵢ ≥ λ·costᵢ`** — reduced value again, identical Lagrangian to the ORB bid
derivation. So: *pacing is an online solver for the dual λ.*

**The demand-curve view (with a controller).** Hold λ roughly constant and
cumulative spend is a monotone function `S(λ)`; hitting budget is root-finding
on `S(λ) = B` with noisy, delayed observations of `S`. LinkedIn's production
pacer (KDD 2014) is exactly this — an LP re-solved per period for a pacing
rate, plus online correction tracking realized spend against it.

What elevates it from root-finding to *control*: the map λ→spend has unknown,
**drifting gain** (competition reprices underneath you), **dead time**
(conversion-limited campaigns label hours late — a delay-biased error term
feeds the integrator), and **multiplicative response** (win-rate curves steepen
with bid, so spend moves roughly exponentially with log-bid — the response the
exponential actuators below are built to invert; the old "prices are
log-normal" story behind this claim is only true of heavily pooled data, and
fails per-segment in direct tests). The
literature's answers are textbook control — proportional, integral, anti-windup,
gain scheduling — plus, in the last five years, regret proofs.

## The update laws, oldest to newest

**1. Throttling (the spend governor).** The oldest device, shipped at
exchanges before pacing had a name, formalized in Yuanlong Chen's *Practical
Guide to Budget Pacing Algorithms* (2025; arXiv:2503.06942) as Algorithm 1:
target `α(t) = (t/T)·B`, and a
participation probability nudged multiplicatively:

```
behind target:   p(t) = min{ p(t−1)·(1+λₜ), 1 }
ahead of target: p(t) = max{ p(t−1)·(1−λₜ), 0 }
```

A pure proportional controller on the *gate*. You randomly drop eligible
auctions. Its weakness is exactly its simplicity: the gate is value-blind — it
discards a $100 conversion's auction as cheerfully as the next one's, so
bid-based control dominates whenever value ranking is trustworthy. But note
the guide's own confession that bid-based pacing "should not be interpreted as
a complete replacement of throttling":
changing *bids* has an unpredictable spend response, so the industry keeps a
value-blind emergency brake whose response it *can* predict. That is a
remarkable engineering value: prefer a controller whose plant you understand
over one whose plant is smarter, when you need determinism.

**2. PID on the bid.** The BigTree DSP system (Zhang et al., WSDM 2016 — a
Chinese mobile DSP, not Taobao; controls published every 90 minutes online,
2-hour rounds offline on replayed iPinYou logs):
adjust the bid multiplicatively — `b'(t) = b(t)·exp(φ(t))`, the exponential
actuator guaranteeing positivity and matching spend's exponential response —
with φ from a PID on the eCPC error and explicit φ-bounds (anti-windup: clamp
the integral at limits so a feedback outage can't leave the line committed to
an insane bid). The reading I love is the failure-forensics one: **the
derivative term is the dangerous one on advertising data** (it amplifies the
noise in a sparsely-labeled error signal), and the integral is the one that
blows up under delayed feedback — conversions keep arriving after the
controller already reacted to their absence, so without anti-windup it drives
a line into overdelivery chasing ghosts.

**3. Waterlevel — the degenerate PID that runs adtech.** Kp = Kd = 0:
`φ(t+1) = φ(t) + γ·(xᵣ − x(t))`, an integrator-only law in log-bid space.
Zero steady-state error, slower response to shocks, and — the empirical
finding of the BigTree deployment — **more robust than full PID in the real plant**
where the feedback signal is noisy and delayed. The reason generalizes:
P-terms leave steady-state offset, D-terms amplify noise, and an ad-system
sensor is noisy and delayed; so the minimal law is the robust one. LinkedIn's
pacing-rate recurrence (2014) is the same equation wearing a different
variable name. And the proof that this is not a hack: the waterlevel law is
provably a fast root-finder for the period-optimal bid even under hidden,
dynamic cost functions (Hajiaghayi & Springer 2022), and — this is the line
that made me write this essay — **the integral controller in log-λ space is
mirror descent with a linear reference function** (Balseiro et al.'s field
guide states it; the dual-descent papers imply it). Every decade of adtech
reinvented the same integrator and each time it turned out to be a special
case of last decade's abstraction.

**4. Multiplicative dual descent — the canonical form.** Keep λ per constrained
resource; act greedily on reduced value `ṽᵢ = vᵢ − λ·cᵢ`; update

```
λₜ₊₁ = λₜ·exp(η·(cᵢ − B/T)) / Z      (multiplicative / mirror descent)
   or  λₜ₊₁ = [λₜ + η·(cᵢ − B/T)]₊     (subgradient; same scheme, other reference)
```

Balseiro, Lu & Mirrokni ("The Best of Many Worlds," *Oper. Res.* 2023) unify
both — including dual multiplicative-weights — as one mirror-descent family,
and hand you the guarantees for free: `Õ(√T)` regret under stochastic supply
(order-optimal); constant competitive ratio under arbitrary adversarial
supply; `Õ(√T)` under ergodic/seasonal models; **and no early depletion — λ
rises before the budget runs out, provably (Prop. 2)**, which is the
single sentence pacing engineers read a paper for. Per-request O(1), fits the
hot path, needs no LP re-solve — the theoretical account of why everyone
migrated from period-LP to per-request updates. The survey's verdict:
"Lagrangian dual algorithms are the work-horse algorithms of budget pacing."

**The thing all these loops converge to**, when every buyer runs one: a
*pacing equilibrium*. In first-price markets, the FPPE (Conitzer et al.) is
the componentwise-maximal budget-feasible multiplier vector — every paced
bidder has then spent its budget exactly; existence and uniqueness by a
one-line closure argument (max of two feasible vectors is feasible),
Pareto-dominance, and seller-revenue-maximality for free. The
multiplicative-shading heuristics practitioners distrust *are* the
equilibrium play, and the waterlevel/dual-descent dynamics converge there
under repeated interaction (Balseiro, Kim, Mahdian, Mirrokni, *OR* 2021).
Then the punchline from complexity theory: **computing a pacing equilibrium
in general second-price settings is PPAD-hard** (Chen, Kroer & Kumar, *Math.
OR* 2023; the PPAD lineage running back to the Daskalakis–Goldberg–Papadimitriou
inapproxurability tradition). Which is the *reason* adtech is a control
industry rather than a solver industry: the fixed point is intractable, the
feedback loop is O(1) per auction, and the latest results (Gaitonde et al.,
ITCS 2023) show you don't even need convergence to get good regret and welfare.
The loop not settling is not a bug state; it is the operating state.

## Multiple constraints, and the one architecture mistake

A real line-item carries budget AND a ROS/CPA target AND frequency caps AND
maybe a min-delivery floor. Historically platform loops (budget) and
advertiser tools (ROS) evolved *separately*; the field guide (Balseiro,
Bhawalkar, Feng, Lu, Mirrokni, Sivan & Wang, KDD 2023) compares the ways to
compose and the comparison is the practical payload of the whole paper:

| Architecture | Mechanism | Guarantee |
|---|---|---|
| **Sequential** | ROS loop shaves the bid; budget loop throttles the result | Ω(T) constraint violation — linear in horizon |
| **Min-pacing** | parallel loops; bid = `min(α_B, α_ROS)·v` | same sublinear violation/regret order as fully coupled |
| **Coupled duals** | one program, duals updated jointly | best; needs shared state |

**Min-composition is essentially free; serial cascade is the trap.** The
mechanism of failure is worth internalizing because it recurs across every
control system: the ROS loop already shaved the bid, so the budget loop —
observing artificially low spend — concludes it has room and over-participates
until the ROS violation explodes. One controller hallucinates headroom created
by the other. (The same pathology shows up between *shading* and pacing —
aggressive shading reads as budget slack, λ drifts up, the shade is silently
undone — so "don't cascade, min-compose" is a law about shared actuators, not
about adtech.) The offline ladder in Yang et al. (KDD 2019) prices these
architectures — value ratio: naive post-hoc clamping to hold a CPC KPI 0.362,
feedback-control variants 0.549–0.709, two independent PIDs treating each
other's coupling as noise 0.892, coupled PIDs with a decoupling cross-feed
0.928. The numbers are theirs and single-site (Taobao), but the ordering is
the same physics as the theory column: satisfying the soft constraint is
cheap; satisfying it by clipping is what destroys value. Constraints belong
in the bid *function*, as duals, never in a post-hoc clamp. The field
guide's other doctrine: **treat budget as hard and
ROS as soft** — a hard stop outside the loop (auction-exclusion when spend
hits B), because a soft constraint may be violated a little with guarantees
while a *blown budget* is a financial event. Frequency caps and
min-delivery floors slot into the same frame as further duals — Chen's
guide works through campaign-group budgets and minimum-delivery constraints
with the same machinery.

## The closed loop, drawn with its stability notes

```
   target r(t)          +─────────────────────────────────────────────+
   (forecast supply,     │                                            │
    equalized ref)  e ──►(Σ)──► PID / waterlevel /    φ ──► bid =     │
                    ▲          dual-descent (λ)              e^φ·(w₀v │
                    │                                           − Σⱼ  │
            spend S(t) (ms) ◄────────── auctions ◄────────────  wⱼcⱼ)─┤
            conversions (hours, delayed) ◄────────────────────────────┘
                    plant: S ≈ exp(φ) on log-ish w(b);  dS/dφ drifts with market
```

Stability practice, synthesizing the three sources that read like
engineering manuals with theorems inside:

1. **Two loops, two bandwidths.** Spend feedback is minutes-fast; conversion
   feedback is hours-slow. Run λ_budget with a short-horizon high-gain law;
   ROS with a long-horizon patient one. De-bias delayed labels *before* the
   error enters the loop (the delayed-feedback model's soft labels, applied to
   the controller's error term) or the CPA loop sits permanently
   under-delivered, chasing phantom negatives.
2. **Gain scheduling.** The same Δφ moves spend ten times differently at
   different points of the win-rate curve (it's concave; ORB's own figures —
   and the landscape's quantiles hand you `dS/dφ` for free). A controller
   with fixed η oscillates in thick markets and crawls in thin ones; adapt η
   from the plant estimate.
3. **Anti-windup + saturation** (clamp φ and the integral state; reset on
   clamp) — nonnegotiable under conversion lag.
4. **Hard budget stop outside the loop**, throttles and λ inside.
5. **Day-boundary coordination.** The classic overspend incident in every
   account that documents one: clock skew between controller and bidders
   across the UTC midnight reset. Budgets don't reset atomically; they
   *coordinate*, and coordination is the failure surface.
 6. **MPC where forecast quality earns it**: fit a *monotone* bid→spend model
    (isotonic/PAVA, by construction, so the inversion is well-posed), solve
    "what bid spends the remainder optimally over the forecast window," re-solve
    each tick — which is what LinkedIn's plan-then-correct pattern and Chen's
    practitioner guide actually look like as code, and where modern adtech
    control meets its aerospace cousin. A caution attached to the literature:
    Yang et al.'s KDD 2019 multivariable controller labels its decoupling
    module "model predictive," but it is a fixed-gain 2×2 compensator on two
    PID outputs — no horizon, no re-solve. Two different machines share the
    acronym; only one of them is MPC.

## What "good" means

The metrics the papers optimize, in ascending order of ambition:
**spend attainment** `S(T)/B` plus the tail of underspent lines (LinkedIn's
explicit objective: spend ≤ B, maximize attainment); **constraint violation**
on ROS/CPA — sublinear for min-pacing, linear-as-failure for naive
composition; **regret against the offline-optimal** allocation with foreknowledge
(`Õ(√T)` achievable and lower-bounded — the knapsack-bandit line:
Badanidiyuru/Keskinocak/Tang; Immorlica et al. in the *JACM*); and, market-level,
**liquid welfare / equilibrium efficiency** when a thousand pacing agents
interact. And I'd add the engineering metric the papers circle without naming:
**determinism of the money** — a pacing system is good when, on the day a
downstream service dies, you can predict exactly what it will do, in dollars,
in advance.

The synthesis claim I'd defend to a skeptic: pacing is where the DSP ceases to
be a prediction system that spends money and becomes a **control system whose
sensor happens to be a market** — and once you see the budget line as a plant
with drifting gain and dead time, half the adtech literature reads as
application notes for a 60-year-old discipline, which is either deflating or
liberating depending on your taste. (Chen's book cites Camacho & Bordons' MPC
textbook and Smirnov, Lu & Lee's *Online Ad Campaign Tuning with PID Control*
side by side. This is the level of the game.)

## References

1. Chen, Y. (2025). "A Practical Guide to Budget Pacing Algorithms in Digital Advertising." arXiv:2503.06942
2. Zhang, W., Rong, Y., Wang, J., Zhu, T. & Wang, X. (2016). "Feedback Control of Real-Time Display Advertising." *WSDM*. doi:10.1145/2835776.2835843, arXiv:1603.01055
3. Agarwal, A. et al. (2014). "Budget Pacing for Targeted Online Advertisements at LinkedIn." *KDD*. doi:10.1145/2623330.2623366
4. Balseiro, S., Lu, H. & Mirrokni, V. (2023). "The Best of Many Worlds: Dual Mirror Descent for Online Allocation Problems." *Operations Research* 71(1):101–119. doi:10.1287/opre.2021.2242, arXiv:2011.10124
5. Balseiro, S., Bhawalkar, K., Feng, Z., Lu, H., Mirrokni, V., Sivan, B. & Wang, S. (2023). "A Field Guide for Pacing Budget and ROS Constraints." *KDD*. arXiv:2302.08530
6. Conitzer, V., Kroer, C., Sodomka, E. & Stier-Moses, N. (2019/2022). "Pacing Equilibrium in First-Price Auction Markets." *EC 2019*, doi:10.1145/3328526.3329600; "Multiplicative Pacing Equilibria in Auction Markets," *Management Science* 70(2). doi:10.1287/mnsc.2022.4310, arXiv:1811.07166
7. Balseiro, S., Kim, B., Mahdian, M. & Mirrokni, V. (2021). "Budget-Management Strategies in Repeated Auctions." *Operations Research* 69(3):859–876. doi:10.1287/opre.2020.2073 (+ WWW 2018, doi:10.1145/3038912.3052682)
8. Hajiaghayi, M. & Springer, R. (2022). "Analysis of a Learning Based Algorithm for Budget Pacing." arXiv:2205.13330
9. Chen, X., Kroer, C. & Kumar, R. (2021). "The Complexity of Pacing for Second-Price Auctions." *Math. OR*. arXiv:2103.13969
10. Aggarwal, G. et al. (2024). "Autobidding and Auctions in Online Advertising: A Survey." arXiv:2408.07685
11. Yang, X., Li, Y., Wang, H., Wu, D., Tan, Q., Xu, J. & Gai, K. (2019). "Bid Optimization by Multivariable Control in Display Advertising." *KDD*. doi:10.1145/3292500.3330681
12. He, Y., Chen, X., Wu, D., Pan, J., Tan, Q., Yu, C., Xu, J. & Zhu, X. (2021). "A Unified Solution to Constrained Bidding in Online Display Advertising." *KDD*. doi:10.1145/3447548.3467199
13. Chapelle, O. (2014). "Modeling Delayed Feedback in Display Advertising." *KDD*. doi:10.1145/2623330.2623634
14. Lang, K., Moseley, B. & Vassilvitskii, S. (2012). "Handling Forecast Errors While Bidding for Display Advertising." *WWW*. doi:10.1145/2187836.2187887
15. Zhang, W., Yuan, S. & Wang, J. (2014). "Optimal Real-Time Bidding for Display Advertising." *KDD*. doi:10.1145/2623330.2623633
16. Ghosh, A. et al. (2019). "Scalable Bid Landscape Forecasting in Real-Time Bidding." *ECML-PKDD*. arXiv:2001.06587
