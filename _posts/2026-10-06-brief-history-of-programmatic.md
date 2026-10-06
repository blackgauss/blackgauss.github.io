---
layout: default
title: A Brief History of Programmatic Advertising
---

# A Brief History of Programmatic Advertising
*October 6, 2026*

The thesis I've arrived at, before the dates: for most of its life, the hard
part of a demand-side platform was not intelligence but plumbing — receiving
bid requests in time, speaking the exchange's protocol, spending a budget
without overdrawing. Each era solved one bottleneck, and each solution leaked
to everyone. Patents expired or were designed around, protocols standardized,
papers published, open source shipped. So the frontier of competition moved one
layer inward each time. The DSP of today is an inference-and-data company that
happens to speak OpenRTB, which is the same thing the ad server of 2005 was,
one abstraction layer up.

## Before 2005: rules, not auctions

The pre-programmatic stack was a scheduling problem, not a pricing problem.
DoubleClick's DART (*Dynamic Advertising, Reporting and Targeting*) served
banner campaigns booked in advance against insertion orders. The unit of
computation was the placement — site × size × date × frequency cap — delivered
by a traffic-and-counting engine. There was no per-impression decision, so
there was no DSP yet.

Two artifacts of that era determined everything after it. The third-party cookie made
*audience* targeting representable at all — the data substrate the current
identity era is still fighting over. And keyword auctions in search — GoTo in
1998, Google AdWords in 2000 with quality ranking added in 2002 — proved that
ad inventory could be priced by auction *in software*, at query time. The
conceptual bridge was waiting for someone to port the auction from search text
to display impressions.

## 2005–2009: inventing the per-impression auction

Three threads nearly converged. Right Media Exchange (2005, Brian O'Kelley)
built the first modern ad exchange. Knapp and Blanco at Strategic Data Corp
filed in 2006 the patent that defines the field — *Auction For Each Individual
Ad Impression*, US 2008/0162329A1 — the ur-document of the whole IP thicket.
And Google's $3.1B acquisition of DoubleClick (closed March 2008) gave the
practice a default liquidity venue in AdX. Yahoo acquiring Right Media (~$680M,
2007) confirmed that the exchange was the asset class.

Interestingly, the load-bearing engineering of this era is *still* the DSP's
core: latency budgets, throughput, shared-counter budget pacing, protocol
fragmentation. Spend governors — probabilistic throttling control loops — were
shipped half a decade before their published theory. The same gap recurs
wherever you look: practitioners ran generalized second-price auctions years
before Edelman, Ostrovsky and Schwarz (2007) named GSP and proved it
non-truthful. Practice leads, theory audits.

## 2010–2013: the plumbing standardizes

The OpenRTB Consortium assembled in November 2010, when RTB was about 4% of
display. Version 2.0 (January 2012) unified display, mobile, and video into one
JSON API; the version train ran through 2.x and a briefly-resurrected 3.0 with
signed bid requests. Protocol commoditization *is* the event of the era: once
connectivity became a checkbox — Prebid, SDKs, kits — differentiation had to
move into decision quality. It worked: one trade history puts programmatic's
share of the digital mix near 29% by 2017, and US RTB spend alone at $57B by
2023.

Measurement became science at the same time. Yuan, Wang and Zhao's 2013 study
was the first public analysis of RTB logs from a DSP's side, introducing (to
the literature, anyway) the censoring problem — you only observe the clearing
price when you win. Cui et al. (KDD 2011) had already named the *bid
landscape*: the win-rate-versus-bid curve, and the censored-data challenge of
estimating it. The iPinYou dataset (2014) then turned the field empirical.

## 2013–2016: the algorithmic core goes public

Three research lines went public and became table stakes at roughly the speed
papers were released: optimal bidding via winning-price distributions (Zhang,
Yuan, Wang, KDD 2014), budget pacing as dual/LP control (Zhang et al. WSDM
2016; LinkedIn's waterlevel pacer, KDD 2014), and bid-landscape forecasting
with censored regression (Wu et al. KDD 2015). Every vendor read the same
PDFs. Advantage from *math* evaporated; advantage from *data and execution*
did not.

## 2016–2021: the mechanism changes under everyone

The 2019 migration of Google Ad Manager and the open exchanges from second to
first price rewired the DSP's arithmetic overnight: paying your own bid means
bid shading goes from edge optimization to core subsystem. Header bidding moved
the auction upstream into the publisher's page (`source.fd = 1` is the protocol
saying *the exchange you're talking to doesn't own this auction*). Complexity
compounded: PMP/deal machinery, CTV pods, supply-path transparency
(schain/sellers.json/ads.txt) chasing the transparency rents that intermediaries
had been quietly collecting.

## 2019–now: the data substrate taken away

The ICO's 2019 report found special-category categories of personal data —
race, sexuality, health, political affiliation — flowing through bid streams
without proper consent. In February 2022 the Belgian DPA voided parts of IAB
Europe's Consent Framework under GDPR; the Dutch DPA ordered RTB profiling to
halt. Cookie deprecation and ID ambiguity did the rest. Which is where the
treadmill has deposited the frontier: identity resolution, first-party and
signed data, server-side auctions, on-device or contextual inference. Each era
solved the old constraint; each moved the moat inward one layer. Data is the
last layer that hasn't leaked.
