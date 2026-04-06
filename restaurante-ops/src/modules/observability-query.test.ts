import test from 'node:test';
import assert from 'node:assert/strict';

import {
  parseMetricsQueryParams,
  parseServicesQueryParams,
} from './observability-query.js';

test('parseMetricsQueryParams aplica defaults e compatibilidade', () => {
  const params = new URLSearchParams();
  const parsed = parseMetricsQueryParams(params);

  assert.equal(parsed.hours, 24);
  assert.equal(parsed.service, '');
  assert.equal(parsed.includeTimeline, false);
});

test('parseMetricsQueryParams aceita include_timeline e filtro service valido', () => {
  const params = new URLSearchParams({
    hours: '72',
    service: 'restaurante-web',
    include_timeline: 'true',
  });

  const parsed = parseMetricsQueryParams(params);
  assert.equal(parsed.hours, 72);
  assert.equal(parsed.service, 'restaurante-web');
  assert.equal(parsed.includeTimeline, true);
});

test('parseMetricsQueryParams bloqueia service invalido e limita faixa de horas', () => {
  const params = new URLSearchParams({
    hours: '9999',
    service: 'web<script>alert(1)</script>',
    include_timeline: '1',
  });

  const parsed = parseMetricsQueryParams(params);
  assert.equal(parsed.hours, 168);
  assert.equal(parsed.service, '');
  assert.equal(parsed.includeTimeline, true);
});

test('parseServicesQueryParams aplica default e limites', () => {
  const empty = parseServicesQueryParams(new URLSearchParams());
  assert.equal(empty.hours, 168);

  const minBound = parseServicesQueryParams(new URLSearchParams({ hours: '0' }));
  assert.equal(minBound.hours, 1);

  const maxBound = parseServicesQueryParams(new URLSearchParams({ hours: '99999' }));
  assert.equal(maxBound.hours, 720);
});
