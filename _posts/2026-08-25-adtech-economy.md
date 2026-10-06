---
layout: default
title: The Advertising Economy
---

# The Advertising Economy
*August 25, 2026*

I graduated with a B.S. in Mathematics from Caltech in June 2025. This notebook
collects what I have learned working in and thinking about the digital
advertising industry.

## The transaction

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

The **demand-side platform** is the seat I care about. A DSP lets advertisers
and agencies buy impressions across many supply sources from one place, deciding
audience, bid price, budget pacing, and creative per impression in real time.
What distinguishes it from its predecessor, the ad network, is exact: a DSP has
the technology to determine the value of an *individual* impression in real
time, on the order of less than a hundred milliseconds. The industry trade
literature quotes a decision window of somewhere between 20 and 400
milliseconds, end to end.

## Four systems wearing one trench coat

The mental model I keep returning to: a DSP is four systems wearing one trench
coat.

1. **A bid engine.** OpenRTB JSON arrives over the wire; a price (or a no-bid)
   comes out within the deadline.
2. **A campaign object model.** Advertisers think in campaigns, audiences, and
   CPA targets. The DSP translates that into per-impression arithmetic and
   reports back.
3. **A data pipeline.** Every bid, win, impression, click, and conversion
   becomes a log line, then a training row, then an invoice line. The ICO's
   2019 report into adtech found race, sexuality, health status, and political
   affiliation flowing through RTB streams — the data plane *is* the product.
4. **A financial engine.** DSPs front the media cost and bill advertisers.
   Margin is what survives after clearing price, fees, and fraud refunds.

Of these, only the first two are visible to a buyer. The moat is numbers three
and four — connectivity got commoditized by OpenRTB, but nobody can commoditize
*knowing what an impression is worth.* That knowledge comes from your own
conversions training your own models, and it's why the modern DSP wins on data
and inference, not integrations. Google is the proof case: it turned a serving
company, DoubleClick — acquired for $3.1B in 2008 — into the AdX + DV360 stack.

## The economic engine

A performance DSP is paid a take-rate on spend, so its revenue is
approximately fee × spend, and its profit is a residual:

```
margin = advertiser price − clearing price − fees − fraud refunds
```

That residual is owned entirely by the accuracy of the value model. Overbid and
the advertiser's CPA target breaks — churn. Underbid and you lose share while
the fixed costs sit on less revenue. The DSP's *product* is therefore the error
distribution of its value model, and its *moat* is the feedback data that
narrows it.

The asymmetry that makes the job hard: **supply is abundant and
near-perishable** — an unsold impression must be sold within ~100 ms or it's
gone forever — while **demand is consolidated and slow-moving** — budgets,
targets, brand constraints. The DSP's function in the economy is to convert
perishable supply into durable advertiser ROI, and it only earns the fee when
that conversion is real.

## Where the open questions are

Three things I don't yet know well enough to write down as settled:

- **The fee stack.** Who actually takes what cut of a dollar of advertiser
  spend is the least transparent number in the industry. The best near-primary
  sources are public filings — The Trade Desk's 10-K, AppLovin, Magnite,
  PubMatic. I intend to read them.
- **Open vs. walled.** How much of the chain is still open RTB versus
  Google/Amazon/Meta, who own demand, supply, and identity simultaneously.
- **Where money and information diverge.** Ad fraud, attribution windows, and
  publisher arbitrage all live in the gap between what the log says and what
  the invoice says.

The mechanics of the auction itself get their own entry; the latency
constraints, another.

## References

1. IAB Tech Lab, "OpenRTB (Real-Time Bidding)." https://iabtechlab.com/standards/openrtb/
2. Wikipedia, "Real-time bidding." https://en.wikipedia.org/wiki/Real-time_bidding
3. Wikipedia, "Demand-side platform." https://en.wikipedia.org/wiki/Demand-side_platform
4. Wikipedia, "DoubleClick." https://en.wikipedia.org/wiki/DoubleClick
5. ICO, *Update report into adtech and real time bidding*, 2019-06-20.
6. Veale, M. & Zuiderveen Borgesius, F. (2022). "AdTech and Real-Time Bidding under European Data Protection Law." *German Law Journal*. doi:10.31235/osf.io/wg8fq
7. Edelman, B., Ostrovsky, M. & Schwarz, M. (2007). "Internet Advertising and the Generalized Second-Price Auction." *American Economic Review* 97(1):242–59. doi:10.1257/aer.97.1.242
8. Balseiro, S., Besbes, O. & Weintraub, G. (2015). "Repeated Auctions with Budgets in Ad Exchanges." *Management Science* 61(4):864–884. doi:10.1287/mnsc.2014.2022
