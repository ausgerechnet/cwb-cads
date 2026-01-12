# intro
- cwb-cads is a standalone Flask server that provides REST API integrating both MMDA and Spheroscope functionality
- but Spheroscope part is a complete reimplementation and doesn't include previous functionality (such as comparing query results against previous version)
- implementing SpheroscopeX as a self-contained tool with its own GUI is unrealistic (within the remaining lifetime of RC21), especially because this would have to include a complete FlexiConc front-end with concordance visualisation, forms for algorithms and parameters, and management of the analysis tree (as implemented in CLiC)
- decision: implement SpheroscopeX as a Jupyter notebook with user-friendly client library for cwb-cads REST API, extended concordance displays (suitable for query diffs), and some dashboard-like functionality so that complete analysis tree can be regenerated for new diff after modifying query (and multiple concordance views are displayed)
- fits well into our recent RC21 strategy to highlight Jupyter notebook integration as one of the strengths of the FlexiConc approach

# tasks & responsibilities
- [x] implement query diff functionality in cwb-cads (ideally between current and stored results for same query) ➞ PH
- [ ] make sure that history/versioning for queries, macros, and wordlists works as needed and that query results can be stored manually (as point of reference against which  further modifications of query are compared), or use versioning so that old and new version are stored as two separate queries ➞ TW
- [ ] provide Python client library for (Spheroscope functionality of) cwb-cads, with function to retrieve query results and query diff with selected positional and structural annotation (in a format suitable for import into FlexiConc) ➞ TW
- [ ] implement FlexiConc connector for such query results/diffs (e.g. converting slots and the match span to multiple focus spans) ➞ AP
- [ ] improve FlexiConc concordance visualisation in Jupyter so that differences between matching spans and all slots are highlighted ➞ AP, with help from TW
- [ ] implement workflows or dashboards for Jupyter notebook so that different concordance views are updated automatically after editing a query ➞ TW, AP
- [ ] implement new and/or specialised FlexiConc algorithms for working with query diffs ➞ AP

# how a **query diff** should work
- compare any two versions of the same abstract query (i.e. two individual query objects) ⇒ generates unified concordance where lines are marked according to whether they were found by A, B or A+B
- two matches are considered the same if they overlap (with option to focus on one particular slot); if a match from A overlaps with multiple matches from B, the one with the largest proportion of overlap is chosen (and vice versa)
- each line in the unified concordance has a metadata variable with values A, B, AB
- individual slots are passed to FlexiConc as focus spans; for matches found by both queries, spans are taken from the newer version (A)
- in addition, slots are marked by token-level annotation, using one positional attribute for each slot (could be called slot1, slot2, …) as well as the match span itself; each token is marked AB if it belongs to the slot for both queries, A if it belongs to the slot only for query A, B if only for query B, and O if it doesn't belong to the slot for either query ⇒ allows FlexiConc to work with changes in the slots in a reasonable way
- for consistency, slot-marking annotation is also included for matches only found by one of the queries (i.e. lines with label A or B); in these cases, the slot annotation only uses tags A, O or B, O, respectively
