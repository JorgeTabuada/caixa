# Caixa Multipark com Integração Supabase

Esta versão da aplicação Caixa Multipark inclui integração com o Supabase para armazenamento de dados na cloud, mantendo toda a funcionalidade original da versão v4.

## Funcionalidades Adicionadas

- **Armazenamento na Cloud**: Os dados validados são automaticamente enviados para o Supabase após o encerramento da caixa
- **Carregamento de Dados**: Ao abrir o dashboard, a aplicação verifica se existem dados no Supabase e oferece a opção de carregá-los
- **Exportação Manual**: Novo botão na secção de exportação para enviar dados manualmente para o Supabase

## Pontos de Integração

A integração foi feita de forma não intrusiva, mantendo todo o fluxo original de processamento e validação:

1. **validator.js**: Após encerramento da caixa, os dados validados são enviados para o Supabase
2. **dashboard.js**: Ao iniciar, verifica se existem dados no Supabase e oferece a opção de carregá-los
3. **exporter.js**: Adicionado botão para exportação manual para o Supabase

## Configuração

Para utilizar a integração com o Supabase:

1. Certifique-se de que o ficheiro `supabase.js` está configurado com as credenciais corretas:
   - `SUPABASE_URL`: URL do seu projeto Supabase
   - `SUPABASE_ANON_KEY`: Chave anónima do seu projeto Supabase

2. Verifique se a tabela `deliveries` existe no seu projeto Supabase com os campos necessários para armazenar os dados das entregas.

## Estrutura do Projeto

- **index.html**: Página principal com interface de utilizador
- **js/supabase.js**: Configuração e funções de integração com o Supabase
- **js/validator.js**: Validação de caixa com integração Supabase no encerramento
- **js/dashboard.js**: Dashboard com verificação de dados no Supabase
- **js/exporter.js**: Exportação para Excel e Supabase

## Notas Importantes

- A integração foi feita sem alterar o fluxo original de processamento e validação
- Os dados são enviados para o Supabase apenas após validação completa
- A aplicação continua a funcionar mesmo sem conexão com o Supabase
