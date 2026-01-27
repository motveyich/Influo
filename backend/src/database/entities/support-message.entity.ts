import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { UserProfile } from './user-profile.entity';
import { SupportTicket } from './support-ticket.entity';

@Entity('support_messages')
export class SupportMessage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  ticket_id: string;

  @ManyToOne(() => SupportTicket)
  @JoinColumn({ name: 'ticket_id' })
  ticket: SupportTicket;

  @Column({ type: 'uuid' })
  sender_id: string;

  @ManyToOne(() => UserProfile)
  @JoinColumn({ name: 'sender_id' })
  sender: UserProfile;

  @Column({ type: 'text' })
  message: string;

  @Column({ type: 'boolean', default: false })
  is_staff: boolean;

  @Column({ type: 'jsonb', nullable: true })
  attachments: any;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;
}
