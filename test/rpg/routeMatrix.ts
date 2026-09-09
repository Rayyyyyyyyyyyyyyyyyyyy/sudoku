import type { ClassId, SpecializationMode } from '../../src/lib/rpg/types.ts';

export const ROUTE_MATRIX = (['warrior', 'mage', 'ranger'] as ClassId[]).flatMap(classId =>
  (['direct', 'prepared'] as SpecializationMode[]).flatMap(mode => (['parley', 'dream'] as const).map(route => ({
    name: `${classId}-${mode}-${route}`,
    classId,
    mode,
    route,
    seeds: [0, 1, 2, 3, 4, 5],
    decisions: route === 'parley'
      ? ['listen', 'supplies', 'ruins', 'rune', 'staff', 'event-outcome', 'rescue', 'lift', 'fight-crocodile', mode, 'buy', 'approach-thorns', 'fight-wolf', 'declare', 'parley', 'name', 'short', 'key', 'study', 'gallery', 'truth', 'cells-truth', 'focus', 'fight-guardian', 'listen-bells', 'rest-threshold', 'fight-gaznak', 'hero-record']
      : ['listen', 'supplies', 'ruins', 'rune', 'staff', 'event-outcome', 'covenant', 'keep', 'staff-day-one', 'support-night-one', 'shield-day-two', 'track-night-two', 'temper-day-three', mode, 'buy', 'approach-thorns', 'fight-wolf', 'open', 'dream', 'mirror', 'name-wolf', 'take-mirror', 'remember', 'gallery', 'truth', 'cells-truth', 'focus', 'fight-guardian', 'listen-bells', 'rest-threshold', 'fight-gaznak', 'hero-record'],
    delayedConsequences: route === 'parley'
      ? ['宣名警戒→弩手生命代價', '傳令節拍→守龍情報', '骨匙→蓄水池側門', '救出鐘匠→禁書庫反咒']
      : ['森林盟約→第一夜支援', '狼名→牆中辨夢', '燭淚鏡→破綻技能取捨', '夢境情報→Gaznak 手腕加成'],
  }))));

export function routeOverrides(mode: SpecializationMode, route: 'parley' | 'dream'): Record<string, string> {
  return {
    forge: mode,
    gate: route === 'parley' ? 'declare' : 'open',
    'porte-resonant': route,
    ...(route === 'parley'
      ? { 'parley-guard': 'name', 'parley-message': 'short', 'parley-servants': 'key', 'parley-cistern': 'study' }
      : { marsh: 'covenant', 'forest-covenant': 'keep', 'siege-day-one': 'staff', 'siege-night-one': 'support', 'siege-day-two': 'shield', 'siege-night-two': 'track', 'siege-day-three': 'temper',
          'dream-woman': 'mirror', 'dream-wall': 'name', 'dream-candles': 'take', 'dream-stair': 'remember' }),
  };
}
