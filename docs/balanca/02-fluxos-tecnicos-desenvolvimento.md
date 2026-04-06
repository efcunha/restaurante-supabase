# 02 - Fluxos tecnicos de desenvolvimento

## 1. Fluxo principal (happy path)

1. Operador seleciona produto pesavel.
2. Tela abre componente de pesagem.
3. Hook inicia polling no bridge.
4. Bridge retorna leitura com estavel=true.
5. Operador confirma peso.
6. Sistema calcula valor total.
7. Item e adicionado ao pedido com peso_kg.

## 2. Fluxo de leitura instavel

1. Bridge retorna estavel=false.
2. UI destaca instabilidade.
3. Botao confirmar permanece desabilitado.
4. Polling continua ate leitura estavel ou timeout.

## 3. Fluxo de timeout para leitura estavel

1. Operador solicita leitura estavel.
2. Endpoint de leitura estavel estoura timeout.
3. Cliente recebe retorno controlado.
4. UI exibe orientacao de nova tentativa.
5. Operador pode reconsultar sem fechar o fluxo.

## 4. Fluxo de indisponibilidade do bridge

1. Cliente tenta consultar peso.
2. Bridge indisponivel ou serial fechada.
3. Cliente exibe erro recuperavel.
4. Sistema preserva contexto do pedido.
5. Operador pode usar fallback manual.

## 5. Fluxo de reconexao automatica

1. Porta serial desconecta durante operacao.
2. Bridge registra erro e inicia janela de reconexao.
3. Nova tentativa apos 3 segundos.
4. Ao restabelecer, estado volta para ready/reading.
5. Cliente recupera leitura sem reiniciar sessao.

## 6. Fluxo de tara

1. Operador aciona comando tara.
2. Bridge envia comando para balanca.
3. Leitura volta para zero.
4. UI reflete novo estado.

## 7. Fluxo de encerramento

1. Operador confirma peso ou cancela pesagem.
2. Tela fecha modal/drawer.
3. Polling e interrompido imediatamente.
4. Recursos do hook sao limpos no unmount.

## 8. Fluxo de fallback manual

1. Operador nao consegue leitura automatica.
2. UI habilita entrada manual de peso sob controle.
3. Valor e calculado com as mesmas regras.
4. Pedido recebe marcador de origem da leitura (manual/automatica).

## 9. Regras transversais

- Nenhum erro de rede deve quebrar a tela.
- Toda falha deve ter mensagem operacional clara.
- Nenhuma acao de confirmacao sem peso valido.
- Polling nunca deve continuar apos fechamento do fluxo.
