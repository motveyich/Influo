import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { UserProfile } from './user-profile.entity';
import { AdvertiserCard } from './advertiser-card.entity';

@Entity('applications')
export class Application {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  card_id: string;

  @ManyToOne(() => AdvertiserCard)
  @JoinColumn({ name: 'card_id' })
  card: AdvertiserCard;

  @Column({ type: 'uuid' })
  influencer_id: string;

  @ManyToOne(() => UserProfile)
  @JoinColumn({ name: 'influencer_id' })
  influencer: UserProfile;

  @Column({ type: 'varchar' })
  platform: string;

  @Column({ type: 'varchar' })
  social_handle: string;

  @Column({ type: 'int' })
  followers_count: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  engagement_rate: number;

  @Column({ type: 'text' })
  proposal: string;

  @Column({ type: 'text', nullable: true })
  portfolio_links: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  proposed_price: number;

  @Column({ type: 'varchar', default: 'pending' })
  status: string;

  @Column({ type: 'boolean', default: false })
  completion_confirmed: boolean;

  @Column({ type: 'text', nullable: true })
  completion_notes: string;

  @Column({ type: 'varchar', nullable: true })
  completion_screenshot_url: string;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}
