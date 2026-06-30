export const DAY_MS = 7_200_000;
export const NIGHT_MS = 1_800_000;
export const DAY_NIGHT_CYCLE_MS = DAY_MS + NIGHT_MS;
export const RAIN_ANCHOR_MS = 1_727_685_900_000;
export const SERVER_TIME_ZONE = "Europe/Moscow";

const MINUTE_MS = 60_000;
const HOUR_MS = 3_600_000;
const DAY_NIGHT_OFFSET_MS = DAY_MS;

const RAIN_WEATHER = [
  [0, 1_800_000], [1_800_000, 2_700_000], [2_700_000, 3_600_000], [3_600_000, 4_500_000],
  [4_500_000, 7_200_000], [7_200_000, 8_100_000], [8_100_000, 10_800_000], [10_800_000, 11_700_000],
  [11_700_000, 16_200_000], [16_200_000, 17_100_000], [17_100_000, 21_600_000], [21_600_000, 22_500_000],
  [22_500_000, 23_400_000], [23_400_000, 24_300_000], [24_300_000, 25_200_000], [25_200_000, 26_100_000],
  [26_100_000, 30_600_000], [30_600_000, 31_500_000], [31_500_000, 34_200_000], [34_200_000, 35_100_000],
  [35_100_000, 36_000_000], [36_000_000, 36_900_000], [36_900_000, 39_600_000], [39_600_000, 40_500_000],
  [40_500_000, 41_400_000], [41_400_000, 42_300_000], [42_300_000, 46_800_000], [46_800_000, 47_700_000],
  [47_700_000, 48_600_000], [48_600_000, 49_500_000], [49_500_000, 52_200_000], [52_200_000, 53_100_000],
  [53_100_000, 55_800_000], [55_800_000, 56_700_000], [56_700_000, 57_600_000], [57_600_000, 58_500_000],
  [58_500_000, 59_400_000], [59_400_000, 60_300_000], [60_300_000, 66_600_000], [66_600_000, 67_500_000],
  [67_500_000, 70_200_000], [70_200_000, 71_100_000], [71_100_000, 77_400_000], [77_400_000, 78_300_000],
  [78_300_000, 81_000_000], [81_000_000, 81_900_000], [81_900_000, 82_800_000], [82_800_000, 83_700_000],
  [83_700_000, 90_000_000], [90_000_000, 90_900_000], [90_900_000, 95_400_000], [95_400_000, 96_300_000],
  [96_300_000, 99_000_000], [99_000_000, 99_900_000], [99_900_000, 102_600_000], [102_600_000, 103_500_000],
  [103_500_000, 111_600_000], [111_600_000, 112_500_000], [112_500_000, 113_400_000], [113_400_000, 114_300_000],
  [114_300_000, 115_200_000], [115_200_000, 116_100_000], [116_100_000, 131_400_000], [131_400_000, 132_300_000],
  [132_300_000, 135_000_000], [135_000_000, 135_900_000], [135_900_000, 136_800_000], [136_800_000, 137_700_000],
  [137_700_000, 142_200_000], [142_200_000, 143_100_000], [143_100_000, 156_600_000], [156_600_000, 157_500_000],
  [157_500_000, 158_400_000], [158_400_000, 159_300_000], [159_300_000, 167_400_000], [167_400_000, 168_300_000],
  [168_300_000, 169_200_000], [169_200_000, 170_100_000], [170_100_000, 172_800_000], [172_800_000, 173_700_000],
  [173_700_000, 180_000_000], [180_000_000, 180_900_000], [180_900_000, 181_800_000], [181_800_000, 182_700_000],
  [182_700_000, 185_400_000], [185_400_000, 186_300_000], [186_300_000, 198_000_000], [198_000_000, 198_900_000],
  [198_900_000, 199_800_000], [199_800_000, 200_700_000], [200_700_000, 210_600_000], [210_600_000, 211_500_000],
  [211_500_000, 217_800_000], [217_800_000, 218_700_000], [218_700_000, 221_400_000], [221_400_000, 222_300_000],
  [222_300_000, 223_200_000], [223_200_000, 224_100_000], [224_100_000, 228_600_000], [228_600_000, 229_500_000],
  [229_500_000, 230_400_000], [230_400_000, 231_300_000], [231_300_000, 232_200_000], [232_200_000, 233_100_000],
  [233_100_000, 235_800_000], [235_800_000, 236_700_000], [236_700_000, 239_400_000], [239_400_000, 240_300_000],
  [240_300_000, 241_200_000], [241_200_000, 242_100_000], [242_100_000, 244_800_000], [244_800_000, 245_700_000],
  [245_700_000, 250_200_000], [250_200_000, 251_100_000], [251_100_000, 255_600_000], [255_600_000, 256_500_000],
  [256_500_000, 261_000_000], [261_000_000, 261_900_000], [261_900_000, 266_400_000], [266_400_000, 267_300_000],
  [267_300_000, 270_000_000]
];

const RAIN_CYCLE_MS = RAIN_WEATHER.at(-1)[1];
const RAIN_SEGMENTS = RAIN_WEATHER.map(([startMs, endMs], index) => ({
  startMs,
  endMs,
  isRaining: index % 2 === 1
}));

function positiveModulo(value, modulo) {
  return ((value % modulo) + modulo) % modulo;
}

function findRainSegment(positionMs) {
  return RAIN_SEGMENTS.find((segment) => positionMs >= segment.startMs && positionMs < segment.endMs) || RAIN_SEGMENTS[0];
}

function getNextRainingSegment(positionMs) {
  const future = RAIN_SEGMENTS.find((segment) => segment.isRaining && segment.startMs >= positionMs);
  return future || RAIN_SEGMENTS.find((segment) => segment.isRaining);
}

export function resolveWeatherTimeZone(candidate) {
  const browserTimeZone = globalThis.Intl?.DateTimeFormat?.().resolvedOptions?.().timeZone;
  const timeZone = candidate || browserTimeZone || SERVER_TIME_ZONE;

  try {
    new Intl.DateTimeFormat("ru-RU", { timeZone }).format(new Date());
    return timeZone;
  } catch {
    return SERVER_TIME_ZONE;
  }
}

export function getRainState(nowMs = Date.now()) {
  const positionMs = positiveModulo(nowMs - RAIN_ANCHOR_MS, RAIN_CYCLE_MS);
  const cycleStartMs = nowMs - positionMs;
  const currentSegment = findRainSegment(positionMs);
  const nextSegment = getNextRainingSegment(positionMs);
  const nextRainOffset = nextSegment.startMs >= positionMs
    ? nextSegment.startMs - positionMs
    : RAIN_CYCLE_MS - positionMs + nextSegment.startMs;

  return {
    isRaining: currentSegment.isRaining,
    positionMs,
    nextChangeAtMs: cycleStartMs + currentSegment.endMs,
    remainingMs: Math.max(0, currentSegment.endMs - positionMs),
    nextRainAtMs: nowMs + nextRainOffset
  };
}

export function getDayNightState(nowMs = Date.now()) {
  const positionMs = positiveModulo(nowMs + DAY_NIGHT_OFFSET_MS, DAY_NIGHT_CYCLE_MS);
  const isDay = positionMs < DAY_MS;
  const remainingMs = isDay ? DAY_MS - positionMs : DAY_NIGHT_CYCLE_MS - positionMs;

  return {
    isDay,
    positionMs,
    label: isDay ? "день" : "ночь",
    nextLabel: isDay ? "ночь" : "день",
    nextChangeAtMs: nowMs + remainingMs,
    remainingMs
  };
}

export function buildWeatherTimeline(nowMs = Date.now(), horizonMs = 3 * HOUR_MS) {
  const endMs = nowMs + horizonMs;
  const timeline = [];
  let cursorMs = nowMs;

  while (cursorMs < endMs) {
    const rain = getRainState(cursorMs);
    const phase = getDayNightState(cursorMs);
    const nextBoundaryMs = Math.min(rain.nextChangeAtMs, phase.nextChangeAtMs, endMs);
    const segmentEndMs = nextBoundaryMs > cursorMs ? nextBoundaryMs : Math.min(cursorMs + 1_000, endMs);

    timeline.push({
      startMs: cursorMs,
      endMs: segmentEndMs,
      isDay: phase.isDay,
      isRaining: rain.isRaining,
      label: rain.isRaining ? "дождь" : phase.label
    });

    cursorMs = segmentEndMs;
  }

  return timeline;
}

function buildStateSlots(nowMs, horizonMs, slotMs, predicate) {
  const startMs = Math.floor(nowMs / slotMs) * slotMs;
  const endMs = nowMs + horizonMs;
  const slots = [];

  for (let currentMs = startMs; currentMs < endMs; currentMs += slotMs) {
    const slotEndMs = currentMs + slotMs;
    const probeMs = Math.max(currentMs, nowMs) + Math.min(slotMs / 2, Math.max(1, slotEndMs - Math.max(currentMs, nowMs)) / 2);
    if (!predicate(probeMs)) {
      continue;
    }

    slots.push({
      startMs: currentMs,
      endMs: slotEndMs,
      status: nowMs >= currentMs && nowMs < slotEndMs ? "live" : "future"
    });
  }

  const firstFuture = slots.find((slot) => slot.status === "future");
  if (firstFuture) {
    firstFuture.status = "next";
  }

  return slots;
}

export function buildRainSlots(nowMs = Date.now(), horizonMs = 24 * HOUR_MS) {
  return buildStateSlots(nowMs, horizonMs, 15 * MINUTE_MS, (timeMs) => getRainState(timeMs).isRaining);
}

export function buildNightSlots(nowMs = Date.now(), horizonMs = 24 * HOUR_MS) {
  return buildStateSlots(nowMs, horizonMs, 30 * MINUTE_MS, (timeMs) => !getDayNightState(timeMs).isDay);
}

export function formatWeatherDuration(ms) {
  const totalSeconds = Math.max(0, Math.floor(Number(ms) / 1_000));
  const hours = Math.floor(totalSeconds / 3_600);
  const minutes = Math.floor((totalSeconds % 3_600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (value) => String(value).padStart(2, "0");

  return hours > 0
    ? `${hours}:${pad(minutes)}:${pad(seconds)}`
    : `${pad(minutes)}:${pad(seconds)}`;
}

export function formatWeatherDurationNoSeconds(ms) {
  const totalSeconds = Math.max(0, Math.floor(Number(ms) / 1_000));
  const hours = Math.floor(totalSeconds / 3_600);
  const minutes = Math.floor((totalSeconds % 3_600) / 60);
  const pad = (value) => String(value).padStart(2, "0");

  return hours > 0
    ? `${hours}:${pad(minutes)}`
    : `${pad(minutes)} мин`;
}

export function formatRoundedDuration(ms) {
  const totalMinutes = Math.max(0, Math.floor(ms / 60_000));
  const rounded = Math.round(totalMinutes / 5) * 5; // округляем до 5 мин
  const hours = Math.floor(rounded / 60);
  const minutes = rounded % 60;

  if (hours > 0) {
    return `${hours} ч ${minutes} мин`;
  }
  return `${minutes} мин`;
}

export function formatWeatherClock(ms, timeZone) {
  return new Intl.DateTimeFormat("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: resolveWeatherTimeZone(timeZone)
  }).format(new Date(ms));
}

export function formatWeatherClockWithSeconds(ms, timeZone) {
  return new Intl.DateTimeFormat("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZone: resolveWeatherTimeZone(timeZone)
  }).format(new Date(ms));
}

export function formatWeatherTimeRange(startMs, endMs, timeZone) {
  return `${formatWeatherClock(startMs, timeZone)} - ${formatWeatherClock(endMs, timeZone)}`;
}

export function computeWorldWeather(options = {}) {
  const nowMs = Number.isFinite(Number(options.nowMs)) ? Number(options.nowMs) : Date.now();
  const displayTimeZone = resolveWeatherTimeZone(options.displayTimeZone);
  const rain = getRainState(nowMs);
  const phase = getDayNightState(nowMs);
  const horizonMs = Number(options.horizonMs || 24 * HOUR_MS);
  const timelineHorizonMs = Number(options.timelineHorizonMs || 3 * HOUR_MS);

  return {
    nowMs,
    displayTimeZone,
    current: {
      isDay: phase.isDay,
      isRaining: rain.isRaining,
      phaseLabel: phase.label,
      weatherLabel: rain.isRaining ? "дождь" : "ясно",
      stateLabel: `${phase.label} · ${rain.isRaining ? "дождь" : "ясно"}`,
      nextWeatherLabel: rain.isRaining ? "дождь закончится" : "дождь начнётся",
      nextPhaseLabel: `${phase.nextLabel} в ${formatWeatherClock(phase.nextChangeAtMs, displayTimeZone)}`,
      weatherRemainingMs: rain.remainingMs,
      phaseRemainingMs: phase.remainingMs,
      nextRainAtMs: rain.nextRainAtMs,
      nextPhaseAtMs: phase.nextChangeAtMs
    },
    timeline: buildWeatherTimeline(nowMs, timelineHorizonMs),
    rainSlots: buildRainSlots(nowMs, horizonMs),
    nightSlots: buildNightSlots(nowMs, horizonMs)
  };
}
