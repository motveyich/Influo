import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { UserProfile } from './user-profile.entity';

@Entity('conversations')
export class Conversation {
  @PrimaryGeneratedColumn('uuid')
  conversation_id: string;

  @Column({ type: 'uuid' })
  participant1_id: string;

  @ManyToOne(() => UserProfile)
  @JoinColumn({ name: 'participant1_id' })
  participant1: UserProfile;

  @Column({ type: 'uuid' })
  participant2_id: string;

  @ManyToOne(() => UserProfile)
  @JoinColumn({ name: 'participant2_id' })
  participant2: UserProfile;

  @Column({ type: 'uuid', nullable: true })
  related_offer_id: string;

  @Column({ type: 'varchar', nullable: true })
  last_message_preview: string;

  @Column({ type: 'timestamptz', nullable: true })
  last_message_at: Date;

  @Column({ type: 'int', default: 0 })
  unread_count_participant1: number;

  @Column({ type: 'int', default: 0 })
  unread_count_participant2: number;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}
