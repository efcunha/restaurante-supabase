# Evidencia Tecnica de Certificate Pinning (04/04/2026)

Data: 2026-04-04
Escopo: restaurante-app
Objetivo: registrar hashes SPKI usados no pinning e comando de verificacao.

## Dominios cobertos

- ykalocfhnetxenvmtlcn.supabase.co (coberto por regra supabase.co com subdominios)
- api.mercadopago.com

## Hashes SPKI aplicados

Supabase
- Leaf: GU2W4j1P24T3sqlI+o6YTnidzz0PI8fB/Gvd2ITfSZE=
- Backup CA: kIdp6NNEd8wsugYyyIYFsi1ylMCED3hZbSR8ZFsa/A4=

Mercado Pago
- Leaf: 1rsZujOXhUcEKiMBfMqCDwhVvouJYiW+H7/RiBr4c8Y=
- Backup CA: Wec45nQiFwKvHtuHxSAMGkt19k+uPSw9JlEkxhvYPHk=

## Evidencia de comando (leaf)

Comando usado:

openssl s_client -servername <host> -connect <host>:443 \
  | openssl x509 -pubkey -noout \
  | openssl pkey -pubin -outform der \
  | openssl dgst -sha256 -binary \
  | openssl base64

Saida validada em 04/04/2026:

- Supabase leaf: GU2W4j1P24T3sqlI+o6YTnidzz0PI8fB/Gvd2ITfSZE=
- MercadoPago leaf: 1rsZujOXhUcEKiMBfMqCDwhVvouJYiW+H7/RiBr4c8Y=

## Arquivos atualizados no app

- restaurante-app/app.json
- restaurante-app/ios/Espeto/Info.plist
- restaurante-app/android/app/src/main/AndroidManifest.xml
- restaurante-app/android/app/src/main/res/xml/network_security_config.xml

## Build/EAS status (04/04/2026)

- Novo projectId EAS vinculado: `930f1e33-a6ec-4432-8c37-891f4eddcb1f`
- Android build iniciado com sucesso (preview, no-wait):
  - https://expo.dev/accounts/lumachadolp/projects/comandapraia-dona-cida/builds/577eb0c4-1909-48dd-afed-ed5ea06633f6
  - Observacao: o slug da URL no painel Expo permanece legado; a referencia operacional correta e o `projectId` `930f1e33-a6ec-4432-8c37-891f4eddcb1f`.
- iOS build preview em modo non-interactive bloqueou por falta de credenciais internas (necessita setup interativo).

## Pendencias para fechamento do item

- EAS build Android e iOS concluido com sucesso.
- Smoke controlado de conectividade (Supabase + Mercado Pago).
- Teste MITM controlado documentado.
