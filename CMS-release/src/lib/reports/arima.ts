export interface ArimaForecastResult {
  values: number[];
  method: string;
  model: {
    p: number;
    d: number;
    q: number;
    aic: number;
    trainingPoints: number;
  };
  usedFallback: boolean;
}

interface ArmaFit {
  p: number;
  q: number;
  beta: number[];
  residuals: number[];
  sse: number;
  aic: number;
}

interface ForecastOptions {
  horizon?: number;
  differenceOrder?: 0 | 1;
  maxP?: number;
  maxQ?: number;
  clampMin?: number;
}

const EPSILON = 1e-9;

const average = (values: number[]) =>
  values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;

const standardDeviation = (values: number[], mean: number) => {
  if (values.length < 2) return 0;
  const variance =
    values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
};

const difference = (series: number[], order: 0 | 1) => {
  if (order === 0) return [...series];
  const result: number[] = [];
  for (let index = 1; index < series.length; index += 1) {
    result.push(series[index] - series[index - 1]);
  }
  return result;
};

const clamp = (value: number, min?: number) =>
  typeof min === "number" ? Math.max(min, value) : value;

const solveLinearSystem = (matrix: number[][], vector: number[]) => {
  const n = vector.length;
  const augmented = matrix.map((row, index) => [...row, vector[index]]);

  for (let pivot = 0; pivot < n; pivot += 1) {
    let bestRow = pivot;
    for (let row = pivot + 1; row < n; row += 1) {
      if (Math.abs(augmented[row][pivot]) > Math.abs(augmented[bestRow][pivot])) {
        bestRow = row;
      }
    }

    if (Math.abs(augmented[bestRow][pivot]) < EPSILON) {
      return null;
    }

    if (bestRow !== pivot) {
      [augmented[pivot], augmented[bestRow]] = [augmented[bestRow], augmented[pivot]];
    }

    const pivotValue = augmented[pivot][pivot];
    for (let column = pivot; column <= n; column += 1) {
      augmented[pivot][column] /= pivotValue;
    }

    for (let row = 0; row < n; row += 1) {
      if (row === pivot) continue;
      const factor = augmented[row][pivot];
      for (let column = pivot; column <= n; column += 1) {
        augmented[row][column] -= factor * augmented[pivot][column];
      }
    }
  }

  return augmented.map((row) => row[n]);
};

const ordinaryLeastSquares = (rows: number[][], targets: number[]) => {
  if (!rows.length) return null;

  const columns = rows[0].length;
  const xtx = Array.from({ length: columns }, () => Array(columns).fill(0));
  const xty = Array(columns).fill(0);

  rows.forEach((row, rowIndex) => {
    for (let i = 0; i < columns; i += 1) {
      xty[i] += row[i] * targets[rowIndex];
      for (let j = 0; j < columns; j += 1) {
        xtx[i][j] += row[i] * row[j];
      }
    }
  });

  const ridge = 1e-8;
  for (let index = 0; index < columns; index += 1) {
    xtx[index][index] += ridge;
  }

  return solveLinearSystem(xtx, xty);
};

const predictArmaPoint = (
  values: number[],
  residuals: number[],
  beta: number[],
  p: number,
  q: number,
  index: number,
) => {
  let prediction = beta[0] || 0;

  for (let lag = 1; lag <= p; lag += 1) {
    prediction += (beta[lag] || 0) * (values[index - lag] || 0);
  }

  for (let lag = 1; lag <= q; lag += 1) {
    prediction += (beta[p + lag] || 0) * (residuals[index - lag] || 0);
  }

  return prediction;
};

const fitArma = (values: number[], p: number, q: number): ArmaFit | null => {
  const maxLag = Math.max(p, q);
  const sampleSize = values.length - maxLag;

  if (sampleSize < Math.max(3, p + q + 1)) {
    return null;
  }

  let residuals = Array(values.length).fill(0);
  let beta: number[] | null = null;

  for (let iteration = 0; iteration < 8; iteration += 1) {
    const rows: number[][] = [];
    const targets: number[] = [];

    for (let index = maxLag; index < values.length; index += 1) {
      const row = [1];
      for (let lag = 1; lag <= p; lag += 1) {
        row.push(values[index - lag] || 0);
      }
      for (let lag = 1; lag <= q; lag += 1) {
        row.push(residuals[index - lag] || 0);
      }
      rows.push(row);
      targets.push(values[index]);
    }

    beta = ordinaryLeastSquares(rows, targets);
    if (!beta) return null;

    const nextResiduals = Array(values.length).fill(0);
    for (let index = maxLag; index < values.length; index += 1) {
      const prediction = predictArmaPoint(values, nextResiduals, beta, p, q, index);
      nextResiduals[index] = values[index] - prediction;
    }
    residuals = nextResiduals;
  }

  if (!beta) return null;

  let sse = 0;
  for (let index = maxLag; index < values.length; index += 1) {
    const prediction = predictArmaPoint(values, residuals, beta, p, q, index);
    sse += (values[index] - prediction) ** 2;
  }

  const parameterCount = 1 + p + q;
  const aic = sampleSize * Math.log(sse / sampleSize + EPSILON) + 2 * parameterCount;

  return {
    p,
    q,
    beta,
    residuals,
    sse,
    aic,
  };
};

const forecastWithFit = (
  originalSeries: number[],
  normalizedValues: number[],
  fit: ArmaFit,
  mean: number,
  scale: number,
  differenceOrder: 0 | 1,
  horizon: number,
  clampMin?: number,
) => {
  const normalizedHistory = [...normalizedValues];
  const residuals = [...fit.residuals];
  const forecasts: number[] = [];
  let lastLevel = originalSeries[originalSeries.length - 1] || 0;

  for (let step = 0; step < horizon; step += 1) {
    const index = normalizedHistory.length;
    const normalizedPrediction = predictArmaPoint(
      normalizedHistory,
      residuals,
      fit.beta,
      fit.p,
      fit.q,
      index,
    );
    const predictedValue = normalizedPrediction * scale + mean;
    const nextValue =
      differenceOrder === 1 ? lastLevel + predictedValue : predictedValue;
    const clampedValue = clamp(nextValue, clampMin);

    forecasts.push(clampedValue);
    normalizedHistory.push(normalizedPrediction);
    residuals.push(0);
    lastLevel = clampedValue;
  }

  return forecasts;
};

const driftFallback = (
  series: number[],
  horizon: number,
  clampMin?: number,
): ArimaForecastResult => {
  const lastValue = series[series.length - 1] || 0;
  const window = series.slice(Math.max(0, series.length - 4));
  const drift =
    window.length > 1 ? (window[window.length - 1] - window[0]) / (window.length - 1) : 0;
  const values = Array.from({ length: horizon }, (_, index) =>
    clamp(lastValue + drift * (index + 1), clampMin),
  );

  return {
    values,
    method: "ARIMA fallback: drift",
    model: {
      p: 0,
      d: 1,
      q: 0,
      aic: 0,
      trainingPoints: series.length,
    },
    usedFallback: true,
  };
};

export const forecastArima = (
  inputSeries: number[],
  options: ForecastOptions = {},
): ArimaForecastResult => {
  const horizon = options.horizon ?? 1;
  const differenceOrder = options.differenceOrder ?? 1;
  const clampMin = options.clampMin;
  const series = inputSeries.map((value) => Number(value) || 0);

  if (series.length < 5 || series.every((value) => Math.abs(value) < EPSILON)) {
    return driftFallback(series, horizon, clampMin);
  }

  const transformed = difference(series, differenceOrder);
  if (transformed.length < 4) {
    return driftFallback(series, horizon, clampMin);
  }

  const mean = average(transformed);
  const scale = standardDeviation(transformed, mean) || 1;
  const normalized = transformed.map((value) => (value - mean) / scale);
  const maxP = Math.min(options.maxP ?? 2, Math.max(0, Math.floor(normalized.length / 3)));
  const maxQ = Math.min(options.maxQ ?? 1, Math.max(0, Math.floor(normalized.length / 4)));
  const candidates: ArmaFit[] = [];

  for (let p = 0; p <= maxP; p += 1) {
    for (let q = 0; q <= maxQ; q += 1) {
      const fit = fitArma(normalized, p, q);
      if (fit && Number.isFinite(fit.aic)) {
        candidates.push(fit);
      }
    }
  }

  if (!candidates.length) {
    return driftFallback(series, horizon, clampMin);
  }

  candidates.sort((a, b) => a.aic - b.aic);
  const best = candidates[0];
  const values = forecastWithFit(
    series,
    normalized,
    best,
    mean,
    scale,
    differenceOrder,
    horizon,
    clampMin,
  );

  return {
    values,
    method: `ARIMA(${best.p},${differenceOrder},${best.q})`,
    model: {
      p: best.p,
      d: differenceOrder,
      q: best.q,
      aic: best.aic,
      trainingPoints: series.length,
    },
    usedFallback: false,
  };
};
