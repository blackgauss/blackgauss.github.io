---
layout: default
title: Machine Learning on the Worst Dataset in Tech
---

# Machine Learning on the Worst Dataset in Tech
*October 6, 2026*

RTB prediction is supervised learning where the labels are rare, arrive late,
censored, adversarially contaminated, non-stationary — and are a product of
your own past bidding. Every trick in the DSP ML stack exists to survive one of
those clauses. The good news is the stack is legible: five papers describe most
of what production scoring looks like.

## The model stack, and what each layer is for

The learned components are narrow and stable across every public account:
pCTR, pCVR given click, the win-rate curve, post-hoc calibration maps, and an
auxiliary delay model that's discarded at serving. The architectures:

**Factorization Machines** (Rendle, 2010) are the substrate. Ad feature
vectors are categorical one-hot monsters — billions of dimensions, a tiny
fraction nonzero. FM writes pairwise interactions as `Σ⟨vᵢ,vⱼ⟩xᵢxⱼ` with
*shared low-rank embeddings*, so the model extrapolates interaction strength to
feature *pairs* that were never co-observed, from data seen on the individual
features. The 2010 trick everyone quotes: the quadratic term collapses to sums
of squares, giving **linear time in nonzeros** — which is the entire reason
this family is servable at all.

**Wide & Deep** (Google, 2016) is the memorization/generalization duality
stated plainly: a linear model over hand-crossed features memorizes
co-occurrence; embedding-fed DNNs generalize to unseen pairs; joint training
lets wide compensate where deep underfits. **DCN** (2017) replaces the manual
crosses with layers that *learn* bounded-degree polynomial crosses at linear
parameter cost. **xDeepFM** (2018) computes interactions explicitly at the
vector level. **DIN** (Alibaba, KDD 2018) is the one that aged best: a user's
representation shouldn't be one fixed vector — attend over their behavior
history *conditioned on the candidate ad*. That single idea is now ubiquitous;
it arrived in 2018 to solve CTR.

The production baseline is not deep. **FTRL-Proximal** (McMahan et al., "Ad
Click Prediction: A View from the Trenches", KDD 2013) is the canonical account
of Google's CTR system and the richest engineering paper in the whole
literature. The algorithm composes Adagrad-style per-coordinate learning rates
— a rare feature shouldn't be penalized with the same step size as a common
one; measured: **11.2% AucLoss reduction, where 1% is "considered large"** —
with a proximal L1 that zeroes coefficients *exactly* (naive L1 subgradient
essentially never does), because the optimization target is serving memory, not
training. Half of the unique features occur exactly once in billions of
examples, so the serving-plane tricks are the paper: Poisson feature inclusion
(60% RAM saved at 0.02% loss), counting Bloom filters for admission (66%
saved), q2.13 fixed-point coefficients (75% saved, no measurable loss),
negative-subsampling with importance weights. Also the *negative* results,
which nobody publishes elsewhere: dropout never helped on sparse noisy ad
data; hashing past several billion buckets measurably hurt.

Their evaluation discipline is worth stealing for any streaming ML: *progressive
validation* — predict, then train, on the same stream, so 100% of data serves
both roles and the offline metric mirrors the serving regime; metrics reported
only as relative deltas, because LogLoss's absolute floor depends on a base
rate that drifts by country and hour.

## Calibration is the product

A bid is *money*, so `pCTR` must mean a frequency, not just a ranking. The
architecture keeps the model as a scorer and fits a correction layer per slice
afterward — power-law (`γp^κ` via Poisson regression) or isotonic (PAVA), with
isotonic noted for crushing bias at the tails. The Google paper states the
systems point explicitly: calibration is what decouples the auction's
optimization from the ML machinery — the whole `bid = f(pCTR, policy)`
decomposition rests on it. And the honest caveat: their own citation shows no
calibration guarantee is possible *under the system's feedback loop* — bidding
changes which impressions you observe, which retrains the model that decides
the bidding. You are censoring your own training set.

## Delayed feedback

Chapelle (Criteo, KDD 2014) is the other foundational paper, and its statistics
are brutal: on Criteo logs only ~35% of conversions land within an hour of
click, ~50% after a day, and 13% more than two weeks later — while a third of
traffic is from campaigns less than a month old, so you cannot wait for labels.
Any fixed window is lossy: cut early and tomorrow's converters poison training
as fake negatives; wait for truth and the model is stale relative to the
campaigns that matter.

DFM's fix is one latent variable: `Y (converted yet) = 0 ⟺ (never will ∨ delay
> elapsed)`. Fit two linked GLMs — a logistic `p(x)` for eventual conversion
and an exponential-hazard `λ(x)` for the delay — and every unlabeled click gets
a *soft label*, `w = e^{−λ(x)·e}·p(x)`: the probability it's a future converter
given how long it's been quiet. Recent silence means little; long silence is
evidence. Train with EM or joint non-convex optimization (two fates — "low CVR
fast, high CVR slow" — fit nearly equally well until enough data breaks the
tie). The consequence for systems: your event schema must carry, for every
click, either `delay` or `elapsed` forever, which means a long-lived
click→conversion join is not an analytics nicety, it's a training-data
dependency.

The pCTCVR decomposition deserves last word: `eCPM = CPA · pCTR · pCVR`. Two
heads, two feedback speeds — clicks near-immediate at impression scale,
conversions delayed at click scale (two orders less data). You never join them
in a long-window pipeline; you multiply. The cleanest example I know of a
factorization chosen because *of the data's latency*, then the ML following the
schema into the architecture.
