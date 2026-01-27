import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { UserProfile } from './user-profile.entity';

@Entity('content_filters')
export class ContentFilter {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', unique: true })
  filter_name: string;

  @Column({ type: 'varchar' })
  filter_type: string;

  @Column({ type: 'text' })
  pattern: string;

  @Column({ type: 'boolean', default: true })
  is_regex: boolean;

  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  @Column({ type: 'int', default: 1 })
  severity: number;

  @Column({ type: 'varchar', default: 'flag' })
  action: string;

  @Column({ type: 'uuid', nullable: true })
  created_by: string;

  @ManyToOne(() => UserProfile)
  @JoinColumn({ name: 'created_by' })
  creator: UserProfile;

  @Column({ type: 'jsonb', default: {} })
  metadata: any;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}
