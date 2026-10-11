// Feature flags. The risk-based verdict (backtest) ships OFF until the timing optimiser is working
// and tested. Strategy search is future work (dropped per the prof's feedback, contract v2), so it is OFF.
const flag = (name, fallback) => {
  const v = process.env[name];
  return v === undefined || v === '' ? fallback : v === 'true';
};

export const features = {
  timingOptimiser: flag('FEATURE_TIMING_OPTIMISER', true),
  strategySearch: flag('FEATURE_STRATEGY_SEARCH', false),
  backtest: flag('FEATURE_BACKTEST', false),
};
