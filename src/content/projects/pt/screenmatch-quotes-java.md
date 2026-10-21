---
title: ScreenMatch Quotes
tagline: API REST em Spring Boot que serve frases aleatórias de filmes e séries do PostgreSQL para um front-end em HTML/CSS/JavaScript.
problem: Servir uma frase aleatória por requisição para um front-end separado, sem carregar a tabela inteira na memória.
decisions:
  - Uma consulta nativa com ORDER BY RANDOM() LIMIT 1 deixa o banco escolher a linha, em vez da aplicação.
  - A entidade é convertida num record DTO, então a API devolve exatamente os campos que o front-end espera.
  - O CORS fica habilitado no controller porque a página é servida de uma origem diferente da API.
result: API e front-end funcionando, feitos para um desafio da Alura. O template em HTML/CSS/JavaScript foi fornecido; a API é implementação minha.
---
