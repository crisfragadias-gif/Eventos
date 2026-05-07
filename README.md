# Painel de Eventos

Painel web estatico para consultar os eventos da planilha `eventos teste.xlsx`.

## 1. Como atualizar a planilha

1. Abra o arquivo `eventos teste.xlsx`.
2. Edite ou adicione eventos nas abas anuais, como `2026`, `2025`, `2024` etc.
3. Salve a planilha mantendo o mesmo nome e local:

```text
C:\kiti\eventos\eventos teste.xlsx
```

## 2. Como regenerar os dados do painel

Depois de salvar a planilha, execute este comando na pasta do projeto:

```powershell
python scripts\update-data.py
```

O script le a planilha original e atualiza:

```text
data\eventos-data.js
```

Se o Python nao encontrar a biblioteca `openpyxl`, instale uma vez:

```powershell
pip install openpyxl
```

Tambem e possivel informar outro arquivo de entrada ou saida:

```powershell
python scripts\update-data.py --source "eventos teste.xlsx" --output "data\eventos-data.js"
```

## 3. Como abrir o painel atualizado

Depois de regenerar os dados, abra este arquivo no navegador:

```text
C:\kiti\eventos\index.html
```

Se o painel ja estiver aberto, atualize a pagina do navegador para carregar os novos dados.

## Observacoes

- Nao ha backend, banco de dados, login, API, OAuth ou automacao.
- O painel usa HTML, CSS e JavaScript simples.
- A exportacao `.ics` e gerada no navegador com base nos eventos filtrados.
