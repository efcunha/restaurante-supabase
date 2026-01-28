# Guia de Configuração Firebase para Restaurante App

Este guia ajuda você a configurar corretamente o projeto no Console do Firebase para garantir que o aplicativo funcione corretamente no Android e iOS.

---

## 1. Adicionar o App Android (Já Configurado)

Se você já fez isso, pule para a seção 2.

1.  Acesse o [Console do Firebase](https://console.firebase.google.com/).
2.  Selecione seu projeto **"Restaurante"**.
3.  Adicione um app **Android**.
4.  **Nome do pacote**: `com.comandapraia.donacida`
5.  Baixe o `google-services.json` e salve na pasta `restaurante-app/`.

---

## 2. Adicionar o App iOS (Novo)

Para ter a versão iOS, precisamos registrar o app iOS no Firebase.

1.  No Console do Firebase, clique em **Adicionar app** e selecione o ícone **iOS** (maçã).
2.  **ID do pacote do iOS**: Digite exatamente:
    `com.comandapraia.donacida`
3.  **Apelido do app (opcional)**: Pode colocar "Restaurante iOS".
4.  **ID da App Store**: Deixe em branco por enquanto.
5.  Clique em **Registrar app**.
6.  **Download do arquivo de configuração**:
    - Baixe o arquivo `GoogleService-Info.plist`.
    - Coloque-o na pasta `restaurante-app/` (mesmo lugar do `google-services.json`).
7.  Clique em "Próximo" até concluir.

A configuração no código (`app.json`) eu farei automaticamente para você, apenas certifique-se de salvar o arquivo na pasta correta.

---

## 3. Limitações Importantes (App Check e Analytics)

> [!WARNING]
> Como estamos usando a biblioteca **Web SDK** (`firebase`), recursos nativos como **App Check** não funcionarão diretamente nos apps móveis sem migração para `@react-native-firebase`.
> **Não ative** o bloqueio do App Check no Console para evitar que o app pare de funcionar.

---

## 4. Como Gerar a Versão iOS

Para gerar o aplicativo para iPhone (arquivo `.ipa`), existem duas formas:

1.  **EAS Build (Recomendado)**: Serviço de nuvem da Expo. Você roda um comando (`eas build --platform ios`), eles constroem o app nos servidores deles e te devolvem o link para instalar ou subir na loja. (Requer conta paga Apple Developer para subir na loja).
2.  **Mac Local**: Se você tiver um computador Mac, pode rodar `npx expo run:ios` para testar no simulador ou construir localmente.

_No Windows/Linux (seu caso), a única opção para gerar o binário final do iOS é usar o EAS Build._
