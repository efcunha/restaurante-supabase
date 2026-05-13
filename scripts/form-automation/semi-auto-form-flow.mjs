#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const CURRENT_FILE = fileURLToPath(import.meta.url);
const REPO_ROOT = path.resolve(path.dirname(CURRENT_FILE), '..', '..');

const CRITICAL_SCREEN_NAMES = new Set([
	'NovoPedidoScreen',
	'ComandaGerenciamentoScreen',
	'DeliveryScreen',
	'RotasDeliveryScreen',
	'CaixaOperacoesScreen',
	'CaixaAberturaScreen',
	'CaixaFechamentoScreen',
]);

const SENSITIVE_AREAS = [
	'auth',
	'billing',
	'rls',
	'cors',
	'rate limiting',
	'rate_limit',
	'rate-limiting',
	'jwt',
	'token',
];

const PII_FIELD_HINTS = ['nome', 'name', 'cpf', 'cnpj', 'email', 'phone', 'telefone', 'address', 'endereco'];

const DEFAULT_OUTPUT_DIR = path.join(REPO_ROOT, 'tmp', 'form-automation');
const DEFAULT_WEB_CATALOG_PATH = path.join(REPO_ROOT, 'restaurante-web', 'src', 'ui', 'formsCatalogData.ts');
const DEFAULT_I18N_PT = [
	path.join(REPO_ROOT, 'restaurante-web', 'src', 'i18n', 'locales', 'pt.json'),
	path.join(REPO_ROOT, 'restaurante-app', 'src', 'i18n', 'locales', 'pt.json'),
];

export function parseArgs(argv) {
	const args = {
		mode: 'plan',
		outputDir: DEFAULT_OUTPUT_DIR,
		apply: false,
		runValidation: false,
		strictTargets: false,
		approveCritical: [],
		approvePii: [],
		approveSensitive: [],
		approvalFile: '',
	};

	const items = argv.slice(2);
	if (items[0] && !items[0].startsWith('--')) {
		args.mode = items[0];
		items.shift();
	}

	for (let i = 0; i < items.length; i += 1) {
		const token = items[i];
		const next = items[i + 1];

		if (token === '--change-file' && next) {
			args.changeFile = next;
			i += 1;
		} else if (token === '--output-dir' && next) {
			args.outputDir = next;
			i += 1;
		} else if (token === '--apply') {
			args.apply = true;
		} else if (token === '--run-validation') {
			args.runValidation = true;
		} else if (token === '--strict-targets') {
			args.strictTargets = true;
		} else if (token === '--approve-critical' && next) {
			args.approveCritical.push(next);
			i += 1;
		} else if (token === '--approve-pii' && next) {
			args.approvePii.push(next);
			i += 1;
		} else if (token === '--approve-sensitive' && next) {
			args.approveSensitive.push(next);
			i += 1;
		} else if (token === '--approval-file' && next) {
			args.approvalFile = next;
			i += 1;
		} else if (token === '--help' || token === '-h') {
			args.help = true;
		}
	}

	return args;
}

export function getUsage() {
	return [
		'Uso:',
		'  node scripts/form-automation/semi-auto-form-flow.mjs plan --change-file <arquivo.json> [--output-dir <dir>]',
		'  node scripts/form-automation/semi-auto-form-flow.mjs preflight --change-file <arquivo.json> --strict-targets',
		'  node scripts/form-automation/semi-auto-form-flow.mjs plan --change-file <arquivo.json> --apply --approve-critical <FORM_NAME>',
		'  node scripts/form-automation/semi-auto-form-flow.mjs plan --change-file <arquivo.json> --apply --approve-pii <FORM_NAME>',
		'  node scripts/form-automation/semi-auto-form-flow.mjs plan --change-file <arquivo.json> --apply --approval-file <arquivo.json>',
		'',
		'Regras de seguranca aplicadas automaticamente:',
		'  - Nao aplica alteracoes sem --apply',
		'  - Nao aplica alteracoes em fluxo critico sem --approve-critical por formulario',
		'  - Bloqueia alteracoes em auth/billing/RLS/CORS/rate limiting sem --approve-sensitive <FORM_NAME>',
		'  - Bloqueia alteracoes com impacto PII sem --approve-pii <FORM_NAME>',
		'  - Pode usar --approval-file para auditoria formal de aprovacoes humanas',
		'  - Pode usar --strict-targets para falhar se formulario nao resolver arquivos alvo',
	].join('\n');
}

export function loadApprovalFile(approvalFilePath, { strictAudit = false } = {}) {
	if (!approvalFilePath) {
		return {
			approver: '',
			approvedAt: '',
			approvedCritical: [],
			approvedPii: [],
			approvedSensitive: [],
		};
	}

	const absolute = path.isAbsolute(approvalFilePath)
		? approvalFilePath
		: path.join(REPO_ROOT, approvalFilePath);

	if (!fs.existsSync(absolute)) {
		throw new Error(`Approval file nao encontrado: ${absolute}`);
	}

	const parsed = JSON.parse(fs.readFileSync(absolute, 'utf8'));
	if (typeof parsed !== 'object' || parsed === null) {
		throw new Error('Approval file invalido: payload JSON deve ser um objeto.');
	}

	const approver = typeof parsed.approver === 'string' ? parsed.approver.trim() : '';
	const approvedAt = typeof parsed.approvedAt === 'string' ? parsed.approvedAt.trim() : '';

	if (strictAudit) {
		if (!approver) {
			throw new Error('Approval file invalido: campo "approver" obrigatorio em modo auditavel.');
		}
		if (!approvedAt || Number.isNaN(Date.parse(approvedAt))) {
			throw new Error('Approval file invalido: campo "approvedAt" (ISO date) obrigatorio em modo auditavel.');
		}
	}

	return {
		path: absolute,
		approver,
		approvedAt,
		approvedCritical: Array.isArray(parsed.approvedCritical) ? parsed.approvedCritical : [],
		approvedPii: Array.isArray(parsed.approvedPii) ? parsed.approvedPii : [],
		approvedSensitive: Array.isArray(parsed.approvedSensitive) ? parsed.approvedSensitive : [],
	};
}

function normalizeRepoPath(p) {
	const normalized = p.replace(/\\/g, '/');
	if (path.isAbsolute(normalized)) {
		return path.relative(REPO_ROOT, normalized).replace(/\\/g, '/');
	}
	return normalized.replace(/^\.\//, '');
}

function safeRead(filePath) {
	return fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : '';
}

function writeFileEnsured(filePath, content) {
	fs.mkdirSync(path.dirname(filePath), { recursive: true });
	fs.writeFileSync(filePath, content, 'utf8');
}

export function loadChangeRequest(changeFilePath) {
	if (!changeFilePath) {
		throw new Error('Parametro obrigatorio ausente: --change-file <arquivo.json>');
	}

	const absolute = path.isAbsolute(changeFilePath)
		? changeFilePath
		: path.join(REPO_ROOT, changeFilePath);

	if (!fs.existsSync(absolute)) {
		throw new Error(`Arquivo de change request nao encontrado: ${absolute}`);
	}

	const parsed = JSON.parse(fs.readFileSync(absolute, 'utf8'));
	if (typeof parsed !== 'object' || parsed === null) {
		throw new Error('Change request invalido: payload JSON deve ser um objeto.');
	}

	if (!parsed.title || typeof parsed.title !== 'string') {
		throw new Error('Change request invalido: campo "title" obrigatorio.');
	}

	if (!Array.isArray(parsed.forms) || parsed.forms.length === 0) {
		throw new Error('Change request invalido: "forms" deve ser um array com pelo menos um item.');
	}

	for (const form of parsed.forms) {
		if (!form || typeof form !== 'object') {
			throw new Error('Change request invalido: cada item de "forms" deve ser objeto.');
		}
		if (!form.name || typeof form.name !== 'string') {
			throw new Error('Change request invalido: cada formulario deve possuir "name" string.');
		}
		if (form.patches != null && !Array.isArray(form.patches)) {
			throw new Error(`Change request invalido (${form.name}): "patches" deve ser array.`);
		}
		if (Array.isArray(form.patches)) {
			for (const patch of form.patches) {
				if (!patch || typeof patch !== 'object') {
					throw new Error(`Change request invalido (${form.name}): cada patch deve ser objeto.`);
				}
				if (typeof patch.file !== 'string' || patch.file.trim().length === 0) {
					throw new Error(`Change request invalido (${form.name}): patch.file obrigatorio.`);
				}
				if (typeof patch.search !== 'string') {
					throw new Error(`Change request invalido (${form.name}): patch.search deve ser string.`);
				}
				if (typeof patch.replace !== 'string') {
					throw new Error(`Change request invalido (${form.name}): patch.replace deve ser string.`);
				}
			}
		}
	}

	return {
		absolutePath: absolute,
		request: parsed,
	};
}

export function parseWebFormsCatalog(source) {
	const entries = [];
	const regex = /\{\s*name:\s*'([^']+)'\s*,\s*path:\s*'([^']+)'\s*,\s*group:\s*'([^']+)'\s*\}/g;
	let match = regex.exec(source);
	while (match) {
		entries.push({ name: match[1], path: match[2], group: match[3] });
		match = regex.exec(source);
	}
	return entries;
}

function inferAppScreenPath(webScreenPath) {
	return webScreenPath;
}

function extractFieldsFromSource(source) {
	const names = new Set();

	const useStateRegex = /const\s*\[\s*([A-Za-z0-9_]+)\s*,\s*set[A-Za-z0-9_]+\s*\]\s*=\s*useState/g;
	let useStateMatch = useStateRegex.exec(source);
	while (useStateMatch) {
		names.add(useStateMatch[1]);
		useStateMatch = useStateRegex.exec(source);
	}

	const dottedAccessRegex = /(?:formData|values|data|state)\.([A-Za-z0-9_]+)/g;
	let dottedMatch = dottedAccessRegex.exec(source);
	while (dottedMatch) {
		names.add(dottedMatch[1]);
		dottedMatch = dottedAccessRegex.exec(source);
	}

	return Array.from(names).sort();
}

function extractValidationKeysFromSource(source) {
	const keys = new Set();
	const re = /validate[A-Za-z0-9_]*\(\s*([A-Za-z0-9_\.]+)\s*\)/g;
	let match = re.exec(source);
	while (match) {
		keys.add(match[1]);
		match = re.exec(source);
	}
	return Array.from(keys).sort();
}

function containsSensitiveArea(text) {
	const lower = text.toLowerCase();
	return SENSITIVE_AREAS.some((item) => lower.includes(item));
}

function containsLikelyPiiField(fields) {
	return fields.some((field) => {
		const lower = String(field).toLowerCase();
		return PII_FIELD_HINTS.some((hint) => lower.includes(hint));
	});
}

function hasExplicitPiiFlag(changes) {
	const added = Array.isArray(changes?.add) ? changes.add : [];
	return added.some((item) => item?.pii === true);
}

function loadI18nSources() {
	return DEFAULT_I18N_PT.map((filePath) => ({
		filePath,
		source: safeRead(filePath),
	})).filter((item) => item.source.length > 0);
}

function hasI18nKey(i18nSources, key) {
	return i18nSources.some((entry) => entry.source.includes(`"${key}"`));
}

function findExistingTestsForForm(formName) {
	const matches = [];
	const roots = [
		path.join(REPO_ROOT, 'restaurante-web', 'e2e'),
		path.join(REPO_ROOT, 'restaurante-web', 'src'),
		path.join(REPO_ROOT, 'restaurante-app', 'src'),
	];

	for (const root of roots) {
		if (!fs.existsSync(root)) {
			continue;
		}

		const queue = [root];
		while (queue.length > 0) {
			const current = queue.pop();
			const stat = fs.statSync(current);

			if (stat.isDirectory()) {
				for (const child of fs.readdirSync(current)) {
					queue.push(path.join(current, child));
				}
				continue;
			}

			if (!/(test|spec)\.(ts|tsx|js|jsx)$/i.test(current)) {
				continue;
			}

			const content = safeRead(current);
			if (content.includes(formName)) {
				matches.push(normalizeRepoPath(current));
			}
		}
	}

	return matches;
}

function createUnifiedDiff({ before, after, filePath, maxPreviewLines = 120 }) {
	if (before === after) {
		return `diff --git a/${filePath} b/${filePath}\n--- a/${filePath}\n+++ b/${filePath}\n@@ no changes @@\n`;
	}

	const beforeLines = before.split('\n');
	const afterLines = after.split('\n');
	const lineCount = Math.max(beforeLines.length, afterLines.length, maxPreviewLines);
	const previewCount = Math.min(lineCount, maxPreviewLines);

	const chunks = [];
	for (let i = 0; i < previewCount; i += 1) {
		const left = beforeLines[i] ?? '';
		const right = afterLines[i] ?? '';
		if (left !== right) {
			chunks.push(`-${left}`);
			chunks.push(`+${right}`);
		} else {
			chunks.push(` ${left}`);
		}
	}

	return [
		`diff --git a/${filePath} b/${filePath}`,
		`--- a/${filePath}`,
		`+++ b/${filePath}`,
		`@@ preview @@`,
		...chunks,
		'',
	].join('\n');
}

function applyPatchInstructionToContent(content, patch) {
	const search = patch.search ?? '';
	const replace = patch.replace ?? '';
	if (!search) {
		return { changed: false, next: content, reason: 'search vazio' };
	}

	if (!content.includes(search)) {
		return { changed: false, next: content, reason: 'trecho search nao encontrado no arquivo' };
	}

	const next = content.replace(search, replace);
	return { changed: next !== content, next, reason: next !== content ? '' : 'replace sem efeito' };
}

function buildSecurityGateBlock() {
	return [
		'🔒 Security Gate — Checklist obrigatorio para esta mudanca:',
		'',
		'[ ] Nenhum secret hardcoded (verificado em todo codigo proposto)',
		'[ ] Menor privilegio aplicado: service role key nao exposta ao cliente',
		'[ ] Input validation presente em todas as bordas do sistema afetadas',
		'[ ] RLS cobre os novos dados/tabelas envolvidos',
		'[ ] CORS/headers de seguranca preservados ou endurecidos',
		'[ ] Logs nao expoem PII em texto claro',
		'[ ] Idempotencia garantida em operacoes de billing/webhook',
		'[ ] Smoke test planejado para validacao pos-deploy',
		'[ ] LGPD verificada (se PII envolvido)',
		'[ ] Evidencia de validacao sera documentada no mesmo ciclo de trabalho',
	].join('\n');
}

function buildReportMarkdown(result) {
	const lines = [];
	lines.push('# Fluxo Semi-Automatico de Formularios — Relatorio');
	lines.push('');
	lines.push(`- Change request: ${normalizeRepoPath(result.meta.changeFile)}`);
	lines.push(`- Modo: ${result.meta.mode}`);
	lines.push(`- Aplicacao de patches: ${result.meta.apply ? 'habilitada' : 'somente proposta'}`);
	lines.push('');

	lines.push('## Resumo Executivo');
	lines.push(`- Formularios processados: ${result.summary.totalForms}`);
	lines.push(`- Diffs propostos: ${result.summary.proposedDiffs}`);
	lines.push(`- Diffs aplicados: ${result.summary.appliedDiffs}`);
	lines.push(`- Bloqueios por gate sensivel: ${result.summary.blockedByGate}`);
	lines.push('');

	lines.push('## Planos por Formulario');
	for (const form of result.forms) {
		lines.push(`### ${form.name}`);
		lines.push(`- Fluxo critico: ${form.isCritical ? 'sim' : 'nao'}`);
		lines.push(`- Arquivos alvo: ${form.targetFiles.join(', ') || 'nenhum'}`);
		lines.push(`- Campos atuais detectados: ${form.detectedFields.join(', ') || 'nenhum'}`);
		lines.push(`- Campos adicionados: ${(form.requestedChanges.add || []).map((x) => x.name).join(', ') || 'nenhum'}`);
		lines.push(`- Campos removidos: ${(form.requestedChanges.remove || []).join(', ') || 'nenhum'}`);
		lines.push(`- Campos renomeados: ${(form.requestedChanges.rename || []).map((x) => `${x.from}->${x.to}`).join(', ') || 'nenhum'}`);
		lines.push(`- Validacoes alteradas: ${(form.requestedChanges.validation || []).map((x) => x.field).join(', ') || 'nenhum'}`);
		lines.push(`- Checklist risco auth/billing/RLS/CORS/rate limiting: ${form.checklist.securitySensitiveArea ? 'atingido (gate)' : 'nao'}`);
		lines.push(`- Checklist LGPD/PII: ${form.checklist.piiImpact ? 'sim' : 'nao'}`);
		lines.push(`- Testes relacionados encontrados: ${form.relatedTests.join(', ') || 'nenhum'}`);
		lines.push('');
	}

	lines.push('## Security Gate');
	lines.push(buildSecurityGateBlock());
	lines.push('');

	lines.push('## Validacoes Locais');
	if (result.validation.commands.length === 0) {
		lines.push('- Nenhum comando informado em "validationCommands" no change request.');
	} else {
		for (const cmd of result.validation.commands) {
			lines.push(`- ${cmd.command} => ${cmd.status}`);
		}
	}
	lines.push('');

	lines.push('## Definicao de pronto');
	lines.push('- [ ] Diffs revisados e aplicados com aprovacao');
	lines.push('- [ ] Testes relevantes passando');
	lines.push('- [ ] Sem regressao obvia em fluxo critico');
	lines.push('- [ ] Evidencias registradas');
	lines.push('- [ ] PR description pronta');
	lines.push('');

	return lines.join('\n');
}

function buildPrDescriptionDraft(result) {
	const formNames = result.forms.map((f) => f.name).join(', ');
	return [
		'# Context',
		`This PR applies a semi-automated form evolution flow for: ${formNames}.`,
		'',
		'# Technical Decisions',
		'- Used safe proposal-first workflow (no sensitive auto-overwrite by default).',
		'- Added per-form impact analysis (fields, validation, UX/a11y, tests).',
		'- Preserved multi-tenant constraints and blocked sensitive areas without explicit gate.',
		'',
		'# Risks and Mitigations',
		'- Risk: accidental changes in critical operational screens.',
		'- Mitigation: explicit critical approval token required before apply.',
		'- Risk: sensitive domains (auth/billing/RLS/CORS/rate limiting).',
		'- Mitigation: hard gate blocking automatic apply and forcing manual approval.',
		'',
		'# Evidence',
		'- Generated report: tmp/form-automation/form-change-report.md',
		'- Generated diffs: tmp/form-automation/proposed-diffs/',
		'- Validation commands and status: tmp/form-automation/validation-results.json',
	].join('\n');
}

function buildPendingApprovalsMarkdown(result) {
	const lines = ['# Aprovacoes Pendentes', ''];
	const blocked = result.forms
		.map((form) => ({
			name: form.name,
			blocked: form.patchResults.filter((p) => p.status === 'blocked'),
		}))
		.filter((item) => item.blocked.length > 0);

	if (blocked.length === 0) {
		lines.push('- Nenhuma aprovacao pendente.');
		return lines.join('\n');
	}

	for (const item of blocked) {
		lines.push(`## ${item.name}`);
		for (const patch of item.blocked) {
			lines.push(`- Arquivo: ${patch.file}`);
			lines.push(`- Motivo do bloqueio: ${patch.reason}`);
			if (patch.diff) {
				lines.push(`- Diff proposto: ${patch.diff}`);
			}
			if (patch.reason.includes('--approve-critical')) {
				lines.push(`- Acao sugerida: adicionar --approve-critical ${item.name}`);
			}
			if (patch.reason.includes('--approve-pii')) {
				lines.push(`- Acao sugerida: adicionar --approve-pii ${item.name}`);
			}
			if (patch.reason.includes('--approve-sensitive')) {
				lines.push(`- Acao sugerida: adicionar --approve-sensitive ${item.name}`);
			}
			lines.push('');
		}
	}

	return lines.join('\n');
}

export function executeFlow(args) {
	const { request, absolutePath } = loadChangeRequest(args.changeFile);
	const approvals = loadApprovalFile(args.approvalFile, { strictAudit: Boolean(args.apply && args.approvalFile) });
	const outputDir = path.isAbsolute(args.outputDir) ? args.outputDir : path.join(REPO_ROOT, args.outputDir);
	fs.mkdirSync(outputDir, { recursive: true });

	const webCatalogRaw = safeRead(DEFAULT_WEB_CATALOG_PATH);
	const webCatalog = parseWebFormsCatalog(webCatalogRaw);
	const i18nSources = loadI18nSources();

	const result = {
		meta: {
			mode: args.mode,
			apply: Boolean(args.apply),
			changeFile: absolutePath,
			approvalFile: approvals.path ? normalizeRepoPath(approvals.path) : '',
			approver: approvals.approver,
			approvedAt: approvals.approvedAt || '',
			outputDir,
			generatedAt: new Date().toISOString(),
		},
		summary: {
			totalForms: request.forms.length,
			proposedDiffs: 0,
			appliedDiffs: 0,
			blockedByGate: 0,
		},
		targetResolution: [],
		forms: [],
		validation: {
			commands: [],
		},
	};

	const diffDir = path.join(outputDir, 'proposed-diffs');
	fs.mkdirSync(diffDir, { recursive: true });

	for (const form of request.forms) {
		const name = form.name;
		const requestedChanges = form.fields || {};
		const catalogEntry = webCatalog.find((entry) => entry.name === name);
		const targetFiles = [];

		if (catalogEntry) {
			targetFiles.push(path.join('restaurante-web', catalogEntry.path).replace(/\\/g, '/'));
			const appCandidate = path.join(REPO_ROOT, 'restaurante-app', inferAppScreenPath(catalogEntry.path));
			if (fs.existsSync(appCandidate)) {
				targetFiles.push(path.join('restaurante-app', inferAppScreenPath(catalogEntry.path)).replace(/\\/g, '/'));
			}
		}

		if (form.targetFiles && typeof form.targetFiles === 'object') {
			for (const customTarget of Object.values(form.targetFiles)) {
				if (typeof customTarget === 'string' && customTarget.trim().length > 0) {
					targetFiles.push(normalizeRepoPath(customTarget));
				}
			}
		}

		const uniqueTargets = Array.from(new Set(targetFiles));

		if (args.strictTargets && uniqueTargets.length === 0) {
			throw new Error(`Strict targets: formulario ${name} nao possui arquivos alvo resolvidos.`);
		}

		result.targetResolution.push({
			formName: name,
			foundInCatalog: Boolean(catalogEntry),
			targetFiles: uniqueTargets,
		});

		const mergedSource = uniqueTargets
			.map((target) => safeRead(path.join(REPO_ROOT, target)))
			.filter(Boolean)
			.join('\n');

		const detectedFields = extractFieldsFromSource(mergedSource);
		const detectedValidation = extractValidationKeysFromSource(mergedSource);

		const formIsCritical = CRITICAL_SCREEN_NAMES.has(name) || form.critical === true;
		const formHasSensitiveArea = containsSensitiveArea(JSON.stringify(form));
		const addedFields = (requestedChanges.add || []).map((item) => item.name).filter(Boolean);
		const removedFields = (requestedChanges.remove || []).filter(Boolean);
		const renamedFields = (requestedChanges.rename || []).filter((item) => item?.from && item?.to);
		const validationChanges = (requestedChanges.validation || []).filter((item) => item?.field);
		const piiImpact = containsLikelyPiiField([...addedFields, ...removedFields, ...renamedFields.map((i) => i.to)]);
		const piiImpactExplicit = hasExplicitPiiFlag(requestedChanges);
		const piiImpactFinal = piiImpact || piiImpactExplicit;
		const missingI18nKeys = validationChanges
			.map((item) => item.messageKey)
			.filter((key) => typeof key === 'string' && key.length > 0)
			.filter((key) => !hasI18nKey(i18nSources, key));
		const relatedTests = findExistingTestsForForm(name);

		const formResult = {
			name,
			isCritical: formIsCritical,
			targetFiles: uniqueTargets,
			detectedFields,
			detectedValidation,
			requestedChanges: {
				add: requestedChanges.add || [],
				remove: removedFields,
				rename: renamedFields,
				validation: validationChanges,
				uxAccessibilityImpact: form.uxAccessibilityImpact || 'nao informado',
			},
			checklist: {
				criticalFlowImpact: formIsCritical,
				inputValidationImpact: validationChanges.length > 0 || addedFields.length > 0,
				i18nImpact: missingI18nKeys.length > 0,
				testsImpact: relatedTests.length > 0,
				securitySensitiveArea: formHasSensitiveArea,
				piiImpact: piiImpactFinal,
			},
			missingI18nKeys,
			relatedTests,
			patchResults: [],
		};

		const patches = Array.isArray(form.patches) ? form.patches : [];
		for (let index = 0; index < patches.length; index += 1) {
			const patchSpec = patches[index];
			const targetPath = normalizeRepoPath(patchSpec.file || '');
			if (!targetPath) {
				formResult.patchResults.push({
					index,
					file: targetPath,
					status: 'skipped',
					reason: 'arquivo alvo nao informado no patch',
				});
				continue;
			}

			const absoluteTarget = path.join(REPO_ROOT, targetPath);
			if (!fs.existsSync(absoluteTarget)) {
				formResult.patchResults.push({
					index,
					file: targetPath,
					status: 'skipped',
					reason: 'arquivo alvo nao encontrado',
				});
				continue;
			}

			const before = fs.readFileSync(absoluteTarget, 'utf8');
			const applied = applyPatchInstructionToContent(before, patchSpec);
			const after = applied.next;
			const diff = createUnifiedDiff({ before, after, filePath: targetPath });
			const diffFile = path.join(diffDir, `${name}-${index + 1}.diff`);
			writeFileEnsured(diffFile, diff);

			const patchTouchesSensitiveArea = containsSensitiveArea(JSON.stringify(patchSpec));
			const criticalApproved = args.approveCritical.includes(name) || approvals.approvedCritical.includes(name);
			const sensitiveApproved = args.approveSensitive.includes(name) || approvals.approvedSensitive.includes(name);
			const piiApproved = args.approvePii.includes(name) || approvals.approvedPii.includes(name);

			const blockedByCriticalGate = formIsCritical && !criticalApproved;
			const blockedBySensitiveGate = patchTouchesSensitiveArea && !sensitiveApproved;
			const blockedByPiiGate = piiImpactFinal && !piiApproved;

			result.summary.proposedDiffs += 1;

			if (!args.apply) {
				formResult.patchResults.push({
					index,
					file: targetPath,
					status: 'proposed',
					reason: applied.reason || 'modo somente proposta',
					diff: normalizeRepoPath(diffFile),
				});
				continue;
			}

			if (blockedByCriticalGate || blockedBySensitiveGate || blockedByPiiGate) {
				result.summary.blockedByGate += 1;
				let reason = '';
				if (blockedByCriticalGate) {
					reason = 'formulario critico sem --approve-critical';
				} else if (blockedBySensitiveGate) {
					reason = 'patch em area sensivel sem --approve-sensitive (auth/billing/RLS/CORS/rate limiting)';
				} else {
					reason = 'impacto PII sem --approve-pii';
				}
				formResult.patchResults.push({
					index,
					file: targetPath,
					status: 'blocked',
					reason,
					diff: normalizeRepoPath(diffFile),
				});
				continue;
			}

			if (!applied.changed) {
				formResult.patchResults.push({
					index,
					file: targetPath,
					status: 'skipped',
					reason: applied.reason,
					diff: normalizeRepoPath(diffFile),
				});
				continue;
			}

			fs.writeFileSync(absoluteTarget, after, 'utf8');
			result.summary.appliedDiffs += 1;
			formResult.patchResults.push({
				index,
				file: targetPath,
				status: 'applied',
				reason: 'aplicado com sucesso',
				diff: normalizeRepoPath(diffFile),
			});
		}

		result.forms.push(formResult);
	}

	const validationCommands = Array.isArray(request.validationCommands) ? request.validationCommands : [];
	for (const command of validationCommands) {
		if (!args.runValidation) {
			result.validation.commands.push({
				command,
				status: 'not-run',
			});
			continue;
		}

		const run = spawnSync(command, {
			cwd: REPO_ROOT,
			shell: true,
			encoding: 'utf8',
			stdio: 'pipe',
		});

		result.validation.commands.push({
			command,
			status: run.status === 0 ? 'passed' : 'failed',
			exitCode: run.status,
			stdout: run.stdout?.slice(0, 8000) || '',
			stderr: run.stderr?.slice(0, 8000) || '',
		});
	}

	writeFileEnsured(path.join(outputDir, 'form-change-summary.json'), JSON.stringify(result, null, 2));
	writeFileEnsured(path.join(outputDir, 'target-resolution.json'), JSON.stringify(result.targetResolution, null, 2));
	writeFileEnsured(path.join(outputDir, 'form-change-report.md'), buildReportMarkdown(result));
	writeFileEnsured(path.join(outputDir, 'pr-description-draft.md'), buildPrDescriptionDraft(result));
	writeFileEnsured(path.join(outputDir, 'validation-results.json'), JSON.stringify(result.validation, null, 2));
	writeFileEnsured(path.join(outputDir, 'security-gate.md'), buildSecurityGateBlock());
	writeFileEnsured(path.join(outputDir, 'pending-approvals.md'), buildPendingApprovalsMarkdown(result));
	writeFileEnsured(
		path.join(outputDir, 'approval-audit.json'),
		JSON.stringify(
			{
				approvalFile: approvals.path ? normalizeRepoPath(approvals.path) : '',
				approver: approvals.approver,
				approvedAt: approvals.approvedAt || '',
				approvedCritical: Array.from(new Set([...(approvals.approvedCritical || []), ...(args.approveCritical || [])])),
				approvedPii: Array.from(new Set([...(approvals.approvedPii || []), ...(args.approvePii || [])])),
				approvedSensitive: Array.from(new Set([...(approvals.approvedSensitive || []), ...(args.approveSensitive || [])])),
				generatedAt: new Date().toISOString(),
			},
			null,
			2,
		),
	);

	return result;
}

function main() {
	const args = parseArgs(process.argv);
	if (args.help) {
		process.stdout.write(`${getUsage()}\n`);
		process.exit(0);
	}

	try {
		const result = executeFlow(args);
		process.stdout.write(`Fluxo concluido. Relatorio: ${normalizeRepoPath(path.join(result.meta.outputDir, 'form-change-report.md'))}\n`);
		if (result.summary.blockedByGate > 0) {
			process.stdout.write(`Atencao: ${result.summary.blockedByGate} alteracao(oes) bloqueada(s) por gate de seguranca.\n`);
			if (args.apply) {
				process.stderr.write('[form-flow] Execucao apply interrompida: existem aprovacoes humanas pendentes.\n');
				process.exit(2);
			}
		}
	} catch (error) {
		process.stderr.write(`[form-flow] Erro: ${error.message}\n`);
		process.exit(1);
	}
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(CURRENT_FILE)) {
	main();
}
