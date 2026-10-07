---
layout: default
title: A Brief History of Programmatic Advertising
---

# A Brief History of Programmatic Advertising
*October 6, 2026*

The thesis first, before the dates: for most of its life, the hard part of a
demand-side platform was not intelligence but plumbing — receiving bid
requests in time, speaking the exchange's protocol, spending a budget without
overdrawing. Each era solved one bottleneck, and each solution *leaked to
everyone*: patents expired or were designed around, protocols standardized,
papers published, open source shipped, datasets released. So the frontier of
competition moved one layer inward each time — first the auction mechanism
itself (2005–09), then the auction-theoretic and control-theoretic machinery of
optimal bidding (2010–16), then large-scale machine learning over the bid
landscape (2013–20), and finally the data and identity infrastructure that
lets any of it run once cookies and third-party signals are gone (2019–now).
The DSP of today is an inference-and-data company that happens to speak
OpenRTB — which is the same thing the ad server of 2005 was, one abstraction
layer up. This entry walks the eras and, at each one, notes both what the hard
problem *was* and how it leaked.

## Era 0, before 2005: rules, not auctions

The pre-programmatic stack was a scheduling problem, not a pricing problem.
DoubleClick's DART (*Dynamic Advertising, Reporting and Targeting*, founded
1995, IPO 1998) served banner campaigns booked in advance against insertion
orders: the unit of computation was the *placement* — site × size × date ×
frequency cap — delivered by a central ad server with a traffic-and-counting
engine, measured by clicks and server-side impression logs. Batch traffic
estimation, linear-count delivery, per-campaign rules engines. There is no
per-impression decision, so there is no DSP yet.

Two artifacts of that era determined everything after. The third-party cookie
let an ad server recognize a browser across sites, which is what made
*audience* targeting — as opposed to *inventory* targeting — representable at
all: it is the data substrate the current identity era is still litigating.
And keyword auctions in search proved that ad inventory could be priced by
auction *in software*: GoTo.com ran the first search keyword auction in 1998;
Google AdWords launched 2000 and added quality-based (bid × CTR) ranking in
2002. The formal analysis of what search actually ran — the Generalized
Second Price auction, and its lack of truthfulness (local saddle-point
equilibria instead of dominant strategies) — arrived afterward, in Edelman,
Ostrovsky & Schwarz (2007). **The gap between practitioners shipping
auctions and theory naming them recurs in every era below; it is this
field's most reliable pattern.**

## Era 1, 2005–2009: inventing the per-impression auction

Three nearly simultaneous threads produced real-time bidding. The **Right
Media Exchange (2005, Brian O'Kelley)** built the first modern ad exchange:
inventory from multiple publishers auctioned in software, with RTB-style
prediction, budgeting, and pacing at the buyer; Yahoo acquired it in 2007 for
a widely-reported ~$680M (pending primary; the secondary chain is stable).
**Knapp & Blanco at Strategic Data Corp** filed in 2006 the patent that
defines the concept — *Auction For Each Individual Ad Impression*, US
2008/0162329A1 — claims covering auctioning each impression in real time among
bidders, published 2008-07-03; the ur-document of the field's IP thicket,
filed into by Right Media's people, AppNexus's Serff, and Google's DoubleClick
lineage through 2011. And **DoubleClick AdX (2008)** gave the practice a
default liquidity venue after Google's $3.1B acquisition closed — announced
April 2007, FTC-cleared December, EU-approved and closed March 2008.

The technical problem-set of this era is *still the DSP's load-bearing
engineering today*, and it was all solved before any of the theory existed:

- **Latency budget.** An exchange allows ~100 ms per bid request; `tmax` is
  defined to include internet latency. Everything — profile lookup, model
  evaluation, budget check — must fit inside that.
- **Throughput.** Tens of thousands of queries per second per cluster;
  exchange QPS grows with the number of exchanges, and a DSP must hear from
  all of them to know the market.
- **State at speed.** Budget pacing — spend $X/day without overdrawing or
  front-loading — became a distributed-systems problem: a shared counter
  updated at auction rate, classic read-modify-write contention. The early
  solutions were probabilistic throttling, the "spend governors" — control
  loops shipped half a decade before their published control theory (Zhang
  et al., WSDM 2016).
- **Protocol fragmentation.** Every exchange had its own XML dialect; N
  exchanges × M DSPs integration cost was both the moat and the tax of the
  era, and the reason standardization was inevitable.

## Era 2, 2010–2013: the plumbing standardizes, measurement becomes science

The **OpenRTB Consortium assembled November 2010**, convened by buy- and
sell-side vendors, when RTB was about 4% of display. OpenRTB 2.0 (2012-01)
unified display, mobile, and video into one JSON API; the version train ran
through 2.x (VAST video and geo in 2.1, PMP deal ids and bot flags in 2.2,
native in 2.3, audio in 2.4, header-bidding signals and viewability fields in
2.5), and a 3.0 (Sept 2017) added signed bid requests and supply-path
transparency before being effectively absorbed back into the 2.x lineage. By
2017, one trade estimate had programmatic near 29% of the digital mix.

**Protocol commoditization is the event of this era**: once connectivity was a
checkbox — bidder kits, SDKs, and eventually Prebid — differentiation had to
move upstream, into decision quality. The market data tracks the intuition: US
RTB spend $23.5B (2018) to roughly $57B (2023).

At the same time, *the auction became legible*. Yuan, Wang & Zhao (2013) was
the first public measurement study of RTB from a DSP's own logs: winning-price
distributions, the censoring problem — you only observe the clearing price
when you win — and the empirical finding that CPM/volume behave log-normally.
Cui et al. (KDD 2011) had already named the object: the **bid landscape**, the
win-rate-versus-bid curve, and the censored-data estimation problem it poses.
And in 2014 the **iPinYou dataset** — 64.7M bid request logs published with a
simulation harness ("truthfully bid on the impression logs" to simulate the
full-volume auction) — turned the whole field into a reproducible empirical
science. Everything in Era 3 is legible because iPinYou exists.

## Era 3, 2013–2016: the algorithmic core goes public

Three research threads, all visible from outside a company, became table
stakes:

**(a) Optimal bidding.** Zhang, Yuan & Wang (KDD 2014) gave the canonical
recipe — model the winning-price distribution per segment, choose the bid to
maximize value subject to budget via one Lagrangian — with provable
better spend-efficiency than fixed-CPB bidding, and the refinements stacked
fast: censored-Gaussian regression (Wu et al. 2015), survival-tree functional
landscapes (Wang et al. 2016), deep censored learning (Wu et al. 2018),
mixture-density networks at Adobe (Ghosh et al. 2019), LSTM price ladders
(Ren et al., KDD 2019). Each paper relaxed an assumption of the last; this
lineage is the subject of a whole entry.

**(b) RL and control for pacing.** Spend-governor folklore got published and
generalized: PID feedback control of delivery (Zhang et al., WSDM 2016),
multivariable MPC (Yang et al., KDD 2019), RL bidders formulating the day as
an MDP (Cai et al., WSDM 2017; multi-advertiser games, Jin et al., CIKM
2018). And the theory arrived for what the heuristics had been doing:
Balseiro, Besbes & Weintraub (Management Science 2015) showed that in
repeated auctions *with budgets*, bidding one's true value is not dominant —
pace-adjusted, uniformly-discounted bidding is the equilibrium behavior. In
other words, every DSP's λ-throttling had been reconstructing an equilibrium
strategy since 2006, empirically, before anyone proved that was what it was.

**(c) CTR/CVR as big ML.** Google's "Ad Click Prediction: a View from the
Trenches" (McMahan et al., KDD 2013) popularized FTRL and the discipline of
calibrated prediction at billions-of-impressions scale; Factorization
Machines (Rendle 2010) became the standard sparse-interaction substrate; Wide
& Deep (2016) and Deep Interest Network (KDD 2018) moved the industry toward
attention-style models. CVR's special pathology — conversions arrive *after*
the auction, so labels are censored by time — was formalized by Chapelle
(KDD 2014), the delayed-feedback model.

Why this era matters for the thesis: it is the publication diffusion. The buy
side's edge from 2006–2012 had been *undisclosed heuristics*. From 2013–16 the
same machinery arrived as KDD papers, an open dataset, and (soon) open-source
implementations. Pacing and landscape estimation were no longer
differentiators by about 2017 — visible in the fact that by 2019 the papers
had moved on to auction *design* itself.

## Era 4, 2016–2021: the mechanism changes under everyone

The most under-documented pivot in the field. Beginning in 2019 the dominant
exchanges — Google AdX (announced March 2019) and the open exchanges, Amazon
TAS among them — moved display from second-price to first-price auctions,
meaning every winner pays its own bid. Header bidding (Prebid, launched 2015,
300+ adapters, pages calling 5–15 bidders in parallel) concurrently flattened
the waterfall, so the clearing price became the max of *parallel* bids rather
than the runner-up of a serial one. The two changes compounded:

1. **Bid shading went from edge trick to core subsystem** — the full story in
   its own entry. Yahoo's CIKM 2020 paper and its KDD 2021 successor
   documented the industry fix so thoroughly that by 2022 it too was
   commodity.
2. **Latency engineering again**: header bidding multiplies QPS, and the
   timeout chain of everyone's reference implementation now sets the real
   per-bidder budget.
3. **Autobidding became the product.** Advertisers stopped setting CPMs;
   platforms' tCPA/tROAS buyers became the default buyer. Theory caught up
   fast: uniform value-maximizing pacing multipliers dominate in
   truthfully-solvable mechanisms (Aggarwal et al., 2019); the *pacing
   equilibrium* in first-price markets exists and is unique (Conitzer et
   al., EC 2019 / Management Science 2022); the first-vs-second welfare gap
   under autobidding got bounded (Deng et al., NeurIPS 2024); empirical
   welfare effects were measured in live markets as the migration happened
   (Conitzer, Kong, Li, Shi, Management Science 2022).
4. **Supply-path forensics**: signed bid requests, `schain`/sellers.json/
   ads.txt — an Era-2 deliverable implemented as an Era-4 emergency — because
   the stack had grown four to six intermediaries deep and the buyer wanted
   each hop attested at bid time.

## Era 5, 2019–now: the data substrate taken away

The mechanism and algorithm layers are now open; the contest is over *what
they run on*.

- **Law arrives.** The ICO's 2019 report found RTB broadcasting user-level
  data processing special-category data (race, sexuality, health, politics)
  without lawful basis. The Belgian DPA's Decision 21/2022 voided core parts
  of IAB Europe's Transparency & Consent Framework under GDPR (the trade
  called it an "atomic bomb" for good reason); the Dutch DPA ordered an RTB
  profiling halt. GDPR/CCPA consent banners measurably prune addressable
  inventory. The legality of a *feature* is now a product requirement.
- **Identity deprecation.** Apple ITP (2017 →) capped third-party cookies;
  ATT (iOS 14.5, April 2021) made the IDFA opt-in; Google's cookie-deprecation
  saga announced, wavered, and reversed through 2024 with the Privacy Sandbox
  (cohort-based APIs like Turtledove) in the interregnum. The technical
  response: probabilistic identity graphs and stitching, unified-ID schemes
  (UID2 et al.), and contextual/first-party re-weighting — the
  feature-availability shift itself becoming an ML problem.
- **Compliance rides in the protocol.** GPP and consent strings inside
  OpenRTB `regs` make the bid request itself carry legal metadata —
  compliance evaluated per auction, a genuinely novel protocol fact.
- **Auctions move server-side** (Prebid Server, ad-server-side, CTV
  server-side rendering), which shifts the DSP's systems profile from
  edge-latency engineering toward log-scale *stateful joins*: event →
  identity → conversion. Increasingly a data-engineering company.
- **MFA fraud becomes measurable**: content-farm inventory arbitraging the
  pipe, quantified from exchange logs (Kochalski et al., 2021, at the best
  available confidence); detectable by policy — ads.txt/sellers.json — more
  than by ML.
- **And the LLM/agent era (2023– )**, early and evidence-thin: LLMs as text
  encoders in CTR models; "agentic" framing on DSP marketing pages
  (evidence: marketing, flag only); academically, autobidding now written as
  multi-agent mechanism design (Aggarwal, Perlroth, Zhao, EC 2023). Whether a
  bidder-as-agent changes the economics or just the UI is the live question.

## The synthesis: a commoditization treadmill, layer by layer

| Layer | Who owned it | How it leaked | Where the fight moved |
|---|---|---|---|
| Exchange connectivity | exchanges, 2005–10 | OpenRTB standardization 2010–17 | decision quality |
| Auction mechanics | exchanges, 2005–15 | GSP analyzed 2007; patents expired/designed around | mechanism *choice* (2019) |
| Bidding & pacing | DSP in-house lore, 2006–12 | KDD/WSDM 2014–17 + iPinYou + open source | scale of data |
| ML: CTR/CVR/landscape | Google/Alibaba/Criteo, 2013–19 | published architectures, cloud feature stores | features nobody else has |
| Data & identity | everyone's cookies | ITP/ATT/GDPR/Belgian DPA, 2019–22 | first-party graphs, context, consent |
| Mechanism response: shading, autobidding | DSPs, 2019– | published 2020–21, folded into SDK defaults | agent-level strategy, 2024– |

Every row is the same move: an information-processing advantage → a
publication, standard, or patent expiration → the advantage relocating into
*private data or private contracts*. The compute was never the moat; the
per-request cost curve is a constraint DSPs *share*. The history is of
differentiation retreating from shared constraints into non-shareable places:
first patents, then algorithms, then logs of proprietary interactions, now
consent-granted first-party graphs. The last layer that hasn't leaked is
data — which is exactly why the era we're in looks less like an algorithms
race and more like a legal-and-identity one.

## Where the primary sources are (for the curious)

IAB Tech Lab's OpenRTB version history and the spec PDFs on GitHub; US patent
2008/0162329A1 from USPTO/Google Patents; DoubleClick's 2004 10-K on SEC
EDGAR for DART and ASP-model economics; FTC docket P074102 and EU case
COMP.52577 for the 2008 deal; the Belgian DPA's Decision 21/2022 itself, with
Veale et al.'s analyses. The trade numbers ($680M, spend series, percentages)
travel through Wikipedia and Statista chains and deserve primary
confirmation before I repeat them at anyone important — which is written here
mostly so that *future me* doesn't forget that promise.

## References

1. IAB Tech Lab, "OpenRTB (Real-Time Bidding)," incl. full version history. https://iabtechlab.com/standards/openrtb/
2. Knapp, R. & Blanco, M. (2006). "Auction For Each Individual Ad Impression." US 2008/0162329A1, published 2008-07-03. https://patents.google.com/patent/US20080162329A1
3. Wikipedia, "DoubleClick." https://en.wikipedia.org/wiki/DoubleClick
4. Wikipedia, "Ad exchange" (History: Right Media 2005, O'Kelley; Yahoo $680M; Knapp/Blanco filing). https://en.wikipedia.org/wiki/Ad_exchange
5. Wikipedia, "Online advertising" (early banner/search milestones). https://en.wikipedia.org/wiki/Online_advertising
6. Wikipedia, "Real-time bidding" (spend series via Statista; privacy & fraud sections). https://en.wikipedia.org/wiki/Real-time_bidding
7. Edelman, B., Ostrovsky, M. & Schwarz, M. (2007). "Internet Advertising and the Generalized Second-Price Auction." *American Economic Review* 97(1):242–59. doi:10.1257/aer.97.1.242
8. Yuan, S., Wang, J. & Zhao, X. (2013). "Real-time Bidding for Online Advertising: Measurement and Analysis." arXiv:1306.6542. doi:10.48550/arXiv.1306.6542
9. Cui, Z., Zhang, X., Li, W. & Mao, C. (2011). "Bid Landscape Forecasting in Online Ad Exchange Marketplace." *KDD*. doi:10.1145/2020408.2020454
10. Zhang, W., Yuan, S., Wang, J. & Shen, X. (2014). "Real-Time Bidding Benchmarking with iPinYou Dataset." arXiv:1407.7073
11. Zhang, W., Yuan, S. & Wang, J. (2014). "Optimal Real-Time Bidding for Display Advertising." *KDD*. doi:10.1145/2623330.2623633
12. Balseiro, S., Besbes, O. & Weintraub, G. (2015). "Repeated Auctions with Budgets in Ad Exchanges." *Management Science* 61(4). doi:10.1287/mnsc.2014.2022
13. Zhang, J. et al. (2016). "Feedback Control of Real-Time Display Advertising." *WSDM*. doi:10.1145/2835776.2835843, arXiv:1603.01055
14. Cai, H., Ren, K., Zhang, W. & Wang, K. (2017). "Real-Time Bidding by Reinforcement Learning in Display Advertising." *WSDM*. doi:10.1145/3018661.3018702, arXiv:1701.02490
15. McMahan, H. B. et al. (2013). "Ad Click Prediction: a View from the Trenches." *KDD*. doi:10.1145/2487575.2488200
16. Chapelle, O. (2014). "Modeling Delayed Feedback in Display Advertising." *KDD*. doi:10.1145/2623330.2623634
17. Rendle, S. (2010). "Factorization Machines." *IEEE ICDM*. doi:10.1109/ICDM.2010.127
18. Ren, Q. et al. (2019). "Deep Landscape Forecasting for Real-time Bidding Advertising." *KDD*. doi:10.1145/3292500.3330870, arXiv:1905.03028
19. Aggarwal, G., Badanidiyuru, A. & Mehta, A. (2019). "Autobidding with Constraints." *WINE*. doi:10.1007/978-3-030-35389-6_2
20. Conitzer, V., Kroer, C., Sodomka, E. & Stier-Moses, N. (2019/2022). "Pacing Equilibrium in First-Price Auction Markets." *EC 2019*, doi:10.1145/3328526.3329600; journal version *Management Science* 70(2), 2024. doi:10.1287/mnsc.2022.4310, arXiv:1811.07166
21. ICO, *Update report into adtech and real time bidding*, 2019-06-20.
22. Belgian DPA, Decision 21/2022 re IAB Europe TCF, 2022-02-02.
23. Veale, M. & Zuiderveen Borgesius, F. (2022). "AdTech and Real-Time Bidding under European Data Protection Law." *German Law Journal*. doi:10.31235/osf.io/wg8fq
24. Veale, M., Nouwens, K. & Santos, I. (2022). "Impossible Asks: Can the TCF Ever Authorise RTB After the Belgian DPA Decision?" *TechReg*. doi:10.26116/techreg.2022.002
25. Prebid, "Introduction to Prebid" (header bidding launch, adapters, parallel bidders). https://docs.prebid.org/overview/intro.html
26. Kochalski et al. (2021). "Detecting Ad Fraud and Financial Losses in Digital Advertising." (AdKDD; citation chain via secondary sources — arXiv ID unresolvable this pass, flagged rather than fabricated.)
27. Aggarwal, G., Perlroth, M. & Zhao, J. (2023). "Multi-Channel Auction Design in the Autobidding World." *EC*. doi:10.1145/3580507.3597707
