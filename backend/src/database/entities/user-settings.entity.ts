import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, OneToOne, JoinColumn } from 'typeorm';
import { UserProfile } from './user-profile.entity';

@Entity('user_settings')
export class UserSettings {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', unique: true })
  user_id: string;

  @OneToOne(() => UserProfile)
  @JoinColumn({ name: 'user_id' })
  user: UserProfile;

  @Column({ type: 'jsonb', default: {} })
  security: any;

  @Column({ type: 'jsonb', default: {} })
  privacy: any;

  @Column({ type: 'jsonb', default: {} })
  notifications: any;

  @Column({ type: 'jsonb', default: {} })
  interface: any;

  @Column({ type: 'jsonb', default: {} })
  account: any;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}
