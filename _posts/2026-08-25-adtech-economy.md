---
layout: default
title: The Advertising Economy
---

# The Advertising Economy
*August 25, 2026*

I graduated with a B.S. in Mathematics from Caltech in June 2025 and started
working as a machine learning engineer in the advertising industry. This
notebook collects what I have learned working inside digital advertising — the
economy first, the mechanics in later entries. This entry is the map: who the
players are, how the money and the information flow, and where the interesting
fault lines are.

## The transaction in one line

Strip away the acronyms and programmatic advertising is one exchange: a
**publisher** owns audience attention and has inventory to sell; an
**advertiser** owns budget and has a commercial goal to hit. Everything else in
adtech exists to intermediate that exchange — matching the right impression to
the right advertiser at the right price, at machine speed.

```
Advertiser ──(campaign/budget)──> DSP ──(bid requests)──> Ad Exchange <──(auction)── SSP <── Publisher
                                     ^                                |
                                     └─── Data Providers / DMP, Measurement, Ad Server ───┘
```

I'll walk the actors in order of how much they matter to me, because a
demand-side platform is the seat I sit in.

## The actors

**Advertiser (demand).** Sets the objective — conversions, a CPA/ROAS target,
reach — plus budget and creatives, and buys media programmatically rather than
negotiating an insertion order per site.

**Agency / trading desk.** Not a platform, but a real layer: they hold
advertiser money and operate the DSPs on the advertiser's behalf. It matters
because DSP product decisions are made for agency buyers — multi-advertiser
accounts, approval workflows, reporting hierarchies — more often than for
direct advertisers.

**Demand-Side Platform (the DSP).** Software that lets advertisers and
agencies buy impressions across many supply sources from one interface,
deciding audience, bid price, budget pacing, and creative *per impression* in
real time. The IAB's own framing: real-time bidding is "a way of transacting
media that allows an individual ad impression to be put up for bid in
real-time." The boundary that separates a DSP from its predecessor, the ad
network, is exact: the DSP "has the technology to determine the value of an
individual impression in real time (less than 100 milliseconds)." The trade
literature quotes 20–400 milliseconds end-to-end from bid request to decision.
Later entries take that sentence apart; here I only want the definition on the
table.

**Ad Exchange.** Neutral-ish marketplace technology running the auction between
many DSPs and many sellers — a stock exchange for impressions. Historical first
mover: the Right Media Exchange, launched 2005, acquired by Yahoo in 2007 —
"approximately $680 million" for the remaining equity per Yahoo's own 8-K,
closed July 11 and booked at a $526M GAAP purchase price in Yahoo's FY2007
10-K; the two figures coexist because they count different things, and both
now sit on primary filings. Google's AdX arrived via the DoubleClick acquisition — announced at
$3.1B in April 2007, closed March 2008 after FTC and EU clearance — and became
the default liquidity venue of the industry.

**Supply-Side Platform (SSP) / publisher ad server.** Sell-side software:
aggregates publisher inventory, runs the auction(s), and optimizes yield with
floors, header bidding and waterfalls, and deal management. Large publishers
route many demand sources through an SSP the same way a trader routes through
a smart order router. SSP tech is derivative of exchange tech — the auction
engine is the same one, pointed the other way.

**Ad network.** The *predecessor* architecture: contract inventory from many
sites in bulk, resell it, generally without impression-level real-time pricing.
Networks still matter — curated packages, guaranteed campaigns, and
notoriously, most walled-garden inventory still behaves network-like even when
the plumbing speaks auction.

**Publisher.** Origin of supply: sites, apps, CTV channels, digital-out-of-home
screens. In protocol terms the bid request describes supply with a `site`
(web) or `app` (non-browser app) object plus `imp` objects for the sellable
slots — a shape I dissect in the entry on OpenRTB.

**The ancillary-but-load-bearing.** Four more roles that never appear in the
one-line transaction but own pieces of its spine:

- The **ad server** — creative management and serving/decisioning. The lineage
  is DoubleClick's DART ("Dynamic Advertising, Reporting, and Targeting,"
  1990s), built to raise buyer efficiency and reduce publisher unsold
  inventory; the ad server predates and outlives the auction.
- **Data providers / DMPs** — audience segments attached to bid requests. The
  UK ICO's 2019 investigation into adtech found real-time-bidding participants
  collecting and trading rich personal data — race, sexuality, health status,
  political affiliation — often without proper consent. The data plane is not
  an auxiliary; it is load-bearing, with a legal spine.
- **Measurement and verification** — viewability, fraud. "Made-for-advertising"
  sites exist specifically to extract rent through the programmatic pipe with
  content-farm inventory; fraud is a documented externality of the channel,
  not an accident of it.
- **Attribution** — post-view/post-click conversion measurement. The DSP's
  performance claim lives or dies here, and it is the least standardized layer
  in the entire stack. Two companies can disagree 30% on conversions for the
  same campaign and both be internally consistent.

## How one impression flows (OpenRTB 2.x mental model)

1. A user hits a publisher page; the publisher/SSP constructs a **bid
   request**: device, geography, user id/segments, `site` or `app`, and `imp`
   (slot, size, formats, floor).
2. The exchange/SSP fans the request out to DSPs.
3. Each DSP runs its pipeline — eligibility filters, audience match, a value
   model (pCTR/pCVR or a direct expected-value estimate), a bidding policy
   with pacing and shading — and returns a `seatbid` with a price in currency
   per mille, a creative, and callback macros, or no-bids.
4. The auction clears (first-price in open display since roughly 2019;
   second-price historically and still at many places). The exchange notifies;
   the ad renders; win/impression/click/conversion events flow back and become
   training data.
5. Settlement reconciles auction logs against publisher invoices and
   advertiser bills. Fraud and discrepancy disputes are subtracted somewhere
   in that chain — and *who* subtracts it is a business negotiation, not a
   constant.

Note the loop in step 4: the auction is also the labeling function. Every
auction is simultaneously a transaction and an experiment whose result is
labeled late, partly, and by counterparties.

## The economic asymmetry

The sentence I keep using: **supply is abundant and near-perishable — an
impression must be sold within ~100 ms or it's gone — and demand is
consolidated and slow-moving — budgets, targets, brand constraints move on
timescales of quarters.** The DSP's function is to convert perishable supply
into durable advertiser ROI, and its fee is earned only if that conversion is
real.

## Four systems wearing one trench coat

The mental model that has survived contact with everything else I know: a DSP
is four systems wearing one trench coat.

1. **A bid engine.** OpenRTB JSON arrives; a price (or a 204) comes out within
   `tmax`.
2. **A campaign object model.** Advertisers think in campaigns, audiences,
   budgets, KPIs (eCPC/eCPA); the DSP translates that into per-impression
   arithmetic and reports back in their language.
3. **A data pipeline.** Every bid, win, impression, click, conversion becomes
   a log line, then a feature, then a training row, then an invoice line.
4. **A financial engine.** DSPs front the media cost and bill advertisers:
   `margin = advertiser price − clearing price − fees − fraud refunds`.
   Pacing, fraud deductions, and reconciliation with publisher invoices all
   live here. This is the part I am most confident is structurally right from
   public filings — The Trade Desk's 10-K describes take-rate-on-spend almost
   in these terms — while the exact fee-stack conventions remain the least
   transparent numbers in the industry.

Of these, only the first two are visible to a buyer. The moat is three and
four.

## Why the DSP seat is the valuable one

Connectivity got commoditized. Once OpenRTB standardized (2010 onward), any
DSP can connect to any exchange, and integration count stopped being an
advantage. What cannot be commoditized is *knowing what an impression is
worth*. Value estimation is machine learning plus proprietary feedback loops
— your own conversions training your own models — so the modern moat is data
and inference, not integrations. Google is the proof case: it turned a serving
company (DoubleClick, $3.1B, 2008) into the AdX-exchange + DV360-DSP stack and
then owned both sides of the trade; the DSP-side Invite Media acquisition
(2010) was folded in, renamed DoubleClick Bid Manager, then Display & Video
360. Contrast an independent performance DSP whose whole game is the open
internet's remaining traceable data: bidstream, its own pixels, data
partnerships, consent-granted first-party graphs.

Under a "performance DSP" business model, revenue ≈ take-rate × spend (plus
sometimes data or service fees), and profitability is the accuracy of the
value model. Overbid and the advertiser's CPA target breaks — churn. Underbid
and share is lost while fixed costs sit on less revenue. Which gives the
compressed version of the economics: **a DSP's product is the error
distribution of its value model; a DSP's moat is the feedback data that
narrows it.**

## Where the open questions are

Three things I do not yet know well enough to state as settled, and intend to
close:

- **The fee stack.** Who takes what cut of a dollar of advertiser spend is the
  least transparent number in the industry — DSP fee vs. take vs. SSP cut vs.
  exchange fee, netted and rebated across contracts. The best near-primary
  sources are public filings: Trade Desk 10-Ks, AppLovin, Magnite, PubMatic,
  Criteo. I intend to read them closely (they also contain the honest versions
  of the industry stats the trade press floats).
- **Open vs. walled.** How much of the chain is still open RTB versus
  Google/Amazon/Meta, where — for the first time in this economy's history —
  the same firm owns demand, supply, and identity, and its "auction" prices
  against first-party information no one else sees.
- **Where money and information diverge.** Fraud, attribution windows, and
  publisher arbitrage all live in the gap between what the auction log says
  and what the invoice says. The economics is downstream of the plumbing, and
  most of its hard problems are really disagreements about the plumbing's
  feedback channel.

Those are the seams worth prying open, and I'll keep prying. The auction
mechanics themselves, the latency engineering, the bidding and pacing theory,
and the machine-learning stack all have their own entries now.

## References

1. IAB Tech Lab, "OpenRTB (Real-Time Bidding)." https://iabtechlab.com/standards/openrtb/
2. Wikipedia, "Real-time bidding." https://en.wikipedia.org/wiki/Real-time_bidding
3. Wikipedia, "Demand-side platform." https://en.wikipedia.org/wiki/Demand-side_platform
4. Wikipedia, "Ad exchange." https://en.wikipedia.org/wiki/Ad_exchange
5. Wikipedia, "DoubleClick." https://en.wikipedia.org/wiki/DoubleClick
6. Wikipedia, "Online advertising." https://en.wikipedia.org/wiki/Online_advertising
7. ICO, *Update report into adtech and real time bidding*, 2019-06-20.
8. Veale, M. & Zuiderveen Borgesius, F. (2022). "AdTech and Real-Time Bidding under European Data Protection Law." *German Law Journal*. doi:10.31235/osf.io/wg8fq
9. Diaz Ruiz, C. (2024). "Disinformation and fake news as externalities of digital advertising." *Journal of Marketing Management*. doi:10.1080/0267257X.2024.2421860
10. Edelman, B., Ostrovsky, M. & Schwarz, M. (2007). "Internet Advertising and the Generalized Second-Price Auction." *American Economic Review* 97(1):242–59. doi:10.1257/aer.97.1.242
11. Balseiro, S., Besbes, O. & Weintraub, G. (2015). "Repeated Auctions with Budgets in Ad Exchanges." *Management Science* 61(4):864–884. doi:10.1287/mnsc.2014.2022
12. The Trade Desk, Form 10-K (annual reports; revenue-recognition and take-rate framing). https://investors.thetradedesk.com
13. Yahoo! Inc., Form 8-K (filed 2007-05-02; exhibit: Right Media press release, "approximately $680 million" for remaining equity). https://www.sec.gov/Archives/edgar/data/1011006/000115752307003677/
14. Yahoo! Inc., Form 10-K FY2007 (filed 2008-02-27; Note 3: Right Media GAAP purchase price $526M). https://www.sec.gov/Archives/edgar/data/1011006/000089161807000108/
