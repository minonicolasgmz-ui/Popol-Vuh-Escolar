import { ApiError } from './errors';

export function isDemo() {
  if (process.env.POPOL_VUH_DEMO !== '1') return false;
  if (process.env.NODE_ENV !== 'development' && process.env.NODE_ENV !== 'test') {
    throw new ApiError(503, 'La demostración está desactivada en producción.', 'CONFIGURATION_ERROR');
  }
  return true;
}
