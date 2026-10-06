---
layout: default
title: OpenRTB, or How an Auction Actually Clears
---

# OpenRTB, or How an Auction Actually Clears
*October 6, 2026*

OpenRTB is a small protocol carrying a large economy. The shape is: an SSP
POSTs JSON; a DSP replies with JSON or `204 No Content` within `tmax`; the
exchange runs the auction and fires callback URLs whose placeholders the server
must substitute (`${AUCTION_PRICE}`, `${AUCTION_MIN_TO_WIN}`,
`${AUCTION_DISCOUNT_PCT}`). That round trip plus the notices is the whole
external surface of a bidding company.

## What arrives, and what you do with it

A BidRequest's top level is supply metadata (`site` for web, `app` for apps —
CTV sits inside `app`, DOOH is mutually exclusive with both — plus `device`,
`user`) and the *sellable contract* in `imp[]`: slot id, formats, `bidfloor`
and `bidfloorcur`. Before any valuation logic you must act on the gate flags:

- `regs.gdpr` / `regs.coppa` / GPP consent strings — these short-circuit to a
  no-bid, upstream of valuation. Privacy is a filter, like deduplication.
- `source.fd = 1` means the final sale decision happens upstream — header
  bidding, or an ad server mixing direct campaigns. The exchange you're
  talking to doesn't own this auction.
- `source.tid` — a transaction identifier that must be common across all
  participants. The dedup and fraud signal.
- `source.schain`, plus `sellers.json` and `ads.txt` — the transparency
  machinery that (slowly) kills reseller arbitrage by making the hop chain an
  audited protocol field.
- `user.buyeruid` (your own synced id) and `user.eids` with an `mm`
  (match-method) chain — how you tell a real cookie sync from a probabilistic
  bridge.

BidResponses carry the inverse: price, `adomain`s, `adm` markup, and the
notice URLs. Two of those notices should never be conflated: the **win
notice** informs pricing algorithms of success; the spend notice is applied on
the **billing notice**, "indicates that spend should actually be applied".
Winning is information; billing is money. Treat them as separate event streams.

## The auction-type field

`BidRequest.at`: **1 = first price, 2 = second-price-plus (default), 500+ =
exchange-defined**, overridable per-imp and per-deal. "Second Price Plus"
exists because real clearing deviates from the textbook: second plus a penny,
floor-adjusted clears, and exchange-proprietary formats living in the reserved
≥500 range. A `Deal` with `at = 3` means the `bidfloor` is the agreed price —
no auction at all, which is the protocol's encoding of programmatic guaranteed.

The `at` field also encodes the industry's biggest mechanism change. In 2019
Google Ad Manager and the open exchanges flipped from second to first price.
Under second price, a bid at true value is dominant only absent budget and
repetition — and with budgets it isn't (Balseiro, Besbes and Weintraub showed
the non-truthfulness in *Management Science*, 2015). Under first price every
win is a direct payment observation. Either way the market's *minimum winning
bid* — the runner-up or the binding floor — is the object you must learn, and
either way losing bids still tell you almost nothing. That asymmetry is the
statistical heart of everything downstream.

## Floors, notices, and hygiene

Reserve prices are per-imp (`bidfloor`, default USD-zero), per-segment by
exchange, with newer durable-floors and per-second minimums for CTV/audio.
A floor is both an economic instrument and a censor: bids under the floor tell
you only `z ≥ your bid`.

Notice hygiene is the unglamorous part. Loss notices with `${AUCTION_PRICE}`
and `${AUCTION_MIN_TO_WIN}` are how a DSP learns the market without winning
thousands of auctions a day; an exchange that blanks them starves your model
with zero-length strings. Every no-bid reason (`nbr`) should be counted.
Sampled log lines are the difference between a debuggable bidder and a black
box with a revenue cliff.

## The clock, revisited

`tmax` counts *internet latency from the exchange's send*. The reference
chain from Prebid shows the bookkeeping: the page-level auction timeout, an
s2s timeout set to ~75% of it, and a server-side adjustment that subtracts
processing time, a network buffer, and a response-preparation floor again
before the bidder sees anything. Honor `tmax` at your own wire edge and
you'll never be late; honor only the number you're handed and you'll still
time out at the exchange. The clock is always the budget.

## References

1. IAB Tech Lab, *OpenRTB Version 2.6* (all §-level field citations). https://github.com/InteractiveAdvertisingBureau/openrtb2.x/blob/main/2.6.md
2. IAB Tech Lab, *OpenRTB 2.x Implementation Guide* (`source.tid`, `schain`, `user.eids` match-methods). https://github.com/InteractiveAdvertisingBureau/openrtb2.x/blob/main/implementation.md
3. IAB, "SupplyChain object" implementation guide. https://github.com/InteractiveAdvertisingBureau/openrtb/blob/master/supplychainobject.md
4. Prebid, "Timeouts." https://docs.prebid.org/features/timeouts.html
5. Prebid Server, "`/openrtb2/auction` — Timeout." https://docs.prebid.org/prebid-server/endpoints/openrtb2/pbs-endpoint-auction.html
6. Edelman, B., Ostrovsky, M. & Schwarz, M. (2007). "Internet Advertising and the Generalized Second-Price Auction." *American Economic Review* 97(1):242–59. doi:10.1257/aer.97.1.242
7. Balseiro, S., Besbes, O. & Weintraub, G. (2015). "Repeated Auctions with Budgets in Ad Exchanges." *Management Science* 61(4):864–884. doi:10.1287/mnsc.2014.2022
8. Gligorijevic, D. et al. (2020). "Bid Shading in The Brave New World of First-Price Auctions." *CIKM*. doi:10.1145/3340531.3412689 (preprint arXiv:2009.01360)
9. PubMatic, "First Price Auctions & Auction Dynamics." https://pubmatic.com/blog/first-price-auctions-auction-dynamics/
