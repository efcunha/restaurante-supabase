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
- Rodada inicial (preview, no-wait): builds Android e iOS simulador iniciados com sucesso.
- Rodada de validacao posterior (preview):
  - Android concluido com sucesso: build id `1f4d36ec-66e0-4ff3-be51-6f3507ebea18`
  - iOS simulador concluido com sucesso: build id `53f0d68e-4abd-48d7-8d2a-69f2aabc26b6`
- Estrategia aplicada: `ios.simulator=true` no perfil `preview` para contornar a ausencia de time Apple Developer pago.

## Pendencias para fechamento do item

- Smoke controlado de conectividade (Supabase + Mercado Pago).
- Teste MITM controlado documentado.
