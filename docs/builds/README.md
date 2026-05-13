# Builds EAS (Latest)

Esta pasta armazena os artefatos mais recentes baixados do Expo EAS.

Observacao:
- Quando o EAS retornar `.tar.gz`, o script extrai automaticamente e salva o binario instalavel (`.apk`, `.aab`, `.ipa` ou `.app`).
- Se o build iOS for de simulador, o artifact pode vir como bundle `.app`; nesse caso o script publica `ios-latest.app.tar.gz`.
- O script prioriza `EAS_IOS_BUILD_PROFILE=production` para buscar IPA de device. Para sobrescrever, exporte `EAS_IOS_BUILD_PROFILE=<profile>`.

Arquivos esperados apos executar o script:
- `android-latest.apk` (ou `android-latest.aab` quando o build gerar AAB)
- `ios-latest.ipa` (ou outra extensao retornada pelo EAS)
- arquivos versionados por build ID
- `latest-builds.json` com metadados da ultima execucao

Script relacionado:
- `docs/scripts/download-latest-eas-builds.sh`
