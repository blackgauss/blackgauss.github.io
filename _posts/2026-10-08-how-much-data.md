---
layout: default
title: How Much Data — The Minimum Viable Dataset for Every Kind of Advertising
---

# How Much Data — The Minimum Viable Dataset for Every Kind of Advertising
*October 8, 2026*

Almost every argument in this industry is secretly an argument about sample
size. "We need to segment further" and "the segment model is noisy"; "train it
daily" and "the labels aren't mature"; "buy the segments" and "we should mine
our own logs" — each is a dispute about how many positives fit in a cell before
a number stops being a guess. The arguments never name themselves because the
arithmetic is unfashionable, but it is the only arithmetic that decides what a
bidder can promise. I want to do it here, out loud, for every kind of campaign
I know how to run: the binomial precision of a rate, the censored efficiency
of a price, the trajectories of a controller, and the strategies they
determine — from the cheapest-to-learn (retail media, most-walled) to the
empty spreadsheet of conversational ads. It fits in one page of algebra. It
has humbled me more often than any paper I've read.

## Five templates

**Rates.** For a proportion p estimated from N opportunities with n positive
events, the relative error is sqrt((1−p)/(pN)) ≈ 1/sqrt(n). Read it again with
the emphasis where it belongs: *precision is set by the positive count alone*.
The impressions are just how you pay for positives. Ten percent relative
error needs 100 positives; five percent needs 400; twenty percent — which is
model-input grade when a calibration layer sits behind it — needs 25. The same
math lives in classical statistics as the events-per-variable rule for
logistic regression, ten to twenty events per candidate predictor [1]. Now
convert to impressions at a conversion base rate of 10^-k: a
100-conversion cell costs 10^(k+2) impressions. The public Criteo
click-conversion export is the honest density anchor for k: 45.8 million rows
over 24 days yield 1.33 million clicks (a 2.9% click rate) and 103 thousand
conversions — a click-conditional rate of 7.7%, an impression-conditional rate
near 2.2×10^-4 [4]. That mid-band k≈4 says a hundred conversions per segment
cell costs a *million impressions per refresh cycle*, and it also exposes the
scarcity asymmetry that rules how these models get fed: click-conditional
conversion examples run about two orders of magnitude scarcer than
impression-scale examples, which is why the conversion model forever eats the
entire impression log to feed one funnel [2].

**Prices under censoring.** The bid-landscape model — the probability of
winning at each price — is a censored-data problem by construction: a win
shows you the clearing price, a loss only tells you it was above your bid. The
statistical machinery is older than the auction: censored regression dates to
Tobin's limited-dependent-variable estimator in 1958 [5], and the
censored-likelihood formulation of this exact model is standard in the KDD
literature [3]. The number that matters for planning is efficiency:
censoring a fraction c of observations costs roughly sqrt(1−c) of the
effective sample — at 67% censoring you keep about 57% of what an uncensored
log would have taught you, which is also the *Tobit* efficiency of the
estimator. To pin a landscape at one context bucket to 10% relative error at
a 5% win rate takes (2/0.1)²·19 ≈ 7,600 *effective wins with prices* — call it
fifteen to twenty-five thousand logged bids per bucket depending on how much
loss-notice relief you have, via the loss-notice mechanism the protocol
carries for exactly this purpose [9]. Multiply by the context slices you care
about — twenty geography × format × exchange cells is modest — and a full
nightly refresh wants three to five hundred thousand bids *per slice*. Nobody
has that hourly. This, and not any modeling philosophy, is why landscape
models are nightly-granular.

**Audiences.** A self-trained lookalike needs at least ten thousand seed
positives under the same events-per-variable logic [1]. At a conversion base
rate of 10^-4, ten thousand seeds means a hundred million impressions of
campaign history — so, in practice, only mature advertisers or aggregated
vertical pools qualify to train their own, and everyone else buys the vendor's
model. The vendor shelf is not small: one filing counts "more than 370
third-party data vendors" integrated into a single platform [6].

**Value.** If you bid on revenue per conversion rather than conversion count,
the label is continuous, and a mean with a coefficient of variation σ_v needs
(σ_v/ε)² conversions. Order values are heavy-tailed; σ_v ≈ 3 is a working
convention, not a measurement. For 10% relative error that is **900
conversions per cell** — ten times the binary requirement, and the cheapest
explanation of why value-based bidding is a feature of mature accounts.

**Controllers.** Pacing is the strange one: it learns *trajectories*, not
labels. A campaign-day is about twenty-four (dual, spend-rate,
remaining-demand) triples at the hourly publish cadence documented in the
systems literature [7, 8], and fitting a controller offline wants thousands of
campaign-days — hundreds of campaigns times weeks. In label terms pacing is
the *cheapest* component and in breadth the most expensive: it needs no new
data at all, only the logs you were contractually obliged to keep.

## What each strategy actually requires

| Strategy | binding constraint | minimum viable | dominant sources |
|---|---|---|---|
| Retargeting | ID-match coverage, not volume | 10^5 pool IDs at ≥30% match; 100 conversions/segment | advertiser list + identity + events |
| Broad prospecting | impression volume at the base rate | 10^6 impressions/segment/refresh; 10^8 for lookalike | request log + events |
| Context/semantic | labeled impressions, zero user history | 0 to start; 10^5/cell to be good | inline request |
| Frequency-capped flight | exposure-response resolution | ~8×10^5 users per cap arm | counters + events |
| CTV | household counts, slow labels | 10^4–10^5 exposed households + holdout + clean-room contract | advertiser/panel + batch joins |
| Retail media | contract, not statistics | 10^3–10^4 conversions/cell, labels in days | platform first-party |
| Conversational/LLM | none exists — data is the product | all transfer, log everything day one | own logs + human eval |

**Retargeting is a coverage problem wearing a volume costume.** The warm pool
converts at the high end of the base-rate band, so 100-conversion cells are
cheap — ten to fifty thousand impressions. What binds is identity: an
unmatched ID is simultaneously unaddressable *and* unlabeled, and match rates
across ID spaces run conventionally 30–70%. The minimum viable dataset is a
pool export on at most a day-old cadence, a pre-launch match-rate dry run, and
a hundred-plus conversions per segment you intend to price separately. Every
retargeting failure I have diagnosed was a coverage failure misreported as a
modeling failure.

**Broad prospecting is where the base rate hits full force.** At 10^-4, each
targeting cell wanting its own conversion term eats a million impressions per
refresh, and 10^-6 long-tail niches want a hundred million — beyond almost
every advertiser, which is why sane systems share value hierarchically (fit
globally, bias-correct per segment) instead of estimating per cell. The volume
of a mid-size bidder funds this: one to five million peak queries per second,
dayparting and edge filters shedding most of it, still leaves a hundred
million to a billion bid opportunities a day, a few million impressions at a
one-percent win [12], and a few hundred conversions — which is ten to
twenty *fresh* 100-conversion cells per day, no more. That is the real budget
line of the whole enterprise: a mid-size DSP funds about fifteen cells a day.
Anything you can say about segment granularity follows from fifteen.

**Context targeting is the cold-start escape hatch**, because it requires zero
user history: the features ride the request itself — site, app, category, the
publisher's taxonomy. Zero positives to *start*, ten to a hundred thousand
labeled impressions to be *good* (click labels at 10^-3–10^-2 are an order of
magnitude cheaper to earn than conversions). The price is a ceiling: without
user state the click model saturates, and its real economic role is covering
the traffic your own profiles can't resolve.

**Frequency caps need exposure-level truth.** Detecting a 20% decay in
conversion rate between cap-3 and cap-6 arms at a 5×10^-4 base rate is a
two-proportion test demanding roughly 8×10^5 users *per arm* — a million to
ten million users in flight before the response curve resolves any knee at
all. Hence the cheaper ladder: hold out a randomly throttled five-percent
cohort, and let cohort size, not model sophistication, set your error bars.
The data minimum is unforgiving: every serve logged at exposure level, joined
to conversions through the same keys, retained past the cap window. Flights
that log at flight level cannot answer the only question capping poses.

**CTV inverts the volume profile.** Far fewer, longer, pricier impressions;
clicks mostly absent, so engagement and completion outcomes replace the click
model entirely; identity *better* than display's — deterministic
publisher-account and household graphs — but labels arriving as store-lift or
clean-room purchase matches on a day-batch cadence with weeks-long attribution
windows. The minimum viable dataset is not a dataset, it is a contract:
ten-thousand-plus exposed households, a matched holdout, and a join agreement
*before* launch. Pacing against day-level budgets on hour-class ticks is
sufficient here precisely because event velocity is low.

**Retail media has the best data on the planet and it never leaves.**
Impression, detail page, cart, purchase, all inside one platform's first-party
ledgers, labels in hours, base rates at or above the good end of the band —
one filing even recognizes the revenue "on a net basis, as we act as an
agent," which tells you the platform is booking the fee and keeping the
data [10]. A hundred-conversion cell costs a thousand to ten thousand
impressions: the cheapest strategy to learn, the most constrained to port,
because cross-platform use means a capped, day-old cohort export or a purchased
lookalike. The walled garden's moat is not the shopper. It is the join.

**Conversational/LLM ads are the empty-spreadsheet strategy**: no auction
logs, no attribution convention, no landscape history, base rate unknown. The
minimum viable program is procedural — log everything in the bid-opportunity
shape from day one so labels become joinable retroactively; bootstrap with
human evaluation and relevance rating; import priors from search query-intent
models, the nearest labeled neighbor; seed one landscape bucket with about ten
thousand exploratory bids, which suffices when you have one context class.
The data is the moat at this phase, exactly as it was in the 2009–2012 open
auctions, and every shortcut that skips logging is a loan against the next
five years.

## The ladder, the refresh, and the boutique

Across all strategies the cold-start order is the same and it is all sample
size. Rung zero: rules and category benchmarks, zero labels. Rung one: a
global model plus a per-segment multiplier calibrated on ~100 impressions per
segment — against the 100 *conversions* needed to train a segment from
scratch; that asymmetry, two orders of magnitude for the price of a
calibration layer, is why every platform in history starts there. Rung two:
coarse cross-segment models at about a million labeled impressions. Rung three:
personalization, needing ten-plus events per user, which day one only
retargeting-adjacent pools can afford because they bring their own features.
Rung four: landscape and learning-based bidding, needing the fifteen-to-twenty
thousand bids per bucket plus censoring-relief plumbing — historically the
last rung a market climbs, and it is no accident that the bid-shading
literature flourished only after first-price auctions returned in 2019.

In steady state the refresh cadences differ per component and each one is the
delay law speaking. Click models stream — hourly increments, daily full,
billions of predictions a day in the published accounts [11]. Conversion
models would go stale waiting thirty days for labels when roughly 35% of
conversions arrive within an hour, half by a day, but a persistent 13% tail
arrives after two weeks [2]; the delayed-feedback reweighting of immature
labels makes a *daily* retrain admissible once conversion flow reaches about a
thousand a day, and weekly-with-pooling below a hundred. Landscapes stay
nightly and let the pacing dual absorb intraday drift, because refitting a
censored model hourly costs precision it cannot spend. Lookalikes refresh
weekly on clean-room cadence; pacing publishes hourly as published systems
have since the 90-minute feedback controllers [7, 8].

And then the boutique — the case the arithmetic is really for. At ten queries
per second: 8.6×10^5 requests a day, on the order of 10^5 bids after edge
shedding, a couple thousand impressions at a 2% win, ten clicks, and 0.2 to 2
conversions a day. No per-segment click model. No per-bucket landscape — one
bucket would take a year. No self-trained conversion or value model. The
viable stack is rungs zero and one, everywhere: rules, context, purchased
segments, vendor lookalikes, one global calibrated model, and at most one
pooled landscape at campaign granularity. This is the junk-shed factor of the
exchange business translated into economic dress: 80–90% of queries are shed
at the edge by the big bidders precisely because their *data economics* don't
need them, while the small bidder needs everything and gets nothing.

One budget note closes the loop to the money. Purchased data and identity are
booked — in the only filing that lets us see — *inside platform operations
expense*: hosting, traffic, compute, data, staff, ≈4% of gross spend against a
≈21% take [6]. Any input whose cost exceeds a tenth of the take is
structurally uncompetitive, and the marginal data purchase competes against
free label fabrication from your own event plane. So the rational ordering as
you scale is always: *fabricate before you buy*, and the build-vs-buy crossover
is exactly the day a purchased segment stops filling 100-positive cells faster
than your own pipeline does.

The industry argues about models. The models argue about labels. The labels
argue about counts. One hundred positives, fifteen thousand bids, ten thousand
seeds, eight hundred thousand users, a year of one bucket: write the five
numbers on an index card, and most strategy disputes resolve themselves before
the first meeting ends.

## References

1. Peduzzi, M., Concato, J., Kemsky, E., Silbersnitz, H. & Feinstein, A. R. (1996). "A Simulation Study of the Number of Events Per Variable in Logistic Regression Analysis." *Journal of Clinical Epidemiology* 49(12). doi:10.1016/S0895-4356(96)00236-3
2. Chapelle, O. (2014). "Modeling Delayed Feedback in Display Advertising." *KDD*. doi:10.1145/2623330.2623634
3. Zhang, W., Yuan, S. & Wang, J. (2014). "Optimal Real-Time Bidding for Display Advertising." *KDD*. doi:10.1145/2623330.2623633
4. Criteo. *Display Advertising Challenge dataset* (45.8M rows, 24 days), archived at UCI. https://archive.ics.uci.edu/dataset/477/criteo+display+advertising+challenge
5. Tobin, J. (1958). "Estimation of Relationships for Limited Dependent Variables." *Econometrica* 26(1). doi:10.2307/1907382
6. The Trade Desk, Inc. (2026). *Annual Report (Form 10-K) for fiscal year 2025* (370+ data vendors; data-related costs in platform operations expense), filed 2026-02-27. https://www.sec.gov/Archives/edgar/data/1671933/000167193326000014/
7. Zhang, W., Rong, Y., Wang, J., Zhu, T. & Wang, X. (2016). "Feedback Control of Real-Time Display Advertising." *WSDM*. doi:10.1145/2835776.2835843
8. Yang, X., Li, Y., Wang, H., Wu, D., Tan, Q., Xu, J. & Gai, K. (2019). "Bid Optimization by Multivariable Control in Display Advertising." *KDD*. doi:10.1145/3292500.3330681
9. IAB Tech Lab, *OpenRTB Version 2.6* (`lurl` loss-notice URL and price macros). https://github.com/InteractiveAdvertisingBureau/openrtb2.x/blob/main/2.6.md
10. Criteo S.A. (2026). *Annual Report (Form 10-K) for fiscal year 2025* (retail media revenue recognized net, as agent), filed 2026-02-26. https://www.sec.gov/Archives/edgar/data/1576427/000157642726000014/
11. McMahan, H.B. et al. (2013). "Ad Click Prediction: a View from the Trenches." *KDD*. doi:10.1145/2487575.2488200
12. Yuan, S., Wang, J. & Zhao, X. (2013). "Real-time Bidding for Online Advertising: Measurement and Analysis." arXiv:1306.6542. doi:10.48550/arXiv.1306.6542
