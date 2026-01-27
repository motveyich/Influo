import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { UserProfile } from './user-profile.entity';

@Entity('support_tickets')
export class SupportTicket {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  user_id: string;

  @ManyToOne(() => UserProfile)
  @JoinColumn({ name: 'user_id' })
  user: UserProfile;

  @Column({ type: 'varchar' })
  category: string;

  @Column({ type: 'varchar' })
  subject: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'varchar', default: 'open' })
  status: string;

  @Column({ type: 'varchar', default: 'medium' })
  priority: string;

  @Column({ type: 'uuid', nullable: true })
  assigned_to: string;

  @ManyToOne(() => UserProfile)
  @JoinColumn({ name: 'assigned_to' })
  assignee: UserProfile;

  @Column({ type: 'jsonb', nullable: true })
  metadata: any;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}
