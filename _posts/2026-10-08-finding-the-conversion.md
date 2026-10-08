---
layout: default
title: Finding the Conversion — Identity in Reverse
---

# Finding the Conversion — Identity in Reverse
*October 8, 2026*

There is a moment, hours to weeks after the auction, when the machine learns
whether any of it meant anything. A row appears in someone else's database —
an order table, a CRM export, a mobile-measurement callback — and it says: a
person bought something. The bidding machine spent nine billionths of a second
and a fraction of a cent to reach that person, and now it has to answer a
question it cannot answer in real time, in a place it does not own, about a
person it may never have seen: *was that one of mine, and did I cause it?*

Vendor material treats that as one question. It is two, orthogonal, and the
conflation is why "the DSP reports three thousand conversions, the advertiser
reports twenty-one hundred" has twelve possible causes. The first question is
**identification**: which of my known identities, if any, does this conversion
belong to? It is the auction-time identity problem run in reverse — the
auction asks *who is this device, right now, in under a hundred milliseconds*;
conversion-time identity asks *whose order was this, and did I ever touch
them*, with no latency budget, a far richer key set (email, phone, order id),
and the catch that you only get the keys for the fraction of conversions the
advertiser agrees to share. The second question is **attribution**: which of
that user's impressions or clicks, if any of them mine, *caused* it? That one
is a join over time, and — the part nobody says out loud on a sales call — its
answer is a *policy*, not a measurement. Post-click? Last-click? Over what
window? First conversion or all of them? The label is the join of
identifications to clicks through a policy: `label = join(resolved, clicks,
policy)`. Every pathology in this business is a failure of one leg or the
other.

## Where conversions arrive, and what each door leaks

Seven doors, and each carries a different key set and a different amount of
truth. The **DSP's own pixel** on the advertiser's page is a one-line
fire-and-forget GET carrying whatever the tag stuffed into its query
parameters — a click token if the landing URL preserved one, an order value, a
conversion type. It is the classic mechanism, it is dying with third-party
cookies, and the *mechanism* will outlive the cookie because it is really a
signal bus. The **server-to-server postback** is the only door with a real
identifier round-trip: the affiliate or advertiser platform POSTs a signed
payload back carrying the click token that rode the click-through URL, a stable
conversion id, a value. It is deterministic *if the token survived the
journey* — a large if, discussed below. The **advertiser-side measurement tag**
means the DSP learns the conversion through a vendor export or a clean room,
mediated and lagged. The **offline batch upload** — a nightly file of salted,
hashed emails and phones joined to orders — is the retail and subscription
workhorse, and hash-recipe mismatch is its number-one silent failure. The
**server-side conversions API**, the pattern the largest gardens pioneered,
has the advertiser's *backend* send events enriched with browser metadata
server-side, engineered precisely to survive the pixel and cookie deaths that
ate the first door. The **mobile-measurement postback** delivers an
attribution *verdict* — the network matched the install against its click tree
and is telling you the campaign id — which on iOS after the privacy prompt
arrives at campaign granularity, timer-bucketed, or not at all. And
**on-platform retail media** hands you aggregate attributed sales joined
through the retailer's account graph, the best identity substrate in the market
and entirely unauditable by anyone outside it.

The delivery semantics are shared: *at-least-once*, deduplicated on the
conversion id, merged by taking the strongest label and the earliest elapsed
time. And one asymmetry governs the whole design: **a missed conversion is not
a missing row, it is a fake negative.** It trains the conversion rate down
forever. So the durability requirement on the conversion path sits above the
class its traffic would otherwise earn.

## The keys die before the conversion does

Here is the mechanical heart, and it is bleak. The request id that tied
everything together is *exchange-owned and never reaches the advertiser.* The
bid id returns only through a macro or a URL token. The impression and click
ids are minted by the buyer into the creative and the click-through URL and
"survive only as far as the device honors the URL." And the conversion itself
— the one event you actually want — *carries no auction key at all.*

So the join is carried on a token the buyer had the foresight to mint into a
URL. The click-through link redirects through the buyer's endpoint, which logs
`(click_id, user_id, campaign, timestamp)` and bounces the device onward with a
destination parameter — a `dcid`-style carrier — riding in the landing URL, to
be read back later by the advertiser's tag or postback. This works because the
protocol has no per-click macro: the exchange-macro set covers id, price,
currency, minimum-to-win, discount — never a click — so minting the click id
into the click-through URL is not a convenience, it *is* the join mechanism
[3]. The whole edifice rests on a URL parameter surviving a redirect chain, a
browser, and an app webview. And it sets a second silent trap: the click store
must be retained at least as long as the attribution window, or a fourteen-day
eviction quietly truncates a thirty-day window to fourteen and the difference
shows up as conversions that "weren't there."

The window itself is where policy wears the costume of measurement. The
canonical public study of delayed conversion feedback uses post-click,
last-click, a thirty-day window, matching on user-and-advertiser, crediting the
first conversion per click [1] — that exact tuple is a *choice*, and a
different, earlier study of the same phenomenon on a different exchange settled
on a window nearer two days, accepting roughly one-and-a-half percent of fake
negatives, because 95.5% of that exchange's conversions arrived within an hour
and 98.5% within two days [2]. Two reputable papers, same problem, fifteen-fold
difference in window, and *both correct for their traffic*. The exchange itself
enforced no window; advertisers set post-click versus post-view and a per-
campaign timeout, which is the tell: the window is a contract term, never a
protocol default. Widen it for coverage and you stale the model (about one
conversion in nine arrives from campaigns you no longer run); narrow it for
freshness and you manufacture fake negatives, worst early in a campaign's life.

View-through conversions — crediting a seen-but-not-clicked ad — extend the
join to the far larger impression store, usually over a much shorter window,
and the buyer has every reason to be stingy: impressions outnumber clicks by
two to three orders of magnitude, so view-through credit mostly rewards what
would have converted anyway, it is the cheapest thing to inflate, and a
pixel-only impression is spoofable where a measurer-attested one is not. Make
attested-versus-pixel a traffic-quality class and you get the crediting rule for
free. And multi-touch attribution — the first/last/linear/time-decay/Markov
family, and the survival-theory formulations the academic literature has built
[4] — is, in my taxonomy, *reporting*, not *labeling*: never train a conversion
model on multi-touch-reallocated labels, because the reallocation is a modeling
choice and every platform in the path will have claimed the same conversion. The
bidder converged on last-click plus a holdout calibration not because it is
true but because bidding needs a causal-ish credit per impression, and no single
buyer sees the cross-platform paths a real multi-touch model needs.

## Identity in reverse

For the identification leg, the same tiers as the auction's identity stack,
re-ranked for a world with no clock and many keys. At the top: a round-tripped
click token — deterministic, exact, the best label identity that exists, and
available only through the server-to-server flows that preserve it. Below it,
the salted-hash email and phone joined against the buyer's authenticated graph
— the salted, rotating joiners a major platform describes as an identifier
"designed to not directly identify the individual" [5] — deterministic *after
normalization*, the workhorse of offline upload, with
the caveat that the hash recipe (case normalization, salt, phone format, the
dot-in-gmail question) is a per-integration contract and "salted SHA-256" names
the convention, not the contract. Below that, the app and CTV device ids —
deterministic when present, gated by opt-in when not; and on connected TV,
identity runs on the publisher-account graph precisely because "third-party
cookies do not exist" there [7]. Below that, decayed
cookie and user-id syncs. At the bottom, browser fingerprinting at conversion
time, jurisdiction-branching, a last resort in which the lawfulness of
IP-derived identity must be an explicit input and never inferred. And below the
bottom: *unmatched*, a real fraction of every advertiser's conversions that
never round-trips and so never reaches the buyer at all — which is censoring,
not a zero, and deserves the delayed-feedback machinery, not deletion.

The load-bearing fact is that **match rate is the ceiling on everything
downstream.** In the auction it is the fraction of consented requests you can
resolve; at conversion time its twin is *label coverage* — the probability that
a conversion resolves to someone. And label coverage is skewed the same way
identity coverage is: identifiable-by-demographic is not uniform across the
population, so label bias tracks identity bias, and a conversion model trained
only on resolved labels is fitting the conversion rate of the
*identifiable subpopulation* and calling it the population. Whatever
availability-stratification a platform applies to its auction models it must
apply to its *label-resolution tier* too, or the stratum with the richest labels
quietly speaks for the stratum with the fewest. Clean rooms are the
privacy-legal version of the hash-match tier — batch, day-old, capped, cohort
out, never for auction-time identity, merely a slower and lazier deterministic
join. And retail media inverts the entire flow: the retailer holds
purchase-verified identity, recognizing its own revenue "on a net basis, as we
act as an agent" [6], so you push *your* models and holdout designs to
*them* rather than their data to you, and the label is the platform's reported
one until your own holdout says otherwise.

## The pipeline, and the three events naive systems collapse

Assemble it and you have: a click store keyed on the minted token, window-long
retention, consent carried forward from click time; a conversion intake behind
seven doors with idempotent reduction; a batch identity resolver walking the
tier ladder with a match-rate dashboard per integration; an attribution engine
where the window and the view-through rule and the per-click rule are config,
not code, instantiated per channel because label semantics differ per channel;
a label server emitting `(features, label, elapsed)` to training, delayed-
feedback compatible, with per-vertical delay-law monitoring rather than one
global number; a reversals ledger; and an incrementality harness.

The part that separates the built systems from the prototypes is that three
different events arrive, and the naive pipeline collapses all three into "new
conversion." A **retry** carries the same conversion id and collapses by
idempotency. A **revision** is the advertiser or the measurement network
changing its mind about which click won, arriving as a new conversion id for
the same order — it must land in an append-only revision log and re-emit both
rows' training terms, because the settlement rule "never auto-correct history"
belongs to labels as much as to money. And a **reversal** — a refund — flips a
label from one to zero *after* training already saw the one, which at minimum
means emitting negative-value rows so that return-on-ad-spend reports net
revenue, and properly means the churn-style survival machinery absorbs it.

The whole reason this subsystem exists is freshness discipline. Waiting for the
window to close stales the model; truncating the window manufactures fake
negatives, worst early in a campaign; and the naive one-day cut yields label
means near *0.4× the eventual value* — two and a half times too pessimistic,
every day, forever. The resolution is not to wait; it is to *emit the example
as early as possible, elapsed-since-click included, and let a delay model
absorb the rest.* Identification ends and modeling begins at the insight that
the join is not finished when a conversion is found — it is finished when
*silence becomes provably negative*: once the elapsed time times the per-unit
conversion hazard is large enough, an unlabeled sample contributes the gradient
of a true negative, and you stop waiting.

## Who else claims it, and the referee

Every counterparty with a pixel runs its own last-click attribution, and two
truthful systems disagree because they had *different last clicks*. That is
attribution *disagreement*, a first-class market fact rather than an error —
the same status as a duplicated transaction id, which is a business fact, not a
delivery fault. Gardens are the worst case because they own both the auction
and the label, so their conversions are the *seller's measurement*, and a
wider attribution window is a pricing lever they can pull without ever repricing
a quarter. Retail media attribution lacks an accredited ground-truth
methodology, so treat it the same way. And in mobile, the last-click tree that
the measurement networks run is itself a target: attribution hijack, the
conversion-stuffing practice of firing last-clicks at store pages until an
install in the window sticks, is invisible to impression-level fraud vendors
because it never touches an impression.

Attribution answers who gets credit; only an experiment answers whether the ad
*caused* it. The ladder is short and its costs are honest: last-click labels
calibrate nothing and assume the policy is right; a matched-market or geo
holdout calibrates the exchange rate between a channel's conversions and
causality, at the opportunity cost of the held-out spend; ghost bids inside a
market calibrate the selection bias of who got attributed; the platform's own
lift study grades the platform's own homework and needs a referee anyway. The
rule I would tattoo on the attribution engine is that **every attribution policy
ships with a measured inflation estimate**, because an unmeasured inflation is
unpriced model bias, and that conversion probability is being multiplied into
every bid the machine makes. An unmeasured credit, like an unmeasured fee, is
still a fee.

So the machine, which spent billionths of a second to reach a stranger, spends
hours to weeks in a database it does not own reconstructing whether the stranger
was anyone. It ties the knot backward, on a URL token that may not have
survived, across a window that is a negotiation, through a graph that sees only
the identifiable, crediting a last click that someone else may also claim, and
then hands the result to a model with the honest caveat — elapsed time
attached, hazard applied — *I'm not sure yet; I'll know more when the silence
gets longer.* The conversion is not found. It is *inferred*, late, censored,
disputed, and — if the plumbing is any good — auditable to the join that made
it.

## References

1. Chapelle, O. (2014). "Modeling Delayed Feedback in Display Advertising." *KDD*. doi:10.1145/2623330.2623634
2. Rosales, R., Cheng, H. & Manavoglu, E. (2012). "Post-click Conversion Modeling and Analysis for Non-guaranteed Delivery Display Advertising." *WSDM*. doi:10.1145/2124295.2124333
3. IAB Tech Lab, *OpenRTB Version 2.6* (exchange macros §4.4: id/price/currency/min-to-win/discount; no per-click macro; click-through URL and click macros). https://github.com/InteractiveAdvertisingBureau/openrtb2.x/blob/main/2.6.md
4. Zhang, Z., et al. (2014). "Multi-touch Attribution in Online Advertising with Survival Theory." *IEEE ICDM*. doi:10.1109/ICDM.2014.130
5. The Trade Desk, Inc. (2026). *Annual Report (Form 10-K) for fiscal year 2025* (UID2; advertiser first-party data custody), filed 2026-02-27. https://www.sec.gov/Archives/edgar/data/1671933/000167193326000014/
6. Criteo S.A. (2026). *Annual Report (Form 10-K) for fiscal year 2025* (retail media as agent; consented first-party data), filed 2026-02-26. https://www.sec.gov/Archives/edgar/data/1576427/000157642726000014/
7. Magnite, Inc. (2026). *Annual Report (Form 10-K) for fiscal year 2025* (CTV first-party, publisher-controlled identity), filed 2026-02-25. https://www.sec.gov/Archives/edgar/data/1595974/000159597426000007/
