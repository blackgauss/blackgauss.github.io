---
layout: default
title: The Shape of the Machine
---

# The Shape of the Machine
*October 6, 2026*

I keep trying to hold the whole DSP — hundreds of subsystems, billions of
dollars, one request every few microseconds — in one picture, and the picture
that has stayed stable is small. Three nouns, one schema line, one event loop,
twelve subsystems. Then, at the end, a twenty-year history that explains why
the machine has exactly this shape and no other.

## Three nouns

**Bid Request**: an inbound offer to bid, in the exchange's wire format
(OpenRTB JSON over HTTP POST, or protobuf in 3.0). It is *market state, not
company state*: it arrives unprefetched, unauthenticated beyond the exchange
relationship, and 80–90% junk from the buyer's point of view. The DSP has no
say in what it receives.

**Bid Response**: a request judged worth bidding on, projected back into the
exchange's schema — a `seatbid` with price, ad domains, creative id, billing
and notice macros. A request that produces no bid response produces a `204 No
Content` and leaves no trace beyond a sampled log line.

And between them, the invention that makes the whole system describable:
**Bid Opportunity = bid request + internal features**. It is the *internal*
schema, owned by the company, and the sole interface between the data plane
and the decision plane. Bidding, pacing, and scoring all read it; none of them
parse OpenRTB.

The design consequence is one line: **the DSP's external surface is two
schemas it does not control, and its internal surface is one schema it does.**
Every subsystem boundary is either at a schema edge or across the opportunity
line. If I could teach adtech to distributed-systems people as one abstraction,
this is it: the anticorruption layer as org chart.

## The pipeline, with its failure modes

Time flows left to right inside a `tmax` set by the exchange — conventionally
~100–150 ms for display, more for video/CTV — measured from the moment the
request *leaves the exchange*, which means the DSP's real budget is smaller
than the number suggests, and egress serialization must be reserved from it
before anything smart happens. A working allocation, stage by stage:

**Edge/ingress (~5 ms).** TLS, connection reuse, validation, decode, load
shedding. This is where QPS is actually paid for; the bidder behind it should
see far less traffic than exchanges send. Queue depth grows → shed, don't let
the bidder overrun `tmax`; an exchange connection dies → circuit-break that
one, keep bidding on the rest.

**Edge filters (~2–5 ms).** Cheap predicates needing no learned state, ordered
deliberately cheap-to-expensive: privacy signals (consent strings in the
request's own regulatory fields), supply-path/schain validation, dedup, geo,
format sanity, brand-safety prelists, creative feasibility. Two failure rules
worth tattooing somewhere: **privacy filters fail closed** (no consent signal,
no bid); **quality filters fail open** (bot-scorer timeout → bid, don't
silently lose inventory). Consent is a predicate evaluated per request, not a
feature; the legal metadata rides *inside the auction*, which is a genuinely
novel protocol fact of the last decade.

**ID resolution + feature lookup (~3–8 ms).** The single most
latency-sensitive read in the machine: device/cookie → canonical identity, then
parallel fan-out to user profiles, historical stats, deal membership, frequency
caps. Fan-out means *tail* latency is the enemy: hedged requests and caches
earn their keep here; a single KV hop is low-single-digit ms. KV miss →
population priors, never block. KV slow → partial feature vector, bid flagged
low-confidence. Identity graph stale → frequency blowout, caught downstream.

**Scoring (~3–8 ms).** pCTR/pCVR over the feature vector, then calibration —
covered exhaustively in the ML post; the systems notes: a scorer timeout
degrades to a simpler model or a static prior, never to no-bid; model and
feature *versions are pinned together* in serving; training/serving skew is
the classic silent-revenue-loss incident, caught by shadow scoring and
calibration drift alerts rather than latency dashboards.

**Bid policy (~1–3 ms).** Scores to price: `bid = value · pacing multiplier ·
target-CPA dual · shading`, i.e. arithmetic plus a few state reads.
`λ` unavailable → last-known-good with decay toward conservatism — never
`λ = 0` (zeroes the line) and never `λ = ∞`.

**Pacing gate (~1 ms).** The last chance to say no: the throttle/PID/dual
controller rejects over-pacing lines here rather than letting spend run ahead.
Gate service down → conservative fixed throttle ratio, and alert.

**Assembly (~1 ms).** Creative pick, macro expansion, price signing where the
exchange demands it, serialization, expiry set `tmax`-aware. Creative QA
failure → no-bid; a macro mismatch becomes a non-billable impression hours
later — a *reconciliation* incident, not a latency one, and that distinction
is the whole personality of this industry.

Notice what is *not* in the synchronous path: no exchange is a DSP, no
attribution join, no batch training. The knowledge that powers the
milliseconds was made in the hours before and refit in the minutes between.

## The twelve subsystems, and the boundaries that matter

The inventory, with the property I'd actually defend in a design review:

| Subsystem | Load | Consistency | Failure semantics |
|---|---|---|---|
| Bid engine | highest QPS in the company; owns the Opportunity | stateless; stale state permitted | fail fast → 204; never hold past `tmax` |
| Edge/ingress | all inbound QPS | none | shed by exchange/campaign |
| Policy filters | same QPS, ~10× cheaper/call | consent lists fresh within minutes | privacy closed, quality open |
| ID graph | billions of keys, bidder-QPS reads | eventual, rebuilt in waves | miss = new user; bad merge = frequency blowout |
| Feature store | bidder QPS × fan-out | online may lag offline by one window | partial vector, never block |
| Model serving | bidder QPS | model+feature versions pinned | fallback model; drift → rollback |
| Campaign truth | low write, read fan-out | reach bidders in minutes | stale → bid on ended campaign (soft loss) |
| Pacing state | writes at win rate, reads at bid rate | at-least-once + dedup; bounded overspend | last-known-good λ |
| Event ingestion | orders of magnitude above bidder QPS in bytes | at-least-once, idempotent IDs | sample bid logs, **never drop wins/conversions** |
| Attribution/features | warehouse scale | **point-in-time correctness is the whole game** | lookahead leakage = silent AUC lie |
| Billing/finance | low QPS, high dollar | append-only, exactly-once *in effect* | mismatch → dispute; never auto-fix history |
| Experimentation | bidder QPS (assignment read) | consistent hash per user, forever | contamination → discard the experiment, not the day |

Three boundaries actually bear weight. **Exchange↔edge** is protocol, `tmax`,
QPS caps — the price of a connection; behind it, everything is ours.
**Request↔Opportunity**: crossing it means *spending money on a lookup*, which
is precisely why the kill-filters sit before it — the purpose of edge
filtering is to make the expensive half of the machine see fewer, better
requests. **Opportunity↔decision**: after this line we are doing arithmetic
under a deadline, and **no stage downstream of the Opportunity is allowed to
fetch anything**. Completeness is the contract.

The consistency story is then one paragraph: the request path prefers
availability over consistency — a stale budget, an approximate profile, a
fallback score all beat no-bid, because the harm is statistical and averaged
over millions of impressions. The money path is the opposite: wins, billable
impressions, invoices must be exactly-once *in effect*, because the harm is a
dispute with an exchange, which is not statistical. The tension concentrates
in budget counters — wins arrive on their own callback latency, the bidder
reads the counter at bid time — resolved by stream increments keyed on win
event ID, versioned λ (never a torn read), bounded tolerated overspend with
hard throttle after, and coordinated UTC midnight resets, because clock skew
between controller and bidder is the classic over-spend incident in every
account that has survived one.

## Learned value, controlled cost

The cleanest way I know to cut this machine in half: a DSP is a
**learned-value / controlled-cost** system. Everything uncertain about an
impression — click, convert, win — is handled by *scoring*: statistical
estimates, learned from logs, validated offline, corrected by calibration.
Everything *known* — contract, budget, CPA target, caps, quotas — is handled
by *control*, which predicts nothing: it measures realized spend against
target and adjusts the multipliers and gates the bid passes through. The
canonical composition is `bid = value_hat(x; learned) × f(λ, duals; controlled)`
— learned estimates scale what an impression is *worth*; controllers scale
what the account can *afford*. The two halves then differ in every operational
dimension at once: learned state changes on a training cadence, may be stale
but must be versioned, and its errors average out; controlled state is
write-hot, money-adjacent, reacts at the feedback delay, and its errors spend
money *today*. Failures distribute the same way — scoring failures move ROI
slowly and surface in drift monitors; control failures (runaway pacing, λ
stuck at 1) show up in the spend-rate alarm within minutes and in the invoice
within the week.

## Why the shape is this shape: the treadmill

The history explains the design. For most of programmatic's life the hard part
was not intelligence but plumbing, and each era solved one bottleneck whose
solution leaked to everyone:

| Era | Bottleneck | How it commoditized | Where the fight moved |
|---|---|---|---|
| pre-2005 | ad-server scheduling; cookies make *audience* representable; GoTo/Overture/AdWords prove per-query auctions price inventory in software | — | — |
| 2005–09 | the per-impression auction itself; ~100 ms budgets; pacing as distributed bookkeeping; N×M protocol hell | OpenRTB standardized 2010–17 | decision quality |
| 2010–13 | the market was illegible — censoring, log-normal prices | Cui 2011 named the "bid landscape"; Yuan 2013 measured a live DSP; iPinYou 2014 made it a science with public logs | bidding algorithms |
| 2013–16 | optimal bidding, pacing theory, CTR at scale | ORTB (KDD'14), FTRL paper, FFM/DIN/DCN, Chapelle — the great publication diffusion; pacing stopped being a differentiator by ~2017 | data volume for ML |
| 2016–21 | the mechanism changed under everyone: first price 2019, header bidding flat waterfalls | shading papers published 2020–21; autobidding theory (uniform multipliers dominate) by 2019–21; schain/sellers.json forensics | mechanism response, identity |
| 2019– | the data substrate taken away: GDPR enforcement reports, Belgian DPA voiding the consent framework, ITP/ATT, cookie saga | the responses (ID graphs, unified IDs, cohort/context reweighting) are public too | who holds first-party/consented data |

The anchor artifact of era one deserves naming: **US 2008/0162329A1**, Knapp &
Blanco, *"Auction For Each Individual Ad Impression,"* filed 2006 — the
ur-document of the field's patent thicket, with a family/citing web of
several dozen continuations through Right Media, Appnexus and Google lineages.
And the recurring sociology: GSP auctions shipped years before Edelman,
Ostrovsky & Schwarz (2007) published their analysis; spend governors ran in
production years before the PID papers (2016) justified them; advertisers'
λ-throttling heuristics were, it turned out in 2015's repeated-auctions-with-
budgets model, the mathematically optimal equilibrium behavior all along. **The
practitioners consistently found the right answer first, and the theory — ten
years later and in journals — mostly caught up to name what worked.**

Every row of that table is the same move: an information-processing advantage,
then a publication, standard, or patent expiration, then the advantage
retreating into *private data or private contracts*. The compute was never the
moat — the CPU cost curve is a constraint everyone shares. Differentiation
seeks refuge from shared constraints in non-shareable places: first patents,
then algorithms, then logarithms of proprietary interactions, now
consent-granted first-party graphs.

That is why the machine has the shape it has: the perishability of supply
inside one blink forces offline-solve/online-evaluate, forces caching the
landscape, forces the sparse calibrated model on the hot path, forces degrade-
to-λ-not-nobid. Economics drew the diagram; the history filled in the boxes;
the event-loop seam between them — where a model version, a price macro, or a
lagging feature job quietly severs knowledge from money, invisibly to p99 and
obviously to next-day revenue — is where, in practice, I've found everything
interesting about this system lives.

## References

1. IAB Tech Lab, *OpenRTB 2.6*. https://github.com/InteractiveAdvertisingBureau/openrtb2.x/blob/main/2.6.md
2. Knapp, G. & Blanco, J. US 2008/0162329A1, "Auction For Each Individual Ad Impression." https://patents.google.com/patent/US20080162329A1/en
3. O'Kelley, B. (2014). "How I Created the Ad Exchange." *Forbes*. (Right Media Exchange 2005 lineage)
4. Edelman, B., Ostrovsky, M. & Schwarz, M. (2007). "Internet Advertising and the Generalized Second-Price Auction." *American Economic Review* 97(1):242–259. doi:10.1257/aer.97.1.242
5. Cui, Z. et al. (2011). "Bid Landscape Forecasting in Online Ad Exchange Marketplace." *KDD*. doi:10.1145/2020408.2020454
6. Yuan, S., Wang, J. & Zhao, X. (2013). "Real-time Bidding for Online Advertising: Measurement and Analysis." arXiv:1306.6542
7. Zhang, W., Yuan, S. & Wang, J. (2014). "Optimal Real-Time Bidding for Display Advertising." *KDD*. doi:10.1145/2623330.2623633; iPinYou benchmark: "Real-Time Bidding Benchmarking with iPinYou Dataset," arXiv:1407.7073
8. McMahan, H.B. et al. (2013). "Ad Click Prediction: a View from the Trenches." *KDD*. doi:10.1145/2487575.2488200
9. Rendle, S. (2010). "Factorization Machines." *ICDM*. doi:10.1109/ICDM.2010.127
10. Chapelle, O. (2014). "Modeling Delayed Feedback in Display Advertising." *KDD*. doi:10.1145/2623330.2623634
11. Balseiro, S., Besbes, O. & Weintraub, G. (2015). "Repeated Auctions with Budgets in Ad Exchanges." *Management Science* 61(4):864–884. doi:10.1287/mnsc.2014.2022
12. Zhang, J. et al. (2016). "Feedback Control of Real-Time Display Advertising." *WSDM*. doi:10.1145/2835776.2835843
13. Gligorijevic, D. et al. (2020). "Bid Shading in The Brave New World of First-Price Auctions." *CIKM*. doi:10.1145/3340531.3412689; Zhou, T. et al. (2021). *KDD*. doi:10.1145/3447548.3467167
14. Conitzer, V., Kroer, C., Panigrahi, D., Schrijvers, O., Sodomka, E., Stier-Moses, N. & Wilkens, C.A. (2019). "Pacing Equilibrium in First-Price Auction Markets." *EC*. doi:10.1145/3328526.3329600
15. Aggarwal, G., Perlroth, E. & Zhao, J. (2023). "Multi-Channel Auction Design in the Autobidding World." *EC*. doi:10.1145/3580507.3597707
16. Veale, M. & Zuiderveen Borgesius, F. (2022). "Data Protection and Data Governance in Addressable Online Advertising." *J. on Law & Tech* (special issue: targeted advertising). https://www.joltjournal.com
17. Google / IAB Tech Lab. Prebid Documentation — Prebid Server `tmax_adjustments`; Prebid.org, 2015 launch. https://docs.prebid.org
18. Criteo (2014). "Criteo Display Advertising Challenge" dataset (45M rows, 39 features). https://labs.criteo.com/2014/02/kaggle-display-advertising-challenge-dataset/
19. Balseiro, S., Lu, H. & Mirrokni, V. (2023). "The Best of Many Worlds: Dual Mirror Descent for Online Allocation Problems." *Operations Research* 71(1):101–119. doi:10.1287/opre.2021.2242
20. Kochalski, L. et al. (2021). "Detecting Ad Fraud and Financial Losses in Digital Advertising." *ADKDD*. (arXiv version unresolved; cited by title/venue)
