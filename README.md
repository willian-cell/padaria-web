# padaria-web
(front-end)

Front-end + “JSON Server” grátis (mais próximo de um banco de verdade)

Front-end em HTML/JS.

Um backend leve que persiste tudo num db.json.

Vantagem: dados centralizados e acessíveis de qualquer lugar com login (se você adicionar depois).

Limitação: precisa hospedar 2 coisas (site + API), mas dá para fazer gratuito.

2) Modelagem do “banco JSON” (o que você deve registrar)

Para contabilidade e praticidade, você precisa separar Cadastros (produtos, categorias, fornecedores) de Movimentações (entradas/saídas).

2.1 Produtos (cadastro)

Campos úteis:

id (UUID)

nome (ex: “Pão Francês”)

categoria (ex: “Panificação”, “Confeitaria”, “Bebidas”)

unidade (un, kg, g, cx, pct)

custo_unit (custo médio atual)

preco_venda (padrão)

estoque_min (alerta)

codigo_barras (opcional)

ativo (true/false)

2.2 Movimentações (entrada e saída)

Campos essenciais para auditoria:

id (UUID)

tipo (“ENTRADA”, “SAIDA”, “AJUSTE”, “PERDA”)

data_hora (ISO string)

produto_id

produto_nome_snapshot (para não quebrar histórico se renomear o produto)

quantidade

valor_unit (custo na entrada, preço na saída)

desconto (opcional)

imposto (opcional)

observacao

origem (ex: “Fornecedor X”, “Venda
balcão”, “iFood”, “Quebra/Perda”)

usuario (opcional, se tiver login depois)

2.3 Regras contábeis mínimas (para relatórios)

Entrada: soma no estoque e registra custo.

Saída: baixa do estoque e registra receita.

Perda: baixa do estoque e registra como despesa/perda.

Ajuste: correção de inventário.

2.4 Totais e médias que você pediu

Com esse modelo, você calcula:

Total de entradas no período (quantidade e R$)

Total de saídas no período (quantidade e R$)

Lucro bruto estimado (saídas – custo médio das unidades vendidas)

Média por dia: total_saidas / nº dias do período

Média por mês: total_saidas / nº meses do período

Filtros:por data (início/fim)

por nome do produto

por categoria

por tipo (entrada/saída/perda)

por origem/canal


