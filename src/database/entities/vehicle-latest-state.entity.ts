import { Entity, Column, PrimaryColumn, UpdateDateColumn } from 'typeorm';

/**
 * HOT STORAGE: Vehicle Latest State
 *
 * Operational table storing only the latest known state per vehicle.
 * Optimized for fast dashboard reads and UPSERT operations.
 *
 * Key Design Decisions:
 * - PK on vehicle_id ensures single row per device.
 * - UPSERT pattern (ON CONFLICT DO UPDATE) for atomic updates.
 * - Minimal row count (max = number of vehicles) ensures fast reads.
 */
@Entity('vehicle_latest_state')
export class VehicleLatestState {
  @PrimaryColumn({ name: 'vehicle_id' })
  vehicleId: string;

  @Column({ type: 'decimal', precision: 5, scale: 2 })
  soc: number;

  @Column({
    name: 'kwh_delivered_dc',
    type: 'decimal',
    precision: 12,
    scale: 4,
  })
  kwhDeliveredDc: number;

  @Column({ name: 'battery_temp', type: 'decimal', precision: 5, scale: 2 })
  batteryTemp: number;

  @Column({ name: 'last_seen_at', type: 'timestamptz' })
  lastSeenAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
