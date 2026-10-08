---
layout: default
title: The Data Map — What the Machine Eats, and Who Owns It
---

# The Data Map — What the Machine Eats, and Who Owns It
*October 8, 2026*

Ask a bidding machine what it knows about an impression and you get, in the
limit, a single vector: the opportunity. Everything else — every feed, every
graph, every nightly dump — exists only to have been folded into that vector
before the deadline. That is the first fact of the architecture, and it is an
accounting fact more than an engineering one: *complete at the line*. The bid
decision reads exactly what assembly handed it, because there is no time left
after assembly. Ninety-odd milliseconds from parse to response, of which a
dozen or so are already promised to parsing, filtering, guardrails, and the
network round-trip. The remaining budget is the market in which the machine's
entire sensory apparatus must compete to be consulted.

Which raises the question I want to answer here in full: what, exactly, does
the machine eat? Where does each thing enter, who owns it, who pays for it, and
what happens to all of it after the auction is over — because the second diet
of a DSP is its own outputs, and that one has no deadline but has a law of
delays instead. A map of nine source classes, two matrices (one spatial, one
legal-economic), and a few structural theorems that fall out of them. I have
worked with this map for years and still find the ownership gradient
surprising.

## Nine sources

**The request itself.** Everything the exchange sends in the OpenRTB envelope —
the impression (`id`, `tagid`, `bidfloor`, category and creative bans, deal
ids, the private-marketplace block), the site or app object, device, geography,
the user object with its ids and inline segments, the `regs` block carrying the
GDPR flag, the TCF consent string, and the newer GPP privacy signals, the
supply chain object, `tmax`, the auction type [1, 2, 5, 6]. This is free,
ephemeral, and — crucially — immutable once logged. It also carries more PII
in-band than any contract ever discusses: device ids, coarse geography, and a
consent string are all riding the same JSON. The request is the only source
guaranteed to be present; everything below is optional by construction.

**The platform's own state.** User profiles, frequency counters, pacing
spend-state, negative-targeting bits, learned per-user statistics. Read from
a tiered key-value store during assembly, written milliseconds to seconds ago
by the machine's own decisions. This is the cheapest data in the building —
capital and operating expense, no per-record fee — and it is the only source
whose freshness the platform fully controls. The house rule for it is "stale
but versioned": a counter that is ninety seconds old is acceptable *if the
record says so*, because a stale value with a version stamp is a modeling
input, and a stale value without one is a silent lie.

**First-party advertiser data.** Customer lists, conversion uploads, product
catalogs, audience segments keyed on hashed emails, deal-level creative feeds.
Arrives in batches — object storage dumps, server-side postbacks — and it is
the stuff the biggest independents build their sales pitch around: clients
trusting the platform "with their most granular and expressive data," as the
Trade Desk's own annual report puts it, ingested under strict contractual
protocols [7]. The consent basis is the advertiser's; the platform is a
custodian, deletable on request. It is rewritten routinely — clients
re-upload — which already makes it a training-set hazard we will return to.

**Third-party segments.** Affinity, intent, purchase propensity, lookalikes —
the data-vendor trade. The same filing counts "more than 370 third-party data
vendors" integrated as of the end of 2025 [7], and books what they cost on the
expense side: purchased data is recorded *inside platform operations expense*,
the same line as hosting, which in aggregate runs near four percent of gross
spend [7]. Two transports exist: per-request lookup keyed on a resolved id,
which must fit inside the latency budget or die, or a nightly dump folded into
the key-value tier. The consent string gates the whole class — a purpose for
"advertising selection" you don't have is a purpose you can't buy your way
into.

**Identity services.** Cookie-to-device-to-email-to-person resolution:
deterministic graphs, probabilistic stitching, and the newer salted, rotated
joiners like UID2, which the same annual report describes as transforming
emails or phone numbers into an advertising identifier "designed to not
directly identify the individual" [7, 9]. This class is special twice over:
it is consulted in a dedicated slice of the assembly budget (single-digit
milliseconds, by convention), and its consent topology is the hardest in the
map — deterministic legs carry consent, probabilistic legs often do not, and
the legal boundary between them is asserted far more often than it is sourced.

**The post-win event plane.** Win notices through the `nurl` macro, loss
notices through `lurl`, impression beacons, clicks through macro-substituted
redirects, conversion postbacks [1, 2]. Delayed by law, not by neglect: win
and loss arrive in seconds to minutes; a conversion arrives at click time plus
a delay measured in hours to weeks, with the delay law depending on the
advertiser's vertical rather than on any universal constant. Append-only, and
this is what the models ultimately train on — with the caveat that a beacon
that never fires is not a zero, it is a censored observation, and confusing
the two is the oldest calibration sin in this industry.

**Auction-outcome feedback.** What you learn about the market from clearing:
your own win and loss prices, the price buckets that come back in loss
notices, inference about competitors from your own logged bids. In
first-price-land the loss notice tells you nothing about the second price, so
the feedback is censored by auction design itself, and the win-probability
model — the heart of bid shading — has to be estimated *as a censored-data
problem*. The estimators for that are eighty years old: Kaplan–Meier for the
distribution under censoring, Cox regression for its covariates [13, 14]. The
sell side knows the asset too — Magnite states plainly that the marketplace
"collect[s] … historical clearing prices, bid responses" [10].

**Settlement, quality, and fraud feeds.** Publisher invoices and exchange
reconciliation, viewability and brand-safety measurers, fraud flags. PubMatic
describes the machinery it runs — proprietary and third-party fraud detection,
and a "fraud-free program in which buyers are credited" [8]. Reconciliation
arrives in days and *rewrites history*: a bid that won and billed can be
undone by a dispute. This is the only class that mutates the past, which makes
it the only class that can invalidate a training set after the fact.

**Operational telemetry and configuration.** Latency percentiles, drop rates,
exchange-connection health, and the campaign/creative/pacing configuration
that the UI pushes down. Seconds-fresh, immutable telemetry; version-mutable
config. The rule that matters: every logged bid record carries the config and
schema version in force at its timestamp, because "what did the model see" is
only answerable if "what was deployed" is timestamped too.

## Where they enter, and what it costs in milliseconds

The pipeline is ingress/parse, edge filters, identity resolution, feature
assembly (parallel fan-out), scoring, policy and pacing, response and logging.
The map of sources onto stages has three rules welded to it.

*First: the binding constraint is the slowest sequential chain, not the sum of
the lookups.* Ingress, then identity, then whatever is keyed on the resolved
id — those three are serial, and their chain, not the fifty parallel fetches
around them, eats the budget. Everything on the request path must fit inside
the assembly window; anything that cannot be guaranteed inside it is not a
feature, it is a coin flip with an attached invoice.

*Second: degradation is per-field and pre-declared.* A segment lookup that
times out becomes the empty value — and the scorer must have been trained to
swallow the empty value. Not imputed at log time. Logged *as* the hole,
because a model trained on imputed holes and served on real holes is a model
with a distribution shift it cannot see. Privacy is the one gate that fails
the other way: unresolved consent suppresses the bid, never the other way
around. Fail-closed is not caution; it is the only regime in which the
regulator ever sees you.

*Third — and this is the deep one — post-win sources never enter the request
path at all.* The event plane, outcome feedback, and settlement data influence
today's bids only by way of features precomputed into the key-value shape
overnight or streamed into it by the minute. The machine that scores is not
the machine that learns; they share a database and an oath. This is why a
conversion's week-long delay is survivable: it never had a seat at the
auction's table; it has one at the training table, where the filtration rule
— train on what was knowable at decision time — does the bookkeeping.

## Provenance: the dataset is a join

The training set of a bidding system is not the bid stream. It is
*logged opportunity joined to outcome*, where each logged opportunity is the
full vector frozen at decision time, and each outcome arrives late, censored,
sometimes disputed. Four properties make that join an auditable object rather
than a folk artifact.

**An immutable raw layer.** Every request, response, no-bid reason, and event
append-only — the Kafka-scale log bus is not a performance choice, it is an
epistemic one: you can always recompute *who was censored and why*, which is
exactly what the win-probability correction needs.

**Versioned everything.** Feature values carry registry versions; learned
state carries model and controller versions. Online/offline skew is only
diagnosable when the logged value is byte-identical to what the scorer saw,
holes included.

**Freshness SLOs as the contract with reality.** Every field group's staleness
bound is an SLA on its upstream source: a segment dump that lands thirty-six
hours late doesn't page a human, it flips that group into its stale-flag
behavior and the scorer downweights it. Data lateness is a data-plane event,
not an ops ticket.

**Join keys threaded end to end.** The request id threads request to response
to win to click to conversion; the macro substitutions in the notice URLs are
what make the event plane joinable *at all* [1, 2]. Macro truncation by a
proxy or ad blocker is silent label loss — the dataset gets quieter and nobody
notices. This is the seam I trust least in any deployed system, and to my
knowledge nobody publishes its measurement.

Two of the four stream-processing engines this layer was built on arrived from
the same intellectual move — unifying batch and streaming as one dataflow
model with event-time and watermarks as the semantics of lateness [11, 12] —
and it is worth saying plainly that the industry's honest treatment of late
data (windows, watermarks, side outputs) is now standard vocabulary in
stream-processing infrastructure — except inside bidding, where the
deadline is so much shorter than any window that lateness is handled by
degrade-and-log, not by windowing. We got to the same conclusion from the
opposite direction: at ninety milliseconds, every window is already closed.

## The legal layer, as a graph of gates

Consent travels in-band — the GDPR flag, the TCF string, GPP [3, 4, 6] — but the string
is the *exchange's assertion*, not a verified fact; PubMatic's filings note
that publishers may strip personal data before the request enters the bid
stream at all [8], so the pipeline must be legible to itself under
consent-starvation, and the mature treatment is to *test* consent out of band
wherever the publisher offers an API [3, 6]. Purpose-level gating then maps
cleanly onto the source classes: with no consent string, third-party segment
lookup and probabilistic identity are the first casualties; context and the
platform's own derived state survive. The whole map is channel-dependent —
Magnite reminds us that CTV is "where third-party cookies do not exist,"
already running on publisher-controlled first-party identity [10] — and
adjacent legal risk bends the economics: ad blockers, PubMatic notes,
disproportionately block ads targeted with third-party data while sparing
first-party ones [8], so a segment-heavy strategy can lose the data *and* the
impression.

The direction of travel is visible in four consecutive sets of filings: the
ecosystem's gravity is shifting from buyer-side cookie aggregation to
seller-side first-party segments — Magnite's publisher segments, Criteo's
"consented first-party data … anonymized" language, The Trade Desk's own
identity retrenchment [7, 8, 10, 15]. Read as a forecast on the map: the
inline request gets richer (`user.data`, publisher segments), the
third-party-segment class shrinks or re-routes through clean rooms, and the
DSP's response is not possession but transformation — which is exactly the
lesson of the next section.

## Who owns what, and the gradient that tilts

Lay the sources against owner, payer, and direction of movement and two
structural facts fall out.

**Data is priced into the fee, not metered at the wire.** The Trade Desk books
purchased data as being used "to inform and improve the platform, generally at
no additional charge to our clients outside of our standard fees" [7] — which
means the data bill is a fixed-ish opex line amortized into a percentage of
spend, scaling with platform scale, not with per-auction decisions. No
per-lookup price is ever quoted, anywhere, in anything I have read. The
consequence for architecture is severe and good: a lookup's value to the
score must beat its amortized cost *in expectation over the whole auction
population*, because the invoice arrives on every query, not on the ones that
mattered.

**The ownership gradient tilts seller-side, and the DSP's durable assets are
exactly the classes it owns outright.** Publishers own the request and its
consent declarations; advertisers own first-party data always, with the
platform as custodian; vendors own segments and license their use;
consortiums own the identity graphs. What the platform owns outright is the
middle of its own metabolism: its derived state, its outcome-corrected labels,
and its price models — event plane plus feedback plus derived state. Magnite
says the quiet part with a straight face, that "our access to data puts us in
a unique position" [10] — and the same sentence is true of the DSP, one
ecosystem over. The durable edge in this market was never possession of
signal; it is the transformation of rented signal into owned *statistics*,
and the only class in the map no one can legislate away is the log of your own
auctions, corrected for its own censoring, replayable to any epoch.

That is the map. Nine sources, three pipeline rules, four lineage properties,
one legal graph with fail-closed privacy at its center, and an ownership
gradient that says: buy the signal, own the statistics, and — whatever you
do — log the holes.

## References

1. IAB Tech Lab, *OpenRTB Version 2.6* (request objects: `imp`, `site`/`app`, `device`, `user`, `regs`, `schain`, `tmax`, `at`; §4.4 macros). https://github.com/InteractiveAdvertisingBureau/openrtb2.x/blob/main/2.6.md
2. IAB Tech Lab, *OpenRTB 2.x Implementation Guide* — §7.12 identity and match methods; §7.16 macros. https://github.com/InteractiveAdvertisingBureau/openrtb2.x/blob/main/implementation.md
3. IAB Europe / IAB Tech Lab, *Transparency and Consent Framework (TCF)* technical specification. https://github.com/InteractiveAdvertisingBureau/GDPR-Transparency-and-Consent-Framework
4. IAB Tech Lab, *Global Privacy Platform*. https://iabtechlab.com/standards/global-privacy-platform/
5. IAB, "SupplyChain object" (schain). https://github.com/InteractiveAdvertisingBureau/openrtb/blob/master/supplychainobject.md
6. IAB Tech Lab, "Transparency & Consent Framework." https://iabtechlab.com/standards/transparency-consent-framework/
7. The Trade Desk, Inc. (2026). *Annual Report (Form 10-K) for fiscal year 2025* (data vendors count; UID2 description; data-related costs in platform operations expense; first-party data language), filed 2026-02-27. https://www.sec.gov/Archives/edgar/data/1671933/000167193326000014/
8. PubMatic, Inc. (2026). *Annual Report (Form 10-K) for fiscal year 2025* (fraud program; ad-blocker asymmetry; publishers stripping personal data), filed 2026-02-26. https://www.sec.gov/Archives/edgar/data/1422930/000142293026000010/
9. Unified ID 2.0 (UID2), IAB Tech Lab open-source identity framework. https://unifiedid.com/
10. Magnite, Inc. (2026). *Annual Report (Form 10-K) for fiscal year 2025* (clearing-price data; CTV first-party identity; publisher segments), filed 2026-02-25. https://www.sec.gov/Archives/edgar/data/1595974/000159597426000007/
11. Cherniack, M., Balakrishnan, H., Baldi, M., et al. (2014). "The Dataflow Model: A Practical Approach to Balancing Correctness, Latency, and Cost in Massive-Scale, Unbounded, Parallel Data Processing." *PVLDB* 7(13). https://www.vldb.org/pvldb/vol7/p1251-cherniack.pdf
12. Fowler, M. (2018). "The World Beyond Batch: Streaming 101." O'Reilly Radar. https://www.oreilly.com/radar/the-world-beyond-batch-streaming-101/
13. Kaplan, E. L. & Meier, P. (1958). "Nonparametric Estimation from Incomplete Observations." *JASA* 53(282). doi:10.1080/01621459.1958.10501452
14. Cox, D. R. (1972). "Regression Models and Life-Tables." *JRSS-B* 34(2). doi:10.1111/j.2517-6161.1972.tb00899.x
15. Criteo S.A. (2026). *Annual Report (Form 10-K) for fiscal year 2025* (consented first-party data; anonymization language), filed 2026-02-26. https://www.sec.gov/Archives/edgar/data/1576427/000157642726000014/
