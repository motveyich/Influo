import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { UserProfile } from './user-profile.entity';

@Entity('advertiser_cards')
export class AdvertiserCard {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  user_id: string;

  @ManyToOne(() => UserProfile)
  @JoinColumn({ name: 'user_id' })
  user: UserProfile;

  @Column({ type: 'varchar' })
  company_name: string;

  @Column({ type: 'varchar' })
  campaign_title: string;

  @Column({ type: 'text' })
  campaign_description: string;

  @Column({ type: 'varchar' })
  platform: string;

  @Column({ type: 'jsonb', default: [] })
  product_categories: any;

  @Column({ type: 'jsonb', default: {} })
  budget: any;

  @Column({ type: 'jsonb', default: {} })
  service_format: any;

  @Column({ type: 'jsonb', default: {} })
  campaign_duration: any;

  @Column({ type: 'jsonb', default: {} })
  influencer_requirements: any;

  @Column({ type: 'jsonb', default: {} })
  target_audience: any;

  @Column({ type: 'jsonb', default: {} })
  contact_info: any;

  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}
