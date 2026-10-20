/**
 * Lords Mobile Account Valuation & Scoring Utility
 * 
 * Точний розрахунок реальної ринкової сили акаунта та оцінки вигідності (Value for Money)
 * Підтримка пресетів для різних стилів гри (Rally Lead, Blast, Low Might, Донат/Прокачка, Баланс)
 */

export const PRESETS = [
  { id: 'balance', label: '⚖️ Баланс', shortLabel: 'Баланс', desc: 'Універсальна ринкова оцінка сили та ціни' },
  { id: 'rally_mix', label: '⚔️ Rally / Mix Lead', shortLabel: 'Rally Mix', desc: 'Фокус на Mix Атаку, Army HP/ATK та Champ шмот' },
  { id: 'blast', label: '💥 Blast / Моно', shortLabel: 'Blast Моно', desc: 'Фокус на Blast статки та пробив фортів' },
  { id: 'low_might', label: '🛡 Low Might / KD', shortLabel: 'Low Might', desc: 'Фокус на 0 Quest Might та політ у нові королівства' },
  { id: 'donate', label: '💎 Герої & Донат', shortLabel: 'Донат', desc: 'Фокус на артефакти, скіни замку, героїв та Т5 ману' }
];

// Парсер формату "645-623-643", "645/623/643", "645 623 643" або "+645.34% / +623.47% / +643.7%"
export const parseTripleStats = (rawVal) => {
  if (!rawVal) return { inf: 0, range: 0, cav: 0, avg: 0, sum: 0, raw: '' };
  
  if (typeof rawVal === 'object') {
    const inf = parseFloat(rawVal.inf || rawVal.infantry || 0);
    const range = parseFloat(rawVal.range || rawVal.ranged || 0);
    const cav = parseFloat(rawVal.cav || rawVal.cavalry || 0);
    const sum = inf + range + cav;
    const avg = sum / 3;
    return { inf, range, cav, avg, sum, raw: `${inf}-${range}-${cav}` };
  }

  const str = String(rawVal);
  const nums = str.match(/\d+(\.\d+)?/g);
  if (!nums || nums.length === 0) {
    return { inf: 0, range: 0, cav: 0, avg: 0, sum: 0, raw: str };
  }

  const inf = parseFloat(nums[0] || 0);
  const range = parseFloat(nums[1] || nums[0]);
  const cav = parseFloat(nums[2] || nums[1] || nums[0]);
  const sum = inf + range + cav;
  const avg = sum / 3;

  return { inf, range, cav, avg, sum, raw: str };
};

// Прогресивна оцінка рівня артефактів (макс ~2850+, перші 700 прості)
export const calcArtifactScore = (levelRaw) => {
  const lvl = Math.max(0, parseFloat(levelRaw || 0));
  if (lvl <= 0) return 0;

  // Рівні 1–700: 0.2 бала за рівень (макс 140)
  if (lvl <= 700) {
    return lvl * 0.2;
  }
  // Рівні 701–1500: 0.8 бала за рівень (макс 640)
  if (lvl <= 1500) {
    return 140 + (lvl - 700) * 0.8;
  }
  // Рівні 1501+: 1.5 бала за рівень (топ-донат)
  return 140 + 640 + (lvl - 1500) * 1.5;
};

// Прогресивна оцінка рівнів скінів замку (макс ~320+, перші 20 прості)
export const calcCastleSkinScore = (levelRaw) => {
  const lvl = Math.max(0, parseFloat(levelRaw || 0));
  if (lvl <= 0) return 0;

  // Рівні 1–20: 1 бал за рівень (макс 20)
  if (lvl <= 20) {
    return lvl * 1;
  }
  // Рівні 21–80: 3 бали за рівень (макс 180)
  if (lvl <= 80) {
    return 20 + (lvl - 20) * 3;
  }
  // Рівні 81+: 6 балів за рівень (донатні скіни 5★)
  return 20 + 180 + (lvl - 80) * 6;
};

// Бали за Mana Troops (рівні 1–6)
export const calcManaTroopsScore = (lvlRaw) => {
  const lvl = parseInt(lvlRaw || 0, 10);
  const table = [0, 50, 100, 150, 200, 400, 500];
  if (lvl >= 1 && lvl <= 6) return table[lvl];
  if (lvlRaw === true || String(lvlRaw).toLowerCase() === 'yes') return 200;
  return 0;
};

// Бали за Max KD (якщо більше базового відкритого порогу 1250)
export const calcMaxKdScore = (kdRaw, baseThreshold = 1250) => {
  const kd = parseInt(kdRaw || 0, 10);
  if (kd > baseThreshold) {
    return (kd - baseThreshold) * 1.5;
  }
  return 0;
};

/**
 * Комплексний розрахунок сили акаунта та індексу вигідності
 * Підтримує пресет оцінки: 'balance' | 'rally_mix' | 'blast' | 'low_might' | 'donate'
 */
export const calculateAccountValuation = (account, baseKdThreshold = 1250, preset = 'balance') => {
  if (!account) return null;

  const stats = typeof account.stats === 'string' 
    ? (JSON.parse(account.stats || '{}')) 
    : (account.stats || {});

  const price = Math.max(1, parseFloat(account.price || 0));

  // 1. White Stats (Чисті статки без одягу)
  const whiteRaw = stats.white_stats || stats.mix_atk_base || stats.whiteStats || '';
  const white = parseTripleStats(whiteRaw);

  // 2. Mix Stats (Сет як на скріні з лідером)
  const mixRaw = stats.mix_stats || (typeof stats.mix_atk === 'object' ? stats.mix_atk.leader : stats.mix_atk) || '';
  const mix = parseTripleStats(mixRaw);

  // 3. Blast Stats (Моно-удар)
  const blastRaw = stats.blast_stats || (typeof stats.mono_atk === 'object' ? stats.mono_atk.leader : stats.mono_atk) || '';
  const blast = parseTripleStats(blastRaw);

  // 4. Army ATK & Army HP
  const armyAtk = parseFloat(stats.army_atk || (typeof stats.army_mix_atk === 'object' ? stats.army_mix_atk.leader : stats.army_mix_atk) || 0);
  const armyHp = parseFloat(stats.army_hp || (typeof stats.army_mix_hp === 'object' ? stats.army_mix_hp.leader : stats.army_mix_hp) || 0);

  // 5. Mana Troops (Т5)
  const manaLvl = parseInt(stats.mana_troops_lvl || stats.mana_lvl || 0, 10);
  const baseManaScore = calcManaTroopsScore(manaLvl || stats.mana_troops);

  // 6. Artifacts Level
  const artifactLvl = parseFloat(stats.artifact_lvl || stats.artifacts_lvl || stats.artifacts || 0);
  const baseArtifactScore = calcArtifactScore(artifactLvl);

  // 7. Castle Skins
  const skinLvl = parseFloat(stats.castle_skins_lvl || stats.skins_lvl || stats.castle || 0);
  const baseSkinScore = calcCastleSkinScore(skinLvl);

  // 8. Champ Gear Pieces (0–11)
  const champCount = Math.min(11, Math.max(0, parseInt(stats.champ_pieces || stats.champ_gear || 0, 10) || 0));

  // 9. Low Might (0 Quest Might) супер-бонус
  const isLowMight = Boolean(
    stats.is_low_might || 
    stats.low_might || 
    (stats.might && String(stats.might).toLowerCase().includes('low')) ||
    (account.tags && account.tags.some(t => t.toLowerCase().includes('low might')))
  );

  // 10. Max KD
  const maxKd = parseInt(stats.max_kd || 0, 10);
  const baseMaxKdScore = calcMaxKdScore(maxKd, baseKdThreshold);

  // Герої та фамільяри
  const heroesCount = parseInt(stats.heroes || 0, 10) || 0;
  const famsCount = parseInt(stats.familiars || 0, 10) || 0;

  // Динамічний розрахунок за вибраним пресетом
  let whiteScore = white.avg * 3.0;
  let mixScore = mix.avg * 2.0;
  let blastScore = blast.avg * 1.2;
  let armyAtkScore = armyAtk * 0.5;
  let armyHpScore = armyHp * 0.5;
  let manaScore = baseManaScore;
  let artifactScore = baseArtifactScore;
  let skinScore = baseSkinScore;
  let champScore = champCount * 120;
  let lowMightScore = isLowMight ? 800 : 0;
  let maxKdScore = baseMaxKdScore;

  if (preset === 'rally_mix') {
    // Rally / Wonder Lead: величезний наголос на Mix ATK, Army HP/ATK та Champ шмот
    mixScore = mix.avg * 4.2;
    whiteScore = white.avg * 2.5;
    blastScore = blast.avg * 0.6;
    armyAtkScore = armyAtk * 1.5;
    armyHpScore = armyHp * 1.5;
    champScore = champCount * 220;
    manaScore = baseManaScore * 1.2;
    lowMightScore = isLowMight ? 400 : 0;
    maxKdScore = baseMaxKdScore * 0.8;
  } else if (preset === 'blast') {
    // Blast / Моно-ударник: максимум на Blast Inf/Rng/Cav
    blastScore = blast.avg * 3.6;
    whiteScore = white.avg * 2.2;
    mixScore = mix.avg * 1.0;
    armyAtkScore = armyAtk * 0.8;
    armyHpScore = armyHp * 0.4;
    champScore = champCount * 140;
    manaScore = baseManaScore * 1.0;
    lowMightScore = isLowMight ? 500 : 0;
  } else if (preset === 'low_might') {
    // Low Might Trap / KD Migration: величезний бонус за 0 Quest Might і свіжі KD
    lowMightScore = isLowMight ? 1600 : 0;
    maxKdScore = baseMaxKdScore * 3.0;
    mixScore = mix.avg * 2.6;
    armyHpScore = armyHp * 1.6;
    armyAtkScore = armyAtk * 1.0;
    whiteScore = white.avg * 2.0;
    blastScore = blast.avg * 0.8;
    champScore = champCount * 100;
  } else if (preset === 'donate') {
    // Герої, фамільяри, артефакти, скіни та мана
    artifactScore = baseArtifactScore * 1.8;
    skinScore = baseSkinScore * 1.8;
    manaScore = baseManaScore * 1.8;
    champScore = champCount * 220;
    const heroesBonus = heroesCount * 70 + famsCount * 70;
    champScore += heroesBonus;
    whiteScore = white.avg * 2.0;
    mixScore = mix.avg * 1.8;
    blastScore = blast.avg * 1.0;
    lowMightScore = isLowMight ? 400 : 0;
  }

  // Загальний рейтинг сили (Total Power Score)
  const totalScore = Math.round(
    whiteScore + 
    mixScore + 
    blastScore + 
    armyAtkScore + 
    armyHpScore + 
    manaScore + 
    artifactScore + 
    skinScore + 
    champScore + 
    lowMightScore + 
    maxKdScore
  );

  // Індекс вигідності (Score / Price)
  const valueIndex = parseFloat((totalScore / price).toFixed(2));

  return {
    accountId: account.id,
    preset,
    price,
    totalScore,
    valueIndex,
    white: { ...white, score: Math.round(whiteScore) },
    mix: { ...mix, score: Math.round(mixScore) },
    blast: { ...blast, score: Math.round(blastScore) },
    armyAtk: { value: armyAtk, score: Math.round(armyAtkScore) },
    armyHp: { value: armyHp, score: Math.round(armyHpScore) },
    mana: { level: manaLvl, score: Math.round(manaScore) },
    artifact: { level: artifactLvl, score: Math.round(artifactScore) },
    skins: { level: skinLvl, score: Math.round(skinScore) },
    champ: { count: champCount, score: Math.round(champScore) },
    isLowMight,
    lowMightScore: Math.round(lowMightScore),
    maxKd: { kd: maxKd, score: Math.round(maxKdScore) }
  };
};
