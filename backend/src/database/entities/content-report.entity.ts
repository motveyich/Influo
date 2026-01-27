import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { UserProfile } from './user-profile.entity';

export enum ReportType {
  SPAM = 'spam',
  INAPPROPRIATE = 'inappropriate',
  FAKE = 'fake',
  HARASSMENT = 'harassment',
  COPYRIGHT = 'copyright',
  OTHER = 'other',
}

@Entity('content_reports')
export class ContentReport {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  reporter_id: string;

  @ManyToOne(() => UserProfile)
  @JoinColumn({ name: 'reporter_id' })
  reporter: UserProfile;

  @Column({ type: 'varchar' })
  target_type: string;

  @Column({ type: 'uuid' })
  target_id: string;

  @Column({ type: 'enum', enum: ReportType })
  report_type: ReportType;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'jsonb', default: {} })
  evidence: any;

  @Column({ type: 'varchar', default: 'pending' })
  status: string;

  @Column({ type: 'uuid', nullable: true })
  reviewed_by: string;

  @Column({ type: 'timestamptz', nullable: true })
  reviewed_at: Date;

  @Column({ type: 'text', nullable: true })
  resolution_notes: string;

  @Column({ type: 'int', default: 1 })
  priority: number;

  @Column({ type: 'jsonb', default: {} })
  metadata: any;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}
