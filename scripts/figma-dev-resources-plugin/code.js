figma.showUI(__html__, {
  width: 640,
  height: 800,
  title: 'Dev Resources Sync',
});

function normalizeNodeId(rawId) {
  if (typeof rawId !== 'string') {
    return null;
  }
  var trimmed = rawId.trim();
  if (!trimmed) {
    return null;
  }
  return trimmed.replace(/-/g, ':');
}

function normalizeName(name) {
  return String(name)
    .replace(/^Screen:/i, '')
    .toLowerCase()
    .replace(/[\s_\-]/g, '');
}

function buildCodeUrl(repoBaseUrl, codePath) {
  if (!repoBaseUrl || !codePath) {
    return null;
  }
  var base = String(repoBaseUrl).trim().replace(/\/$/, '');
  var relative = String(codePath).trim().replace(/^\//, '');
  if (!base || !relative) {
    return null;
  }
  return base + '/' + relative;
}

var FORM_PAGE_NAME = '🧩 Forms restaurante-web';
var FORM_BOARD_NAME = 'RestaurantOS Forms Board';
var FORM_SCREEN_NAMES = [
  'LoginScreen',
  'RegisterCompanyScreen',
  'ResetPasswordScreen',
  'ConfiguracoesScreen',
  'BillingScreen',
  'EditarEmpresaScreen',
  'FuncionariosScreen',
  'OperationalSettingsScreen',
  'ConfiguracaoEstoqueScreen',
  'ConfiguracaoMesasScreen',
  'CadastroProdutoScreen',
  'CaixaAberturaScreen',
  'CaixaFechamentoScreen',
  'CaixaOperacoesScreen',
  'EstoqueScreen',
  'ExtrasConfigScreen',
  'GerenciarCardapioScreen',
  'GerenciarFornecedoresScreen',
  'PedidoDetalhesModal',
  'NovoPedidoScreen',
  'PublicMenuScreen',
  'ReservasScreen',
  'DeliveryScreen',
  'DeliveryOcorrenciasScreen',
  'AdicionaisConfigModal',
  'MenuSettings',
  'ProductForm',
  'StockManager',
  'VariationManager',
];

var SCREEN_PAGE_NAME = '🧩 Screens restaurante-web';
var SCREEN_BOARD_NAME = 'RestaurantOS Screens Board';
var SCREEN_NODE_NAMES = [
  'AboutScreen',
  'AdicionaisConfigModal',
  'MenuSettings',
  'ProductForm',
  'ProductList',
  'StockManager',
  'VariationManager',
  'AdminScreen',
  'BillingScreen',
  'CadastroProdutoScreen',
  'CaixaAberturaScreen',
  'CaixaFechamentoScreen',
  'CaixaHistoricoScreen',
  'CaixaOperacoesScreen',
  'CancellationReportScreen',
  'CashFlowScreen',
  'ComandaAbertaScreen',
  'ComandaGerenciamentoScreen',
  'ComandaVisualizacaoAdminScreen',
  'ConfiguracaoEstoqueScreen',
  'ConfiguracaoMesasScreen',
  'ConfiguracoesScreen',
  'ConfiguracoesWhatsApp',
  'CozinhaScreen',
  'DeliveryOcorrenciasScreen',
  'DeliveryScreen',
  'EditarEmpresaScreen',
  'EstoqueScreen',
  'ExtrasConfigScreen',
  'FinancialConfigScreen',
  'FinancialDashboardScreen',
  'FuncionariosScreen',
  'GerenciarCardapioScreen',
  'GerenciarFornecedoresScreen',
  'LoginScreen',
  'MapaMesasScreen',
  'MontagemScreen',
  'NovoPedidoScreen',
  'OperationalSettingsScreen',
  'PagamentoScreen',
  'PedidoDetalhesModal',
  'PedidosProntosScreen',
  'PerformanceDashboardScreen',
  'PrinterConfigScreen',
  'PublicMenuScreen',
  'RegisterCompanyScreen',
  'ReservasScreen',
  'ResetPasswordScreen',
  'RotasDeliveryScreen',
  'UpdateCardapioScreen',
];

var PAYLOAD_PAGE_NAME = '🧩 Payload restaurante-web';
var PAYLOAD_BOARD_NAME = 'RestaurantOS Payload Board';

function findPageByName(name) {
  var pages = figma.root.children;
  for (var i = 0; i < pages.length; i++) {
    if (pages[i].name === name) {
      return pages[i];
    }
  }
  return null;
}

function findChildByName(parent, name) {
  if (!parent || !parent.children) {
    return null;
  }
  var children = parent.children;
  for (var i = 0; i < children.length; i++) {
    if (children[i].name === name) {
      return children[i];
    }
  }
  return null;
}

async function seedFormsBoard(options) {
  var dryRun = Boolean(options && options.dryRun);
  var counters = {
    formsTotal: FORM_SCREEN_NAMES.length,
    createdPage: 0,
    createdBoard: 0,
    createdFrames: 0,
    existingFrames: 0,
  };

  var page = findPageByName(FORM_PAGE_NAME);
  if (!page) {
    if (!dryRun) {
      page = figma.createPage();
      page.name = FORM_PAGE_NAME;
    }
    counters.createdPage = 1;
  }

  var board = page ? findChildByName(page, FORM_BOARD_NAME) : null;
  if (!board) {
    if (!dryRun && page) {
      board = figma.createFrame();
      board.name = FORM_BOARD_NAME;
      board.resizeWithoutConstraints(2560, 1840);
      board.x = 120;
      board.y = 120;
      page.appendChild(board);
    }
    counters.createdBoard = 1;
  }

  var existing = {};
  if (board && board.children) {
    for (var i = 0; i < board.children.length; i++) {
      existing[board.children[i].name] = true;
    }
  }

  var columns = 5;
  var frameWidth = 420;
  var frameHeight = 280;
  var gapX = 32;
  var gapY = 24;
  var startX = 40;
  var startY = 40;

  for (var j = 0; j < FORM_SCREEN_NAMES.length; j++) {
    var formName = FORM_SCREEN_NAMES[j];
    if (existing[formName]) {
      counters.existingFrames += 1;
      continue;
    }

    counters.createdFrames += 1;

    if (!dryRun && board) {
      var frame = figma.createFrame();
      frame.name = formName;
      frame.resizeWithoutConstraints(frameWidth, frameHeight);
      frame.fills = [];
      frame.layoutMode = 'VERTICAL';
      frame.paddingLeft = 16;
      frame.paddingRight = 16;
      frame.paddingTop = 16;
      frame.paddingBottom = 16;
      frame.itemSpacing = 8;

      var col = j % columns;
      var row = Math.floor(j / columns);
      frame.x = startX + col * (frameWidth + gapX);
      frame.y = startY + row * (frameHeight + gapY);

      board.appendChild(frame);
    }
  }

  return {
    seedType: 'forms',
    dryRun: dryRun,
    counters: counters,
    pageName: FORM_PAGE_NAME,
    boardName: FORM_BOARD_NAME,
  };
}

async function seedScreensBoard(options) {
  var dryRun = Boolean(options && options.dryRun);
  var counters = {
    screensTotal: SCREEN_NODE_NAMES.length,
    createdPage: 0,
    createdBoard: 0,
    createdFrames: 0,
    existingFrames: 0,
  };

  var globalNameMap = await buildNameMap();

  var page = findPageByName(SCREEN_PAGE_NAME);
  if (!page) {
    if (!dryRun) {
      page = figma.createPage();
      page.name = SCREEN_PAGE_NAME;
    }
    counters.createdPage = 1;
  }

  var board = page ? findChildByName(page, SCREEN_BOARD_NAME) : null;
  if (!board) {
    if (!dryRun && page) {
      board = figma.createFrame();
      board.name = SCREEN_BOARD_NAME;
      board.resizeWithoutConstraints(2880, 2200);
      board.x = 120;
      board.y = 120;
      page.appendChild(board);
    }
    counters.createdBoard = 1;
  }

  var columns = 5;
  var frameWidth = 420;
  var frameHeight = 280;
  var gapX = 32;
  var gapY = 24;
  var startX = 40;
  var startY = 40;

  for (var i = 0; i < SCREEN_NODE_NAMES.length; i++) {
    var screenName = SCREEN_NODE_NAMES[i];
    var key = normalizeName(screenName);

    if (globalNameMap[key]) {
      counters.existingFrames += 1;
      continue;
    }

    counters.createdFrames += 1;

    if (!dryRun && board) {
      var frame = figma.createFrame();
      frame.name = screenName;
      frame.resizeWithoutConstraints(frameWidth, frameHeight);
      frame.fills = [];
      frame.layoutMode = 'VERTICAL';
      frame.paddingLeft = 16;
      frame.paddingRight = 16;
      frame.paddingTop = 16;
      frame.paddingBottom = 16;
      frame.itemSpacing = 8;

      var col = i % columns;
      var row = Math.floor(i / columns);
      frame.x = startX + col * (frameWidth + gapX);
      frame.y = startY + row * (frameHeight + gapY);

      board.appendChild(frame);
    }
  }

  return {
    seedType: 'screens',
    dryRun: dryRun,
    counters: counters,
    pageName: SCREEN_PAGE_NAME,
    boardName: SCREEN_BOARD_NAME,
  };
}

async function seedMissingFromPayload(payload, options) {
  var dryRun = Boolean(options && options.dryRun);
  var includeScreens = Boolean(options && options.includeScreens);

  var entries = Array.isArray(payload && payload.entries) ? payload.entries : [];
  var uniqueNamesByKey = {};
  var targetNames = [];

  for (var i = 0; i < entries.length; i++) {
    var entry = entries[i];
    var component = entry && typeof entry.component === 'string' ? entry.component.trim() : '';
    if (!component) {
      continue;
    }
    var isScreen = /^Screen:/i.test(component);
    if (isScreen && !includeScreens) {
      continue;
    }
    var frameName = component.replace(/^Screen:/i, '').trim();
    if (!frameName) {
      continue;
    }
    var key = normalizeName(frameName);
    if (uniqueNamesByKey[key]) {
      continue;
    }
    uniqueNamesByKey[key] = frameName;
    targetNames.push(frameName);
  }

  var counters = {
    payloadTotal: entries.length,
    formsTotal: targetNames.length,
    createdPage: 0,
    createdBoard: 0,
    createdFrames: 0,
    existingFrames: 0,
  };

  var globalNameMap = await buildNameMap();

  var page = findPageByName(PAYLOAD_PAGE_NAME);
  if (!page) {
    if (!dryRun) {
      page = figma.createPage();
      page.name = PAYLOAD_PAGE_NAME;
    }
    counters.createdPage = 1;
  }

  var board = page ? findChildByName(page, PAYLOAD_BOARD_NAME) : null;
  if (!board) {
    if (!dryRun && page) {
      board = figma.createFrame();
      board.name = PAYLOAD_BOARD_NAME;
      board.resizeWithoutConstraints(3200, 2600);
      board.x = 120;
      board.y = 120;
      page.appendChild(board);
    }
    counters.createdBoard = 1;
  }

  var columns = 6;
  var frameWidth = 420;
  var frameHeight = 280;
  var gapX = 32;
  var gapY = 24;
  var startX = 40;
  var startY = 40;

  for (var j = 0; j < targetNames.length; j++) {
    var name = targetNames[j];
    var key = normalizeName(name);

    if (globalNameMap[key]) {
      counters.existingFrames += 1;
      continue;
    }

    counters.createdFrames += 1;

    if (!dryRun && board) {
      var frame = figma.createFrame();
      frame.name = name;
      frame.resizeWithoutConstraints(frameWidth, frameHeight);
      frame.fills = [];
      frame.layoutMode = 'VERTICAL';
      frame.paddingLeft = 16;
      frame.paddingRight = 16;
      frame.paddingTop = 16;
      frame.paddingBottom = 16;
      frame.itemSpacing = 8;

      var col = j % columns;
      var row = Math.floor(j / columns);
      frame.x = startX + col * (frameWidth + gapX);
      frame.y = startY + row * (frameHeight + gapY);

      board.appendChild(frame);
    }
  }

  return {
    seedType: includeScreens ? 'payload-all' : 'payload-non-screen',
    dryRun: dryRun,
    counters: counters,
    pageName: PAYLOAD_PAGE_NAME,
    boardName: PAYLOAD_BOARD_NAME,
  };
}

async function buildNameMap() {
  var map = {};
  var pages = figma.root.children;
  for (var i = 0; i < pages.length; i++) {
    var page = pages[i];
    try { await page.loadAsync(); } catch (e) {}
    var children = page.children;
    for (var j = 0; j < children.length; j++) {
      var child = children[j];
      // Register the top-level frame itself
      var key = normalizeName(child.name);
      if (!map[key]) {
        map[key] = child;
      }
      // Also register its direct children (components inside a board frame)
      if (child.children) {
        for (var k = 0; k < child.children.length; k++) {
          var grandchild = child.children[k];
          var gkey = normalizeName(grandchild.name);
          if (!map[gkey]) {
            map[gkey] = grandchild;
          }
        }
      }
    }
  }
  return map;
}

async function scanDocument() {
  var results = [];
  var pages = figma.root.children;
  for (var i = 0; i < pages.length; i++) {
    var page = pages[i];
    try { await page.loadAsync(); } catch (e) {}
    var children = page.children;
    for (var j = 0; j < children.length; j++) {
      var child = children[j];
      results.push({
        nodeId: child.id,
        name: child.name,
        type: child.type,
        page: page.name,
        depth: 1,
      });
      // Also list grandchildren so user can see names inside board frames
      if (child.children) {
        for (var k = 0; k < child.children.length; k++) {
          var gc = child.children[k];
          results.push({
            nodeId: gc.id,
            name: gc.name,
            type: gc.type,
            page: page.name,
            depth: 2,
          });
        }
      }
    }
  }
  return results;
}

async function upsertDevResource(node, options) {
  var resourceName = options.resourceName;
  var resourceUrl = options.resourceUrl;
  var replaceByName = options.replaceByName;
  var dryRun = options.dryRun;

  var currentResources = await node.getDevResourcesAsync({ includeChildren: false });

  var sameUrl = null;
  for (var i = 0; i < currentResources.length; i++) {
    if (currentResources[i].url === resourceUrl) {
      sameUrl = currentResources[i];
      break;
    }
  }

  if (sameUrl) {
    if (sameUrl.name !== resourceName && !dryRun) {
      await node.editDevResourceAsync(sameUrl.url, { name: resourceName, url: resourceUrl });
      return 'renamed';
    }
    return 'kept';
  }

  if (replaceByName) {
    var sameName = null;
    for (var k = 0; k < currentResources.length; k++) {
      if (currentResources[k].name === resourceName) {
        sameName = currentResources[k];
        break;
      }
    }
    if (sameName) {
      if (!dryRun) {
        await node.editDevResourceAsync(sameName.url, { name: resourceName, url: resourceUrl });
      }
      return 'replaced';
    }
  }

  if (!dryRun) {
    await node.addDevResourceAsync(resourceUrl, resourceName);
  }
  return 'added';
}

async function applyEntries(payload, runtimeOptions) {
  var entries = Array.isArray(payload && payload.entries) ? payload.entries : [];

  var nameMap = null;
  if (runtimeOptions.matchByName) {
    nameMap = await buildNameMap();
  }

  var counters = {
    total: entries.length,
    processedNodes: 0,
    skippedNodeNotFound: 0,
    skippedInvalidEntry: 0,
    added: 0,
    replaced: 0,
    renamed: 0,
    kept: 0,
    errors: 0,
    foundById: 0,
    foundByName: 0,
  };

  var errors = [];
  var idSuggestions = [];

  for (var e = 0; e < entries.length; e++) {
    var entry = entries[e];
    var nodeId = normalizeNodeId(
      (entry && entry.nodeId) || (entry && entry.figmaNodeId)
    );
    var docsUrl =
      entry && typeof entry.docsUrl === 'string' ? entry.docsUrl.trim() : '';
    var component =
      entry && typeof entry.component === 'string' ? entry.component.trim() : 'Unknown';
    var codePath =
      entry && typeof entry.codePath === 'string' ? entry.codePath.trim() : '';

    if (!docsUrl) {
      counters.skippedInvalidEntry += 1;
      continue;
    }

    var node = null;

    if (nodeId) {
      try {
        node = await figma.getNodeByIdAsync(nodeId);
      } catch (err) {
        errors.push('ID lookup failed for ' + nodeId + ': ' + String(err));
      }
      if (node) {
        counters.foundById += 1;
      }
    }

    if (!node && nameMap) {
      var lookupKey = normalizeName(component);
      node = nameMap[lookupKey] || null;
      if (node) {
        counters.foundByName += 1;
        var resolvedId = String(node.id || '').trim();
        if (resolvedId && nodeId !== resolvedId) {
          idSuggestions.push({
            component: component,
            oldNodeId: nodeId || null,
            resolvedNodeId: resolvedId,
          });
        }
      }
    }

    if (!node) {
      counters.skippedNodeNotFound += 1;
      continue;
    }

    counters.processedNodes += 1;

    var resourceOps = [
      {
        resourceName: 'Storybook Docs: ' + component,
        resourceUrl: docsUrl,
      },
    ];

    if (runtimeOptions.includeCodePathLink) {
      var codeUrl = buildCodeUrl(runtimeOptions.repoBaseUrl, codePath);
      if (codeUrl) {
        resourceOps.push({
          resourceName: 'Code Path: ' + component,
          resourceUrl: codeUrl,
        });
      }
    }

    for (var r = 0; r < resourceOps.length; r++) {
      var op = resourceOps[r];
      try {
        var result = await upsertDevResource(node, {
          resourceName: op.resourceName,
          resourceUrl: op.resourceUrl,
          replaceByName: runtimeOptions.replaceByName,
          dryRun: runtimeOptions.dryRun,
        });
        counters[result] += 1;
      } catch (opErr) {
        counters.errors += 1;
        errors.push(
          'Node ' + (node.id || nodeId) + ' (' + component + ') -> ' + op.resourceName + ': ' + String(opErr)
        );
      }
    }
  }

  return { counters: counters, errors: errors, idSuggestions: idSuggestions };
}

figma.ui.onmessage = async (msg) => {
  if (!msg || typeof msg !== 'object') {
    return;
  }

  if (msg.type === 'cancel') {
    figma.closePlugin('Dev resources sync cancelled.');
    return;
  }

  if (msg.type === 'scan') {
    try {
      var nodes = await scanDocument();
      figma.ui.postMessage({ type: 'scan-result', nodes: nodes });
    } catch (err) {
      figma.ui.postMessage({ type: 'fatal', message: String(err) });
    }
    return;
  }

  if (msg.type === 'seed-forms') {
    try {
      var seedReport = await seedFormsBoard({ dryRun: Boolean(msg.dryRun) });
      figma.ui.postMessage({ type: 'seed-report', report: seedReport });
    } catch (err) {
      figma.ui.postMessage({ type: 'fatal', message: String(err) });
    }
    return;
  }

  if (msg.type === 'seed-screens') {
    try {
      var seedScreensReport = await seedScreensBoard({ dryRun: Boolean(msg.dryRun) });
      figma.ui.postMessage({ type: 'seed-report', report: seedScreensReport });
    } catch (err) {
      figma.ui.postMessage({ type: 'fatal', message: String(err) });
    }
    return;
  }

  if (msg.type === 'seed-payload') {
    try {
      var payload = JSON.parse(msg.payloadText || '{}');
      var seedPayloadReport = await seedMissingFromPayload(payload, {
        dryRun: Boolean(msg.dryRun),
        includeScreens: Boolean(msg.includeScreens),
      });
      figma.ui.postMessage({ type: 'seed-report', report: seedPayloadReport });
    } catch (err) {
      figma.ui.postMessage({ type: 'fatal', message: String(err) });
    }
    return;
  }

  if (msg.type !== 'apply') {
    return;
  }

  var dryRun = Boolean(msg.dryRun);
  var replaceByName = Boolean(msg.replaceByName);
  var includeCodePathLink = Boolean(msg.includeCodePathLink);
  var matchByName = Boolean(msg.matchByName);
  var repoBaseUrl = typeof msg.repoBaseUrl === 'string' ? msg.repoBaseUrl : '';

  try {
    var payload = JSON.parse(msg.payloadText || '{}');
    var report = await applyEntries(payload, {
      dryRun: dryRun,
      replaceByName: replaceByName,
      includeCodePathLink: includeCodePathLink,
      matchByName: matchByName,
      repoBaseUrl: repoBaseUrl,
    });

    figma.ui.postMessage({
      type: 'report',
      dryRun: dryRun,
      counters: report.counters,
      errors: report.errors,
      idSuggestions: report.idSuggestions,
    });
  } catch (err) {
    figma.ui.postMessage({ type: 'fatal', message: String(err) });
  }
};
