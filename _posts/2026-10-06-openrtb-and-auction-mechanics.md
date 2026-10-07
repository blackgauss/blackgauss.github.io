---
layout: default
title: OpenRTB, or How an Auction Actually Clears
---

# OpenRTB, or How an Auction Actually Clears
*October 6, 2026*

OpenRTB is a small protocol carrying a large economy — a 2010 consortium
standard (assembled by buy- and sell-side vendors when RTB was ~4% of display)
whose version train (2.0 in January 2012, refining through 2.6 in 2023, with a
protobuf-flavored 3.0 detour in 2017) defines the *only* interface most of the
advertising industry has ever had with itself. The transport is boring on
purpose: HTTP POST with a JSON body — binary (protobuf/Avro) allowed via
content type but JSON assumed — `200` means there's a bid in here, `204` is a
valid no-bid ("the most bandwidth-friendly form of this signal," the spec
says), `400` your request was malformed; gzip and connection reuse are named
best practices. For each inbound ad opportunity, the exchange broadcasts bid
requests, evaluates responses under the auction rules, and declares a winner.
Everything a bidder controls lives inside the request→response round trip and
the notice callbacks that follow. That sentence is the whole external surface
of a bidding company, so it's worth dissecting field by field — because the
fine print in this protocol repeatedly turns out to be load-bearing economics.

## The sequence, end to end

```
Publisher page/app
   │  ad opportunity
   ▼
SSP / ad server ───(1) BidRequest POST (tmax clock starts)───► DSP
      ▲                                                        │
      │◄──(2) BidResponse (price, adm, nurl/burl/lurl) ────────┘
      │        ...or HTTP 204 / nbr: no-bid
      ▼
  auction (at=1/2/…) → winner
      │
      ├──(3) win notice → GET/POST bid.nurl  (macro ${AUCTION_PRICE})
      │          └── optional: markup returned in nurl's response body
      ├──(4) impression fires from device (adm pixel or burl)
      ├──(5) billing notice → bid.burl  ("spend should actually be applied")
      └──(6) loss notice → bid.lurl  (optionally ${AUCTION_PRICE}, ${AUCTION_MIN_TO_WIN})
```

The two notices most systems conflate are, in the spec's own words, for
different jobs: "The win notice informs the bidder's pricing algorithms of a
success, whereas the billing notice indicates that spend should actually be
applied." Winning is an *information* event; billing is a *money* event. For
VAST video, IAB prescribes the VAST impression event as the official billable
signal with `burl` fired alongside — an early admission that "impression" is
whatever the parties can agree to instrument.

The notice URLs and `adm` markup carry **substitution macros** —
`${AUCTION_ID}`, `${AUCTION_PRICE}` (the clearing price "after discount," same
currency and units as the bid), `${AUCTION_CURRENCY}`, `${AUCTION_MIN_TO_WIN}`
(the minimum bid that would have won), plus discount macros added in 2.6.
Macros can carry encoding suffixes (`${AUCTION_PRICE:B64}`), the
encode/decode algorithms are *bilateral* (so a DSP must never assume the
price it sees is plaintext), and — this clause matters more than anything in
this paragraph — the spec permits the exchange to blank `${AUCTION_PRICE}`
entirely on loss notices. A policy choice by a counterparty, in a document
neither party really controls, directly thins the DSP's training-data stream.
You cannot hedge that with code; only with a second vendor relationship.

## BidRequest anatomy

The top level splits into identity (`id`, `test` for sandbox traffic that is
"explicitly identified as non-billable"), filters (`cur`, `wseat`/`bseat`
seat allow/block — coordinated out-of-band, `allimps` road-blocking signals,
`bcat`/`cattax`/`badv`/`bapp` category and advertiser/app blocklists),
context, and the sellable contract in `imp[]`. Three areas deserve detail:

**Supply context is exactly one of** `site` (web), `app` (non-browser
applications — CTV lives in here, with store-assigned app ids in `bapp`), or
`dooh` ("a bid request with a DOOH object must not contain a site or app
object"). So the branch on inventory type happens *before* any auction logic
runs: a bidder's model stack, creative QA, and duration floors are all
selected off that triage.

**Compliance flags ride in `regs`** and must be acted on before bidding:
`coppa`, `gdpr` (0/1/omitted-unknown), `us_privacy` (the CCPA string), and
`gpp` + `gpp_sid` (the Global Privacy Platform string and applicable sections,
2.6+). This is a protocol fact worth dwelling on: *consent is now an
auction-time field, evaluated per request* — the law rides inside the
payload, and the canonical treatment is a no-bid with reason code 8
(`unmatched user... consent`) — compliance evaluated upstream of valuation,
like dedup, not downstream like a feature.

**The upstream decider is `source`**, and it carries three fields whose
economics I've never stopped thinking about:

- `source.fd` — *who makes the final sale decision*. `fd=1` means upstream of
  the exchange: header bidding, or an ad server mixing direct campaigns with
  the auction. It is the protocol saying: *the exchange you're talking to
  doesn't own this auction.* A bidder that doesn't branch on `fd` is
  price-discriminating in the wrong direction.
- `source.tid` — a transaction id that "must be common across all
  participants." It's the join key across the fan-out: deduplication, supply
  forensics, and the fraud signal all hang off it.
- `source.schain` — the supply chain object, below.

`device` and `user` are "recommended," and that's where identity lives:
device/geo/connection/IFA, `user.buyeruid` (your own synced id — the one asset
in the request you fully control), and `user.eids`, extended IDs, whose
`inserter`/`source`/`matcher` provenance and `mm` (match method) fields tell
you whether the hop from this ID to your user is a real addressable sync or a
probabilistic bridge. Weight your downstream features accordingly; most
organizations don't.

The `imp` object is the slot contract: `impid`/`tagid` (slot identity — the
key for dynamic floors and creative specs), `pmp` (deals, below), format
objects (`banner` with blocking attributes, `video` with `plcmt`/`podid`/
`maxseq` for CTV pod dedup, `audio`, `native`), `secure`, and the floor
machinery (`bidfloor`/`bidfloorcur`, default zero/USD, plus 2.6's
`mincpmpersec` and `durfloors`). All of that field-level machinery — floors,
pods, deals — is a reserve-price story: more below.

## `at` — the auction type, and the 2019 shock

`BidRequest.at` is small and enormous: **1 = first price, 2 = "Second Price
Plus" (the default), 500+ = exchange-specific** (the spec: "additional auction
types can be defined by the exchange"), overridable per-`Imp` and per-`Deal`.
`at=3` in a deal or imp override means "`bidfloor` is the agreed price" — no
auction at all, just purchase-order arithmetic. "Second Price *Plus*" exists
because real SSPs never cleared textbook second: second + $0.01, floor-adjusted
second, or proprietary clears living in the ≥500 space.

Mechanism-design note, because the choice of first price in 2019 was not
accident: the GSP/second-price literature (Edelman-Ostrovsky-Schwarz 2007 is
the canonical statement; the VCG line its ancestor) predicts truthful
revelation, and truthfulness *concentrates surplus with buyers*. First price is
more robust to reserve misspecification and — once bidders shade — yields
higher seller revenue; the exchanges monetized the gap by switching formats and
letting the DSPs rebuild their estimation stacks under the new payment rule.
The DSP-side consequence, spelled out in the entry on bid-landscape
forecasting: under second price you observe the market price on wins only
(right-censored); under first price every win is a *payment* observation but
losses still reveal nothing. Same censoring wall, different side of it.

## `tmax`, revisited as economics

"Maximum time in milliseconds the exchange allows for bids to be received
including Internet latency… supersedes any *a priori* guidance." The spec's
own example: 120. What I find instructive is the reference implementation's
timeout chain — because it shows a timeout budget is a stack of subtractions,
everyone keeping their own reserve: a publisher's auction timeout with a
page-level failsafe beyond it; the server-side leg nominally 50–75% of the
auction timeout, which *is* what's sent as `tmax`; the Prebid Server then
netting its own processing time, a network-latency buffer, and a minimum
bidder response duration off before a bidder is even asked — refusing to ask
if what's left is under its response-preparation floor. The `tmax` that
arrives at your wire has already paid everyone upstream's latency. Budget
accordingly.

## Deals, floors, and path forensics — the protocol's legal sections

**`imp.pmp = {private_auction, deals[]}`.** `private_auction: 1` means bids
restricted to the listed deals. A `Deal` carries its own `id`, floor, `at`
override, seat/domain allowlists, and — the quiet, load-bearing field —
`guar`: 1 means a *guaranteed* deal, the bidder *must* bid. Mapping the
industry's terms of art onto these fields: open auction = no `pmp`; PMP = `private_auction=1`
with auctioned deals; **Preferred Deal** = `at=3` fixed rate, non-exclusive,
`guar=0`; **Programmatic Guaranteed** = `at=3` + `guar=1` + buyer-locked
seats; First Look ≈ priority-expected deal, buyer-locked. The right-hand
column is the industry's encoding of its own vocabulary — the spec never uses
the strings "PDB" or "PG" — and the guidance is blunt about the failure modes:
a deal ID should be used "for any situation where the auction may be awarded
to a bid not on the basis of price alone" (prioritization must be
deal-backed, not magic ordering); sorting deal bids into a plain price
auction and truncating endangers fulfillment; applying your margin discount to
deal bids silently breaks a direct buyer↔seller agreement because on a deal
you and the publisher are the parties and the exchange is "third-party
automation." And the bid-return etiquette: for a matching deal, return M≥1
deal bids **plus N≥2 open-auction bids** ("M+N") — because returning only the
deal bid when both are valid creates problems downstream in exchanges that
prioritize or floor classes differently. Small etiquette; large invoices.

**Floors** are the reserve-price machinery and get scarier the deeper you
read. Legacy `bidfloor` in ISO-4217 currency (default USD; the imp-level
currency sets defaults for everything below it); 2.6-202307 added *duration
floors* — `mincpmpersec` (linear $/second) and `durfloors` (nonlinear ranges,
the spec's own example: 1–15s at $5, 16–30s at $10, 31+ at $20, with
overlapping ranges whose resolution is "bilateral"). Sellers must use
*exactly one floor form per object*; buyers resolve deal floors first, then
video/audio floors, then `imp.bidfloor`. In `at=3` deals, the floor *is* the
price — the one field where "reserve" and "price" collapse into each other,
and a warning to anyone building floor-decomposition models. Dynamic,
per-request ML-priced floors live entirely outside the spec (SSP-side
decisioning; what the DSP sees is the resulting number), which is the open
question I most want answered: how much of "the market price" is the market.

**Supply-chain transparency is a trio with division of labor:**
**ads.txt** = *this publisher authorizes this seller* (buyer-side
eligibility); **sellers.json** = who an exchange's counterparties are, flagging
`INTERMEDIARY` vs `PUBLISHER` (reseller depth); **`schain`** = the per-request
*proof of path* — nodes ordered initial-seller → sender, each with `asi`
(ads.txt-registered domain), `sid` (matching a sellers.json seller), `rid`
(the per-hop request join key), `hp` (in the payment flow), and the whole
thing stamped `complete`. The protocol sanctions suspicion of incomplete
paths: no-bid reason codes **16 (incomplete supply chain)** and **17 (blocked
node)** exist — i.e., *opaque paths are a codified reason to drop traffic*,
and supply-path optimization finally became bid-time computable because the
`complete` flag doubles as a data-quality-and-fee-stack signal. The "one hop
of margin" assumption of early RTB died quietly, and this object is its
autopsy.

## Feedback hygiene: 204s, reason codes, loss notices

The no-bid ladder, cheapest first: `204 No Content`; an empty-ish JSON object;
or `seatbid: []` with an `nbr` reason code — which the spec explicitly
*encourages*. The canonical table (defined in 3.0, referenced from 2.6): 1
technical error, 2 invalid request, 3 known crawler, 4 suspected non-human
traffic, 5 datacenter/proxy IP, 6 unsupported device, 7 blocked publisher,
8 unmatched user, 9 user daily cap, 10 domain daily cap, 11/12 ads.txt
unavailable/violated, 13/14 Ads.cert unavailable/violated, 15 not enough
auction time, 16/17 supply-chain incomplete/blocked, 500+ exchange-specific
(negotiated in advance). The implementation guide adds the etiquette that
non-human traffic should be *symmetrically* handled — exchange filters, bidder
still no-bids with the code — so the reason-code counters on both sides stay
interpretable to each other, which is the quiet foundation of the entire
feedback loop: *a no-bid with a reason code is a labeled event; a 204 is a
silent one.*

Loss notices (`lurl`) close the loop when they exist: `${AUCTION_PRICE}` on a
loss converts a censored observation into an exact one — this is literally the
censoring-relief valve the statistics in the landscape entry depend on. But
the spec admits, in its loss-notice note, that "exchange-specific policy may
preclude support for loss notices or the disclosure of winning clearing
prices." So: plan the ML stack to degrade gracefully when loss data is
partial, and understand `AUCTION_MIN_TO_WIN` semantics (floor-based vs
runner-up-based; the spec works an example with a $0.85 floor) before trusting
what the macro teaches you. And count your `nbr` distribution per exchange as
a drift signal — reason-code mixes shift before revenue does.

## The fee-stack, protocol-visible

The protocol *shows* you fragments of the money: every floor, every
intermediary in `schain.nodes`, every seat restriction, every `fd` flag. The
actual fee stack — who nets what from a dollar of advertiser spend — still
lives in contracts and 10-Ks, not in this document. But the protocol-visible
fragments are where I keep finding bugs with dollar signs: an undocumented
`at=500` variant clearing below your floor model's assumptions; dynamic floors
colliding with shaded bids; `private_auction` misread as a hard gate when the
exchange also passes open traffic. Read the spec the way you'd read a
contract: the interesting clauses are the permissive ones, the "may"
sentences, where someone's margin is quietly encoded. The macros are
handshakes, the reason codes are a shared ontology of failure, and the whole
document is a negotiated peace in JSON that turns out, on close reading, to
describe the industry's balance of power more honestly than its blogs do.

## References

1. IAB Tech Lab, *OpenRTB Version 2.6* (all § citations above: §2 transport; §3.2.1 request root, `at`, `tmax`; §3.2.2 `source`; §3.2.3 `regs`; §3.2.4/§3.2.12 imp and deal; §3.2.11 pmp; §3.2.18/§3.2.20 device/user; §3.2.25–26 schain; §3.2.35 duration floors; §4 responses & notices; §4.4 macros; §5 example). https://github.com/InteractiveAdvertisingBureau/openrtb2.x/blob/main/2.6.md
2. IAB Tech Lab, *OpenRTB 2.x Implementation Guide* — §7.1 NHT and no-bid etiquette; §7.3 deals ("M+N," anti-patterns); §7.6 pods; §7.11 floors and buyer resolution order; §7.12 identity and match methods; §7.16 macros. https://github.com/InteractiveAdvertisingBureau/openrtb2.x/blob/main/implementation.md
3. IAB, "SupplyChain object" (schain implementation examples). https://github.com/InteractiveAdvertisingBureau/openrtb/blob/master/supplychainobject.md
4. OpenRTB 3.0 FINAL — no-bid reason code list. https://github.com/InteractiveAdvertisingBureau/openrtb/blob/master/OpenRTB%20v3.0%20FINAL.md
5. Prebid, "Timeouts." https://docs.prebid.org/features/timeouts.html
6. Prebid Server, "`/openrtb2/auction` — Timeout." https://docs.prebid.org/prebid-server/endpoints/openrtb2/pbs-endpoint-auction.html
7. Prebid, "Introduction to Prebid." https://docs.prebid.org/overview/intro.html
8. Edelman, Ostrovsky & Schwarz (2007). "Internet Advertising and the Generalized Second-Price Auction." *American Economic Review* 97(1):242–59. doi:10.1257/aer.97.1.242
9. Balseiro, Besbes & Weintraub (2015). "Repeated Auctions with Budgets in Ad Exchanges." *Management Science* 61(4). doi:10.1287/mnsc.2014.2022
10. Gligorijevic, D. et al. (2020). "Bid Shading in The Brave New World of First-Price Auctions." *CIKM*. doi:10.1145/3340531.3412689, arXiv:2009.01360
11. Zhou, T. et al. (2021). "An Efficient Deep Distribution Network for Bid Shading in First-Price Auctions." *KDD*. doi:10.1145/3447548.3467167, arXiv:2107.06650
12. PubMatic, "First-Price Auctions & Auction Dynamics." https://pubmatic.com/blog/first-price-auctions-auction-dynamics/
