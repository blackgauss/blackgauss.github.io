---
layout: default
title: Who Pays the DSP — The Unit Economics of a Media Dollar
---

# Who Pays the DSP — The Unit Economics of a Media Dollar
*October 8, 2026*

Here is a ledger that should not balance the way it does. In fiscal 2025, one
demand-side platform transacted $13.39 billion of other people's advertising
money, recognized $2.896 billion as its own revenue, spent $619 million running
the machinery, and kept $443 million as net income [1]. It did this with 3,843
employees — $754 thousand of revenue and $3.48 million of media flowing per
head. The machine that turns spend into revenue is, on its face, a protocol:
receive a bid request, score it, answer in under a tenth of a second, bill.
Software that "just" buys ads does not obviously deserve a fifth of a
thirteen-billion-dollar river.

And yet the take is a fifth, it is measured rather than estimated, and it is
*shrinking* with scale. The interesting question is not whether the DSPs are
overpaid — the market has voted — but who the customers actually are, what
each one's dollar looks like once you decompose it, and why the arithmetic of
serving those customers lands hundreds of millions of dollars in the platform's
pocket instead of the publisher's or the agency's. I want to walk the whole
dollar: down the fee stack, through the two ledgers, into the customer
segments and the mechanics that make some of them nearly impossible to serve
profitably, and out the other side where the margin lives.

## The dollar, decomposed

The reason we can decompose the dollar at all is that one company is legally
obliged to publish both numerator and denominator. The Trade Desk's annual
report defines its own units in the same breath: "Gross spend measures the
amount of a client's spend on our platform for advertising inventory,
value-added services and data; plus the platform fee, which is generally based
on a percentage of a client's total spend on our platform" [1]. It even names
the ratio — its "take rate (revenue as a percentage of gross spend)" — and
flags out loud that it compresses with size, mix, and volume discounts [1].
Three fiscal years of the ratio, computed from the filings' own tables: 20.2%
in 2023 [10], 20.3% in 2024 and 21.6% in 2025 [1]. Call 20–22% the measured
ceiling of what an
independent can charge for full-stack buy-side software, data, and identity
when the buyers are sophisticated enough to audit the invoice.

Now the other side of the same income statement. Everything the platform spends
to run end-to-end — hosting for every query it answers, compute for the
scoring, purchased data, platform staff — is one expense line, and it came to
4.6% of gross spend (3.9% the year before). So per dollar of advertiser money:
roughly 21.6 cents is the fee, no more than 4.6 cents is the cost of *all the
technology and plumbing that earns the fee*, and 3.3 cents survives sales,
R&D, and overhead to become profit [1]. Sit with the middle number. The entire
stack — the value models, the pacing controllers, the landscape estimators, the
reconciliation jobs — competes inside a 4.6-cent envelope, about a fifth of the
take. Any per-auction refinement that costs more than a tenth of the fee is, at
that company's own disclosed ratio, structurally uncompetitive. The engineering
budget is a line item in the take, and the take is what the customer pays.

Where does the rest of the dollar go? The sell-side filings describe the flow
without giving the number — which is itself information. PubMatic states the
settlement mechanics outright: it invoices DSPs and "collect[s] the full
purchase price for the digital ad impressions they purchase, retain[s] our
fees, and remit[s] the balance to the publisher" [3]. Magnite confirms the fee
form ("typically a percentage of advertising spend that the publisher receives")
and, more usefully, its *direction*: the take is lower on guaranteed deals,
lower on connected TV, "higher for our managed service business" [2]. So the
exchange leg is a per-publisher, per-channel, per-deal percentage whose numeric
level nobody publishes. A DSP cannot hard-code its net-of-SSP economics; it has
to learn them per exchange, from invoices, the same way it learns a bid
landscape — every settlement file is an out-of-sample test of a learned
estimate.

One more fork before the customer enters, because it changes whose balance
sheet the media sits on. When the platform books *net* — acting as agent, as
The Trade Desk "generally" does and Criteo does for its retail-media line —
the media is a pass-through memo quantity and revenue is fee alone [1, 4].
When it books *gross* — insertion-order and managed-service campaigns, part of
Criteo's performance business — the full spend lands in revenue and traffic
acquisition in cost of revenue: Criteo's FY2025 income statement carried $770
million of purchased impressions against $1.945 billion of revenue, 39.6 cents
of every revenue dollar spent on media it fronts [4]. Gross booking means
fronting. And fronting is a *float*: the platform pays exchanges on net-30/45
terms and collects from advertisers on net-60/90, so working capital grows with
spend and the failure mode of a fast-growing DSP is a credit event, not a bug.
This is why pacing — which looks like an algorithms problem — is financially a
credit control: the tolerated budget overshoot of one or two percent is not an
engineering tolerance, it is the size of the credit note the platform is
willing to write itself.

## Who the customers are, cut properly

"Who are the DSP's customers" is usually answered with demographics:
mid-market e-commerce, agencies, DTC brands, verticals, spend bands. The
segmentation literature itself is a long warning that demographics are not
segmentation: Smith (1956) framed segmenting the market and differentiating the
product as the two real strategies, and Dickson (1987) made the distinction
that survives — segmentation *terms* (who the buyer is) are at best proxies for
segmentation *bases* (what the buyer needs), and a segment is only defensible
if the firm's actual programs respond to it differently [6, 7]. In this market
the base is unusually legible, because what a DSP sells is a *solution
procedure*: it converts the advertiser's campaign into an optimization —
maximize attributed value subject to a budget, a cost-per-action target,
frequency caps, delivery floors — and keeps that problem's shadow prices
current at machine rate. So cut customers by what actually binds inside their
problem, and by the three numbers that decide whether a learning system can
promise them anything at all: the conversion *base rate*, the *delay law* (how
long after the click the label arrives), and the *coverage* of the credit
pipeline that carries labels home.

On those axes the customer base separates into something like eight kinds, and
I'll name the load-bearing ones.

**Commerce performance / retargeting** runs a budget plus a target cost per
acquisition or return on ad spend; its base rate is mid-band; its labels come
home on the campaign's own rails (postbacks, retailer feeds) with a long delay
tail. This is the segment one vendor's filings literally price: retail-commerce
advertisers are 75% of Criteo's performance-media buyers placing impressions
[4]. It is also the segment whose problem is best-posed *earliest* in a new
platform's life, because retargeting brings its own features — the visitor's
cart is the feature store — so labels and inputs travel together. The catch:
the best commerce labels live where the checkout is, which is why this
segment's growth keeps flowing toward retail media — the same filing pair
Criteo's flat-to-slightly-down performance line against a retail-media line at
$264 million that is real but barely growing [4].

**Direct-response lead-gen** — finance, insurance, home services — runs one
number: a target CPA, and almost nothing else. Its labels are fast and sparse.
The delay laws deserve to be quoted side by side, because they are the single
most consequential measured numbers in this business, and they disagree in the
way that turns out to be informative rather than contradictory. On Criteo's
retargeting logs, about 50% of conversions arrive within 24 hours of the click
and 13% land after two weeks, inside a 30-day window [5]. On Yahoo's RMX
exchange, CPA/broker-led direct-response traffic converts 86.7% within ten
minutes, 95.5% within an hour, 98.5% within two days [8]. Both are
measurements of record; neither generalizes. The delay law is a parameter of
the advertiser's *category*, not of the medium — and it is what determines how
fast the cost-per-action controller can close its loop. An advertiser whose
conversions arrive inside an hour puts a platform's CPA loop on a feedback path
measured in hours; one whose conversions trickle in over two weeks puts the
same loop on a calendar credit. Same spend, different physics. Which is also a
quiet warning about dashboards: a conversion rate printed before its window
closes is a censoring artifact. Extend the window from seven days to thirty and
CVR "doubles" with no change in a single bid [5].

**Brand / reach** buyers declare budgets and delivery floors, not return
targets, because the credited action is a modeling choice with no natural
label — viewability thresholds (the "half the pixels, one second, two for
video" measurement-council lineage) stand in for value, and every
practitioner who has looked knows these are proxies wearing a base's clothes.

**Regulated verticals** (pharma, financial services) are a shape rather than an
industry: their spend is gated by creative compliance, consent predicates, and
brand-safety-by-construction. What defends a platform serving them is the
compliance surface — which is labor, not compute, and survives at any request
volume.

Then the long tail: **retail-media sellers** (best labels in the market, but
leased, readable only through someone else's clean room); **political** (hard
date horizon, no return target); **B2B long-cycle** (sparse and slow — the
worst label quadrant, where the honest systems say "we cannot learn from your
data" rather than pretending); and **local / long-tail self-serve**, whose
existence is not folklore — the live proof is a pricing page with a
credit-card, no-minimum entry tier at "40,000 brands" of claimed scale [13].
For that last tier the arithmetic of service forces the product: support cost
per account must go to zero or the tier's economics die, which is exactly why
its entry level is card-in, academy, and no humans.

## Matching customers to platforms, and why the fit is mechanical

Now the supply side, priced by the same disclosures. A hyperscaler's DSP is not
a better DSP; it is a channel with a bidding bolt welded to an inventory
monopoly. Alphabet sells "through Google Ads, Google Ad Manager, Google Display
& Video 360" — with no separate line item anywhere in its 10-K; advertising is
a revenue category of $294.7 billion, not a business you can see the margin of
[11]. Amazon's ad revenue ($68.6 billion in FY2025) is not even a reportable
segment [12]. The garden's cut stays inside the price, its measurement is
seller-reported, and its inventory may be sold "exclusively... directly to
advertisers, which prevents us from competing with them entirely," as The Trade
Desk's competition section puts it [1]. Everything below the garden rents
either its supply or its signal — often both.

The independent full-stack platform is a product-led machine: one architecture,
self-serve after contracting, $3.48 million of gross spend per employee [1].
That per-head number is the *service-envelope law* for the whole industry:
anyone offering less automation than that has to create advertiser value
inside a smaller envelope per human, or they are structurally outpriced. The
mid-market independents run the same logic with thinner absolute cost — Viant:
$344 million of revenue, up 19%, on roughly 380 people [9] — and their
filings read like survival doctrine: "patented identity resolution
capabilities," a jab at "legacy competitors still reliant on cookie-based
technology," and consolidation named as a market mechanism in the competition
section itself [9]. Retail media runs rails, not open auctions: closed
auction, checkout truth, asynchronous APIs. And boutiques survive in four
shapes only: vertical compliance, channel depth, white-label rails inside
someone else's workflow, or being first to plumb a new surface.

Match demand to supply and you get a grid whose cells have mechanisms in them.
Commerce advertisers fit gardens and rails — labels live at the checkout — and
are structurally contested everywhere else. Lead-gen, with a single
constraint, hour-fast labels, and open-web supply, has the best-posed problem
in the whole table and is nobody's home turf: the garden's sales gate orphans
budgets below its service economics; the full-stack platform's design center is
multi-advertiser agency workflow; the commerce-conditioned giant is 75% retail
by construction. That empty cell is the most interesting fact in the matrix,
and it is exactly the kind of cell that persists for years because the
incumbents' *organization*, not their algorithms, is pointed elsewhere. The
long tail fits self-serve SaaS on price, and the anti-cells are just as
mechanical: a boutique serving CTV brand buyers is bidding on a second
product's creative pipeline; a boutique serving sub-self-serve micro-budgets is
picking a support war with a cost structure built for forty thousand accounts.

## Where the hundreds of millions come from

Assemble the pieces and the profit stops being mysterious and starts being
arithmetic with four legs.

**One: the toll is the price of a solved constraint problem.** Sum the
platform's optimality condition — bid iff value exceeds the shadow price of the
constraints — over a campaign and you get the business identity everyone in
performance marketing already recites in different clothes: the maximum payable
per acquisition is margin × lifetime value × the *incremental* share of the
credited conversions. The last factor is the knife. A $100 order at 30% margin
is worth $30 before fulfillment, and a "3.3× ROAS" on revenue is a zero on
margin. A first purchase is worth its expected repurchase stream only net of
the organic stream the ad merely *claimed* — and the one clean measurement of
that wedge we have, a large field experiment on eBay's paid search, found
paid-credited revenue running roughly fifteen to twenty times the *incremental*
revenue for searcher segments already near purchase [14]. The DSP's job, priced
daily, is to keep a thousand of these inequalities — per audience class, per
hour, under a budget — satisfied simultaneously, at the rate the market moves.
Trading desks used to solve it with headcount; the platform solves it with a
dual variable and a control loop. Twenty-one cents on the dollar is the price
of replacing that labor, and it is holding — with the managed-service tier
still pricing *above* the platform baseline on the sell side's own disclosure
[2], which tells you service pricing survives wherever humans still touch the
invoice.

**Two: the cost curve is the moat.** If the whole technology envelope is 4.6
cents of spend, then sophistication amortizes: the fixed-cost platform gets
cheaper per auction as spend grows, while the alternative — desk labor — is
strictly linear. At $3.48 million of media per employee, the platform's
marginal human cost per auction is a rounding error; that gap, multiplied
across billions of auctions, is the operating leverage the market is actually
valuing. There is a shadow side, and the filing states it as a risk factor
almost verbatim: growth in spend "may outpace growth in our revenue" via
pricing competition and volume discounts [1] — take-rate compression is a named
corporate risk, not a prediction. But the direction of that compression is
itself instructive: discounts are how a platform buys *more gross spend*, which
is the numerator of every other ratio. Growth in spend is the strategy; the
take is a lever.

**Three: the float and the concentration.** Because the DSP collects before it
remits (or fronts before it collects, in gross mode), the ledger is a bank:
receivables book on one side, payables on the other, and the pacing throttle is
the underwriting. Concentration risk in that book is not hypothetical — the
sell side discloses the shape for us: Magnite reports that in 2025 "two buyers
of advertising inventory... indirectly contributed to approximately 44% of
revenue" [2]. When two names are half of a marketplace's revenue, the
"interchangeable open exchange" is doing some rhetorical work, and every
independent's contracts know it.

**Four: measurement asymmetry.** Finally, the platform keeps the margin that
lies between *billed* and *proven*, and the industry as a whole keeps rather
more. The ANA's 2023 transparency study — 21 marketers, $123 million of spend,
35.5 billion impressions tracked end to end — concluded that something like 36
cents of a programmatic dollar reliably reaches a consumer, and claimed some
$20 billion reallocatable [15]. A DSP's own leakage — the invalid-traffic
credits, the reconciliation deltas between its win logs and the exchanges'
invoices — is a rounding error beside that structural gap, which is why the
mature players increasingly sell *auditability itself*: provenance-tagged
prices, append-only ledgers, supply-chain disclosures. Turning a substrate
deficit into a governance product, in the case of the platform that couldn't
own an identity graph.

So: who pays, and why hundreds of millions? The payers are advertisers whose
campaigns are constraint problems that bind in software-shaped ways — commerce
buyers with fast labels at the checkout, lead-gen buyers with one number and
hour-class conversions, regulated verticals whose gates are their budgets'
gates — plus the agencies standing between, whose own margin rides on top of
the platform's. They pay because the alternative is labor, and labor prices the
wrong way against $3.48 million of media per head. The DSP keeps its fee
because shadow prices at machine cost are the cheapest constraint-solver ever
built, its costs amortize into 4.6 cents, and the customer's own value test
clears a 22% toll before counting a cent of publisher cost or fraud. The
hundreds of millions are what's left when a thousand small control loops run at
the speed of the auction instead of the speed of a weekly meeting — minus the
float, minus the disputes, minus the risk that the next commoditized layer of
this stack leaves another competitor in the posture Viant's filing describes:
reliant on the substrate they failed to hedge, consolidating.

## References

1. The Trade Desk, Inc. (2026). *Annual Report (Form 10-K) for fiscal year 2025*, filed 2026-02-27. https://www.sec.gov/Archives/edgar/data/1671933/000167193326000014/
2. Magnite, Inc. (2026). *Annual Report (Form 10-K) for fiscal year 2025*, filed 2026-02-25. https://www.sec.gov/Archives/edgar/data/1595974/000159597426000007/
3. PubMatic, Inc. (2026). *Annual Report (Form 10-K) for fiscal year 2025*, filed 2026-02-26. https://www.sec.gov/Archives/edgar/data/1422930/000142293026000010/
4. Criteo S.A. (2026). *Annual Report (Form 10-K) for fiscal year 2025*, filed 2026-02-26. https://www.sec.gov/Archives/edgar/data/1576427/000157642726000014/
5. Chapelle, O. (2014). "Modeling Delayed Feedback in Display Advertising." *KDD*. doi:10.1145/2623330.2623634
6. Smith, A. N. (1956). "Product Differentiation and Market Segmentation as Alternative Marketing Strategies." *Journal of Marketing* 21(1). doi:10.1177/002224295602100102
7. Dickson, P. R. (1987). "Market Segmentation, Product Differentiation, and Marketing Strategy." *Journal of Marketing* 51(2). doi:10.1177/002224298705100201
8. Rosales, R., Cheng, H. & Manavoglu, E. (2012). "Post-click Conversion Modeling and Analysis for Non-guaranteed Delivery Display Advertising." *WSDM*. doi:10.1145/2124295.2124333
9. Viant Technology Inc. (2026). *Annual Report (Form 10-K) for fiscal year 2025*, filed 2026-03-11. https://www.sec.gov/Archives/edgar/data/1828791/000182879126000019/
10. The Trade Desk, Inc. (2025). *Annual Report (Form 10-K) for fiscal year 2024*, filed 2025-02-21. https://www.sec.gov/Archives/edgar/data/1671933/000167193325000029/
11. Alphabet Inc. (2026). *Annual Report (Form 10-K) for fiscal year 2025*, filed 2026-02-05. https://www.sec.gov/Archives/edgar/data/1652044/000165204426000018/
12. Amazon.com, Inc. (2026). *Annual Report (Form 10-K) for fiscal year 2025*, filed 2026-02-06. https://www.sec.gov/Archives/edgar/data/1018724/000101872426000004/
13. StackAdapt. Plans and packages (accessed 2026-10-08). https://www.stackadapt.com/plans-and-packages
14. Blake, T., Nosko, C. & Tadelis, S. (2015). "Consumer Heterogeneity and Paid Search Effectiveness: A Large-Scale Field Experiment." *Econometrica* 83(1). doi:10.3982/ECTA12423
15. Association of National Advertisers (2023). *Programmatic Media Supply Chain Transparency Study*, December 2023. https://www.ana.net/miccontent/show/id/rr-2023-12-ana-programmatic-media-supply-chain-transparency-study
