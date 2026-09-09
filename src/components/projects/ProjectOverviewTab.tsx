import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Linking, ScrollView } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ProjectDetailItem } from '@/services/projectService';
import { TEAM_MEMBER_ROLE_LABELS, USER_ROLE } from '@/services/teamService';
import { BrandColors } from '@/constants/colors';
import { formatNumber } from '@/utils/formatters';

interface ProjectOverviewTabProps {
  project: ProjectDetailItem;
  onOpenAssignPm: () => void;
  onConfirmProject?: () => void;
  isConfirming?: boolean;
  canAssignPm?: boolean;
  canConfirmProject?: boolean;
  taskStats: {
    total: number;
    completed: number;
    doing: number;
    pending: number;
  };
  onOpenAddMember?: () => void;
  onRemoveMember?: (memberId: string) => void;
  onEditMemberRole?: (member: any) => void;
  canManageTeam?: boolean;
}

export default function ProjectOverviewTab({
  project,
  onOpenAssignPm,
  onConfirmProject,
  isConfirming,
  canAssignPm = false,
  canConfirmProject = false,
  taskStats,
  onOpenAddMember,
  onRemoveMember,
  onEditMemberRole,
  canManageTeam = false,
}: ProjectOverviewTabProps) {
  const router = useRouter();
  const pmUser = project.projectManager || project.team?.members?.find((m) => m.role === 'PROJECT_MANAGER')?.user;
  const pm = pmUser;
  const leadUser = project.team?.teamLead || project.team?.members?.find((m) => m.role === 'ACCOUNT' && m.user?.id !== pmUser?.id)?.user;
  const team = project.team;
  const contract = project.contract;
  const progress = project.progress ?? 0;

  const handleOpenAttachment = (url?: string) => {
    if (url) {
      Linking.openURL(url).catch((err) => {
        console.warn('Cannot open attachment URL:', err);
      });
    }
  };

  return (
    <View style={styles.container}>
      {/* 1. Missing PM Banner (If project has no PM yet) */}
      {!pm && (
        <View style={styles.noPmBanner}>
          <View style={styles.confirmBannerHeader}>
            <Feather name="alert-triangle" size={20} color="#D97706" />
            <View style={{ flex: 1 }}>
              <Text style={styles.noPmTitle}>Dự án chưa có PM phụ trách</Text>
              <Text style={styles.noPmSubtitle}>
                Dự án này chưa được phân công PM phụ trách. Vui lòng phân công PM tuân thủ đúng quy trình hợp đồng.
              </Text>
            </View>
          </View>
          {canAssignPm && (
            <TouchableOpacity
              style={styles.assignPmHeaderBtn}
              onPress={onOpenAssignPm}
              activeOpacity={0.8}
            >
              <Feather name="user-plus" size={14} color="#FFFFFF" />
              <Text style={styles.assignPmHeaderBtnText}>Phân công PM ngay</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* 2. Pending Confirmation Banner (If project has PM & status is PENDING_CONFIRMATION) */}
      {pm && project.status === 'PENDING_CONFIRMATION' && (
        <View style={styles.confirmBanner}>
          <View style={styles.confirmBannerHeader}>
            <Feather name="clock" size={20} color="#C2410C" />
            <View style={{ flex: 1 }}>
              <Text style={styles.confirmTitle}>Dự án đang chờ PM xác nhận</Text>
            </View>
          </View>

          {canConfirmProject ? (
            <TouchableOpacity
              style={styles.confirmBtn}
              onPress={onConfirmProject}
              disabled={isConfirming}
              activeOpacity={0.8}
            >
              {isConfirming ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Feather name="check-circle" size={16} color="#FFFFFF" />
                  <Text style={styles.confirmBtnText}>Chấp nhận dự án</Text>
                </>
              )}
            </TouchableOpacity>
          ) : (
            <View style={styles.lockNotice}>
              <Feather name="lock" size={13} color="#9A3412" />
              <Text style={styles.lockNoticeText}>
                Chỉ PM phụ trách ({pm.fullName}) hoặc Ban quản lý mới có quyền chấp nhận dự án.
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Project Info Card (Thông tin dự án like Web ERP) */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Feather name="calendar" size={16} color={BrandColors.primary} />
          <Text style={styles.cardTitle}>Thông tin dự án</Text>
        </View>

        {/* Code & Name Grid */}
        <View style={styles.projectInfoGrid}>
          <View style={styles.projectInfoCol}>
            <Text style={styles.projectInfoMetaLabel}>MÃ HỢP ĐỒNG</Text>
            <Text style={styles.projectInfoMetaVal}>{contract?.contractCode || 'Chưa cập nhật'}</Text>
          </View>
          <View style={styles.projectInfoCol}>
            <Text style={styles.projectInfoMetaLabel}>TÊN HỢP ĐỒNG</Text>
            <Text style={styles.projectInfoMetaVal} numberOfLines={2}>
              {contract?.name || project.name || 'Chưa cập nhật'}
            </Text>
          </View>
        </View>

        {/* Description / Customer Brief */}
        <View style={styles.briefSection}>
          <View style={styles.briefHeader}>
            <Feather name="briefcase" size={14} color={BrandColors.primary} />
            <Text style={styles.briefTitle}>Mô tả khách hàng (Brief)</Text>
          </View>
          <Text style={styles.briefContent}>
            {contract?.description || (project as any).description || 'Chưa có mô tả chi tiết từ khách hàng.'}
          </Text>
        </View>

        {/* Attachments Section */}
        <View style={styles.attachmentsSection}>
          <Text style={styles.attachmentsTitle}>
            Tài liệu đính kèm ({contract?.attachments?.length || 0})
          </Text>

          {contract?.attachments && contract.attachments.length > 0 ? (
            <View style={styles.attachmentsList}>
              {contract.attachments.map((file, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={styles.attachmentCard}
                  onPress={() => handleOpenAttachment(file.url)}
                  activeOpacity={0.7}
                >
                  <View style={styles.attachmentIconBox}>
                    <Feather name="file-text" size={16} color={BrandColors.primary} />
                  </View>
                  <View style={styles.attachmentMain}>
                    <Text style={styles.attachmentName} numberOfLines={1}>
                      {file.name}
                    </Text>
                    {file.type ? <Text style={styles.attachmentType}>{file.type.toUpperCase()}</Text> : null}
                  </View>
                  <Feather name="external-link" size={14} color="#64748B" />
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <Text style={styles.emptyAttachmentsText}>Không có tài liệu đính kèm</Text>
          )}
        </View>
      </View>

      {/* Task Progress Stat Card */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Feather name="pie-chart" size={16} color={BrandColors.primary} />
          <Text style={styles.cardTitle}>Thống kê tiến độ công việc</Text>
        </View>

        <View style={styles.progressHeader}>
          <Text style={styles.progressPercent}>{progress}%</Text>
          <Text style={styles.progressSubtitle}>Tổng thể dự án</Text>
        </View>

        <View style={styles.progressBarBg}>
          <View
            style={[
              styles.progressBarFill,
              { width: `${Math.min(100, Math.max(0, progress))}%` },
            ]}
          />
        </View>

        <View style={styles.statsGrid}>
          <View style={styles.statBox}>
            <Text style={styles.statVal}>{taskStats.total}</Text>
            <Text style={styles.statLabel}>Tổng Task</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statVal, { color: '#059669' }]}>{taskStats.completed}</Text>
            <Text style={styles.statLabel}>Hoàn thành</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statVal, { color: '#2563EB' }]}>{taskStats.doing}</Text>
            <Text style={styles.statLabel}>Đang làm</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statVal, { color: '#D97706' }]}>{taskStats.pending}</Text>
            <Text style={styles.statLabel}>Chờ gán</Text>
          </View>
        </View>
      </View>

      {/* Project Manager Card */}
      <View style={styles.card}>
        <View style={styles.cardHeaderBetween}>
          <View style={styles.cardHeader}>
            <Feather name="user-check" size={16} color={BrandColors.primary} />
            <Text style={styles.cardTitle}>Quản lý dự án (PM)</Text>
          </View>
          {canAssignPm && (
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={onOpenAssignPm}
              activeOpacity={0.7}
            >
              <Feather name="edit-2" size={12} color={BrandColors.primary} />
              <Text style={styles.actionBtnText}>{pm ? 'Đổi PM' : 'Phân công'}</Text>
            </TouchableOpacity>
          )}
        </View>

        {pm ? (
          <View style={styles.pmInfo}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {pm.fullName ? pm.fullName.charAt(0).toUpperCase() : 'P'}
              </Text>
            </View>
            <View>
              <Text style={styles.pmName}>{pm.fullName}</Text>
              {(pm as any)?.email ? <Text style={styles.pmEmail}>{(pm as any).email}</Text> : null}
            </View>
          </View>
        ) : (
          <View style={styles.emptyPm}>
            <Feather name="alert-circle" size={18} color="#F59E0B" />
            <Text style={styles.emptyPmText}>Dự án này chưa được gán PM phụ trách.</Text>
          </View>
        )}
      </View>

      {/* Team Info Card */}
      <View style={styles.card}>
        <View style={styles.cardHeaderBetween}>
          <View style={styles.cardHeader}>
            <Feather name="users" size={16} color={BrandColors.primary} />
            <Text style={styles.cardTitle}>Đội ngũ thực hiện</Text>
          </View>
          {canManageTeam && pmUser && (
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={onOpenAddMember}
              activeOpacity={0.7}
            >
              <Feather name="user-plus" size={12} color={BrandColors.primary} />
              <Text style={styles.actionBtnText}>Thêm nhân sự</Text>
            </TouchableOpacity>
          )}
        </View>

        <Text style={styles.teamName}>{team?.name || 'Đội dự án'}</Text>
        <Text style={styles.teamLead}>
          Trưởng nhóm (Lead dự án):{' '}
          <Text style={{ fontWeight: '700', color: leadUser ? '#047857' : '#94A3B8' }}>
            {leadUser?.fullName || 'Chưa chọn Lead dự án'}
          </Text>
        </Text>

        {/* Status Lock Notices for Team Management */}
        {!pmUser ? (
          <View style={styles.teamLockBox}>
            <Feather name="lock" size={14} color="#D97706" />
            <Text style={styles.teamLockText}>
              Vui lòng phân công PM phụ trách trước khi mở khóa quản lý đội ngũ thực hiện.
            </Text>
          </View>
        ) : (
          /* Members List */
          <View style={styles.memberList}>
            {team?.members && team.members.length > 0 ? (
              team.members.map((m) => {
                const isPmRole = !!pmUser?.id && m.user?.id === pmUser.id;
                const isLeadRole = !isPmRole && !!leadUser?.id && m.user?.id === leadUser.id;

                return (
                  <View key={m.id} style={styles.memberRow}>
                    <View style={styles.memberAvatarCircle}>
                      <Text style={styles.memberAvatarText}>
                        {m.user?.fullName ? m.user.fullName.charAt(0).toUpperCase() : 'M'}
                      </Text>
                    </View>

                    <View style={styles.memberMainInfo}>
                      <View style={styles.memberNameBadgeRow}>
                        <Text style={styles.memberName}>{m.user?.fullName || 'Thành viên'}</Text>
                        {isPmRole ? (
                          <View style={styles.pmRoleBadge}>
                            <Text style={styles.pmRoleBadgeText}>PM/Manager</Text>
                          </View>
                        ) : isLeadRole ? (
                          <View style={styles.leadRoleBadge}>
                            <Text style={styles.leadRoleBadgeText}>Lead dự án</Text>
                          </View>
                        ) : (
                          <View style={styles.memberRoleBadge}>
                            <Text style={styles.memberRoleBadgeText}>
                              {TEAM_MEMBER_ROLE_LABELS[m.role] || m.role || 'Thành viên'}
                            </Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.memberSubText}>
                        {(m.user as any)?.role
                          ? USER_ROLE[(m.user as any).role] || (m.user as any).role
                          : m.user?.email || 'Nhân sự'}
                      </Text>
                    </View>

                    {canManageTeam && !isPmRole && !isLeadRole && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <TouchableOpacity
                          style={styles.editRoleBtn}
                          onPress={() => onEditMemberRole?.(m)}
                          activeOpacity={0.7}
                        >
                          <Feather name="edit-2" size={13} color={BrandColors.primary} />
                        </TouchableOpacity>
                        {onRemoveMember && (
                          <TouchableOpacity
                            style={styles.removeMemberBtn}
                            onPress={() => onRemoveMember(m.id)}
                            activeOpacity={0.7}
                          >
                            <Feather name="trash-2" size={14} color="#EF4444" />
                          </TouchableOpacity>
                        )}
                      </View>
                    )}
                  </View>
                );
              })
            ) : (
              <Text style={styles.emptyMemberText}>Chưa có thành viên bổ sung trong đội.</Text>
            )}

            {canManageTeam && (
              <TouchableOpacity
                style={styles.addMemberFullBtn}
                onPress={onOpenAddMember}
                activeOpacity={0.8}
              >
                <Feather name="plus-circle" size={15} color={BrandColors.primary} />
                <Text style={styles.addMemberFullBtnText}>+ Thêm thành viên vào đội dự án</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>

      {/* Contract Info Card */}
      {contract && (
        <View style={styles.card}>
          <View style={styles.cardHeaderBetween}>
            <View style={styles.cardHeader}>
              <Feather name="file-text" size={16} color={BrandColors.primary} />
              <Text style={styles.cardTitle}>Hợp đồng liên quan</Text>
            </View>
            {contract.id && (
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => router.push(`/contracts/${contract.id}` as any)}
                activeOpacity={0.7}
              >
                <Text style={styles.actionBtnText}>Xem hợp đồng</Text>
                <Feather name="chevron-right" size={14} color={BrandColors.primary} />
              </TouchableOpacity>
            )}
          </View>

          <Text style={styles.contractCode}>
            #{contract.contractCode || 'HĐ-DỰ-ÁN'}
          </Text>

          {contract.customer?.name && (
            <Text style={styles.customerName}>Khách hàng: {contract.customer.name}</Text>
          )}

          {contract.sellingPrice ? (
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Giá trị hợp đồng:</Text>
              <Text style={styles.priceVal}>{formatNumber(contract.sellingPrice)} đ</Text>
            </View>
          ) : null}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    gap: 14,
  },
  confirmBanner: {
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FFEDD5',
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  confirmBannerHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  confirmTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#C2410C',
    marginBottom: 2,
  },
  confirmSubtitle: {
    fontSize: 12,
    color: '#9A3412',
    lineHeight: 18,
  },
  confirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#059669',
    paddingVertical: 10,
    borderRadius: 10,
  },
  confirmBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  lockNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFEDD5',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  lockNoticeText: {
    fontSize: 12,
    color: '#9A3412',
    fontWeight: '600',
    flex: 1,
  },

  noPmBanner: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  noPmTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#B45309',
    marginBottom: 2,
  },
  noPmSubtitle: {
    fontSize: 12,
    color: '#92400E',
    lineHeight: 18,
  },
  assignPmHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: BrandColors.primary,
    paddingVertical: 10,
    borderRadius: 10,
  },
  assignPmHeaderBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardHeaderBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F0FDFA',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: BrandColors.primary,
  },
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  progressPercent: {
    fontSize: 28,
    fontWeight: '800',
    color: BrandColors.primary,
  },
  progressSubtitle: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },
  progressBarBg: {
    height: 8,
    backgroundColor: '#E2E8F0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: BrandColors.primary,
    borderRadius: 4,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
  },
  statBox: {
    alignItems: 'center',
    gap: 2,
  },
  statVal: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  statLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  pmInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#F8FAFC',
    padding: 10,
    borderRadius: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: BrandColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  pmName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  pmEmail: {
    fontSize: 12,
    color: '#64748B',
  },
  emptyPm: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFBEB',
    padding: 10,
    borderRadius: 12,
  },
  emptyPmText: {
    fontSize: 13,
    color: '#B45309',
    fontWeight: '500',
  },
  teamName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  teamLead: {
    fontSize: 12,
    color: '#64748B',
  },
  teamLockBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF3C7',
    padding: 10,
    borderRadius: 10,
    marginTop: 4,
  },
  teamLockText: {
    fontSize: 12,
    color: '#B45309',
    fontWeight: '500',
    flex: 1,
  },
  memberList: {
    gap: 8,
    marginTop: 4,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 10,
  },
  memberAvatarCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: BrandColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberAvatarText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  memberMainInfo: {
    flex: 1,
    gap: 2,
  },
  memberNameBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  memberName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  pmRoleBadge: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  pmRoleBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#1D4ED8',
  },
  leadRoleBadge: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  leadRoleBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#047857',
  },
  memberRoleBadge: {
    backgroundColor: '#F3E8FF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  memberRoleBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#7E22CE',
  },
  memberSubText: {
    fontSize: 11,
    color: '#64748B',
  },
  editRoleBtn: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: '#F0FDFA',
    borderWidth: 1,
    borderColor: '#CCFBF1',
  },
  removeMemberBtn: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: '#FEE2E2',
  },
  emptyMemberText: {
    fontSize: 12,
    color: '#94A3B8',
    fontStyle: 'italic',
  },
  addMemberFullBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#F0FDFA',
    borderWidth: 1,
    borderColor: '#CCFBF1',
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 4,
  },
  addMemberFullBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: BrandColors.primary,
  },
  contractCode: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    fontFamily: 'PlatformMono',
  },
  customerName: {
    fontSize: 13,
    color: '#64748B',
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 8,
    marginTop: 4,
  },
  priceLabel: {
    fontSize: 13,
    color: '#64748B',
  },
  priceVal: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  projectInfoGrid: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
  },
  projectInfoCol: {
    flex: 1,
    gap: 4,
  },
  projectInfoMetaLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 0.5,
  },
  projectInfoMetaVal: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },
  briefSection: {
    backgroundColor: '#FAFAFA',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    padding: 12,
    gap: 6,
  },
  briefHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  briefTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
  },
  briefContent: {
    fontSize: 13,
    color: '#64748B',
    fontStyle: 'italic',
    lineHeight: 20,
  },
  attachmentsSection: {
    gap: 8,
    marginTop: 4,
  },
  attachmentsTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  attachmentsList: {
    gap: 8,
  },
  attachmentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 10,
    gap: 10,
  },
  attachmentIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  attachmentMain: {
    flex: 1,
  },
  attachmentName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1E293B',
  },
  attachmentType: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94A3B8',
    marginTop: 1,
  },
  emptyAttachmentsText: {
    fontSize: 12,
    color: '#94A3B8',
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 8,
  },
});
