# Subcorpora from s-atts via cwb-make-subcorpus

- here: GermaParl220Web 
- create GermaParl LP19+20

```
cwb-make-subcorpus \
    -r registry \
    GERMAPARL220WEB \
    GERMAPARL220WEB_LP19_20 \
    corpora/germaparl220web_lp19_20 \
    '(<text_lp = "c_19"> | <text_lp = "c_20">) [] expand to text;'
```

# Subcorpora from s-atts via cwb-cads REST API

- here: GermaParl220Web with following relevant meta data
```
corpus_id = 1
level = text
key = year
value_type = unicode
values = ["c_2022", "c_2023"]
```

- correspondung example cURL for GermaParl220Web:
```
curl -X 'POST' \
  'http://127.0.0.1:5000/corpus/4/subcorpus/' \
  -H 'accept: application/json' \
  -H 'Authorization: Bearer XXX' \
  -H 'Content-Type: application/json' \
  -d '{
  "bins_unicode": [
     "c_2000", "c_2001", "c_2002"
  ],
  "create_nqr": true,
  "description": "string",
  "key": "year",
  "level": "text",
  "name": "test",
  "subcorpus_id": null
}'
```

- actual data
```
{
  "bins_unicode": ["c_2000", "c_2001", "c_2002"],
  "create_nqr": true,
  "key": "year",
  "level": "text",
  "name": "2000-2002",
  "subcorpus_id": null
}

{
  "bins_unicode": ["c_2003", "c_2004", "c_2005"],
  "create_nqr": true,
  "key": "year",
  "level": "text",
  "name": "2003-2005",
  "subcorpus_id": null
}

{
  "bins_unicode": ["c_2006", "c_2007", "c_2008"],
  "create_nqr": true,
  "key": "year",
  "level": "text",
  "name": "2006-2008",
  "subcorpus_id": null
}


{
  "bins_unicode": ["c_2009", "c_2010", "c_2011"],
  "create_nqr": true,
  "key": "year",
  "level": "text",
  "name": "2009-2011",
  "subcorpus_id": null
}


{
  "bins_unicode": ["c_2012", "c_2013", "c_2014"],
  "create_nqr": true,
  "key": "year",
  "level": "text",
  "name": "2012-2014",
  "subcorpus_id": null
}

{
  "bins_unicode": ["c_2015", "c_2016", "c_2017"],
  "create_nqr": true,
  "key": "year",
  "level": "text",
  "name": "2015-2017",
  "subcorpus_id": null
}


{
  "bins_unicode": ["c_2018", "c_2019", "c_2020", "c_2021"],
  "create_nqr": true,
  "key": "year",
  "level": "text",
  "name": "2018-2021",
  "subcorpus_id": null
}

{
  "bins_unicode": ["c_2022", "c_2023", "c_2024"],
  "create_nqr": true,
  "key": "year",
  "level": "text",
  "name": "2022-2024",
  "subcorpus_id": null
}
```
