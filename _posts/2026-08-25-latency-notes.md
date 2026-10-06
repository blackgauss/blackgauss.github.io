---
layout: default
title: Notes on Sub-100ms Auction Latency
---

# Notes on Sub-100ms Auction Latency

Notes, not an essay. The constraint that shapes every engineering decision in a
demand-side platform.

**The contract.** An OpenRTB bid request carries a `tmax` field: the maximum
time, in milliseconds, the exchange allows for bids to be received,
*including* internet latency. The spec's own worked example ships `tmax: 120`.
Miss it and the bid is discarded — no retry, no second chance, not even an
error.

**The real budget is smaller than it looks.** Network round-trip (often 10–50 ms
of the total), exchange fan-out, TLS and JSON deserialization all come off the
top. The Prebid Server reference implementation says this explicitly, shaving
its own processing time, a network-latency buffer, and a response-preparation
floor off the incoming `tmax` before telling a bidder what it has. What's left
for filters + ML + assembly is maybe 10–50 milliseconds of true compute.

**The load.** A mid-size DSP sees millions of bid requests per second at peak;
a large one, ten million or more. Every request is a stateful lookup — user
profile, frequency caps, budget pacing state — plus a model score.

**Tail latency is the failure mode.** The p99 must fit under `tmax`; a GC pause
or a cold cache miss is a *lost auction*, not an error. Consequences that fall
out mechanically:

- In-memory stores and billions-of-keys KV reads at single-digit milliseconds,
  with hedged requests, because you're paying for the tail, not the mean.
- Request-level budgets everywhere: if not scored in X ms, serve a cached bid or
  a cheap model, never block. KV miss → population priors. Scorer timeout →
  static prior.
- Filters ordered cheap-to-expensive so the cheapest kills happen first, and
  with deliberate failure polarity: privacy filters fail *closed* (no consent
  signal, no bid), quality filters fail *open* (bot scorer timeout → bid, don't
  silently abandon inventory).
- The identity/feature lookup is the single most latency-sensitive read in the
  machine: one canonical-ID resolution, then a parallel fan-out where the sum
  of tails, not sum of means, is what you pay. A typical budget breakdown for a
  100 ms window: ~5 ms ingress/parse, ~2–5 ms edge filters, ~3–8 ms ID +
  feature fetch, ~3–8 ms model score, ~1–3 ms bid policy arithmetic, ~1 ms pace
  gate, ~1 ms assembly.

**Where requests actually evaporate.** 80–90% of inbound bid requests are junk
from the DSP's point of view — duplicate, consentless, bot-suspicious,
size-infeasible. Edge filtering is where the QPS bill is actually paid; nobody
behind it should ever see traffic at exchange rates. A no-bid costs a `204 No
Content` and one sampled log line, which is why the bidder can afford to be
ruthless.

**Failure economics.** Bid too slow → silent revenue loss. Bid too eager → real
money lost. Both failures are invisible in normal monitoring, so the system
ships conservative timeouts and graceful degradation rather than correctness at
any cost, and watches auction-capture rate per exchange rather than HTTP
latency alone.

One more asymmetry worth writing down: the feedback path is write-heavy forever.
Every impression, click, and conversion becomes a log line; logging alone is a
streaming-infrastructure problem at Kafka scale. The bidder is the part that
looks like a web server; the whole rest of the company exists to feed it and
learn from it.
