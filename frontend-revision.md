# Constellation

## parameters

collocation parameters (*window size*, *context break*, *secondary*) should be separated from concordance parameters (sort by offset, sort order, primary). note that collocation parameters are always also considered in concordancing.

filter item (and filter discourseme) should be accessible via clicking. this should directly filter concordance lines and provide the option to start a "secondary" collocation analysis.

## concordance KWIC view

doesn't show MWUs as keywords, only first token

## concordance filtering and sorting

sorting doesn't work as expected [backend issue?]

## collocation items

after selecting a corpus and a focus discourseme, the frontend asks for collocation analyses via

    GET /mmda/constellation/<constellation_id>/description/<description_id>/collocation/
    
but then does not use

    GET /mmda/constellation/<constellation_id>/description/<description_id>/collocation/<id>/items

but

    GET /collocation/<id>/items
    
instead. this endpoint does return the same items, but no discourseme scores (or coordinates).

## discourseme visualisation

discourseme names should be visualised in the semantic map. the correct endpoint (see above) returns corresponding coordinates. when selecting a discourseme by clicking on it, their individual items should be displayed on the side.

## discourseme items

I think there's a general confusion between the items in the discourseme description (which are CQP queries, or p/surface pairs) and the items on the (unigram) breakdown -- which should be highlighted in the semantic map.

## semantic map interaction

moving items (and discoursemes) on the map should be possible.

filtering concordance lines via selecting an item or a discourseme should be possible via clicking (as above).

there should be the possibility to hide items that belong to the unigram breakdown of a discourseme (especially the focus discourseme).
