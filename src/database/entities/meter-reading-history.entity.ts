import {
    Entity,
    Column,
    PrimaryGeneratedColumn,
    Index,
    CreateDateColumn,
} from 'typeorm';

/**
 * COLD STORAGE: Meter Readings History
 *
 * Append-only historical table for grid-side energy consumption.
 * Optimized for high-throughput INSERTs and time-bounded analytical queries.
 *
 * Key Design Decisions:
 * - Composite index on (meter_id, timestamp DESC) enables efficient
 *   time-ordered lookups without full table scans.
 * - No UPDATE operations - immutable audit trail.
 */
@Entity('meter_readings_history')
@Index('idx_meter_history_meter_timestamp', ['meterId', 'timestamp'])
export class MeterReadingHistory {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'meter_id' })
    meterId: string;

    @Column({ name: 'kwh_consumed_ac', type: 'decimal', precision: 12, scale: 4 })
    kwhConsumedAc: number;

    @Column({ type: 'decimal', precision: 8, scale: 2 })
    voltage: number;

    @Column({ type: 'timestamptz' })
    timestamp: Date;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;
}
