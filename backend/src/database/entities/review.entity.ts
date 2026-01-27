import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { UserProfile } from './user-profile.entity';
import { Offer } from './offer.entity';

@Entity('reviews')
export class Review {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  offer_id: string;

  @ManyToOne(() => Offer)
  @JoinColumn({ name: 'offer_id' })
  offer: Offer;

  @Column({ type: 'uuid' })
  reviewer_id: string;

  @ManyToOne(() => UserProfile)
  @JoinColumn({ name: 'reviewer_id' })
  reviewer: UserProfile;

  @Column({ type: 'uuid' })
  reviewee_id: string;

  @ManyToOne(() => UserProfile)
  @JoinColumn({ name: 'reviewee_id' })
  reviewee: UserProfile;

  @Column({ type: 'decimal', precision: 2, scale: 1 })
  rating: number;

  @Column({ type: 'varchar' })
  title: string;

  @Column({ type: 'text' })
  comment: string;

  @Column({ type: 'varchar' })
  collaboration_type: string;

  @Column({ type: 'boolean', default: true })
  is_public: boolean;

  @Column({ type: 'int', default: 0 })
  helpful_votes: number;

  @Column({ type: 'jsonb', default: {} })
  metadata: any;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}
