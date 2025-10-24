/**
 * Courier Location Service
 * 
 * Service for tracking and updating courier location in real-time
 * Uses Firestore for storing location data and Geolocation API for tracking
 */

import { db } from '@/lib/firebase';
import { doc, setDoc, onSnapshot, serverTimestamp, Unsubscribe } from 'firebase/firestore';

export interface CourierLocation {
  lat: number;
  lng: number;
  accuracy?: number;
  heading?: number; // Direction in degrees (0-360)
  speed?: number; // Speed in m/s
  timestamp: Date;
}

export interface CourierLocationUpdate {
  location: CourierLocation;
  orderId: string;
  courierId: string;
}

class CourierLocationService {
  private watchId: number | null = null;
  private updateInterval: ReturnType<typeof setInterval> | null = null;
  private currentPosition: CourierLocation | null = null;

  /**
   * Start tracking courier location
   * Updates Firestore every 10 seconds
   */
  startTracking(courierId: string, orderId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported'));
        return;
      }

      // Request high accuracy position
      this.watchId = navigator.geolocation.watchPosition(
        (position) => {
          const location: CourierLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy,
            heading: position.coords.heading ?? undefined,
            speed: position.coords.speed ?? undefined,
            timestamp: new Date(position.timestamp),
          };

          this.currentPosition = location;

          // Update Firestore immediately on first position
          if (!this.updateInterval) {
            this.updateLocationInFirestore(courierId, orderId, location);
            
            // Setup interval for subsequent updates (every 10 seconds)
            this.updateInterval = setInterval(() => {
              if (this.currentPosition) {
                this.updateLocationInFirestore(courierId, orderId, this.currentPosition);
              }
            }, 10000);

            resolve();
          }
        },
        (error) => {
          console.error('Geolocation error:', error);
          reject(error);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      );
    });
  }

  /**
   * Stop tracking courier location
   */
  stopTracking(): void {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }

    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }

    this.currentPosition = null;
  }

  /**
   * Update courier location in Firestore
   */
  private async updateLocationInFirestore(
    courierId: string,
    orderId: string,
    location: CourierLocation
  ): Promise<void> {
    try {
      const locationDoc = doc(db, 'courierLocations', courierId);
      
      await setDoc(locationDoc, {
        courierId,
        orderId,
        location: {
          lat: location.lat,
          lng: location.lng,
          accuracy: location.accuracy,
          heading: location.heading,
          speed: location.speed,
        },
        updatedAt: serverTimestamp(),
        timestamp: location.timestamp.toISOString(),
      }, { merge: true });

      console.log('✅ Courier location updated:', location);
    } catch (error) {
      console.error('❌ Failed to update courier location:', error);
    }
  }

  /**
   * Subscribe to courier location updates
   * Returns unsubscribe function
   */
  subscribeToLocation(
    courierId: string,
    onUpdate: (location: CourierLocation) => void
  ): Unsubscribe {
    const locationDoc = doc(db, 'courierLocations', courierId);

    return onSnapshot(locationDoc, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        const location: CourierLocation = {
          lat: data.location.lat,
          lng: data.location.lng,
          accuracy: data.location.accuracy,
          heading: data.location.heading,
          speed: data.location.speed,
          timestamp: new Date(data.timestamp),
        };
        onUpdate(location);
      }
    });
  }

  /**
   * Get current tracked position (client-side only)
   */
  getCurrentPosition(): CourierLocation | null {
    return this.currentPosition;
  }

  /**
   * Check if tracking is active
   */
  isTracking(): boolean {
    return this.watchId !== null;
  }
}

// Export singleton instance
export const courierLocationService = new CourierLocationService();
