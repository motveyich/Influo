import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { UserProfile } from './user-profile.entity';
import { AutoCampaign } from './auto-campaign.entity';

@Entity('offers')
export class Offer {
  @PrimaryGeneratedColumn('uuid')
  offer_id: string;

  @Column({ type: 'uuid' })
  creator_id: string;

  @ManyToOne(() => UserProfile)
  @JoinColumn({ name: 'creator_id' })
  creator: UserProfile;

  @Column({ type: 'uuid', nullable: true })
  advertiser_id: string;

  @ManyToOne(() => UserProfile)
  @JoinColumn({ name: 'advertiser_id' })
  advertiser: UserProfile;

  @Column({ type: 'uuid', nullable: true })
  influencer_id: string;

  @ManyToOne(() => UserProfile)
  @JoinColumn({ name: 'influencer_id' })
  influencer: UserProfile;

  @Column({ type: 'uuid', nullable: true })
  auto_campaign_id: string;

  @ManyToOne(() => AutoCampaign)
  @JoinColumn({ name: 'auto_campaign_id' })
  auto_campaign: AutoCampaign;

  @Column({ type: 'varchar', nullable: true })
  initiated_by: string;

  @Column({ type: 'varchar' })
  title: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'varchar' })
  platform: string;

  @Column({ type: 'simple-array', default: '' })
  content_types: string[];

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  budget: number;

  @Column({ type: 'varchar', default: 'USD' })
  currency: string;

  @Column({ type: 'varchar', default: 'pending' })
  status: string;

  @Column({ type: 'jsonb', nullable: true })
  requirements: any;

  @Column({ type: 'jsonb', nullable: true })
  deliverables: any;

  @Column({ type: 'timestamptz', nullable: true })
  deadline: Date;

  @Column({ type: 'text', nullable: true })
  completion_notes: string;

  @Column({ type: 'varchar', nullable: true })
  completion_screenshot_url: string;

  @Column({ type: 'boolean', default: false })
  completion_confirmed_by_advertiser: boolean;

  @Column({ type: 'boolean', default: false })
  completion_confirmed_by_influencer: boolean;

  @Column({ type: 'jsonb', nullable: true })
  integration_details: any;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}
