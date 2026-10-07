---
layout: default
title: Notes on Sub-100ms Auction Latency
---

# Notes on Sub-100ms Auction Latency

Notes, not an essay — an appendix to the map. The constraint that shapes every
engineering decision in a demand-side platform, collected honestly, with the
parts the public records can and cannot support told apart.

## The contract

An OpenRTB bid request carries a `tmax` field: "maximum time in milliseconds
the exchange allows for bids to be received **including Internet latency** to
avoid timeout," and the spec is careful to add that this value supersedes any
*a priori* guidance from the exchange. Miss it and the bid is simply discarded
— no retry, no second chance, not even an error. The spec's own worked example
ships `tmax: 120`. Trade sources describe 20–400 ms decision windows, with
"less than 100 ms" as the often-cited bar separating a DSP from an ad network.

The first honest note: **the public record is thin on where the milliseconds
actually go.** The OpenRTB spec defines the object model; none of the per-stage
budget numbers anyone quotes in interviews are in a citable document. The
exchange-published numbers, the ones you can pin, are `tmax` behavior and the
Prebid reference implementations' timeout arithmetic — and that arithmetic
matters, because it shows *your* budget is not what it looks like.

## The real budget is smaller than it thinks it is

Prebid is the de facto reference implementation of the sell side, and its
timeout chain is the best public documentation of who subtracts what:

- The publisher page runs an **auction timeout** (delaying the ad-server call
  to collect bids) plus a separate failsafe `setTimeout` as the page safety
  net.
- The server-side leg (`s2sConfig.timeout`) "should probably be within the
  range of 50%–75% of the Auction Timeout," and that value is what's sent as
  `tmax` in the OpenRTB request. Default 75%.
- Prebid Server then *shaves again* before asking its bidders:
  `bidder_tmax = tmax − request_processing_time − network_latency_buffer −
  bidder_response_duration_min`, computed at runtime, with an `enforced_tmax`
  as the real cutoff and the stated `tmax` advisory. It refuses to call a
  bidder at all if what's left is smaller than its own response-preparation
  floor.

So the `tmax` you receive has already netted out the upstream hops' budgets.
Then network RTT comes off, TLS and JSON deserialization come off, exchange
fan-out timing comes off — leaving, by the arithmetic everyone converges on,
maybe 10–50 ms of *true compute* for filters + ML + assembly inside a nominal
100 ms clock. If you honor `tmax` only at your own wire edge you'll never be
late; if you honor only the number you were handed, you'll still time out at
the exchange, an ocean away, on someone else's timeout arithmetic. The clock
is not the budget; *everyone else's budget subtraction* is the budget.

## What the load actually is

A mid-size DSP sees one to five million bid requests per second at peak; a
large one, ten million or more. (Exchange QPS grows with the number of
exchanges a DSP connects to — you have to hear from all of them to know the
market, which is itself a note: the ingestion bill is proportional to how much
of the market you want to *see*.) Every request is a stateful lookup — user
profile, frequency caps, budget pacing state — plus a model score. The system
is:

- **Latency-critical in the tail.** p99 must fit under `tmax`. A GC pause or a
  cold cache miss is a *lost auction*, not an error; nothing logs an error
  when you lose. Consequences: aggressive caching, in-memory stores,
  low-GC runtimes on the hot path, request-level budgets everywhere ("if not
  scored in X ms, serve cached bid or no-bid, never block").
- **Stateful at absurd scale.** User-profile key-value at billions of keys,
  reads inside single-digit milliseconds per hop; hedged requests and
  locality-aware sharding because you pay for the tail sum, not the mean.
- **Write-heavy forever.** Every impression, click, conversion becomes a log
  line; the logging path alone is a Kafka-scale streaming-infrastructure
  problem. The bidder is the part that looks like a web server; the rest of
  the company exists to feed it and learn from it.

## Reading the pipeline stage by stage

Where the milliseconds conventionally live inside a 100 ms clock (label these
*convention*, not measurement — but the failure modes listed with each stage
are universal enough to be the real content):

**Edge / ingress (≈5 ms): TLS, connection reuse, validation, decode, load
shed.** The whole QPS bill is actually paid here; the bidder behind should see
far less traffic than exchanges send, because 80–90% of inbound requests are
junk from a DSP's point of view. Failure modes are administrative and must be
counted per exchange: decode errors → immediate 400 and a counter; queue depth
rising → *shed*, don't let the bidder overrun `tmax` on a request it will miss
anyway; exchange connection lost → circuit-break that one, keep bidding the
rest. No-bids should go out as `204 No Content` — which the spec itself calls
"the most bandwidth-friendly form of this signal."

**Edge filters (≈2–5 ms): cheap predicates requiring no learned state.**
Privacy and consent first (GPP/TCF strings, GDPR/COPPA flags) — these short
circuit to no-bid *before* valuation, because consent is a predicate, not a
feature; then supply-path (`schain`) validation, dedup on `source.tid`,
geo/format/currency sanity, brand-safety prelists, creative-size feasibility.
Deliberately ordered cheap-to-expensive so the cheapest kills happen first.
The deliberately asymmetric failure polarity is the interesting engineering
truth: **privacy filters fail closed** (no consent signal, no bid) and
**quality filters fail open** (bot scorer times out → bid anyway, don't
silently abandon inventory). Two kinds of filter, opposite defaults, because
the harm in each direction is not symmetric.

**ID resolution + feature lookup (≈3–8 ms): the most latency-sensitive read
in the machine.** Canonicalize cookie/device/IDFA/GPSAAID (the `mm`
match-method chain on extended IDs tells you whether the hop to that canonical
ID was a real sync or a probabilistic bridge — you should know which, because
it tells you how to weight every feature downstream), then a *parallel*
fan-out to profiles, historical stats, deal memberships, frequency caps.
Fail-open discipline: KV miss → population priors, never block; KV slow →
partial vector and a low-confidence flag; identity graph stale →
over/under-frequency, caught downstream by cap breaches and TTL jobs.

**Scoring (≈3–8 ms): model inference plus calibration.** Deep-model serving
at bidder QPS is what the budget is mostly spent *on*. Fall back to simpler
model or static prior on scorer timeout. The classic incident class here isn't
latency at all — it's **training/serving skew**: the model and the feature
pipeline drifting out of agreement, caught neither by latency alarms nor by
offline eval, only by calibration monitoring and shadow scoring.

**Bid policy (≈1–3 ms): scores become a price.** `bid = multiplier · pCTR ·
pCVR · value`, then pacing gate, then shading. Arithmetic plus a few state
reads. Failure semantics that look arbitrary until you see the economics: if
λ (the pacing multiplier) is unavailable, use last-known-good with a decay
toward conservatism — never λ=0 (zeroes the line's delivery) and never ∞
(spends the daily budget in minutes of tail latency).

**Assembly (≈1–2 ms): creative pick, macro rendering, signing where the
exchange requires it, serialize, `exp` set `tmax`-aware.** Failure mode worth
naming: a macro mismatch produces a non-billable impression discovered *hours
later* in reconciliation — that's a money incident that looks like nothing for
half a day, which is exactly the kind of incident this whole system breeds.

## Tail thinking, and why the degradation order is what it is

Because a slow response equals a lost auction equals silent revenue, every
stage ships *conservative timeouts and graceful degradation instead of
correctness at any cost*: serve a cached bid, serve the cheap model, use the
old λ. Bid too slow → revenue loss, invisible. Bid too eager → real money
lost, visible in invoices. Both failure modes are invisible in normal
monitoring, so the real instruments are **auction-capture rate per exchange**
and calibration drift per slice, not HTTP p99 dashboards. The bidder's
monitoring philosophy generalizes nicely: measure *outcomes you intended*,
because every mechanism by which you fail to do them is silent.

The write path deserves the closing note because it's where consistency flips.
The request path prefers availability over consistency — a stale budget, an
approximate profile, a fallback score are all better than no bid, and their
harm is bounded and statistical. The **money path is the opposite**: wins and
billable impressions must be exactly-once *in effect* (at-least-once delivery,
idempotent event keys), because the harm there is a dispute with an exchange,
which is not statistical. The two consistency models meet at the budget
counter — incremented by a stream processor keyed on win-event IDs so a
duplicated win-notice callback can't double-charge, read at bid time, allowed
to overrun by a configured bound and then throttled rather than frozen, reset
at a coordinated day boundary where clock skew between controllers and
bidders is the classic overspend cause. One number, two truths: it must feel
real-time to the bidder and must be defensible in accounting. Getting that
seam right, not the latency, is what I suspect actually distinguishes a mature
DSP platform team.

## References

1. IAB Tech Lab, *OpenRTB Version 2.6* — §2 (transport, 204), §3.2.1 (`tmax` definition, source fields), §4 (no-bid ladder), §5 (example with `tmax: 120`). https://github.com/InteractiveAdvertisingBureau/openrtb2.x/blob/main/2.6.md
2. IAB Tech Lab, *OpenRTB 2.x Implementation Guide* — §7.1 (NHT/no-bids), §7.12 (`user.eids` match methods). https://github.com/InteractiveAdvertisingBureau/openrtb2.x/blob/main/implementation.md
3. Prebid, "Timeouts" (page/auction/s2s taxonomy, 50–75% rule). https://docs.prebid.org/features/timeouts.html
4. Prebid Server, "`/openrtb2/auction` endpoint — Timeout" (`tmax_adjustments`, `bidder_tmax`, `enforced_tmax`). https://docs.prebid.org/prebid-server/endpoints/openrtb2/pbs-endpoint-auction.html
5. Wikipedia, "Demand-side platform" ("20–400 ms to decision"). https://en.wikipedia.org/wiki/Demand-side_platform
6. Wikipedia, "Real-time bidding" ("<100 ms" bar; MFA/fraud rent extraction). https://en.wikipedia.org/wiki/Real-time_bidding
7. Yuan, S., Wang, J. & Zhao, X. (2013). "Real-time Bidding for Online Advertising: Measurement and Analysis." arXiv:1306.6542. doi:10.48550/arXiv.1306.6542
8. Edelman, B., Ostrovsky, M. & Schwarz, M. (2007). "Internet Advertising and the Generalized Second-Price Auction." *American Economic Review* 97(1):242–59. doi:10.1257/aer.97.1.242
