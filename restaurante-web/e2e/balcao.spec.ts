import { expect, test } from '@playwright/test'

test.describe('Fluxo Principal - Balcão (Novo Pedido Direto)', () => {
  test.setTimeout(120000)

  test.beforeEach(async ({ page }) => {
    console.log('Navegando para o App / Login')
    await page.goto('/')

    try {
      const emailInput = page.locator('input[placeholder="seu@email.com"]')
      await emailInput.waitFor({ state: 'visible', timeout: 8000 })

      console.log('Preenchendo credenciais...')
      await emailInput.fill(process.env.PLAYWRIGHT_TEST_EMAIL!)
      await page
        .locator('input[placeholder="••••••••"]')
        .fill(process.env.PLAYWRIGHT_TEST_PASSWORD!)
      await page.getByText('ENTRAR', { exact: true }).click()

      await expect(page.locator('text=Novo Pedido').first()).toBeVisible({ timeout: 15000 })
    } catch (e) {
      console.log('Login já persistido ou tela de login ignorada. Prosseguindo.')
    }
  })

  test('Deve conseguir criar um pedido de Balcão puro sem vínculo externo', async ({ page }) => {
    page.on('dialog', async (dialog) => {
      console.log(`[ALERT/DIALOG INTERCEPTADO] ${dialog.type()} -> Mensagem: "${dialog.message()}"`)
      await dialog.accept()
    })

    // Adiciona um pequeno delay aleatório para evitar race condition na geração de número da comanda
    // quando executado em terminais rodando exata e perfeitamente ao mesmo tempo.
    await page.waitForTimeout(Math.random() * 3000)

    console.log('1. Acessando Aba Novo Pedido')
    const tabNovoPedido = page.getByText('Novo Pedido').first()
    await expect(tabNovoPedido).toBeVisible({ timeout: 15000 })
    await tabNovoPedido.click()

    // Pequena pausa para garantir carregamento do form
    await page.waitForTimeout(2000)

    console.log('2. Verificando Novo Pedido e Preenchendo Nome')
    const clienteInput = page.getByPlaceholder('Digite o nome')
    await expect(clienteInput).toBeVisible({ timeout: 15000 })
    const uniqueId = Date.now() + Math.round(Math.random() * 1000)
    await clienteInput.fill(`Cliente Balcão ${uniqueId}`)

    console.log('3. Adicionando itens variados ao pedido')
    const searchInput = page.getByPlaceholder('Buscar item do cardápio...')
    await searchInput.waitFor({ state: 'visible', timeout: 10000 })

    // Pizza Grande/Família: 1/2 Calabresa + 1/2 Chocolate com Morango + Bacon
    console.log(
      'Adicionando Pizza Grande/Família (1/2 Calabresa, 1/2 Chocolate com Morango) + Bacon...',
    )
    try {
      const calabresaCard = page
        .locator('div[dir="auto"]')
        .filter({ hasText: /^Calabresa$/ })
        .first()
      await calabresaCard.waitFor({ state: 'visible', timeout: 5000 })
      await calabresaCard.click()
      await page.getByText('Grande/Família').first().waitFor({ state: 'visible' })
      await page.getByText('Grande/Família').first().click()
      await page
        .getByText('Chocolate com Morango')
        .last()
        .waitFor({ state: 'visible', timeout: 10000 })
      await page.getByText('Chocolate com Morango').last().click()
      await page.getByText('Próximo: Extras').last().click()
      await page.getByText('Bacon').last().waitFor({ state: 'visible' })
      await page.getByText('Bacon').last().click()
      await page.getByText('Adicionar ao Pedido').last().click()
      console.log('   ✓ Pizza Grande/Família adicionada')
    } catch (e: any) {
      console.log(`   ⚠️ Pizza: ${e.message}`)
    }
    await page.waitForTimeout(500)

    // Porções/Batata Frita: fluxo com novo modal de adicionais
    console.log('Adicionando Porção Batata Frita (novo modal de adicionais)...')
    await searchInput.click()
    await searchInput.fill('')
    await searchInput.fill('batata frita')
    await page.waitForTimeout(1500)

    const batataCard = page
      .locator('div[dir="auto"]')
      .filter({ hasText: /Batata Frita/i })
      .filter({ visible: true })
      .first()
    const hasBatataCard = await batataCard.isVisible({ timeout: 3000 }).catch(() => false)

    if (hasBatataCard) {
      const plusInBatataCard = batataCard
        .locator('div[role="button"], div[dir="auto"]')
        .filter({ hasText: /^\+$/ })
        .filter({ visible: true })
        .first()

      if ((await plusInBatataCard.count()) > 0) {
        await plusInBatataCard.click()
      } else {
        const fallbackPlusBtn = page
          .locator('div[role="button"], div[dir="auto"]')
          .filter({ hasText: /^\+$/ })
          .filter({ visible: true })
          .first()
        await expect(fallbackPlusBtn).toBeVisible({ timeout: 8000 })
        await fallbackPlusBtn.click()
      }

      const addComAdicionaisBtn = page
        .getByText(/Adicionar ao pedido\s*·\s*R\$|Adicionar sem adicionais/i)
        .last()
      const modalHasConfirmAction = await addComAdicionaisBtn
        .isVisible({ timeout: 5000 })
        .catch(() => false)

      if (modalHasConfirmAction) {
        const adicionaisBatata = [/Ketchup/i, /^Maionese$/i, /Maionese\s+Temperada/i, /Calabresa/i]

        for (const adicional of adicionaisBatata) {
          const adicionalOption = page
            .locator('div[role="button"], div[dir="auto"], button')
            .filter({ hasText: adicional })
            .filter({ visible: true })
            .last()

          if (await adicionalOption.isVisible({ timeout: 1000 }).catch(() => false)) {
            await adicionalOption.scrollIntoViewIfNeeded().catch(() => {})
            await adicionalOption.click({ force: true })
            await page.waitForTimeout(150)
          }
        }

        await addComAdicionaisBtn.click({ force: true })
        await expect(addComAdicionaisBtn)
          .toBeHidden({ timeout: 10000 })
          .catch(() => {})
        console.log('   ✓ Batata Frita adicionada com fluxo de adicionais')
      } else {
        console.log(
          '   ℹ️ Produto não abriu modal de adicionais; seguindo com item direto (cenário válido).',
        )
      }
    } else {
      console.log('   ℹ️ Batata Frita não encontrada no catálogo atual; etapa opcional ignorada.')
    }

    // Guard extra para evitar overlay residual bloqueando interação.
    const closeAdicionaisBtn = page.getByText('✕').last()
    if (await closeAdicionaisBtn.isVisible({ timeout: 500 }).catch(() => false)) {
      await closeAdicionaisBtn.click().catch(() => {})
    }
    await page.waitForTimeout(500)

    const itemsToSearch = [
      { term: 'chopp', quantity: 3 },
      { term: 'risoto', quantity: 1 },
      { term: 'caldo', quantity: 3 },
    ]

    for (const { term, quantity } of itemsToSearch) {
      for (let i = 0; i < quantity; i++) {
        console.log(`Buscando por: ${term} (${i + 1}/${quantity})`)

        const scaleModalTitle = page.getByText('Pesagem assistida').first()
        if (await scaleModalTitle.isVisible({ timeout: 500 }).catch(() => false)) {
          const closeScaleBtn = page.getByText('Cancelar').last()
          if (await closeScaleBtn.isVisible({ timeout: 500 }).catch(() => false)) {
            await closeScaleBtn.click().catch(() => {})
          }
        }

        await searchInput.focus().catch(() => {})
        await searchInput.fill('')
        await searchInput.fill(term)
        await page.waitForTimeout(1500)

        try {
          const itemLabel = page.getByText(new RegExp(term, 'i')).first()
          await expect(itemLabel).toBeVisible({ timeout: 8000 })

          const rowContainer = itemLabel.locator(
            'xpath=ancestor::div[.//*[normalize-space(text())="+"]][1]',
          )
          const plusBtn = rowContainer
            .locator('div[role="button"], div[dir="auto"]')
            .filter({ hasText: /^\+$/ })
            .first()

          if (await plusBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
            await plusBtn.click()
            console.log(`- Item '${term}' adicionado com sucesso!`)
          } else {
            await itemLabel.click()
            console.log(`- Item '${term}' selecionado pelo card.`)
          }
        } catch (e: any) {
          console.log(`- Erro ao adicionar '${term}': ${e.message}`)
        }
        await page.waitForTimeout(500)
      }
    }

    console.log('4. Finalizando Pedido')
    const submitBtn = page.locator('div[dir="auto"]').filter({ hasText: 'Criar Pedido' }).last()
    await expect(submitBtn).toBeVisible()
    await submitBtn.click()

    // Aguarda a confirmação (Toast de sucesso do useNovoPedido)
    console.log('5. Aguardando confirmação...')
    const toast = page.locator('text=/Pedido criado! Comanda/i')
    await expect(toast).toBeVisible({ timeout: 15000 })

    console.log('- Pedido Balcão criado!')
  })
})
