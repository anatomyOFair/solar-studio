import { api } from '../utils/api';
import type { 
  CelestialObject, 
  VisibilityCalculationRequest, 
  VisibilityCalculationResponse 
} from '../types';

/**
 * Celestial Objects API
 */
export const celestialObjectsApi = {
  /**
   * Get all celestial objects
   */
  getAll: () => api.get<CelestialObject[]>('/api/celestial-objects'),
  
  /**
   * Get a celestial object by ID
   */
  getById: (id: string) => api.get<CelestialObject>(`/api/celestial-objects/${id}`),
  
  /**
   * Create a new celestial object
   */
  create: (object: Omit<CelestialObject, 'id'>) => 
    api.post<CelestialObject>('/api/celestial-objects', object),
  
  /**
   * Update an existing celestial object
   */
  update: (id: string, object: Partial<CelestialObject>) => 
    api.put<CelestialObject>(`/api/celestial-objects/${id}`, object),
  
  /**
   * Delete a celestial object
   */
  delete: (id: string) => 
    api.delete<void>(`/api/celestial-objects/${id}`),
};

/**
 * Visibility API
 */
export const visibilityApi = {
  /**
   * Calculate visibility between observer and target positions
   */
  calculate: (request: VisibilityCalculationRequest) => 
    api.post<VisibilityCalculationResponse>('/api/visibility/calculate', request),
};
