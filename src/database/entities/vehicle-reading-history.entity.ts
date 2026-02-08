import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  Index,
  CreateDateColumn,
} from 'typeorm';

/**
 * COLD STORAGE: Vehicle Readings History
 *
 * Append-only historical table for vehicle-side DC energy delivery.
 * Optimized for high-throughput INSERTs and time-bounded analytical queries.
 *
 * Key Design Decisions:
 * - Composite index on (vehicle_id, timestamp DESC) enables efficient
 *   analytical window queries (e.g., last 24 hours).
 * - No UPDATE operations - immutable audit trail.
 */
@Entity('vehicle_readings_history')
@Index('idx_vehicle_history_vehicle_timestamp', ['vehicleId', 'timestamp'])
export class VehicleReadingHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'vehicle_id' })
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

  @Column({ type: 'timestamptz' })
  timestamp: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
