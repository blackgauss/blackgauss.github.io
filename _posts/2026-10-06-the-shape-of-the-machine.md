---
layout: default
title: The Shape of the Machine
---

# The Shape of the Machine
*October 6, 2026*

I keep trying to hold the whole DSP — hundreds of subsystems, billions of
dollars — in one picture, and the picture that has stayed stable is small.
Three nouns, one schema line, one event loop.

## Three nouns

**Bid Request**: an inbound offer to bid, in the exchange's wire format. Market
state, not company state. The DSP has no say in what arrives; 80–90% of it is
junk. **Bid Response**: a request judged worth bidding on, translated back into
the exchange's format — everything else leaves no trace beyond a `204` and a
sampled log line. And between them, the invention that makes the system
describable: **Bid Opportunity** = bid request + internal features. It's the
*internal* schema, owned by the company, and it's the only interface between
the data plane and the decision plane. Bidding, pacing, and scoring all read
it; none of them parse OpenRTB.

That gives the design consequence in one line: *the DSP's external surface is
two schemas it does not control, and its internal surface is one schema it
does.* Every subsystem boundary is either at a schema edge or across the
opportunity line. If I had to teach one abstraction from adtech to distributed
systems people, it would be this one — the anticorruption layer as org chart.

## The pipeline

Within (typically) 100 milliseconds of the exchange's clock: ingress parses
90%+ of requests away, cheap filters ordered cheap-to-expensive (privacy
*before* valuation, because consent is a predicate, not a feature; dedup and
supply-path checks; privacy fails closed, quality fails open), identity
resolution and parallel fan-out to profile/frequency/budget state — the
single most latency-sensitive read — then model scoring, then bid policy
(landscape curve × pacing multiplier × shading: arithmetic plus state reads),
then the pace gate and assembly. What the bidder does not include: an
exchange, an attribution warehouse, or batch ML.

And what goes around: every bid, opportunity, notice, click, conversion flows
to an event bus — stream plus batch — where attribution joins it, models
retrain, dual variables refit, invoices reconcile, and the results come back
as caches and λs. The synchronous path is where money is spent; the
asynchronous path is where knowledge is made; they are only joined by the
event log, and that seam is where most incidents actually live. A model
version skew between trainer and server, an exchange blanking its price
macro, a feature produced by a job that quietly lagged: each is invisible to
p99 and obvious in revenue the next day, so the system's real instrumentation
is auction-capture rate per exchange and calibration drift per slice, not
latency dashboards.

## The economics at the end of the picture

Compute is ∝ QPS ∝ spend, and the per-request decision must cost far less
than the take-rate margin on a fraction of a cent — the force behind every ugly
decision above: offline-solve, online-evaluate; cache the landscape; serve the
sparse model; degrade to older λ under pressure rather than no-bid. The
architecture is not shaped by taste. It is shaped by the fact that the supply
is perishable inside one human blink, and the price of being wrong is paid, at
scale, immediately, in cash. That is a strange and beautiful design constraint,
and you can see its fingerprints on every box in the diagram.
