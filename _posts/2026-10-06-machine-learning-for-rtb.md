---
layout: default
title: Machine Learning for Real-Time Bidding
---

# Machine Learning for Real-Time Bidding
*October 6, 2026*

A DSP's scoring plane has a strange contract: predict `P(click | context)` and
`P(conversion | click)` billions of times a day, inside milliseconds, with
labels that arrive late or never, on features that are mostly empty, into a
mechanism that only makes sense if the probabilities are *calibrated* — not
merely well-ranked. Almost every hard problem in industrial ML shows up here in
pure form: model architecture for sparse crosses, optimization for streaming,
serving-systems memory engineering, survival analysis for delayed labels,
causal correction for selection bias, and evaluation methodology. This entry is
the full stack as the papers left it, and the papers are unusually good because
they were written when the field had to figure this out first.

## What actually gets learned

Before architectures — the components, because the list is the spec:

1. **pCTR**, `P(click | impression context)` — impression-scale data, near-
   immediate labels.
2. **pCVR | click** — click-scale (two orders of magnitude smaller), labels with
   delay up to the attribution window.
3. **pCTCVR via decomposition** — `eCPM = CPA · Pr(click) · Pr(conv | click)`.
   Chapelle's factorization is not just tidy: it removes the need for a
   long-window impression↔conversion join, and it degrades gracefully for
   zero-conversion campaigns (each head trains on its own delay profile).
4. **Win-price / landscape models**, `P(win | bid)` — the shading/pacing feed.
5. **Calibration maps per slice** — fitted post-hoc, deliberately outside the
   gradient loop (more on why below).
6. **Delay/hazard models** — auxiliary at training, discarded at serving.

Everything else in the stack — pacing multipliers, shading policies —
*consumes* these outputs. The contract is "expose a calibrated probability."

## The model lineage

**Factorization Machines** (Rendle, ICDM 2010) are the foundation:
`ŷ = w₀ + Σ wᵢxᵢ + Σ_{i<j} ⟨vᵢ,vⱼ⟩xᵢxⱼ`. The quadratic term reduces to
½Σ_f[(Σᵢ v_{if}xᵢ)² − Σᵢ v²_{if}x²ᵢ] — *linear* time in non-zero features.
That identity is why FM is viable on ad-feature vectors with hundreds of
non-zeros out of billions: it generalizes to unseen feature *pairs* from data
seen only on the individual features, which is the whole sparsity problem of
advertising. The industry successor cited everywhere is field-aware FFM (Juan
et al., WWW 2017): field-specific embeddings buy accuracy at
O(d·k·#fields) parameters and lose the linear-time trick. It's a fair trade
summary of ad ML in one sentence.

**Wide & Deep** (Cheng et al., Google, DLRS@ICML 2016);
jointly trains a memorization side (cross-product transforms —
`AND(user_installed_app, ad_impressed)` coefficients) against a generalization
side (embeddings to a DNN) so the wide part papers over the deep part's imperfect
extrapolation. Not an ensemble; joint training is the point.

**DCN** (Zhou et al., ADS@KDD 2017) replaces manual crosses with learned ones:
`x_{l+1} = x₀x_lᵀw_l + b_l + x_l` — linear parameters per layer, spanning all
crossings up to order l+1. (DCN-v2 later promotes `w_l` to matrices.)

**DIN** (Zhou et al., Alibaba, KDD 2018) attacks the fixed-length user vector:
a local activation unit attends over the user's behavior history *conditioned
on the candidate ad*, so "the user" is a different representation for every ad
being scored. This candidate-conditioned attention is the pattern that
propagated into essentially every DSP scoring stack afterward.

**xDeepFM** (Wang, Fu & Chen, SIGIR 2018) adds the Compressed Interaction
Network: vector-level, order-by-order explicit interactions beside implicit
DNN ones.

The honest reading of this lineage: it's a decade-long argument about **explicit
versus implicit feature crosses** under serving constraints, and production
winners were decided more by memory footprint and latency than by offline AUC.

## The production baseline: FTRL and McMahan et al.

Google's "Ad Click Prediction: a View from the Trenches" (McMahan et al., KDD
2013) is the canonical account of a working system at billions of events/day,
and its numbers are the ones I keep in my head when estimating anything.
Trained with **FTRL-Proximal**: the update
`w ← argmin [g₁:t·w + ½Σσ_s‖w−w_s‖² + λ₁‖w‖₁]` produces the same sequence as
online gradient descent when λ₁ = 0 (a mirror-descent equivalence McMahan proved
in 2011) but zeroes coefficients *exactly* when λ₁ > 0 — naive subgradient-L1
"will essentially never produce coefficients that are exactly zero," and serving
memory is the optimization target, not training. The implementation stores two
scalars per coordinate (`z_i`, `n_i`) and touches only non-zero features. Key
numbers, all from the paper:

| Technique | Mechanism | Measured |
|---|---|---|
| Per-coordinate rates `η_{t,i}=α/(β+√Σg²)` | Adagrad accumulator inside FTRL | **−11.2% AucLoss**, where 1% is "considered large"; regret argument (rare features punished for updates they never got: Ω(T^{3/2}) vs O(T^{1/2})) |
| Poisson feature inclusion | admit unseen features w.p. p | p=0.03: 60% RAM, 0.02% loss |
| Counting Bloom filters | admit after n sightings | n=2: 66% RAM, 0.008% loss |
| q2.13 fixed-point, randomized rounding | 16 bits/coeff, zero-mean error | **75% RAM, no measurable loss** |
| Counts-as-learning-rate | `Σg² ≈ PN/(N+P)` from counts | "just as well" |
| Negative subsampling `1/r` weights | keep all clicks + fraction of non | aggressive r: "very mild impact" |

Half the unique features occur *exactly once* in billions of examples. That
statistic is the reason the table exists.

The negative results are as valuable: feature hashing past billions of buckets
hurt; dropout (0.1–0.5, tuned) never helped on sparse noisy ad data; feature
bagging cost 0.1–0.6% AucLoss. Among the most-cited "why not" data points in
all of industrial ML, and they came from ad ML.

Evaluation discipline from the same paper, adopted wholesale wherever I work:
**progressive validation** — predict-then-train on the stream, because it uses
100% of data for both roles and mirrors serving; metrics (AucLoss, LogLoss,
squared error) always as *relative* percent changes on identical streams, since
absolute LogLoss depends on base rate and drifts by country/topic/hour; and
slice-level dashboards, because aggregate wins routinely hide offsetting losses.
For exploration, an *uncertainty score* `u(x) = αη̂·|x|` bounding the one-example
change in log-odds — one dot product — correlates with true error about as well
as a thirty-two-model bootstrap.

## Calibration is the architectural load-bearer

Deep logit models are not calibrated, and in bidding that is not a cosmetic
defect: `bid = value · risk-adjusted probability` only means anything if the
probability means what it says at money scale. The fitted families: Platt
scaling (Niculescu-Mizil & Caruana 2005 — simple logistic recalibration beats
the fancy model on calibration), power-law maps `γp^κ`, and isotonic regression,
which McMahan's team found "significantly reduced bias… at both the high and
low ends." Crucially, calibration is fitted *per slice* and lives **outside the
model**: their words are that this is what allows "a loosely coupled overall
system design separating concerns of optimizations in the auction from the
machine learning machinery." The bid side must not know about the model side.

And a warning printed in fine print that costs the field real money every year:
under the system's own feedback loop — bids select which impressions you
observe, observations train the model — **no theoretical calibration guarantee
is possible** without further assumptions (McMahan & Muralidharan). The DSP is a
closed loop; its model's meaning is partly endogenous. Selection bias is the
same coin: you train on impressions you chose to buy, so the fix (inverse
propensity weighting, Schnabel et al. 2016; the sample-selection-bias machinery
of Cortes et al.) is causal inference wearing a CTR costume.

## Delayed feedback: the Chapelle model

The dilemma is sharper than "labels are late." A conversion can happen days or
weeks after the click; a fixed matching window is lossy in *both* directions —
too short relabels future converters as negatives, too long trains on stale data
while 11.3% of Criteo traffic came from campaigns younger than a month. The log
statistics: 35% of conversions within an hour, ~50% within a day, 13% still
arriving after two weeks (a Yahoo property saw 95.5% in an hour — the delay law
is per-advertiser, which is its own infrastructure requirement).

The model (Chapelle, KDD 2014) is a two-GLM latent-variable construction. Five
variables per event and one structural identity:

```
Y = 0  ⟺  C = 0  or  E < D      (not-yet-converted = never-or-too-early)
```

with `p(x) = σ(w_c·x)` and exponential delay `λ(x) = exp(w_d·x)` (it "fits
quite well" per-campaign, modulo 24-hour cyclicality), and the sole assumption
that `(C,D) ⟂ E | X`. The likelihood decomposes into an observed-conversion
term and a *survival* term for unconverted clicks, `1 − p + p·e^{−λe}` — and
the posterior that a silent click is a future converter, `e^{−λe}p`, gives each
unlabeled example an **elapsed-time-dependent soft label**, which is exactly
what breaks naive positive-unlabeled learning's missing-at-random assumption.
Fit by EM or joint L-BFGS on a non-convex objective whose known pathology —
"low CVR + short delay" vs "high CVR + long delay" fit nearly equally well —
vanishes with data. The gradient of an unlabeled example interpolates smoothly
between fully-ignored (too early to call) and exactly-a-negative (long past its
hazard window): the paper's abstract phrase "discard or keep" is implemented,
literally, by a sigmoid of elapsed time. The no-feature closed form `E[D] =
Σt/Σy` is the sanity check everyone should compute before buying anything fancy.

Consequences for the pipeline: every click event must carry either a
conversion-with-delay or its elapsed time, which makes a long-lived
click→conversion join keyed by (user, advertiser) part of the ML system, not
the attribution vendor's problem; and the naive baseline — treat unconverted
clicks as negatives — systematically underpredicts, worst at campaign start,
which is exactly when a new campaign can least afford it.

## Serving, features, and the feedback loop

The serving plane is a memory-latency problem wearing an ML hat: precompute what
you can, KV-cache the rest — embeddings pushed offline to serving clusters,
online updates from streams — with the join/training architecture (their Photon
streaming joins; the Lambda pattern; the feature-registry and point-in-time
correctness discipline Feast later productized) treated as first-class ML
infrastructure. McMahan's automated feature management over
"thousands of input signals consumed by hundreds of active models" — annotation,
deprecation gates, automatic vetting — reads in 2026 like a Feast/feature-store
design doc written a decade early.

The last thing I'd internalize is the loop again, deliberately, because it ties
this essay to the pacing one: the model feeds the bid, the bid selects the data,
the data retrain the model. Conversion-lag enters the *pacing controller* as
delay-time in the feedback path; selection bias enters the *model* as missing-
not-at-random. Same phenomenon, two subsystems, two different 2014 papers that
each quietly solved half of it. A DSP is an online learning system whose
training distribution is written by its own controller — and every serious
technique in this post exists to keep that loop stable and honest while the
market moves under it.

## References

1. Rendle, S. (2010). "Factorization Machines." *IEEE ICDM*. doi:10.1109/ICDM.2010.127
2. Juan, Y. et al. (2017). "Field-aware Factorization Machines for CTR Prediction." *RecSys*, doi:10.1145/3109859.3109862; "FFM in a Real-world Online Advertising System." *WWW*. arXiv:1701.04099
3. Cheng, H. et al. (2016). "Wide & Deep Learning for Recommender Systems." DLRS@ICML. arXiv:1606.07792, doi:10.1145/2988450.2988454
4. Zhou, X. (2018) / Zhou, H. et al. (2017). "Deep & Cross Network for Ad Click Predictions." ADKDD. arXiv:1708.05123; DCN-v2 arXiv:2008.13535
5. Zhou, G. et al. (2018). "Deep Interest Network for Click-Through Rate Prediction." *KDD*. arXiv:1706.06978, doi:10.1145/3219819.3219823
6. Wang, J., Fu, F. & Chen, J. (2018). "xDeepFM." *SIGIR*. arXiv:1803.05170
7. McMahan, H.B. et al. (2013). "Ad Click Prediction: a View from the Trenches." *KDD*. doi:10.1145/2487575.2488200
8. Xu, D., Xiao, Y. & Qi, B. (2018). "Self-defined Loss Function & Mirror Descent View of FTRL." *JMLR* 19(47) (FTRL–mirror-descent equivalence); McMahan (2011). "Regularized Algorithms for Online Learning." *AISTATS*
9. Streeter, M. & McMahan, H.B. (2012). "Improving regret bounds for online PCA… / lower bounds for per-coordinate." *COLT*, arXiv:1002.4862
10. Duchi, J., Hazan, E. & Singer, Y. (2011). "Adaptive Subgradient Methods." *JMLR* 12 (Adagrad)
11. Golovin, D. et al. (2015). "Quantized Logistic Regression via Randomized Rounding (q2.13)." *ICML / IEEE Data Eng. Bull* 38(1)
12. Chapelle, O. (2014). "Modeling Delayed Feedback in Display Advertising." *KDD*. doi:10.1145/2623330.2623634 (preprint wnzhang.net RTB reading list)
13. Niculescu-Mizil, A. & Caruana, R. (2005). "Predicting Good Probabilities with a Learning Curve / Obeying the Law." *ICML*. (Platt-scaling calibration paper)
14. Elkan, C. & Noto, K. (2008). "Learning Classifiers from Only Positive and Unlabeled Data." *ICML*. doi:10.1145/1394021.1394055
15. Schnabel, T. et al. (2016). "Recommendations as Treatments: Debiasing Learning and Evaluation." *ICML*. arXiv:1602.05352
16. Cortes, C. et al. (2008). "Sample Selection Bias Correction Theory." *ALT*. doi:10.1007/978-3-540-87987-9_10
17. McMahan, H.B. & Muralidharan, A. (2012). "A General Adaptive Regularization Framework with Improved Regret Bounds." / calibration under feedback ("Model Calibration with Bandit Feedback").
18. Tiwari, M. & Seldowia, A. (2015). (Criteo/Google delayed conversion stats as cited in Chapelle §2.3)
19. Feast documentation (feature registry, point-in-time correctness). https://docs.feast.dev
20. Ren, K. et al. (2019). "Learning the Win-Price in Display Advertising." *KDD*; Ghosh et al. (2019). "Scalable Bid Landscape Forecasting." arXiv:2001.06587 (landscape models consumed by the bid side)
21. Ananthanarayanan et al. (2013). "Photon: Join-based Streaming." *SIGMOD*. doi:10.1145/2463372.2463403 (the join architecture behind the McMahan system)
