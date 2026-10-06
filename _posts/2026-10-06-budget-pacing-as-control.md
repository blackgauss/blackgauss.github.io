---
layout: default
title: Budget Pacing Is a Control Loop
---

# Budget Pacing Is a Control Loop
*October 6, 2026*

The pacing problem in one sentence: spend a daily budget without overdrawing or
front-loading, without knowing tomorrow's supply. It sounds like an accounting
concern. It is actually the place where a DSP most plainly becomes a
control-theory and online-optimization problem, and the literature — much of it
published by the companies doing it at scale — is unusually good.

## Two ways to see the same object

With perfect foresight, pacing is a **packing LP**: maximize delivered value
subject to spend ≤ B. Its dual has one multiplier λ per constrained resource,
and optimality is just "buy iff `value ≥ λ·cost`." So pacing is an *online
solver for the dual variable λ*. The alternative, equivalent view: if you hold
λ roughly constant, cumulative spend is a monotone function `S(λ)`, so hitting
budget means finding the root of `S(λ) = B`. Both framings describe what
every production system does — root-find on a spend curve with a noisy,
*delayed* estimate of spend.

What makes it a genuine control problem, not a root-find: the map λ→spend has
an unknown, drifting *gain* (competition changes under you), *dead time*
(conversions arrive late), and a *multiplicative* rather than additive response
(spend moves roughly exponentially with bid on log-normal-ish landscapes). The
industry's answers are, predictably, the classic control answers plus some
regret bounds.

## The update laws, oldest to newest

**Throttling** — the probabilistic spend governor, and older than its theory.
Target `α(t) = (t/T)·B`; multiplicatively nudge a participation probability up
when behind, down when ahead, clipped to [0,1]. It's a pure proportional
controller on the *entry gate*. The weakness is that `p` is blunt: it discards
high-value auctions indiscriminately, so bid-based control dominates whenever
value ranking can be trusted — but throttling never fully went away, because
changing bids has an unpredictable spend response and sometimes you need a hard
stop.

**PID on the bid multiplier**, and its degenerate case **waterlevel** — an
integrator-only PID in log-bid space converges to exactly the pacing-rate
recurrence of LinkedIn's 2014 controller. The control-theory reading is
satisfyingly clean: the proportional term reacts to current error, the integral
term kills steady-state offset, the *derivative term is the dangerous one* on
advertising data because it amplifies noise, and the integral term is the one
that blows up under delayed feedback unless you add anti-windup, because
conversions lag and the controller keeps pushing against a plant that is
already responding.

**Dual descent** — the modern canonical form, where those laws become
"approximations of" something with proofs. Keep λ, act greedily against
reduced value `ṽ = v − λ·c` (a beautiful phrase to hang the architecture on),
and update multiplicatively `λ_{t+1} = λ_t·exp(η·(cost − B/T))/Z`. Guarantees:
`Õ(√T)` regret with iid supply, a constant competitive ratio with adversarial
supply, and provably *no early depletion* — λ rises before the resource runs
out. It subsumes PID; the integral law in log-λ space is mirror descent with a
linear reference function. This is the same reduced-value trick as optimal
bidding (see the KKT post), the same reduced-value trick as the pacing LP: the
dual multiplier keeps showing up as the *only* interface between economics and
the auction, which means it is also the only thing the bidder must compute in
real time.

## When it goes wrong

The failure modes are symmetric and both advertiser-visible: underspend (the
line didn't deliver, lost margin) and ~1–2% overspend (the line overdelivered,
and refunds or goodwill get subtracted). Millions of simultaneous auctions
racing one daily counter means the controller is distributed, with
read-modify-write contention — which is why systems settle on *sharded,
asynchronous* budget counters with a control law tolerant of lag, rather than a
single hot counter. And it ties back to the landscape: to know the marginal
cost of the next percentile of supply you need the *distribution* of winning
prices, so the bid-landscape model isn't just for shading — it's pacing's
sensing apparatus too.

## References

1. Xu, Z. et al. (Tencent). "A Practical Guide to Budget Pacing." arXiv:2503.06942
2. Zhang, J. et al. (2016). "Feedback Control of Real-Time Display Advertising." *WSDM*. doi:10.1145/2835776.2835843, arXiv:1603.01055
3. Agarwal, A. et al. (2014). "Budget Pacing for Targeted Online Advertisements at LinkedIn." *KDD*. doi:10.1145/2623330.2623366
4. Balseiro, S., Lu, H. & Mirrokni, V. (2021). "Dual Mirror Descent-Based Online Budget Pacing." *Operations Research* 71(1):101–119. doi:10.1287/opre.2021.2242, arXiv:2011.10124
5. Balseiro, S. et al. (2023). "A Field Guide for Pacing Budget and ROS Constraints." *KDD*. arXiv:2302.08530
6. Conitzer, V., Kroer, C., Sodomka, E. & Stier-Moses, N. (2020+). "Multiplicative Pacing Equilibria." *Management Science* 70(2). doi:10.1287/mnsc.2022.4310, arXiv:1811.07166
7. Hajiaghayi, M. & Springer, R. (2022). "Analysis of a Learning Based Algorithm for Budget Pacing." arXiv:2205.13330
8. Chen, X., Kroer, C. & Kumar, A. (2023). "The Complexity of Pacing for Second-Price Auctions." *Mathematics of OR*. arXiv:2103.13969
9. Yang, X. et al. (2019). "Bid Optimization by Multivariable Control in Display Advertising." *KDD*. doi:10.1145/3292500.3330681
10. Ghosh, S. et al. (2019). "Scalable Bid Landscape Forecasting in Real-time Bidding." *ECML-PKDD*. arXiv:2001.06587
