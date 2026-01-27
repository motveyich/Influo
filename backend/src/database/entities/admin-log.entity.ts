import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { UserProfile } from './user-profile.entity';

@Entity('admin_logs')
export class AdminLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  admin_id: string;

  @ManyToOne(() => UserProfile)
  @JoinColumn({ name: 'admin_id' })
  admin: UserProfile;

  @Column({ type: 'varchar' })
  action_type: string;

  @Column({ type: 'varchar', nullable: true })
  target_type: string;

  @Column({ type: 'uuid', nullable: true })
  target_id: string;

  @Column({ type: 'jsonb', default: {} })
  details: any;

  @Column({ type: 'inet', nullable: true })
  ip_address: string;

  @Column({ type: 'text', nullable: true })
  user_agent: string;

  @Column({ type: 'varchar', nullable: true })
  session_id: string;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;
}
