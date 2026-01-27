import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { UserProfile, UserRole } from './user-profile.entity';

@Entity('user_roles')
export class UserRoleAssignment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  user_id: string;

  @ManyToOne(() => UserProfile)
  @JoinColumn({ name: 'user_id' })
  user: UserProfile;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.USER })
  role: UserRole;

  @Column({ type: 'uuid', nullable: true })
  assigned_by: string;

  @Column({ type: 'timestamptz', nullable: true })
  assigned_at: Date;

  @Column({ type: 'timestamptz', nullable: true })
  expires_at: Date;

  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  @Column({ type: 'jsonb', default: {} })
  metadata: any;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}
