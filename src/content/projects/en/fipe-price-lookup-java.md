---
title: FIPE Price Lookup
tagline: Command-line app that looks up Brazilian FIPE vehicle prices for every model year at once and saves each search to JSON.
problem: The FIPE website shows the average price of a car, motorcycle or truck one model year at a time.
decisions:
  - Requests to the public FIPE API are chained with Java's HttpClient, one per step, from brands to models, available years and the price of each year.
  - Jackson deserializes the responses into records, and the Streams API filters models by part of their name.
  - Each search is written to a timestamped JSON file, keeping a history of previous lookups.
result: Every model year in a single search. Built for an Alura challenge; the implementation, including the JSON export, is my own.
---
