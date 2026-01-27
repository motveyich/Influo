import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { UserProfile } from './user-profile.entity';

@Entity('auto_campaigns')
export class AutoCampaign {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  advertiser_id: string;

  @ManyToOne(() => UserProfile)
  @JoinColumn({ name: 'advertiser_id' })
  advertiser: UserProfile;

  @Column({ type: 'varchar' })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'varchar', default: 'draft' })
  status: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  budget_min: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  budget_max: number;

  @Column({ type: 'int' })
  audience_min: number;

  @Column({ type: 'int' })
  audience_max: number;

  @Column({ type: 'int' })
  target_influencers_count: number;

  @Column({ type: 'simple-array', default: '' })
  content_types: string[];

  @Column({ type: 'simple-array', default: '' })
  platforms: string[];

  @Column({ type: 'simple-array', nullable: true })
  audience_interests: string[];

  @Column({ type: 'varchar', nullable: true })
  audience_age_min: string;

  @Column({ type: 'varchar', nullable: true })
  audience_age_max: string;

  @Column({ type: 'varchar', nullable: true })
  audience_gender: string;

  @Column({ type: 'simple-array', nullable: true })
  audience_geo: string[];

  @Column({ type: 'boolean', default: false })
  enable_chat: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  start_date: Date;

  @Column({ type: 'timestamptz', nullable: true })
  end_date: Date;

  @Column({ type: 'decimal', precision: 10, scale: 6, nullable: true })
  target_price_per_follower: number;

  @Column({ type: 'int', default: 0 })
  sent_offers_count: number;

  @Column({ type: 'int', default: 0 })
  accepted_offers_count: number;

  @Column({ type: 'int', default: 0 })
  completed_offers_count: number;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}
