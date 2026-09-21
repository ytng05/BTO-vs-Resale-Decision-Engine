// Feature flags. The risk-based verdict (backtest) ships OFF until the timing optimiser
// and strategy search are working and tested.
const flag = (name, fallback) => {
  const v = process.env[name];
  return v === undefined || v === '' ? fallback : v === 'true';
};

export const features = {
  timingOptimiser: flag('FEATURE_TIMING_OPTIMISER', true),
  strategySearch: flag('FEATURE_STRATEGY_SEARCH', true),
  backtest: flag('FEATURE_BACKTEST', false),
};
