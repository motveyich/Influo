import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { UserProfile } from './user-profile.entity';
import { ModerationStatus } from './influencer-card.entity';

@Entity('moderation_queue')
export class ModerationQueue {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  content_type: string;

  @Column({ type: 'uuid' })
  content_id: string;

  @Column({ type: 'jsonb' })
  content_data: any;

  @Column({ type: 'enum', enum: ModerationStatus, default: ModerationStatus.PENDING })
  moderation_status: ModerationStatus;

  @Column({ type: 'simple-array', nullable: true })
  flagged_reasons: string[];

  @Column({ type: 'boolean', default: false })
  auto_flagged: boolean;

  @Column({ type: 'jsonb', default: {} })
  filter_matches: any;

  @Column({ type: 'uuid', nullable: true })
  assigned_moderator: string;

  @ManyToOne(() => UserProfile)
  @JoinColumn({ name: 'assigned_moderator' })
  moderator: UserProfile;

  @Column({ type: 'timestamptz', nullable: true })
  reviewed_at: Date;

  @Column({ type: 'text', nullable: true })
  review_notes: string;

  @Column({ type: 'int', default: 1 })
  priority: number;

  @Column({ type: 'jsonb', default: {} })
  metadata: any;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}
