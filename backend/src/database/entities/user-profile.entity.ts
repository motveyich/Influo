import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';

export enum UserRole {
  USER = 'user',
  MODERATOR = 'moderator',
  ADMIN = 'admin',
}

@Entity('user_profiles')
export class UserProfile {
  @PrimaryGeneratedColumn('uuid')
  user_id: string;

  @Column({ type: 'varchar', unique: true })
  email: string;

  @Column({ type: 'varchar' })
  password_hash: string;

  @Column({ type: 'varchar', nullable: true })
  full_name: string;

  @Column({ type: 'varchar', nullable: true, unique: true })
  username: string;

  @Column({ type: 'varchar', nullable: true })
  phone: string;

  @Column({ type: 'varchar', nullable: true })
  avatar: string;

  @Column({ type: 'text', nullable: true })
  bio: string;

  @Column({ type: 'varchar', nullable: true })
  location: string;

  @Column({ type: 'varchar', nullable: true })
  website: string;

  @Column({ type: 'jsonb', nullable: true })
  influencer_profile: any;

  @Column({ type: 'jsonb', nullable: true })
  advertiser_profile: any;

  @Column({ type: 'jsonb', nullable: true, default: {} })
  unified_account_info: any;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.USER })
  role: UserRole;

  @Column({ type: 'int', default: 0 })
  total_rating: number;

  @Column({ type: 'int', default: 0 })
  rating_count: number;

  @Column({ type: 'decimal', precision: 3, scale: 2, nullable: true })
  avg_rating: number;

  @Column({ type: 'int', default: 0 })
  completed_deals_count: number;

  @Column({ type: 'boolean', default: false })
  is_deleted: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  deleted_at: Date;

  @Column({ type: 'uuid', nullable: true })
  deleted_by: string;

  @Column({ type: 'timestamptz', nullable: true })
  last_seen_at: Date;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}
