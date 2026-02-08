import { Entity, Column, PrimaryColumn, UpdateDateColumn } from 'typeorm';

/**
 * HOT STORAGE: Meter Latest State
 *
 * Operational table storing only the latest known state per meter.
 * Optimized for fast dashboard reads and UPSERT operations.
 *
 * Key Design Decisions:
 * - PK on meter_id ensures single row per device.
 * - UPSERT pattern (ON CONFLICT DO UPDATE) for atomic updates.
 * - Minimal row count (max = number of meters) ensures fast reads.
 */
@Entity('meter_latest_state')
export class MeterLatestState {
  @PrimaryColumn({ name: 'meter_id' })
  meterId: string;

  @Column({ name: 'kwh_consumed_ac', type: 'decimal', precision: 12, scale: 4 })
  kwhConsumedAc: number;

  @Column({ type: 'decimal', precision: 8, scale: 2 })
  voltage: number;

  @Column({ name: 'last_seen_at', type: 'timestamptz' })
  lastSeenAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
