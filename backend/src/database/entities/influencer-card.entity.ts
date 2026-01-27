import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { UserProfile } from './user-profile.entity';

export enum ModerationStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  FLAGGED = 'flagged',
}

@Entity('influencer_cards')
export class InfluencerCard {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  user_id: string;

  @ManyToOne(() => UserProfile)
  @JoinColumn({ name: 'user_id' })
  user: UserProfile;

  @Column({ type: 'varchar' })
  platform: string;

  @Column({ type: 'varchar' })
  social_handle: string;

  @Column({ type: 'int' })
  followers_count: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  engagement_rate: number;

  @Column({ type: 'jsonb', default: [] })
  categories: any;

  @Column({ type: 'jsonb', default: [] })
  content_types: any;

  @Column({ type: 'jsonb', default: {} })
  audience_demographics: any;

  @Column({ type: 'jsonb', default: {} })
  pricing: any;

  @Column({ type: 'text', nullable: true })
  portfolio_description: string;

  @Column({ type: 'jsonb', default: [] })
  collaboration_preferences: any;

  @Column({ type: 'jsonb', nullable: true })
  integration_details: any;

  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  @Column({ type: 'enum', enum: ModerationStatus, default: ModerationStatus.APPROVED })
  moderation_status: ModerationStatus;

  @Column({ type: 'boolean', default: false })
  is_deleted: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  deleted_at: Date;

  @Column({ type: 'uuid', nullable: true })
  deleted_by: string;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}
