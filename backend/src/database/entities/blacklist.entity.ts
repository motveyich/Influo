import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { UserProfile } from './user-profile.entity';

@Entity('blacklist')
export class Blacklist {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  blocker_id: string;

  @ManyToOne(() => UserProfile)
  @JoinColumn({ name: 'blocker_id' })
  blocker: UserProfile;

  @Column({ type: 'uuid' })
  blocked_user_id: string;

  @ManyToOne(() => UserProfile)
  @JoinColumn({ name: 'blocked_user_id' })
  blocked_user: UserProfile;

  @Column({ type: 'text', nullable: true })
  reason: string;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;
}
