---
title: Consulta de Preços FIPE
tagline: Aplicação de linha de comando que consulta os preços FIPE de todos os anos de um modelo de uma vez e salva cada busca em JSON.
problem: O site da FIPE mostra o preço médio de um carro, moto ou caminhão um ano de modelo por vez.
decisions:
  - As requisições à API pública da FIPE são encadeadas com o HttpClient do Java, uma por etapa, das marcas aos modelos, anos disponíveis e preço de cada ano.
  - O Jackson converte as respostas em records, e a Streams API filtra os modelos por parte do nome.
  - Cada busca é gravada num arquivo JSON com data e hora, mantendo o histórico das consultas anteriores.
result: Todos os anos do modelo numa única busca. Feito para um desafio da Alura; a implementação, incluindo a exportação em JSON, é minha.
---
