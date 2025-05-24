# Guia de Utilização - Caixa Multipark com Supabase

## Introdução

Este guia explica como utilizar a nova versão da aplicação Caixa Multipark que agora está integrada com o Supabase para armazenamento de dados na cloud. A interface e o fluxo de trabalho permanecem semelhantes à versão anterior, mas com a vantagem de armazenamento persistente dos dados.

## Acesso à Aplicação

A aplicação está disponível online através do seguinte URL:
- **URL da Aplicação**: [https://caixa-multipark.vercel.app](https://caixa-multipark.vercel.app)

## Fluxo de Trabalho

### 1. Importação de Ficheiros

A importação de ficheiros segue o mesmo processo da versão anterior, mas agora os dados são armazenados no Supabase:

1. Aceda ao separador "Importação"
2. Importe primeiro os ficheiros 'sales orders' e 'entregas':
   - Arraste e solte os ficheiros nas áreas designadas ou clique para selecionar
   - Clique no botão "Processar Arquivos"
3. Depois, importe o ficheiro 'caixa':
   - Arraste e solte o ficheiro na área designada ou clique para selecionar
   - Clique no botão "Processar Arquivos"

**Nota importante**: Pode importar vários ficheiros 'caixa' ao longo do dia, conforme necessário.

### 2. Comparação

Após importar os ficheiros 'sales orders' e 'entregas', a aplicação realiza automaticamente a comparação:

1. Aceda ao separador "Comparação"
2. Visualize os resultados da comparação:
   - Registos válidos
   - Registos com inconsistências
   - Registos ausentes
3. Utilize os botões de filtro para visualizar diferentes tipos de registos
4. Para resolver inconsistências:
   - Clique no botão "Resolver" ao lado do registo
   - Escolha a fonte de dados preferida ou insira dados manualmente
   - Clique em "Salvar"

### 3. Validação de Caixa

Após importar o ficheiro 'caixa', pode validar os registos:

1. Aceda ao separador "Validação"
2. Selecione um condutor no menu dropdown
3. Visualize as entregas associadas ao condutor
4. Para validar uma entrega:
   - Clique no botão "Validar" ao lado da entrega
   - Verifique ou ajuste o método de pagamento e o preço
   - Adicione notas se necessário
   - Clique em "Validar"

### 4. Dashboard

O dashboard apresenta uma visão geral dos dados importados:

1. Aceda ao separador "Dashboard"
2. Visualize estatísticas:
   - Total de registos em cada ficheiro
   - Totais por método de pagamento (Cash, Cartão, Online, No Pay)
   - Total de inconsistências
   - Breakdown por parque

### 5. Exportação

Para exportar os dados processados:

1. Aceda ao separador "Exportação"
2. Visualize os registos a serem exportados
3. Clique no botão "Exportar para Excel"
4. O ficheiro será gerado e transferido automaticamente

## Vantagens da Versão Cloud

Esta nova versão com Supabase oferece várias vantagens:

1. **Persistência de dados**: Os dados permanecem armazenados mesmo após fechar o navegador
2. **Acesso de qualquer lugar**: Aceda à aplicação e aos dados de qualquer dispositivo
3. **Colaboração**: Múltiplos utilizadores podem trabalhar com os mesmos dados
4. **Segurança**: Dados protegidos por políticas de segurança do Supabase
5. **Histórico**: Mantém histórico de todas as importações e exportações

## Suporte

Em caso de dúvidas ou problemas, contacte o administrador do sistema.
