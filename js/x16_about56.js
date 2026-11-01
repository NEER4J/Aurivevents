/* ===== x16_about56.js ===== */
/* v5.6 LAYER 16 — feature map, changelog and assumptions for the v5.6 additions */
FEATURE_MAP.push(['14 · v5.6 — review fixes, next-quote learning, cash handling',[
 ['Door sales create a ticket sale (review defect 1)','real','Adding a delegate on a paid class creates a pending or paid sale; cash/UPI at the desk recorded with a voucher; complimentary needs a reason. Invariant: sold = active delegates; every paid-class delegate has a sale','Delegates & ticketing'],
 ['Retention is a control (review defect 2)','real','Retention held on a delivery is subtracted from what is payable; paying beyond it needs a written reason, is audited and shows as an exception; release with a reason','Vendors'],
 ['Allocation mismatch is an exception (review defect 3)','real','An agreement whose scope-line split does not add up is never patched: the gap is counted as unallocated in the forecast, flagged on the Scope tab and in Exceptions, blocks the work order, and is placed with a reason','Scope & forecast'],
 ['Vendor reliability beside the quote','real','Acknowledgement speed, on-time deliveries, bill overrun, disputes, rehire answers and GSTIN status shown on every RFQ row and under the vendor picker','Vendors / RFQs'],
 ['Hire again? at close-out','real','One yes/no with a reason per vendor per event; the last "no" reads out beside their next quote','Close-out'],
 ['Where the margin went','real','Close-out table: each scope line quoted vs bought with the vendor named, crew planned vs actual with overtime days, changes priced below cost','Close-out'],
 ['Next-quote proposals','real','Lines 5%+ off become proposals; the owner approves or declines each; approval writes a dated price-book entry (or the template crew rate), never overwrites; declined ones stay listed','Next quote'],
 ['Cash book & vouchers','real','All cash receipts and cash payments from anywhere in the app, with numbered vouchers (PDF), bank deposits/withdrawals, running balance; negative balance is an exception','Cash book'],
 ['Section 269ST warning','real','Cash received for one event at or above the limit: warning with acknowledgement, flagged on the receipt and in Exceptions. Recorded in full either way','Client money'],
 ['Section 40A(3) warning','real','Cash paid to one vendor above the daily limit: warning with acknowledgement, flagged. Recorded in full either way','Vendors'],
 ['Unregistered vendors','real','No GSTIN: quotes normalised without a tax line, "no input credit" on the agreement, cash flags apply; reverse charge left to the CA','Vendors'],
 ['Limits as settings','real','269ST / 40A(3) limits, voucher prefix and opening cash on the company; marked verify with CA','Settings']
]]);
CHANGELOG.unshift(['v5.6 (this build)','Fixes-only plus two refinements. The three v5.5 review defects (door sales off the books, retention ignored by payments, silent allocation patch) repaired and tested. Vendor reliability on RFQ rows and the vendor picker; hire-again at close-out. Close-out explains lost margin and proposes price-book changes for owner approval. Cash handling: cash book, vouchers, 269ST and 40A(3) warnings, unregistered-vendor consequences. Nothing is kept off the books; no module added. Storage key moved to v56; v5.5 backups migrate.']);
ASSUMPTIONS.push('Cash limits default to ₹2,00,000 (269ST, per event per payer) and ₹10,000 (40A(3), per vendor per day) as understood at build time; they are settings, marked verify with CA, and warnings only — money received or paid is always recorded.');
ASSUMPTIONS.push('Rate proposals use a 5% threshold between quoted and bought unit cost. One event is weak evidence; the owner decides.');
ASSUMPTIONS.push('Vendor "acks in" is the average time from order sent to vendor acknowledgement over acknowledged orders; "on time" means no delivery line marked late.');
ASSUMPTIONS.push('Reverse-charge GST on unregistered vendors is not computed; the app says so and leaves it to the CA.');
const _vBuild55=vBuild;vBuild=function(){return _vBuild55().replace('v5.5 is the complete reference product.','v5.6 is the v5.5 reference product with the review defects fixed, next-quote learning and cash handling added — and nothing else.').replace('across 13 sections','across 14 sections')};

