---
title: ScreenMatch Quotes
tagline: Spring Boot REST API that serves random movie and TV show quotes from PostgreSQL to an HTML/CSS/JavaScript front end.
problem: Serve one random quote per request to a separate front end, without loading the whole table into memory.
decisions:
  - A native query with ORDER BY RANDOM() LIMIT 1 lets the database pick the row instead of the application.
  - The entity is mapped to a DTO record, so the API returns exactly the fields the front end expects.
  - CORS is enabled on the controller because the page is served from a different origin than the API.
result: A working API and front end built for an Alura challenge. The HTML/CSS/JavaScript template was provided; the API is my own implementation.
---
